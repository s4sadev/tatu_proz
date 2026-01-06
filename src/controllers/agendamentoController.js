const sql = require('../config/db')

exports.criaComPhone = async (req, res) => {
    try {
        const {
            client_name,
            client_phone,
            service = null,
            inicio,
            fim
        } = req.body

        console.log('📞 Recebendo solicitação:', { client_name, client_phone })

        // 🔍 VALIDAÇÃO COMPLETA
        const camposObrigatorios = []
        if (!client_name) camposObrigatorios.push('client_name')
        if (!client_phone) camposObrigatorios.push('client_phone') 
        if (!inicio) camposObrigatorios.push('inicio')
        if (!fim) camposObrigatorios.push('fim')

        if (camposObrigatorios.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Campos obrigatórios faltando',
                missing_fields: camposObrigatorios,
                message: `Preencha: ${camposObrigatorios.join(', ')}`
            })
        }

        // 📊 VALIDAÇÃO DE DATAS
        const dataInicio = new Date(inicio)
        const dataFim = new Date(fim)
        
        if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Datas inválidas',
                message: 'Formato de data/hora incorreto'
            })
        }

        if (dataInicio >= dataFim) {
            return res.status(400).json({
                success: false,
                error: 'Datas inconsistentes',
                message: 'A data de início deve ser antes da data de fim'
            })
        }

        // 👤 BUSCAR OU CRIAR USUÁRIO
        console.log('🔍 Buscando usuário pelo telefone...')
        let usuarios = await sql`
            SELECT id, name, telefone, email, created_at 
            FROM usuarios 
            WHERE telefone = ${client_phone}
            LIMIT 1
        `

        let usuarioInfo
        let usuarioCriadoAgora = false

        if (usuarios.length === 0) {
            // 📝 CRIAR NOVO USUÁRIO
            console.log('👤 Criando novo usuário...')
            const novosUsuarios = await sql`
                INSERT INTO usuarios (name, telefone, senha)
                VALUES (
                    ${client_name},
                    ${client_phone},
                    ${client_phone}  // Senha temporária = telefone
                )
                RETURNING 
                    id, 
                    name, 
                    telefone, 
                    email,
                    created_at
            `
            
            usuarioInfo = novosUsuarios[0]
            usuarioCriadoAgora = true
            console.log('✅ Usuário criado! ID:', usuarioInfo.id)
        } else {
            // ✅ USUÁRIO JÁ EXISTE
            usuarioInfo = usuarios[0]
            console.log('✅ Usuário encontrado! ID:', usuarioInfo.id)
            
            // Atualizar nome se fornecido e diferente
            if (client_name && client_name !== usuarioInfo.name) {
                await sql`
                    UPDATE usuarios 
                    SET name = ${client_name}
                    WHERE id = ${usuarioInfo.id}
                `
                usuarioInfo.name = client_name
                console.log('📝 Nome atualizado para:', client_name)
            }
        }

        // 📅 CRIAR AGENDAMENTO
        console.log('📅 Criando agendamento...')
        const agendamentos = await sql`
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
                ${usuarioInfo.id},
                ${usuarioInfo.name},
                ${usuarioInfo.telefone},
                ${service},
                ${inicio},
                ${fim},
                'AGENDADO'
            )
            RETURNING 
                id,
                client_id,
                client_name,
                client_phone,
                service,
                inicio,
                fim,
                status,
                created_at
        `

        const agendamentoInfo = agendamentos[0]
        console.log('🎉 Agendamento criado! ID:', agendamentoInfo.id)

        // 🎯 RESPOSTA ORGANIZADA PARA O FRONTEND
        const response = {
            success: true,
            message: usuarioCriadoAgora 
                ? 'Usuário criado e agendamento realizado com sucesso!' 
                : 'Agendamento realizado com sucesso!',
            
            // 📊 DADOS DO AGENDAMENTO
            agendamento: {
                id: agendamentoInfo.id,
                client_id: agendamentoInfo.client_id,
                client_name: agendamentoInfo.client_name,
                client_phone: agendamentoInfo.client_phone,
                service: agendamentoInfo.service,
                inicio: agendamentoInfo.inicio,
                fim: agendamentoInfo.fim,
                status: agendamentoInfo.status,
                created_at: agendamentoInfo.created_at,
                
                // 📅 INFORMAÇÕES ÚTEIS
                duracao_minutos: Math.round(
                    (new Date(agendamentoInfo.fim) - new Date(agendamentoInfo.inicio)) 
                    / (1000 * 60)
                ),
                data_formatada: new Date(agendamentoInfo.inicio).toLocaleDateString('pt-BR'),
                hora_formatada: new Date(agendamentoInfo.inicio).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                })
            },
            
            // 👤 DADOS DO USUÁRIO
            usuario: {
                id: usuarioInfo.id,
                name: usuarioInfo.name,
                telefone: usuarioInfo.telefone,
                email: usuarioInfo.email,
                created_at: usuarioInfo.created_at,
                novo_usuario: usuarioCriadoAgora,
                mensagem: usuarioCriadoAgora 
                    ? 'Sua conta foi criada automaticamente!'
                    : 'Bem-vindo de volta!'
            },
            
            // ⚙️ METADADOS
            metadata: {
                timestamp: new Date().toISOString(),
                usuario_criado: usuarioCriadoAgora,
                agendamento_id: agendamentoInfo.id,
                usuario_id: usuarioInfo.id
            },
            
            // 📱 INFORMAÇÕES PARA O CLIENTE
            cliente_info: {
                titulo: 'Agendamento Confirmado! ✅',
                resumo: `${service || 'Serviço'} agendado para ${new Date(inicio).toLocaleDateString('pt-BR')}`,
                lembrete: 'Você receberá um lembrete 24h antes do horário.',
                contato_suporte: 'Em caso de dúvidas, entre em contato: (11) 99999-9999'
            }
        }

        return res.status(201).json(response)

    } catch (error) {
        console.error('❌ ERRO DETALHADO:')
        console.error('Mensagem:', error.message)
        console.error('Código:', error.code)
        console.error('Detalhe:', error.detail)
        
        // 🚨 RESPOSTA DE ERRO ORGANIZADA
        const errorResponse = {
            success: false,
            error: 'Falha ao processar agendamento',
            
            // 💻 DETALHES TÉCNICOS (apenas em desenvolvimento)
            debug: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                code: error.code,
                hint: error.hint
            } : undefined,
            
            // 📋 MENSAGENS AMIGÁVEIS
            user_message: this.getUserFriendlyMessage(error),
            suggestion: 'Verifique os dados e tente novamente',
            
            // 🔧 AÇÕES SUGERIDAS
            actions: [
                'Verifique se todos os campos obrigatórios foram preenchidos',
                'Confirme se o horário está disponível',
                'Entre em contato com o suporte se o erro persistir'
            ]
        }

        return res.status(500).json(errorResponse)
    }
}

// 🎯 FUNÇÃO AUXILIAR PARA MENSAGENS AMIGÁVEIS
exports.getUserFriendlyMessage = (error) => {
    const errorMap = {
        '23505': 'Já existe um registro com estas informações',
        '23503': 'Erro de referência - cliente não encontrado',
        '22007': 'Formato de data/hora inválido',
        '42703': 'Erro interno - campo não encontrado',
        '23502': 'Campo obrigatório não preenchido'
    }
    
    return errorMap[error.code] || 'Ocorreu um erro inesperado. Tente novamente.'
}