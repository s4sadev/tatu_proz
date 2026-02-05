const webpush = require('web-push')
const sql = require('../config/db')

// Configurar chaves VAPID (apenas se ambas forem fornecidas)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:tatu@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  console.log('[PUSH] VAPID Details configurados com sucesso')
} else {
  console.warn('[PUSH] Chaves VAPID não configuradas. Push notifications desabilitadas.')
  console.warn('[PUSH] Para ativar, configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no .env')
}

/**
 * Enviar notificação push para um usuário
 */
exports.sendPushNotification = async (userId, notification) => {
  // Se VAPID não está configurado, retornar sucesso falso mas sem erro
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log('[PUSH] VAPID não configurado, notificação não enviada')
    return false
  }

  try {
    // Buscar tokens do usuário
    const tokens = await sql`
      SELECT token FROM push_tokens
      WHERE user_id = ${userId}
    `

    if (tokens.length === 0) {
      console.log(`[PUSH] Nenhum token para user ${userId}`)
      return false
    }

    const payload = JSON.stringify({
      title: notification.title || 'TATU - Sistema de Tatuadores',
      body: notification.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: notification.tag || 'default',
      data: notification.data || {}
    })

    let sent = 0
    for (const tokenRecord of tokens) {
      try {
        await webpush.sendNotification(
          { endpoint: tokenRecord.token },
          payload
        )
        sent++
      } catch (err) {
        console.error(`[PUSH] Erro ao enviar para ${tokenRecord.token}:`, err.message)
        // Se token inválido, remover do banco
        if (err.statusCode === 410) {
          await sql`DELETE FROM push_tokens WHERE token = ${tokenRecord.token}`
        }
      }
    }

    console.log(`[PUSH] Notificação enviada para ${sent}/${tokens.length} dispositivos`)
    return sent > 0
  } catch (err) {
    console.error('[PUSH] Erro ao enviar notificação:', err)
    return false
  }
}

/**
 * Enviar notificações em massa para agendamentos do próximo dia
 */
exports.sendScheduledReminders = async () => {
  // Se VAPID não está configurado, retornar 0 mas sem erro
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log('[CRON] VAPID não configurado, lembretes não enviados')
    return 0
  }

  try {
    console.log('[CRON] Iniciando envio de lembretes para agendamentos de amanhã')

    // Buscar agendamentos de amanhã
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]

    const appointments = await sql`
      SELECT 
        id,
        client_id,
        client_name,
        client_phone,
        service,
        inicio
      FROM agendamentos
      WHERE DATE(inicio) = ${tomorrowDate}
      AND status IN ('pendente', 'confirmado')
    `

    console.log(`[CRON] Encontrados ${appointments.length} agendamentos para amanhã`)

    let sent = 0
    for (const apt of appointments) {
      const notified = await exports.sendPushNotification(apt.client_id, {
        title: 'Lembrete de Agendamento',
        body: `${apt.client_name}, você tem um agendamento de ${apt.service} amanhã às ${apt.inicio.split('T')[1].substring(0, 5)}`,
        tag: `appointment-${apt.id}`,
        data: {
          appointmentId: apt.id,
          type: 'appointment-reminder'
        }
      })
      if (notified) sent++
    }

    console.log(`[CRON] Lembretes enviados com sucesso: ${sent}/${appointments.length}`)
    return sent
  } catch (err) {
    console.error('[CRON] Erro ao enviar lembretes:', err)
    return 0
  }
}