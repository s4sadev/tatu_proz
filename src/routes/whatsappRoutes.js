// No seu arquivo de rotas (routes.js ou similar)
const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

// Inicializa WhatsApp quando o servidor inicia
// whatsappController.initializeWhatsApp().catch(console.error);

// Rotas
router.get('/qr', whatsappController.getQr);
router.get('/status', whatsappController.getStatus);
router.post('/logout', whatsappController.logout);
router.post('/init', whatsappController.initializeWhatsApp)

module.exports = router;