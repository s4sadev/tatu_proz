const sql = require('../config/db')

/**
 * Buscar horários disponíveis para um dia específico
 */
exports.getAvailableHours = async (req, res) => {
  const { date } = req.query // data no formato YYYY-MM-DD

  if (!date) {
    return res.status(400).json({ error: 'Date obrigatória' })
  }

  try {
    // Buscar data como objeto
    const targetDate = new Date(date)
    const dayOfWeek = targetDate.getDay() // 0-6 (domingo-sábado)
    const dateStr = date

    // 1. Verificar se há horário especial para esta data
    const specialHours = await sql`
      SELECT inicio, fim FROM horario_especial
      WHERE DATE(inicio) = ${dateStr}
      OR DATE(fim) = ${dateStr}
      LIMIT 1
    `

    // Se tem horário especial, usar ele
    if (specialHours.length > 0) {
      const special = specialHours[0]
      const horariosEspeciais = gerarHorarios(
        special.inicio,
        special.fim,
        null, // sem pausa em dia especial
        dateStr
      )
      return res.json({
        success: true,
        type: 'special',
        date: dateStr,
        hours: horariosEspeciais
      })
    }

    // 2. Se não tem especial, usar horário regular do dia da semana
    const regularHours = await sql`
      SELECT inicio, fim, pausa_inicio, pausa_fim, ativo
      FROM horario_regular
      WHERE dia = ${dayOfWeek}
    `

    if (regularHours.length === 0 || !regularHours[0].ativo) {
      return res.json({
        success: true,
        type: 'closed',
        date: dateStr,
        message: 'Tatuador não atende neste dia',
        hours: []
      })
    }

    const regular = regularHours[0]
    const horarios = gerarHorarios(
      regular.inicio,
      regular.fim,
      { inicio: regular.pausa_inicio, fim: regular.pausa_fim },
      dateStr
    )

    // 3. Filtrar horários já agendados
    const agendados = await sql`
      SELECT inicio, fim FROM agendamentos
      WHERE DATE(inicio) = ${dateStr}
      AND status IN ('confirmado', 'pendente')
    `

    const horariosDisponiveis = horarios.filter(h => {
      const horarioDuracao = 60 // minutos por agendamento (ajuste conforme necessário)
      const hStart = new Date(`${dateStr}T${h}:00`)
      const hEnd = new Date(hStart.getTime() + horarioDuracao * 60000)

      return !agendados.some(ag => {
        const agStart = new Date(ag.inicio)
        const agEnd = new Date(ag.fim)
        // Verificar sobreposição
        return hStart < agEnd && hEnd > agStart
      })
    })

    res.json({
      success: true,
      type: 'regular',
      date: dateStr,
      hours: horariosDisponiveis
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar horários disponíveis' })
  }
}

/**
 * Gerar array de horários em intervalos (a cada 30 min ou 1h)
 */
function gerarHorarios(inicio, fim, pausa, dateStr) {
  const horarios = []
  const intervaloMinutos = 30 // intervalo entre horários

  // Converter para minutos desde meia-noite
  const [iHoras, iMinutos] = inicio.split(':').map(Number)
  const [fHoras, fMinutos] = fim.split(':').map(Number)

  let horarioAtual = iHoras * 60 + iMinutos

  while (horarioAtual < fHoras * 60 + fMinutos) {
    const horas = Math.floor(horarioAtual / 60)
    const minutos = horarioAtual % 60

    // Verificar se está na pausa
    if (pausa) {
      const [pIHoras, pIMinutos] = pausa.inicio.split(':').map(Number)
      const [pFHoras, pFMinutos] = pausa.fim.split(':').map(Number)

      const pausaInicio = pIHoras * 60 + pIMinutos
      const pausaFim = pFHoras * 60 + pFMinutos

      if (horarioAtual >= pausaInicio && horarioAtual < pausaFim) {
        horarioAtual += intervaloMinutos
        continue
      }
    }

    horarios.push(`${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`)
    horarioAtual += intervaloMinutos
  }

  return horarios
}

/**
 * Verificar disponibilidade antes de criar agendamento
 */
exports.checkAvailability = async (req, res) => {
  const { date, time, duracao } = req.body // duracao em minutos

  if (!date || !time) {
    return res.status(400).json({ error: 'Date e time obrigatórios' })
  }

  try {
    const dateStr = date
    const [horas, minutos] = time.split(':').map(Number)
    const durMin = duracao || 60

    const startDateTime = new Date(`${dateStr}T${time}:00`)
    const endDateTime = new Date(startDateTime.getTime() + durMin * 60000)

    // Verificar conflitos
    const conflitos = await sql`
      SELECT COUNT(*) as count FROM agendamentos
      WHERE DATE(inicio) = ${dateStr}
      AND status IN ('confirmado', 'pendente')
      AND (
        (inicio < ${endDateTime.toISOString()} AND fim > ${startDateTime.toISOString()})
      )
    `

    const disponivel = conflitos[0].count === 0

    // Verificar se está dentro dos horários do tatuador
    const targetDate = new Date(dateStr)
    const dayOfWeek = targetDate.getDay()

    const horarioRegular = await sql`
      SELECT inicio, fim, pausa_inicio, pausa_fim, ativo
      FROM horario_regular
      WHERE dia = ${dayOfWeek}
    `

    let dentroDoHorario = false

    if (horarioRegular.length > 0 && horarioRegular[0].ativo) {
      const reg = horarioRegular[0]
      const [rIHoras, rIMinutos] = reg.inicio.split(':').map(Number)
      const [rFHoras, rFMinutos] = reg.fim.split(':').map(Number)

      const regInicio = rIHoras * 60 + rIMinutos
      const regFim = rFHoras * 60 + rFMinutos
      const horarioAtual = horas * 60 + minutos

      dentroDoHorario = horarioAtual >= regInicio && horarioAtual + durMin <= regFim

      // Verificar pausa
      if (dentroDoHorario && reg.pausa_inicio) {
        const [pIHoras, pIMinutos] = reg.pausa_inicio.split(':').map(Number)
        const [pFHoras, pFMinutos] = reg.pausa_fim.split(':').map(Number)

        const pausaInicio = pIHoras * 60 + pIMinutos
        const pausaFim = pFHoras * 60 + pFMinutos

        if (
          (horarioAtual >= pausaInicio && horarioAtual < pausaFim) ||
          (horarioAtual + durMin > pausaInicio && horarioAtual < pausaFim)
        ) {
          dentroDoHorario = false
        }
      }
    }

    res.json({
      success: true,
      disponivel: disponivel && dentroDoHorario,
      conflitos: conflitos[0].count > 0,
      dentroDoHorario
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao verificar disponibilidade' })
  }
}