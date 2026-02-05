const express = require('express')
const pushNotificationController = require('../controllers/pushNotificationController')
const authMiddleware = require('../middleware/authMiddleware')
const clientAuthMiddleware = require('../middleware/clientAuthMiddleware')

const router = express.Router()

// Salvar token de push (cliente autenticado)
router.post('/subscribe', clientAuthMiddleware, pushNotificationController.savePushToken)

// Remover token de push
router.post('/unsubscribe', clientAuthMiddleware, pushNotificationController.deletePushToken)

// Enviar notificação manual (admin)
router.post('/send-manual', authMiddleware, pushNotificationController.sendManualNotification)

module.exports = router