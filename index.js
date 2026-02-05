/**
 * Ponto de entrada do servidor TATU
 * Inicia o app com todas as rotas (agendamentos, zap, dashboard, finances)
 */
// Garante que o .env seja encontrado (mesmo quando iniciado fora da pasta do projeto)
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
require('./src/routes/index.js')
