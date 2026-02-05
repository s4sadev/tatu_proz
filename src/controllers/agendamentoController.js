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
                    ${client_phone}  
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
                'pendente'
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

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // 1. VERIFICA SE EXISTE (com await)
        const existe = await sql`
            SELECT * FROM agendamentos 
            WHERE id = ${id}
        `;

        // 2. Condição CORRETA: se NÃO existir, retorna erro
        if (existe.length === 0) {
            return res.status(404).json({  // 404 é mais apropriado
                success: false,
                message: 'Registro não encontrado!'
            });
        }

        // 3. Validação dos campos...
        const valid = {
            client_name: validaString,
            client_phone: validaPhone,
            client_service: validaString,
            inicio: validaData,
            fim: validaData,
            service: validaString,
            valor: validaValor,
            status: validaStatus
        };

        const updatesNew = {};
        
        for (const key in updates) {
            if (!valid[key]) {
                return res.status(400).json({
                    success: false,
                    message: 'Campo não existe',
                    field: key
                });
            }
            
            const result = valid[key](updates[key]);
            if (result == null) {
                return res.status(400).json({
                    success: false,
                    message: 'Valor inválido',
                    field: key,
                    value: updates[key]
                });
            }
            
            updatesNew[key] = result;
        }

        // 4. Se não há campos para atualizar
        if (Object.keys(updatesNew).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Nenhum campo válido para atualizar'
            });
        }

        // 5. Atualização (com verificação)
        const result = await sql`
            UPDATE agendamentos 
            SET ${sql(updatesNew, ...Object.keys(updatesNew))}
            WHERE id = ${id}
            RETURNING *
        `;

        // 6. Verifica se realmente atualizou
        if (result.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Registro não encontrado após tentativa de atualização'
            });
        }

        return res.json({
            success: true,
            message: 'Registro atualizado com sucesso',
            data: result[0]  // Agora existe
        });
        
    } catch(error) {
        console.error('Erro:', error);
        return res.status(500).json({  // Corrigi a sintaxe aqui também
            success: false,
            message: 'Erro ao atualizar registro'
        });
    }
};
// funções extras de validação
function validaString(name){
  if(typeof name != 'string'){ // retorno de typeof é string
      return false
    }
  else{
    return name
  }
} // retorna valor ou false
function validaValor(valor){
    if(!typeof(valor)=== 'number'){
        return false
    }else{
        return valor
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

function validaData(date){
    if (typeof date !== 'string') return false
    const newDate = new Date(date)
    if(isNaN(newDate.getTime())){
      return false
    }
    else {
      return newDate.toISOString()
    }
} // retorna valor ou false

function validaStatus(status){
  const list_status = ['pendente', 'concluido', 'cancelado']
  if(list_status.includes(status)){
    return status
  }
  else {
    return false
  }
}  // retorna valor ou false

exports.updateConfirm = async (req, res) => {
    try {
        const {id} = req.params
        //const update = req.body // pega o que vier
        
        // for (const key in update){
        //     if(key != "status"){
        //         return res.status(400).json({
        //             sucess: false,
        //             message: 'Deu bo amigo, esse campo nao existe'
        //     })
        //     }
        //     else if(update[key]!= 'CONCLUIDO'){
        //         return res.status(400).json({
        //         sucess: false,
        //         message: 'Deu bo amigo, status nao existe'
        //     })
        //     }
        // }

                // 1. VERIFICA SE EXISTE (com await)
        const existe = await sql`
            SELECT * FROM agendamentos 
            WHERE id = ${id}
        `;

        // 2. Condição CORRETA: se NÃO existir, retorna erro
        if (existe.length === 0) {
            return res.status(404).json({  // 404 é mais apropriado
                success: false,
                message: 'Registro não encontrado!'
            });
        }
        
            const result = await sql`
                UPDATE agendamentos 
                SET status = 'finalizado'
                WHERE id = ${id}
                RETURNING *
                
            `
            return res.json({
                sucess: true,
                message: 'Registro atualizado com sucesso',
                data: result[0]
            })

    }catch(error){
            return res.status(400).json({
            sucess: false,
            message: 'Erro ao confirmar agendamento'
            })
    }
}

exports.updateCancel = async (req, res) => {
    try {
        const {id} = req.params

        // 1. VERIFICA SE EXISTE (com await)
        const existe = await sql`
            SELECT * FROM agendamentos 
            WHERE id = ${id}
        `;

        // 2. Condição CORRETA: se NÃO existir, retorna erro
        if (existe.length === 0) {
            return res.status(404).json({  // 404 é mais apropriado
                success: false,
                message: 'Registro não encontrado!'
            });
        }

        // const update = req.body // pega o que vier
        
        // for (const key in update){
        //     if(key != "status"){
        //         return res.status(400).json({
        //             sucess: false,
        //             message: 'Deu bo amigo, esse campo nao existe'
        //     })
        //     }
        //     else if(update[key]!= 'cancelado'){
        //         return res.status(400).json({
        //         sucess: false,
        //         message: 'Deu bo amigo, status nao existe'
        //     })
        //     }
        // }

        
        const result = await sql`
            UPDATE agendamentos 
            SET status = 'cancelado'
            WHERE id = ${id}
            RETURNING *        
        `
            return res.json({
                sucess: true,
                message: 'Registro atualizado com sucesso',
                data: result[0]
            })

    }catch(error){
            return res.status(400).json({
            sucess: false,
            message: 'Erro ao confirmar agendamento'
            })
    }
}

exports.updatePendence = async (req, res) => {
    try {
        const {id} = req.params
        const update = req.body // pega o que vier
        
        for (const key in update){
            if(key != "status"){
                return res.status(400).json({
                    sucess: false,
                    message: 'Deu bo amigo, esse campo nao existe'
            })
            }
            else if(update[key]!= 'PENDETE'){
                return res.status(400).json({
                sucess: false,
                message: 'Deu bo amigo, status nao existe'
            })
            }
        }

        
            const result = await sql`
                UPDATE agendamentos 
                SET status = ${update['status']}
                WHERE id = ${id}
                RETURNING *
                
            `
            return res.json({
                sucess: true,
                message: 'Registro atualizado com sucesso',
                data: result[0]
            })

    }catch(error){
            return res.status(400).json({
            sucess: false,
            message: 'Erro ao confirmar agendamento'
            })
    }
}

exports.byStatus = async (req, res) => {
        try{
        const status_query = req.query

        const status_list = ['CONCLUIDO', 'PENDENTE', 'CANCELADO']

        const query_keys = Object.keys(status_query)
        
        if(query_keys[0] != 'status'){
            console.log(query_keys[0])
            return res.status(500).json({
                sucess: false,
                // count: result.length,
                message: `tem que ser STATUS`
            })
        }

        if(!status_list.includes(status_query['status'])){
                return res.status(500).json({
                sucess: false,
                // count: result.length,
                message: `tem que ser um status valido`
            })
        }

        const result = await sql`
        SELECT * FROM agendamentos
        WHERE status = ${status_query['status']}
        RETURNING *
        `

        return res.status(200).json({
            sucess: true,
            count: result.length,
            message: 'sem erro',
            data: result
        })

    }catch(error){
        console.error('erro ao buscar agendamentos', error)
        return res.status(500).json({
            sucess: false,
            error: `Erro ao buscar agendamentos` ,
            message: error.message
        })
    }
}

// ========== ROTAS FINANCEIRAS / DASHBOARD ==========

/**
 * GET /dashboard/summary
 * Cards do dashboard - números/resumo
 */
exports.dashboardSummary = async (req, res) => {
    try {
        const hoje = new Date()
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)

        // Total de receita (agendamentos finalizados com valor)
        const receitaTotal = await sql`
            SELECT COALESCE(SUM(COALESCE(valor, 0)), 0)::numeric(12,2) as total
            FROM agendamentos
            WHERE status IN ('finalizado', 'concluido')
              AND (valor IS NOT NULL AND valor > 0)
        `
        const receitaMes = await sql`
            SELECT COALESCE(SUM(COALESCE(valor, 0)), 0)::numeric(12,2) as total
            FROM agendamentos
            WHERE status IN ('finalizado', 'concluido')
              AND (valor IS NOT NULL AND valor > 0)
              AND inicio >= ${inicioMes}
              AND inicio <= ${fimMes}
        `

        // Contagem de agendamentos
        const totalAgendamentos = await sql`
            SELECT COUNT(*)::int as total FROM agendamentos
        `
        const agendamentosMes = await sql`
            SELECT COUNT(*)::int as total FROM agendamentos
            WHERE inicio >= ${inicioMes} AND inicio <= ${fimMes}
        `
        const pendentes = await sql`
            SELECT COUNT(*)::int as total FROM agendamentos WHERE status = 'pendente'
        `

        return res.json({
            success: true,
            summary: {
                receita_total: Number(receitaTotal[0]?.total ?? 0),
                receita_mes: Number(receitaMes[0]?.total ?? 0),
                total_agendamentos: totalAgendamentos[0]?.total ?? 0,
                agendamentos_mes: agendamentosMes[0]?.total ?? 0,
                pendentes: pendentes[0]?.total ?? 0
            },
            periodo: {
                mes_atual: inicioMes.toISOString().slice(0, 7),
                atualizado_em: new Date().toISOString()
            }
        })
    } catch (error) {
        console.error('Erro dashboard/summary:', error)
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar resumo do dashboard',
            message: error.message
        })
    }
}

