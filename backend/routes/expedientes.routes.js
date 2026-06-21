const router = require('express').Router();
router.get('/', (req, res) => res.json({ ruta: 'expedientes - pendiente' }));
module.exports = router;
