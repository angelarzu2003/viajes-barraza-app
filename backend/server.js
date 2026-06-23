// ── 1. Variables de entorno y BD ──────────────────────────────
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
require('./config/db');
 
// ── 2. Módulos ────────────────────────────────────────────────
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
// ── 3. Middlewares PRIMERO (siempre antes de las rutas) ───────
app.use(helmet());
app.use(cors({
  origin: ['http://localhost', 'http://127.0.0.1', 'http://134.209.70.88'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
 
// ── 4. Rutas DESPUÉS de los middlewares (una sola vez cada una)
app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/clientes',    require('./routes/clientes.routes'));
app.use('/api/expedientes', require('./routes/expedientes.routes'));
app.use('/api/documentos',  require('./routes/documentos.routes'));
app.use('/api/alertas',     require('./routes/alertas.routes'));
app.use('/api/reportes',    require('./routes/reportes.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/viajes', require('./routes/viajes.routes'));
app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/mapa', require('./routes/mapa.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/configuracion', require('./routes/configuracion.routes'));
 
// ── 5. Ruta de prueba ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', mensaje: 'API ArchivoClientes — Viajes Barraza', version: '1.0.0' });
});
 
// ── 6. Manejo de errores global ───────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});
 
// ── 7. Arrancar ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋  API lista. Base de datos: ${process.env.DB_NAME}\n`);
});