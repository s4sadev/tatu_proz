const sql = require('../config/db')

// criar usuario
const User = {
    async create(userData){
        const {email, senha} = userData
        const result = await sql`
            INSERT INTO users (name, email, senha)
            VALUES (${name}, ${email}, ${senha})
            RETURNING id, name, email, created_at
        `;

        return[0]
    },

    async findByEmail(email){
        const result = await sql `
        SELECT * FROM usuarios
        WHERE email = ${email}
        `;
        return result[0]
    },

    async findById(id){
        const result = await sql`
        SELECT id, name, email, created_at
        FROM usuarios
        WHERE id = ${id}
        `
        
        return result[0]
    }
}

// 
modelue.exports = User;