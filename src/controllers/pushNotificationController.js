const sql = require('../config/db')
const { sendPushNotification } = require('../services/pushNotificationService')

exports.savePushToken = async (req, res) => {
  const { token } = req.body
  const userId = req.userId

  if (!token) {
    return res.status(400).json({ error: 'Token obrigatório' })
  }

  try {
    // Verifica se já existe
    const existing = await sql`
      SELECT id FROM push_tokens
      WHERE user_id = ${userId}
      AND token = ${token}
    `

    if (existing.length === 0) {
      await sql`
        INSERT INTO push_tokens (user_id, token, created_at)
        VALUES (${userId}, ${token}, NOW())
      `
    }

    res.json({ message: 'Token salvo com sucesso' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao salvar token' })
  }
}

exports.deletePushToken = async (req, res) => {
  const { token } = req.body
  const userId = req.userId

  try {
    await sql`
      DELETE FROM push_tokens
      WHERE user_id = ${userId}
      AND token = ${token}
    `
    res.json({ message: 'Token removido' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao remover token' })
  }
}

exports.getPushTokens = async (userId) => {
  try {
    const result = await sql`
      SELECT token FROM push_tokens
      WHERE user_id = ${userId}
    `
    return result.map(r => r.token)
  } catch (err) {
    console.error(err)
    return []
  }
}

exports.sendManualNotification = async (req, res) => {
  const { appointmentId, clientName, clientPhone } = req.body
  const adminId = req.userId

  if (!appointmentId || !clientName) {
    return res.status(400).json({ error: 'appointmentId e clientName obrigatórios' })
  }

  try {
    // Buscar o agendamento para pegar o cliente
    const appointments = await sql`
      SELECT client_id, service, inicio
      FROM agendamentos
      WHERE id = ${appointmentId}
    `

    if (appointments.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' })
    }

    const apt = appointments[0]

    // Enviar notificação push
    const sent = await sendPushNotification(apt.client_id, {
      title: 'Lembrete de Agendamento',
      body: `${clientName}, você tem um agendamento de ${apt.service} em ${new Date(apt.inicio).toLocaleString('pt-BR')}`,
      tag: `appointment-${appointmentId}`,
      data: {
        appointmentId: appointmentId,
        type: 'appointment-reminder'
      }
    })

    res.json({ 
      message: sent ? 'Notificação enviada com sucesso' : 'Falha ao enviar notificação',
      sent 
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao enviar notificação' })
  }
}
