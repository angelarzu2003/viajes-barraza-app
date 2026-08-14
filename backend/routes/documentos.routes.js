const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/documentos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Configuración de multer para RAM
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // Límite de 10 MB
});

// 1. RUTAS PÚBLICAS O CON AUTENTICACIÓN PERSONALIZADA
router.get('/:id/ver', ctrl.verDocumento);

// 2. BARRERA DE SEGURIDAD
// Todo lo que esté debajo de esta línea pedirá Token obligatorio en el Header
router.use(verificarToken);

// 3. RUTAS PROTEGIDAS
router.post('/', upload.single('archivo'), ctrl.subirDocumento);
router.get('/', ctrl.obtenerDocumentos);
router.delete('/:id', ctrl.eliminarDocumento);

// Usamos 'ctrl' en lugar de 'documentosController'
router.get('/clientes/:clienteId/acompanantes', ctrl.obtenerAcompanantesCliente);

module.exports = router;