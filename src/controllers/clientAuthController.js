const sql = require('../config/db')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')

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
}

exports.checkPhone = async (req, res) => {
  const { telefone } = req.body

  if (!telefone) {
    return res.status(400).json({ error: 'Telefone obrigatório' })
  }

  const telefoneValidado = validaPhone(telefone)
  if (!telefoneValidado) {
    return res.status(400).json({ error: 'Telefone inválido' })
  }

  try {
    const result = await sql`
      SELECT ativo FROM usuarios
      WHERE telefone = ${telefoneValidado}
      AND role = 'CLIENT'
    `

    if (result.length === 0) {
      return res.json({ exists: false })
    }

    res.json({ exists: true, active: result[0].ativo })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao verificar telefone' })
  }
}

exports.registerClient = async (req, res) => {
  const { telefone, name, email, senha } = req.body

  if (!telefone || !name || !email || !senha) {
    return res.status(400).json({ error: 'Telefone, name, email e senha obrigatórios' })
  }

  const telefoneValidado = validaPhone(telefone)
  if (!telefoneValidado) {
    return res.status(400).json({ error: 'Telefone inválido' })
  }

  try {
    // Verifica se já existe
    const existing = await sql`
      SELECT id, ativo FROM usuarios
      WHERE telefone = ${telefoneValidado}
      AND role = 'CLIENT'
    `

    const hash = await bcrypt.hash(senha, 10)

    if (existing.length === 0) {
      // Novo cliente
      await sql`
        INSERT INTO usuarios (telefone, name, email, senha, role, ativo)
        VALUES (${telefoneValidado}, ${name}, ${email}, ${hash}, 'CLIENT', false)
      `
      res.status(201).json({ message: 'Pré-cadastro realizado. Ative sua conta no login.' })
    } else if (!existing[0].ativo) {
      // Atualiza dados e ativa
      await sql`
        UPDATE usuarios
        SET name = ${name}, email = ${email}, senha = ${hash}, ativo = true
        WHERE id = ${existing[0].id}
      `
      res.json({ message: 'Conta ativada com sucesso' })
    } else {
      res.status(400).json({ error: 'Telefone já cadastrado e ativo' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao cadastrar' })
  }
}

exports.loginClient = async (req, res) => {
  const { telefone, senha } = req.body

  if (!telefone || !senha) {
    return res.status(400).json({ error: 'Telefone e senha obrigatórios' })
  }

  const telefoneValidado = validaPhone(telefone)
  if (!telefoneValidado) {
    return res.status(400).json({ error: 'Telefone inválido' })
  }

  try {
    const result = await sql`
      SELECT id, senha, ativo FROM usuarios
      WHERE telefone = ${telefoneValidado}
      AND role = 'CLIENT'
    `

    if (result.length === 0) {
      return res.status(401).json({ error: 'Telefone não cadastrado' })
    }

    const user = result[0]

    if (!user.ativo) {
      return res.status(401).json({ error: 'Conta inativa. Complete o cadastro.' })
    }

    const senhaOk = await bcrypt.compare(senha, user.senha)

    if (!senhaOk) {
      return res.status(401).json({ error: 'Senha incorreta' })
    }

    const token = jwt.sign(
      { userId: user.id, role: 'CLIENT' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    )

    res.json({ token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro no login' })
  }
}

exports.getClientMe = async (req, res) => {
  try {
    const result = await sql`
      SELECT id, name, email, telefone, created_at FROM usuarios
      WHERE id = ${req.userId}
      AND role = 'CLIENT'
    `

    if (result.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' })
    }

    res.json(result[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar cliente' })
  }
}