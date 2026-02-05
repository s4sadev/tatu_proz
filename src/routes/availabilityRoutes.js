const express = require('express')
const router = express.Router()
const availabilityController = require('../controllers/availabilityController')

// Buscar horários disponíveis para uma data
router.get('/hours', availabilityController.getAvailableHours)

// Verificar se um horário específico está disponível
router.post('/check', availabilityController.checkAvailability)

module.exports = router