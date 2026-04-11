/* =================================================================

   Integração com o Banco de Dados (PostgreSQL - Railway)

====================================================================*/


require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect()
    .then(client => {
        console.log('✅ Conectado ao PostgreSQL no Railway com sucesso!');
        client.release(); 
    })
    .catch(err => {
        console.error('❌ Falha na conexão com o Banco de Dados:', err);
        process.exit(1);
    });

module.exports = { pool };