const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportes.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Protegemos todas las rutas de reportes
router.use(verificarToken);

// Ruta para obtener el dossier completo (datos, documentos y viajes)
router.get('/cliente/:id', ctrl.obtenerDossierCliente);

module.exports = router;