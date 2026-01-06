// src/index.js (seu arquivo atualizado)
require("dotenv").config()
const express = require("express")

const app = express()

// ⭐ MIDDLEWARE IMPORTANTE ⭐
app.use(express.json()) // Permite receber JSON no body

// ⭐ IMPORTAR ROTAS ⭐
const agendamentoRoutes = require('./agendamentoRoutes')

// ⭐ USAR ROTAS ⭐
app.use('/api/agendamentos', agendamentoRoutes) // ṔST APPOINTMENTS -> CRIA O AGENDAMENTOS, ALÉM DISSO VERIFICA SE O USER POSSUI

// Rota raiz
app.get("/", (req, res) => {
  res.json({ 
    message: "API funcionando!",
    endpoints: {
      agendamentos: "/api/agendamentos"
    }
  })
})

const PORT = process.env.PORT || 3333

app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${PORT}`)
})