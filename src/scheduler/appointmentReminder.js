const cron = require('node-cron')
const { sendScheduledReminders } = require('../services/pushNotificationService')

/**
 * Agendar job para enviar lembretes de agendamentos
 * Executa todo dia às 15:00 (3 PM)
 */
function startScheduler() {
  const task = cron.schedule('0 15 * * *', async () => {
    console.log(`[CRON] Executando job de notificações - ${new Date().toLocaleString()}`)
    try {
      await sendScheduledReminders()
    } catch (err) {
      console.error('[CRON] Erro no job:', err)
    }
  })

  console.log('[CRON] Scheduler iniciado - Reminders diários às 15:00')
  return task
}

module.exports = { startScheduler }