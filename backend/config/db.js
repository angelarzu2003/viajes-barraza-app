const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASS     || '',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
});

// Verificar conexión al iniciar
pool.getConnection()
  .then(conn => {
    console.log('🗄️   MySQL conectado —', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('❌  Error MySQL:', err.message);
  });

module.exports = pool;
