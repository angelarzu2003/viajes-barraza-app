const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');

// ¡Importamos tus dos guardias de seguridad!
const { verificarToken, soloAdmin } = require('../middlewares/auth.middleware');

// Inyectamos verificarToken Y soloAdmin en la ruta
router.post('/registrar', verificarToken, soloAdmin, async (req, res) => {
    const { username, email, password, rol } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Convertimos a minúsculas por si el frontend manda 'Administrador'
        const rolFinal = rol.toLowerCase() === 'administrador' ? 'admin' : 'empleado';

        await db.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, 1)',
            [username, email, hashedPassword, rolFinal]
        );
        
        res.status(201).json({ message: 'Usuario creado exitosamente' });
    } catch (err) {
        console.error("Error al registrar usuario:", err);
        res.status(500).json({ message: 'Error en el servidor al crear usuario' });
    }
});

// Ruta para actualizar Mi Perfil
router.put('/perfil', verificarToken, async (req, res) => {
    const { username, email, password } = req.body;
    
    // El middleware nos dejó los datos del usuario en req.usuario
    const userId = req.usuario.id; 
    const identificador = userId ? 'id' : 'email'; // Blindaje por si tu token no guarda el ID
    const valorIdentificador = userId || req.usuario.email;

    try {
        if (password && password.trim() !== '') {
            // Si escribió una contraseña nueva, la encriptamos y la guardamos
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.query(
                `UPDATE usuarios SET nombre = ?, email = ?, password_hash = ? WHERE ${identificador} = ?`,
                [username, email, hashedPassword, valorIdentificador]
            );
        } else {
            // Si la dejó en blanco, solo actualizamos nombre y correo
            await db.query(
                `UPDATE usuarios SET nombre = ?, email = ? WHERE ${identificador} = ?`,
                [username, email, valorIdentificador]
            );
        }
        res.json({ message: 'Perfil actualizado' });
    } catch (err) {
        console.error("❌ Error actualizando perfil:", err);
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});


module.exports = router;