// backend/routes/clientes.routes.js
const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/clientes.controller');
const { verificarToken } = require('../middlewares/auth.middleware'); // <-- Cambiado a español

// Todas las rutas requieren JWT válido
router.use(verificarToken); // <-- Cambiado a español

router.get('/',        ctrl.getAll);       // GET    /api/clientes
router.get('/:id',     ctrl.getOne);       // GET    /api/clientes/:id
router.post('/',       ctrl.create);       // POST   /api/clientes
router.put('/:id',     ctrl.update);       // PUT    /api/clientes/:id
router.delete('/:id',  ctrl.remove);       // DELETE /api/clientes/:id

module.exports = router;