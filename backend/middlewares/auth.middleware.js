const jwt    = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'cambiar_esto_en_env';

const verificarToken = (req, res, next) => {
  const header = req.headers['authorization'];
  if (!header) {
    console.log("❌ Seguridad: No llegó el token desde el navegador.");
    return res.status(401).json({ ok: false, error: 'Token requerido' });
  }

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;

  try {
    req.usuario = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    // 👇 AQUÍ ESTÁ EL CHISMOSO 👇
    console.log("❌ Seguridad: El token fue rechazado. Razón:", err.message);
    res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
};

const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol !== 'admin') {
    console.log("❌ Seguridad: Bloqueado por no ser Admin. Rol que intentó entrar:", req.usuario?.rol);
    return res.status(403).json({ ok: false, error: 'Acceso solo para administradores' });
  }
  next();
};

module.exports = { verificarToken, soloAdmin };