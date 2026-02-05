const express = require('express')
const path = require('path')

const app = express() // 👈 AQUI nasce o app

// middlewares
app.use(express.json())

// servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'public')))

// rotas
const zapRoutes = require('./zap/zap.routes')
app.use('/zap', zapRoutes)

// servidor
const PORT = 3000
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`)
})