/**
 * GET /finances/report
 * Tabela de transações - lista detalhada
 */
exports.financesReport = async (req, res) => {
    try {
        const { mes, ano, status, limit = 100, offset = 0 } = req.query
        const limite = Math.min(Number(limit) || 100, 500)
        const desloc = Math.max(Number(offset) || 0, 0)

        let transacoes
        let total

        if (mes && ano) {
            const inicio = new Date(Number(ano), Number(mes) - 1, 1)
            const fim = new Date(Number(ano), Number(mes), 0, 23, 59, 59)
            if (status) {
                transacoes = await sql`
                    SELECT id, client_name, client_phone, service, valor, status, inicio, fim, created_at
                    FROM agendamentos
                    WHERE inicio >= ${inicio} AND inicio <= ${fim} AND status = ${status}
                    ORDER BY inicio DESC
                    LIMIT ${limite}
                    OFFSET ${desloc}
                `
                const count = await sql`
                    SELECT COUNT(*)::int as total FROM agendamentos
                    WHERE inicio >= ${inicio} AND inicio <= ${fim} AND status = ${status}
                `
                total = count[0]?.total ?? 0
            } else {
                transacoes = await sql`
                    SELECT id, client_name, client_phone, service, valor, status, inicio, fim, created_at
                    FROM agendamentos
                    WHERE inicio >= ${inicio} AND inicio <= ${fim}
                    ORDER BY inicio DESC
                    LIMIT ${limite}
                    OFFSET ${desloc}
                `
                const count = await sql`
                    SELECT COUNT(*)::int as total FROM agendamentos
                    WHERE inicio >= ${inicio} AND inicio <= ${fim}
                `
                total = count[0]?.total ?? 0
            }
        } else if (status) {
            transacoes = await sql`
                SELECT id, client_name, client_phone, service, valor, status, inicio, fim, created_at
                FROM agendamentos
                WHERE status = ${status}
                ORDER BY inicio DESC
                LIMIT ${limite}
                OFFSET ${desloc}
            `
            const count = await sql`SELECT COUNT(*)::int as total FROM agendamentos WHERE status = ${status}`
            total = count[0]?.total ?? 0
        } else {
            transacoes = await sql`
                SELECT id, client_name, client_phone, service, valor, status, inicio, fim, created_at
                FROM agendamentos
                ORDER BY inicio DESC
                LIMIT ${limite}
                OFFSET ${desloc}
            `
            const count = await sql`SELECT COUNT(*)::int as total FROM agendamentos`
            total = count[0]?.total ?? 0
        }

        return res.json({
            success: true,
            data: transacoes.map(t => ({
                ...t,
                valor: t.valor != null ? Number(t.valor) : null,
                data_formatada: t.inicio ? new Date(t.inicio).toLocaleDateString('pt-BR') : null
            })),
            total,
            limit: limite,
            offset: desloc
        })
    } catch (error) {
        console.error('Erro finances/report:', error)
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar relatório financeiro',
            message: error.message
        })
    }
}

