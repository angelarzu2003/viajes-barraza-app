// backend/controllers/clientes.controller.js
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

/* ── Generar número de cliente único ── */
async function generarNumeroCliente() {
  const [rows] = await db.query('SELECT COUNT(*) AS total FROM clientes');
  const num = (rows[0].total + 1).toString().padStart(5, '0');
  return `VB-${num}`;
}

/* ─────────────────────────────────────────
   GET /api/clientes
   Lista todos los clientes activos
───────────────────────────────────────── */
exports.getAll = async (req, res) => {
  try {
    const { buscar, ciudad, activo } = req.query;

    let sql = `
      SELECT id, numero_cliente, nombre, apellidos, email,
             telefono, ciudad, estado, activo, creado_en
      FROM clientes
      WHERE 1=1
    `;
    const params = [];

    if (buscar) {
      sql += ` AND (nombre LIKE ? OR apellidos LIKE ? OR email LIKE ? OR numero_cliente LIKE ?)`;
      const like = `%${buscar}%`;
      params.push(like, like, like, like);
    }
    if (ciudad) {
      sql += ` AND ciudad = ?`;
      params.push(ciudad);
    }
    if (activo !== undefined) {
      sql += ` AND activo = ?`;
      params.push(activo === 'true' ? 1 : 0);
    }

    sql += ` ORDER BY creado_en DESC`;

    const [rows] = await db.query(sql, params);
    return res.json({ clientes: rows, total: rows.length });

  } catch (err) {
    console.error('[Clientes] getAll:', err);
    return res.status(500).json({ message: 'Error al obtener clientes.' });
  }
};

/* ─────────────────────────────────────────
   GET /api/clientes/:id
───────────────────────────────────────── */
exports.getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM clientes WHERE id = ?',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Cliente no encontrado.' });
    return res.json({ cliente: rows[0] });
  } catch (err) {
    console.error('[Clientes] getOne:', err);
    return res.status(500).json({ message: 'Error al obtener cliente.' });
  }
};

/* ─────────────────────────────────────────
   POST /api/clientes
───────────────────────────────────────── */
exports.create = async (req, res) => {
  const {
    nombre, apellidos, email, telefono,
    fecha_nacimiento, direccion, ciudad, estado, notas
  } = req.body;

  if (!nombre || !apellidos) {
    return res.status(400).json({ message: 'Nombre y apellidos son requeridos.' });
  }

  try {
    // Verificar email duplicado
    if (email) {
      const [dup] = await db.query('SELECT id FROM clientes WHERE email = ?', [email]);
      if (dup[0]) return res.status(409).json({ message: 'Ya existe un cliente con ese correo.' });
    }

    const numero_cliente = await generarNumeroCliente();

    const [result] = await db.query(
      `INSERT INTO clientes
        (numero_cliente, nombre, apellidos, email, telefono,
         fecha_nacimiento, direccion, ciudad, estado, notas,
         activo, creado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        numero_cliente, nombre, apellidos,
        email || null, telefono || null,
        fecha_nacimiento || null, direccion || null,
        ciudad || null, estado || null,
        notas || null, req.usuario.id
      ]
    );

    return res.status(201).json({
      message: 'Cliente creado correctamente.',
      id: result.insertId,
      numero_cliente
    });

  } catch (err) {
    console.error('[Clientes] create:', err);
    return res.status(500).json({ message: 'Error al crear cliente.' });
  }
};

/* ─────────────────────────────────────────
   PUT /api/clientes/:id
───────────────────────────────────────── */
exports.update = async (req, res) => {
  const {
    nombre, apellidos, email, telefono,
    fecha_nacimiento, direccion, ciudad, estado, notas, activo
  } = req.body;

  try {
    const [exists] = await db.query('SELECT id FROM clientes WHERE id = ?', [req.params.id]);
    if (!exists[0]) return res.status(404).json({ message: 'Cliente no encontrado.' });

    await db.query(
      `UPDATE clientes SET
        nombre = ?, apellidos = ?, email = ?, telefono = ?,
        fecha_nacimiento = ?, direccion = ?, ciudad = ?,
        estado = ?, notas = ?, activo = ?,
        actualizado_en = NOW()
       WHERE id = ?`,
      [
        nombre, apellidos, email || null, telefono || null,
        fecha_nacimiento || null, direccion || null,
        ciudad || null, estado || null,
        notas || null, activo !== undefined ? activo : 1,
        req.params.id
      ]
    );

    return res.json({ message: 'Cliente actualizado correctamente.' });

  } catch (err) {
    console.error('[Clientes] update:', err);
    return res.status(500).json({ message: 'Error al actualizar cliente.' });
  }
};

/* ─────────────────────────────────────────
   DELETE /api/clientes/:id
   (Borrado Definitivo + Destrucción de Archivos .enc)
───────────────────────────────────────── */
exports.remove = async (req, res) => {
  try {
    const id = req.params.id;

    // 1. Verificar si el cliente existe
    const [exists] = await db.query('SELECT id FROM clientes WHERE id = ?', [id]);
    if (!exists[0]) return res.status(404).json({ message: 'Cliente no encontrado.' });

    // 2. Buscar sus documentos encriptados y destruirlos del disco duro
    const [docs] = await db.query('SELECT ruta_cifrada FROM documentos WHERE cliente_id = ?', [id]);
    
    docs.forEach(doc => {
        const rutaArchivo = path.join(__dirname, '../uploads', doc.ruta_cifrada);
        if (fs.existsSync(rutaArchivo)) {
            fs.unlinkSync(rutaArchivo); // Borra el archivo físico
        }
    });

    // 3. Borrado definitivo de la base de datos
    await db.query('DELETE FROM clientes WHERE id = ?', [id]);

    return res.json({ message: 'Cliente y sus expedientes eliminados permanentemente.' });

  } catch (err) {
    console.error('[Clientes] remove:', err);
    return res.status(500).json({ message: 'Error al eliminar cliente y sus documentos.' });
  }
};