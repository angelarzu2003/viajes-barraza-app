const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = (process.env.ENCRYPTION_KEY || 'LlaveSecretaProvisionalViajes2024').padEnd(32, '0').slice(0, 32);

exports.obtenerDossierCliente = async (req, res) => {
    const { id } = req.params;
    try {
        const [clienteInfo] = await db.query('SELECT * FROM clientes WHERE id = ?', [id]);
        if (clienteInfo.length === 0) return res.status(404).json({ message: 'Cliente no encontrado' });

        const [documentos] = await db.query(
            'SELECT tipo, nombre_original, fecha_vencimiento, subido_en, ruta_cifrada, iv_hex FROM documentos WHERE cliente_id = ? ORDER BY subido_en DESC', 
            [id]
        );

        const documentosFormateados = documentos.map(d => {
            let base64Img = null;
            const ext = d.nombre_original ? d.nombre_original.split('.').pop().toLowerCase() : '';

            // AHORA TAMBIÉN INCLUIMOS 'pdf' EN LA LISTA DE DESCIFRADO
            if (['jpg', 'jpeg', 'png', 'pdf'].includes(ext) && d.ruta_cifrada && d.iv_hex) {
                try {
                    const filePath = path.join(__dirname, '../uploads', d.ruta_cifrada);

                    if (fs.existsSync(filePath)) {
                        const encryptedData = fs.readFileSync(filePath);
                        const keyBuffer = Buffer.from(SECRET_KEY);
                        const ivBuffer = Buffer.from(d.iv_hex, 'hex');

                        const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
                        const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
                        
                        // Detectamos si es PDF o Imagen para mandarlo correctamente
                        const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'png' ? 'png' : 'jpeg'}`;
                        base64Img = `data:${mimeType};base64,${decrypted.toString('base64')}`;
                    }
                } catch (error) {
                    console.error(`[Reportes] Error descifrando ${d.nombre_original}:`, error.message);
                }
            }

            return {
                tipo: d.tipo,
                nombre_original: d.nombre_original,
                fecha_vencimiento: d.fecha_vencimiento,
                subido_en: d.subido_en,
                archivoBase64: base64Img 
            };
        });

        const [viajes] = await db.query('SELECT destino, fecha_salida, fecha_regreso, estatus FROM viajes WHERE cliente_id = ? ORDER BY fecha_salida DESC', [id]);

        return res.json({ cliente: clienteInfo[0], documentos: documentosFormateados, viajes: viajes });
    } catch (err) {
        console.error('[Reportes] Error:', err);
        return res.status(500).json({ message: 'Error interno al generar datos' });
    }
};