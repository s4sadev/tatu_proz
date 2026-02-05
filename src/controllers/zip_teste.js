const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal"); // Já parece que você tem este
const QRCode = require('qrcode')



async function connectToWhatsApp() {
  console.log("🔄 Iniciando conexão WhatsApp...");

  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Desative o QR padrão do Baileys
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr } = update || {};

    if (qr) {
      console.log("\n" + "=".repeat(50));
      console.log("📱 ESCANEIE O QR CODE NO SEU WHATSAPP");
      console.log("=".repeat(50) + "\n");
      
      // Usando qrcode-terminal

      gerarQRimg(qr)
      console.log(qrI)
      console.log("\n" + "=".repeat(50));
      console.log("⚠️  QR Code expira em 20 segundos!");
      console.log("=".repeat(50));
    }

    if (connection === "open") {
      console.log("\n✅ CONECTADO COM SUCESSO!");
      console.log(`👤 Usuário: ${sock.user?.name || "Não identificado"}`);
      console.log(`📱 Número: ${sock.user?.id}`);
      
      // Envia mensagem de confirmação para você mesmo
      const myNumber = sock.user.id;
      sock.sendMessage(myNumber, { 
        text: "🤖 Bot conectado com sucesso!\n" + 
              `Data: ${new Date().toLocaleString()}` 
      }).then(() => {
        console.log("📨 Mensagem de confirmação enviada!");
      });
    }

    if (connection === "close") {
      console.log("🔌 Conexão fechada. Tentando reconectar em 5s...");
      setTimeout(connectToWhatsApp, 5000);
    }
  });

  // Receber mensagens
  sock.ev.on("messages.upsert", ({ messages }) => {
    const msg = messages[0];
    if (!msg.key.fromMe && msg.message) {
      console.log("\n📩 NOVA MENSAGEM:");
      console.log(`De: ${msg.pushName || "Desconhecido"}`);
      console.log(`Texto: ${msg.message.conversation || "Mídia ou outro tipo"}`);
    }
  });
}

// Limpar sessão anterior e iniciar
const fs = require('fs');
if (fs.existsSync('./auth_info_baileys')) {
  console.log("🧹 Limpando sessão anterior...");
  fs.rmSync('./auth_info_baileys', { recursive: true, force: true });
}

connectToWhatsApp().catch(err => {
  console.error("❌ Erro:", err.message);
});


async function gerarQRimg(qr) {
  const img = await QRCode.toDataURL(qr)
  return img
}