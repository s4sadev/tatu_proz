// src/routes/dashboardRoutes.js
// Rotas do dashboard - resumo/cards
const express = require('express')
const router = express.Router()
const agendamentoController = require('../controllers/agendamentoController')

// GET /dashboard/summary - Cards do dashboard (números/resumo)
router.get('/summary', agendamentoController.dashboardSummary)

module.exports = router
