/* =================================================================

    Integração com o Banco de Dados (Backend)

====================================================================*/

require('dotenv').config();
const sql = require('mssql');

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: '127.0.0.1',
    database: process.env.DB_NAME,
    port: 1435,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false, 
        trustServerCertificate: true 
    }
};

const poolPromise = new sql.ConnectionPool(sqlConfig)
    .connect()
    .then(pool => {
        console.log(' Conectado ao SQL Server com sucesso!');
        return pool;
    })
    .catch(err => {
        console.error(' Falha na conexão com o Banco de Dados:', err);
        process.exit(1);
    });

module.exports = {
    sql, poolPromise
};