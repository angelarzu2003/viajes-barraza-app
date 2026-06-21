// backend/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

//const JWT_SECRET  = process.env.JWT_SECRET;   // Definido en .env
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h'; // Sesión de 8 horas

/* ─────────────────────────────────────────
   POST /api/auth/login
   Body: { email, password }
───────────────────────────────────────── */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // 1. Validar que vengan los campos
  if (!email || !password) {
    return res.status(400).json({ message: 'Correo y contraseña son requeridos.' });
  }

  try {
    // 2. Buscar al usuario en la BD
    const [rows] = await db.query(
      'SELECT id, nombre, email, password_hash, rol, activo FROM usuarios WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    const usuario = rows[0];

    // 3. Si no existe o está inactivo
    if (!usuario) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ message: 'Tu cuenta está desactivada. Contacta al administrador.' });
    }

    // 4. Comparar contraseña con el hash almacenado
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    // 5. Generar JWT
    const secretKey = process.env.JWT_SECRET || 'llave_secreta_temporal_de_emergencia_2026';

    const payload = {
      id:     usuario.id,
      nombre: usuario.nombre,
      email:  usuario.email,
      rol:    usuario.rol
};

    const token = jwt.sign(payload, secretKey, { expiresIn: JWT_EXPIRES });

    // 6. Responder con token y datos públicos del usuario
    return res.status(200).json({
      message: 'Login exitoso.',
      token,
      usuario: {
        id:     usuario.id,
        nombre: usuario.nombre,
        email:  usuario.email,
        rol:    usuario.rol
      }
    });

  } catch (err) {
    console.error('[Auth] Error en login:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/* ─────────────────────────────────────────
   POST /api/auth/logout
   (El token se invalida en el cliente;
    aquí puedes añadir blacklist si lo necesitas)
───────────────────────────────────────── */
exports.logout = (req, res) => {
  // El cliente borra el token de localStorage.
  // Si necesitas blacklist de tokens, agrégalo aquí.
  return res.status(200).json({ message: 'Sesión cerrada correctamente.' });
};

/* ─────────────────────────────────────────
   GET /api/auth/me
   Devuelve el usuario actual (requiere token válido)
───────────────────────────────────────── */
exports.me = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, email, rol, creado_en FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    return res.status(200).json({ usuario: rows[0] });

  } catch (err) {
    console.error('[Auth] Error en /me:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};

/* ─────────────────────────────────────────
   POST /api/auth/registro
   Crea un nuevo usuario (Solo Admin)
───────────────────────────────────────── */
exports.registro = async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ message: 'Nombre, correo y contraseña son requeridos.' });
  }

  try {
    // Encriptamos la contraseña del nuevo usuario
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insertamos en la base de datos
    await db.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, 1)',
      [nombre, email.toLowerCase().trim(), passwordHash, rol || 'user']
    );

    return res.status(201).json({ message: 'Usuario registrado con éxito.' });
  } catch (err) {
    console.error('[Auth] Error en registro:', err);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};