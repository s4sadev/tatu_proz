// src/routes/agendamentoRoutes.js
const express = require('express')
const router = express.Router()
const sql = require('../config/db')


// controller
const agendamentoController = require('../controllers/agendamentoController')


// Rota POST /api/agendamentos -> CRIA AGENDAMENTO E VALIDA SE O USUARIO POSSUI LOGIN, SE NAO CRIA
router.post('/', agendamentoController.criaComPhone)

// Rota GET /api/agendamentos -> BUSCA TODOS OS AGENDAMENTOS
router.get('/', async(req, res) =>{
    try{
        const result = await sql`
        SELECT * FROM agendamentos
        `

        return res.status(200).json({
            sucess: true,
            count: result.legth,
            data: result
        })

    }catch(error){
        console.error('erro ao buscar agendamentos', error)
        return res.status(500).json({
            sucess: false,
            error: 'Erro ao buscar agendamentos',
            message: error.message
        })
    }

})

router.get('/by', agendamentoController.byStatus)
// ROTA GET /api/agendamentos/id -> BUSCA ATENDIMENTO POR ID
router.get('/:id', async(req, res) =>{
    try{
        const {id} = req.params
        const result = await sql`
        SELECT * FROM agendamentos
        WHERE id = ${id}
        `

        return res.status(200).json({
            sucess: true,
            count: result.length,
            data: result
        })

    }catch(error){
        console.error('erro ao buscar agendamentos', error)
        return res.status(500).json({
            sucess: false,
            error: 'Erro ao buscar agendamentos',
            message: error.message
        })
    }

})

// Rota PUT /api/agendamentos/id -> EDITA ATENDIMENTO IDENTIFICADO PELO ID
router.put('/:id', agendamentoController.update)

// Rota POST /api/agendamentos/id/confirm -> Executa a ação de confirmar um agendamento
router.post('/:id/confirm', agendamentoController.updateConfirm)

// Rota POST /api/agendamentos/id/cancel -> Executa a ação de confirmar um agendamento
router.post('/:id/cancel', agendamentoController.updateCancel)

// Rota POST /api/agendamentos/id/ -> Executa a ação de confirmar um agendamento
router.post('/:id/pendence', agendamentoController.updatePendence)

// Rota GET /api/agendamentos/id -> Busca pelo ID fornecido


// router
module.exports = router
