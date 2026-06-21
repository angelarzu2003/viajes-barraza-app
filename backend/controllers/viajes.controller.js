const db = require('../config/db');

// Obtener todos los viajes (con info del cliente)
exports.obtenerViajes = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT v.*, c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos 
      FROM viajes v
      JOIN clientes c ON v.cliente_id = c.id
      ORDER BY v.fecha_salida ASC
    `);
    return res.json({ viajes: rows });
  } catch (err) {
    console.error('[Viajes] Error al obtener:', err);
    return res.status(500).json({ message: 'Error al obtener viajes.' });
  }
};

// Crear un viaje nuevo
exports.crearViaje = async (req, res) => {
  const { cliente_id, destino, fecha_salida, fecha_regreso, presupuesto, estatus, notas } = req.body;
  
  if (!cliente_id || !destino) {
    return res.status(400).json({ message: 'Cliente y destino son obligatorios.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO viajes (cliente_id, destino, fecha_salida, fecha_regreso, presupuesto, estatus, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cliente_id, destino, fecha_salida || null, fecha_regreso || null, presupuesto || 0, estatus || 'Cotizando', notas || '']
    );
    return res.status(201).json({ message: 'Viaje registrado exitosamente.', id: result.insertId });
  } catch (err) {
    console.error('[Viajes] Error al crear:', err);
    return res.status(500).json({ message: 'Error al crear el viaje.' });
  }
};

// Eliminar un viaje
exports.eliminarViaje = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM viajes WHERE id = ?', [id]);
    return res.json({ message: 'Viaje eliminado correctamente.' });
  } catch (err) {
    console.error('[Viajes] Error al eliminar:', err);
    return res.status(500).json({ message: 'Error al eliminar el viaje.' });
  }
};