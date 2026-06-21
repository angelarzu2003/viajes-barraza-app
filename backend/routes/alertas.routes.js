const router = require('express').Router();
router.get('/', (req, res) => res.json({ ruta: 'alertas - pendiente' }));
module.exports = router;
