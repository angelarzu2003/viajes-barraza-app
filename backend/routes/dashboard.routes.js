const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboard.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken); // Protegemos la ruta
router.get('/resumen', ctrl.getResumen);

module.exports = router;