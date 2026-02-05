exports.authMiddleware = function(req, res, next) {
const authHeader =
  req.headers.authorization || req.headers.Authorization

if (!authHeader) {
  return res.status(401).json({ error: 'Token não enviado' })
}

const token = authHeader.replace('Bearer ', '')

try {
  const decoded = require('jsonwebtoken').verify(
    token,
    process.env.JWT_SECRET
  )

  req.userId = decoded.userId
  next()
} catch (err) {
  return res.status(401).json({ error: 'Token inválido' })
}
}

function validaPhone(numero) {
    // Remove todos os caracteres não numéricos
    numero = numero.replace(/\D/g, '');

    // Verifica se o número contém o código do país +55 seguido de 10 ou 11 dígitos nacionais
    var regex10 = /^55(\d{10})$/; // Código do país + 10 dígitos nacionais
    var regex11 = /^55(\d{11})$/; // Código do país + 11 dígitos nacionais

    if (regex10.test(numero)) {
        // Adiciona o número 9 após os dois primeiros dígitos nacionais
        var match = numero.match(regex10);
        var numeroNacional = match[1];
        return '55' + numeroNacional.slice(0, 2) + '9' + numeroNacional.slice(2);
    } else if (regex11.test(numero)) {
        // Retorna o número original se já tiver 11 dígitos nacionais
        return numero;
    } else {
        // Retorna uma mensagem de erro se o número não tiver exatamente 10 ou 11 dígitos nacionais após o código do país
        return false;
    }
} // retorna valor ou false


// require('dotenv').config()
// const express = require('express')
const sql = require('../config/db')

// const app = express()
// app.use(express.json())

exports.createRegister =  async (req, res) => {
  const { email, senha, telefone} = req.body

  if (!email || !senha || !telefone) {
    return res.status(400).json({ error: 'Email e senha obrigatórios' })
  }

  const query = await sql`
    SELECT *
    FROM usuarios
    WHERE email = ${email}
    AND senha = ${senha}
    AND telefone = ${telefone}
    `
  if(!query.length === 0){
      return res.status(400).json({ error: 'usuario já criado!' })
  }
  const telefoneVerided = validaPhone(telefone)

  try {
    const bcrypt = require('bcrypt')
    const hash = await bcrypt.hash(senha, 10)

      await sql`
      INSERT INTO usuarios (email, senha, telefone)
      VALUES (${email}, ${hash}, ${telefoneVerided})
      `
    res.status(201).json({ message: 'Usuário criado' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar usuário' , message: err})
  }
}   

// app.listen(3000, () => {
//   console.log('API rodando na porta 3000')
// })

const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

exports.authLogin = async (req, res) => {
  const { email, senha } = req.body

  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha obrigatórios' })
  }

  try {
    const result = await sql`SELECT id, senha FROM usuarios WHERE email = ${email}`
    

    if (result.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const user = result[0]
    const senhaOk = await bcrypt.compare(senha, user.senha)

    if (!senhaOk) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.json({ token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro no login' })
  }
}

exports.authMe = async (req, res) => {
  try {
    const result = await sql
      `SELECT id, email, created_at FROM usuarios WHERE id = ${req.userId}`
    

    res.json(result[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar usuário' })
  }
}

// exports.getWork('/working-hours', authMiddleware, async (req, res) => {
//   try {
//     const result = await sql(
//       `SELECT day, start_time, end_time
//        FROM working_hours
//        WHERE user_id = $1
//        ORDER BY day`,
//       [req.userId]
//     )

//     res.json(result.rows)
//   } catch (err) {
//     console.error(err)
//     res.status(500).json({ error: 'Erro ao buscar horários' })
//   }
// })


// exports.updateWork('/working-hours', authMiddleware, async (req, res) => {
//   const hours = req.body

//   if (!Array.isArray(hours)) {
//     return res.status(400).json({ error: 'Formato inválido' })
//   }

//   try {
//     // apaga os horários antigos
//     await sql(
//       'DELETE FROM working_hours WHERE user_id = $1',
//       [req.userId]
//     )

//     // insere os novos
//     for (const h of hours) {
//       await sql(
//         `INSERT INTO working_hours
//          (user_id, day_of_week, start_time, end_time)
//          VALUES ($1, $2, $3, $4)`,
//         [req.userId, h.day, h.start, h.end]
//       )
//     }

//     res.json({ message: 'Horários atualizados' })
//   } catch (err) {
//     console.error(err)
//     res.status(500).json({ error: 'Erro ao salvar horários' })
//   }
// })
