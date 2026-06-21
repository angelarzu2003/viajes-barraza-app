const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/viajes.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken); // Protegemos todas las rutas de viajes

router.get('/', ctrl.obtenerViajes);
router.post('/', ctrl.crearViaje);
router.delete('/:id', ctrl.eliminarViaje);

module.exports = router;