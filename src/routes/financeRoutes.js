// src/routes/financeRoutes.js
// Rotas financeiras - relatório, gráficos, export PDF
const express = require('express')
const router = express.Router()
const agendamentoController = require('../controllers/agendamentoController')

// GET /finances/report - Tabela de transações (lista detalhada)
router.get('/report', agendamentoController.financesReport)

// GET /finances/chart - Dados para gráficos (arrays)
router.get('/chart', agendamentoController.financesChart)

// GET /finances/export-pdf - Download de PDF
router.get('/export-pdf', agendamentoController.financesExportPdf)

module.exports = router