/**
 * GET /finances/chart
 * Dados para gráficos - arrays prontos para uso
 */
exports.financesChart = async (req, res) => {
    try {
        const { meses = 6 } = req.query
        const n = Math.min(Math.max(Number(meses) || 6, 1), 24)

        const inicio = new Date()
        inicio.setMonth(inicio.getMonth() - n)
        inicio.setDate(1)
        inicio.setHours(0, 0, 0, 0)

        const porMes = await sql`
            SELECT
                DATE_TRUNC('month', inicio)::date as mes,
                COUNT(*)::int as quantidade,
                COALESCE(SUM(COALESCE(valor, 0)), 0)::numeric(12,2) as receita
            FROM agendamentos
            WHERE inicio >= ${inicio}
            GROUP BY DATE_TRUNC('month', inicio)
            ORDER BY mes ASC
        `

        const labels = porMes.map(r => {
            const d = new Date(r.mes)
            return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        })
        const receitaPorMes = porMes.map(r => Number(r.receita))
        const quantidadePorMes = porMes.map(r => r.quantidade)

        // Por status (para pizza/do nut)
        const porStatus = await sql`
            SELECT status, COUNT(*)::int as total
            FROM agendamentos
            WHERE created_at >= ${inicio}
            GROUP BY status
        `

        return res.json({
            success: true,
            chart: {
                labels,
                datasets: {
                    receita: receitaPorMes,
                    quantidade: quantidadePorMes
                }
            },
            por_status: porStatus.reduce((acc, r) => ({ ...acc, [r.status]: r.total }), {}),
            periodo_meses: n
        })
    } catch (error) {
        console.error('Erro finances/chart:', error)
        return res.status(500).json({
            success: false,
            error: 'Erro ao buscar dados para gráficos',
            message: error.message
        })
    }
}

