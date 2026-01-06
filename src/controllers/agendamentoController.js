const sql = require('../config/db')

exports.criaComPhone = async (req, res) =>{
    const {
        client_name,
        client_phone = null,
        service = null,
        inicio = null,
        fim = null
    } = req.body

    // validação inicial
    if(!client_name || !client_phone){
        return res.status(400).json({
            error:'dados obrigatorios!'
        })
    }
    // buscando client
    let client = await sql`
        SELECT id FROM usuarios
        WHERE telefone = ${client_phone}
        LIMIT 1
    `

    let client_id = null;
    console.log('id identificado', client.length)
    if(client.length === 0){
        console.log('client não existe, iremos criar!')
        const novoClient = await sql`
            INSERT INTO usuarios (nome, telefone, senha, role)
            VALUES(
                ${client_name},
                ${client_phone},
                ${client_phone},
                'CLIENT'
            )
            RETURNING id
        `
        client_id = novoClient[0].id
        console.log('Client Criado com sucesso!', client_id)
    }else{
        client_id = client[0].id
        console.log('Client já existe! ID: ',client_id )
    }

    try{
        const result = await sql `
        INSERT INTO agendamentos (
            client_id,
            client_name,
            client_phone,
            service,
            inicio,
            fim,
            status
        )
        VALUES (
            ${client_id},
            ${client_name},
            ${client_phone},
            ${service},
            ${inicio},
            ${fim},
            'PENDENTE'
        )

        RETURNING *
        `
        return res.status(201).json({
        message: 'Agendamento criado com sucesso!',
        data: result[0]
        })
    } catch (error){
        console.error(error)
        return res.status(500).json({
        error:'Erro ao criar agendamento!!',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })
    }
    }