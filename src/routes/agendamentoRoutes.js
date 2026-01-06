// src/routes/agendamentoRoutes.js
const express = require('express')
const router = express.Router()

// controller
const agendamentoController = require('../controllers/agendamentoController')


// Rota POST /api/agendamentos (vai virar /api/agendamentos)
router.post('/', agendamentoController.criaComPhone)

// router
module.exports = router
