require('dotenv').config()
const nodemailer = require('nodemailer')

async function test() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_USER,
    subject: 'Teste local Nodemailer',
    text: 'Se chegou, está tudo certo!'
  })

  console.log('ENVIADO:', info)
}

test().catch(console.error)
