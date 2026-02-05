// src/routes/index.js
// Carrega .env com caminho absoluto (evita falha quando o cwd não é o root do projeto)
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })
const cors = require('cors')
const express = require("express")

const app = express()
app.use(cors())

// ⭐ MIDDLEWARE IMPORTANTE ⭐
app.use(express.json()) // Permite receber JSON no body

// configurando o caminho
app.use(express.static(path.join(__dirname, '..', 'public')))

// ⭐ IMPORTAR ROTAS ⭐
const agendamentoRoutes = require('./agendamentoRoutes')
const zapRoute = require('./whatsappRoutes')
const dashboardRoutes = require('./dashboardRoutes')
const financeRoutes = require('./financeRoutes')

// Rota raiz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
})

app.use('/api/agendamentos', agendamentoRoutes) //

app.use('/api/zap', zapRoute )

// Rotas financeiras e dashboard
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/finances', financeRoutes)
// caso a porta nao esteja on
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${PORT}`)
})// so para validar