/**
 * GET /finances/export-pdf
 * Download de PDF - relatório financeiro
 */
exports.financesExportPdf = async (req, res) => {
    try {
        const PDFDocument = require('pdfkit')
        const doc = new PDFDocument({ margin: 50 })
        const transacoes = await sql`
            SELECT id, client_name, service, valor, status, inicio
            FROM agendamentos
            ORDER BY inicio DESC
            LIMIT 200
        `

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'attachment; filename=relatorio-financeiro.pdf')

        doc.pipe(res)

        doc.fontSize(18).text('Relatório Financeiro - TATU', { align: 'center' })
        doc.moveDown()
        doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
        doc.moveDown(2)

        const receitaTotal = transacoes
            .filter(t => ['finalizado', 'concluido'].includes(t.status) && t.valor != null)
            .reduce((s, t) => s + Number(t.valor), 0)

        doc.fontSize(12).text(`Resumo: ${transacoes.length} registros | Receita (finalizados): R$ ${receitaTotal.toFixed(2)}`)
        doc.moveDown(2)

        const colY = doc.y
        doc.fontSize(10)
        doc.text('ID', 50, colY)
        doc.text('Cliente', 95, colY)
        doc.text('Serviço', 220, colY)
        doc.text('Valor', 325, colY)
        doc.text('Status', 390, colY)
        doc.text('Data', 465, colY)
        doc.moveDown(1)

        transacoes.forEach(t => {
            if (doc.y > 700) {
                doc.addPage()
                doc.y = 50
            }
            const rowY = doc.y
            doc.fontSize(9)
            doc.text(String(t.id), 50, rowY)
            doc.text((t.client_name || '-').slice(0, 18), 95, rowY)
            doc.text((t.service || '-').slice(0, 14), 220, rowY)
            doc.text(t.valor != null ? `R$ ${Number(t.valor).toFixed(2)}` : '-', 325, rowY)
            doc.text(t.status || '-', 390, rowY)
            doc.text(t.inicio ? new Date(t.inicio).toLocaleDateString('pt-BR') : '-', 465, rowY)
            doc.y = rowY + 18
        })

        doc.end()
    } catch (error) {
        console.error('Erro finances/export-pdf:', error)
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                error: 'Erro ao gerar PDF',
                message: error.message
            })
        }
    }
}