const router     = require('express').Router();
const controller = require('../controllers/auth.controller');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

router.post('/login',    controller.login);
router.post('/registro', verificarToken, soloAdmin, controller.registro);
router.get('/me',        verificarToken, controller.me);

module.exports = router;
