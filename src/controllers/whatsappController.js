const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const qrterminal = require('qrcode-terminal') 

// Variável global para armazenar a instância do socket
let sock = null;
let qrCodeData = null;
let connectionState = null
exports.initializeWhatsApp = async () => {
    try {
        if (sock && connectionState !== 'DISCONNECTED') {
            return sock;
        }

        connectionState = 'CONNECTING';

        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.macOS('Chrome'),
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, qr } = update;

            if (qr) {
                qrCodeData = qr;
                connectionState = 'WAITING_QR';
                qrterminal.generate(qr, { small: true });
            }

            if (connection === 'open') {
                qrCodeData = null;
                connectionState = 'CONNECTED';
            }

            if (connection === 'close') {
                const wasConnected = connectionState === 'CONNECTED'

                sock = null;
                qrCodeData = null;
                connectionState = 'DISCONNECTED';
            
                if(!wasConnected){
                    const authPath = path.resolve('./auth_info')
                            if (fs.existsSync(authPath)) {
                                fs.rmSync(authPath, { recursive: true, force: true });
                                console.log('Auth info removido para gerar novo QR');
                            }
                }
            
            }
        });

        sock.ev.on('creds.update', saveCreds);

        return sock;
    } catch (error) {
        connectionState = 'DISCONNECTED';
        throw error;
    }
};


// ROTA para obter o QR code
exports.getQr = async (req, res) => {
    try {
        if (!qrCodeData) {
            // Se não há QR code disponível, pode ser que já esteja conectado
            if (sock && sock.user) {
                return res.status(200).json({ 
                    message: 'WhatsApp já está conectado',
                    user: sock.user
                });
            }
            
            // Inicializa se não estiver
            if (!sock) {
                await exports.initializeWhatsApp();
            }
            
            return res.status(202).json({ 
                message: 'Aguardando QR code...',
                qrCode: null 
            });
        }
        
        // Gera o QR code como imagem base64
        const qrImage = await qrcode.toDataURL(qrCodeData);
        
        res.json({ 
            qrCode: qrImage,
            rawQr: qrCodeData // Opcional: também retorna o raw para outros usos
        });
    } catch (error) {
        console.error('Erro ao gerar QR code:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar QR code',
            details: error.message 
        });
    }
};

// Verificar status da conexão
exports.getStatus = (req, res) => {
    try {
        res.json({  
            state: connectionState,
            user: connectionState === 'CONNECTED' ? sock?.user : null,
            hasQr: connectionState === 'WAITING_QR'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Encerrar conexão
exports.logout = async (req, res) => {
    try {
        if (sock) {
            try {
                await sock.logout(); // tenta avisar o WhatsApp
            } catch (e) {
                // se já estiver fechado, ignora
            }

            // 🔴 ISSO é o que estava faltando
            sock.user = null;
        }

        // limpa estado global
        sock = null;
        qrCodeData = null;
        connectionState = 'DISCONNECTED'

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
