const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken } = require('../middlewares/auth.middleware');

router.use(verificarToken);

router.get('/ubicaciones', async (req, res) => {
    try {
        const [clientes] = await db.query(
            'SELECT id, nombre, apellidos, ciudad, estado FROM clientes WHERE ciudad IS NOT NULL AND ciudad != ""'
        );
        
        // Agregamos fecha_salida y fecha_regreso a la petición
        const [viajes] = await db.query(
            `SELECT v.id, v.destino, v.fecha_salida, v.fecha_regreso, v.estatus, c.nombre, c.apellidos 
             FROM viajes v 
             JOIN clientes c ON v.cliente_id = c.id 
             WHERE v.estatus IN ('Confirmado', 'En curso')`
        );

        res.json({ clientes, viajes });
    } catch (err) {
        console.error('[Mapa] Error al traer ubicaciones:', err);
        res.status(500).json({ message: 'Error interno al generar datos del mapa' });
    }
});

module.exports = router;