const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 1. OBTENER Y GUARDAR DÍAS DE ALERTA
router.get('/alertas', verificarToken, soloAdmin, async (req, res) => {
    try {
        // Intentamos crear la tabla si no existe
        await db.query('CREATE TABLE IF NOT EXISTS configuracion (id INT PRIMARY KEY, dias_alerta INT DEFAULT 90)');
        await db.query('INSERT IGNORE INTO configuracion (id, dias_alerta) VALUES (1, 90)');

        const [rows] = await db.query('SELECT dias_alerta FROM configuracion WHERE id = 1');
        res.json(rows[0] || { dias_alerta: 90 });
    } catch(err) { 
        console.error("❌ Error interno al OBTENER alertas:", err);
        res.status(500).json({ error: 'Error obteniendo alertas' }); 
    }
});

router.put('/alertas', verificarToken, soloAdmin, async (req, res) => {
    console.log("📥 Petición para cambiar días de alerta a:", req.body.dias);
    try {
        // Blindaje extra por si el GET falló
        await db.query('CREATE TABLE IF NOT EXISTS configuracion (id INT PRIMARY KEY, dias_alerta INT DEFAULT 90)');
        await db.query('INSERT IGNORE INTO configuracion (id, dias_alerta) VALUES (1, 90)');

        await db.query('UPDATE configuracion SET dias_alerta = ? WHERE id = 1', [req.body.dias]);
        
        console.log("✅ Días de alerta actualizados en la base de datos.");
        res.json({ message: 'Parámetros actualizados' });
    } catch(err) { 
        console.error("❌ Error interno al GUARDAR alertas:", err);
        res.status(500).json({ error: 'Error guardando alertas' }); 
    }
});

// 2. CALCULAR ESPACIO EN LA BÓVEDA
router.get('/almacenamiento', verificarToken, soloAdmin, (req, res) => {
    const uploadsPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsPath)) {
        return res.json({ megabytes: '0.00', porcentaje: '0.0' });
    }

    fs.readdir(uploadsPath, (err, files) => {
        if (err) {
            console.error("❌ Error leyendo carpeta uploads:", err);
            return res.status(500).json({ error: 'Error leyendo bóveda' });
        }
        let totalBytes = 0;
        files.forEach(file => {
            const stats = fs.statSync(path.join(uploadsPath, file));
            totalBytes += stats.size;
        });
        const megabytes = (totalBytes / (1024 * 1024)).toFixed(2);
        const porcentaje = Math.min((megabytes / 2048) * 100, 100).toFixed(1);
        res.json({ megabytes, porcentaje });
    });
});

// 3. GENERAR EL RESPALDO (.SQL)
router.get('/backup', verificarToken, soloAdmin, (req, res) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Respaldo_VB_${timestamp}.sql`;
    const backupPath = path.join(__dirname, '../', fileName);

    const comandoXAMPP = `C:\\xampp\\mysql\\bin\\mysqldump -u root viajes_barraza > "${backupPath}"`;
    const comandoGenerico = `mysqldump -u root viajes_barraza > "${backupPath}"`;

    exec(comandoXAMPP, (error) => {
        if (error) {
            exec(comandoGenerico, (err2) => {
                if (err2) {
                    console.error("❌ Error al empaquetar BD:", err2);
                    return res.status(500).json({ error: 'No se pudo empaquetar la base de datos.' });
                }
                res.download(backupPath, fileName, () => fs.unlinkSync(backupPath));
            });
        } else {
            res.download(backupPath, fileName, () => fs.unlinkSync(backupPath));
        }
    });
});

module.exports = router;