const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const ALGORITHM = 'aes-256-cbc';
// El algoritmo AES-256 exige una llave exacta de 32 caracteres. 
// La tomamos de tu .env, o usamos una provisional de 32 bytes ajustada automáticamente.
const SECRET_KEY = (process.env.ENCRYPTION_KEY || 'LlaveSecretaProvisionalViajes2024').padEnd(32, '0').slice(0, 32);

/* ─────────────────────────────────────────
   POST /api/documentos
   Recibe un archivo en RAM, lo encripta y guarda info en DB
───────────────────────────────────────── */
exports.subirDocumento = async (req, res) => {
  try {
    // req.file contiene el archivo en la memoria RAM gracias a multer
    if (!req.file) {
      return res.status(400).json({ message: 'No se detectó ningún archivo.' });
    }

    const { cliente_id, expediente_id, tipo, fecha_vencimiento, acompanantes } = req.body;
    
    if (!cliente_id) {
      return res.status(400).json({ message: 'El ID del cliente es obligatorio.' });
    }

    // 1. Generar Vector de Inicialización (IV) de 16 bytes
    const iv = crypto.randomBytes(16);
    
    // 2. Crear el encriptador y procesar el archivo desde la RAM
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    const encryptedBuffer = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);

    // 3. Inventar un nombre seguro para el archivo y guardarlo en el disco
    const nombreEncriptado = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.enc`;
    const rutaDestino = path.join(__dirname, '../uploads', nombreEncriptado);
    
    fs.writeFileSync(rutaDestino, encryptedBuffer);

    // 4. Guardar el documento en la base de datos
    const [result] = await db.query(
      `INSERT INTO documentos 
        (expediente_id, cliente_id, tipo, nombre_original, ruta_cifrada, iv_hex, fecha_vencimiento, subido_por) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expediente_id || null, 
        cliente_id, 
        tipo || 'Otro', 
        req.file.originalname, 
        nombreEncriptado, 
        iv.toString('hex'), 
        fecha_vencimiento || null, 
        req.usuario.id 
      ]
    );

    const documentoId = result.insertId;

    // 5. 👨‍👩‍👧‍👦 GUARDAR ACOMPAÑANTES (Si se enviaron desde el frontend)
    if (acompanantes) {
      try {
        const listaAcomp = JSON.parse(acompanantes);
        if (Array.isArray(listaAcomp) && listaAcomp.length > 0) {
          for (const acomp of listaAcomp) {
            if (acomp.nombre) {
              await db.query(
                `INSERT INTO acompanantes (documento_id, cliente_id, nombre, parentesco) VALUES (?, ?, ?, ?)`,
                [documentoId, cliente_id, acomp.nombre, acomp.parentesco || 'Acompañante']
              );
            }
          }
        }
      } catch (jsonErr) {
        console.error('[Acompañantes] Error al parsear JSON:', jsonErr);
      }
    }

    return res.status(201).json({ 
      message: 'Documento y acompañantes guardados exitosamente.',
      documento_id: documentoId 
    });

  } catch (err) {
    console.error('[Documentos] Error al subir y encriptar:', err);
    return res.status(500).json({ message: 'Error interno al procesar el documento.' });
  }
};
/* ─────────────────────────────────────────
   GET /api/documentos
   Obtiene la lista de documentos subidos
───────────────────────────────────────── */
exports.obtenerDocumentos = async (req, res) => {
  try {
    // Usamos LEFT JOIN desde 'clientes' para asegurar que salgan todos los activos
    const [rows] = await db.query(`
      SELECT c.id AS cliente_id, c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos,
             d.id AS doc_id, d.tipo, d.fecha_vencimiento, d.subido_en, d.nombre_original
      FROM clientes c
      LEFT JOIN documentos d ON c.id = d.cliente_id
      WHERE c.activo = 1
      ORDER BY c.nombre ASC, d.subido_en DESC
    `);
    
    return res.json({ documentos: rows });
  } catch (err) {
    console.error('[Documentos] Error al obtener:', err);
    return res.status(500).json({ message: 'Error en base de datos.' });
  }
};



exports.verDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT ruta_cifrada, iv_hex, nombre_original FROM documentos WHERE id = ?', [id]);
    
    if (rows.length === 0) return res.status(404).send('Documento no encontrado en la base de datos.');
    
    const doc = rows[0];
    const rutaArchivo = path.join(__dirname, '../uploads', doc.ruta_cifrada);
    
    if (!fs.existsSync(rutaArchivo)) return res.status(404).send('El archivo físico no existe en el disco duro.');

    // Preparar el desencriptador
    const iv = Buffer.from(doc.iv_hex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);

    // Tipos de archivo
    const ext = doc.nombre_original.split('.').pop().toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === 'pdf') mimeType = 'application/pdf';
    if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';

    // ENCABEZADOS DE RESPUESTA Y SEGURIDAD
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.nombre_original}"`);
    
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); 
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost *");
    res.removeHeader('X-Frame-Options');

    const readStream = fs.createReadStream(rutaArchivo);
    // 🪂 PARACAÍDAS: Si falla la lectura o la desencriptación, no apagues el servidor
    readStream.on('error', (err) => {
        console.error('[Stream Error] Error al leer el archivo:', err);
        if (!res.headersSent) res.status(500).send('Error interno al leer el archivo físico.');
    });

    decipher.on('error', (err) => {
        console.error('[Crypto Error] Fallo al desencriptar. Posible llave incorrecta:', err);
        if (!res.headersSent) res.status(500).send('Error de seguridad: No se pudo desencriptar el archivo.');
    });

    // Enviar el archivo a la pantalla
    readStream.pipe(decipher).pipe(res);

  } catch (err) {
    console.error('[Documentos] Error general en visor:', err);
    if (!res.headersSent) res.status(500).send('Error crítico en el servidor.');
  }
};



/* ─────────────────────────────────────────
   DELETE /api/documentos/:id
   Elimina un solo documento físico y su registro
───────────────────────────────────────── */
exports.eliminarDocumento = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Buscar la ruta del archivo encriptado
    const [rows] = await db.query('SELECT ruta_cifrada FROM documentos WHERE id = ?', [id]);
    
    if (rows.length === 0) {
        return res.status(404).json({ message: 'Documento no encontrado.' });
    }

    const doc = rows[0];
    const rutaArchivo = path.join(__dirname, '../uploads', doc.ruta_cifrada);

    // 2. Destruir el archivo físico del disco duro
    if (fs.existsSync(rutaArchivo)) {
        fs.unlinkSync(rutaArchivo);
    }

    // 3. Borrar el registro de la base de datos
    await db.query('DELETE FROM documentos WHERE id = ?', [id]);

    return res.json({ message: 'Documento eliminado permanentemente.' });

  } catch (err) {
    console.error('[Documentos] Error al eliminar documento:', err);
    return res.status(500).json({ message: 'Error interno al eliminar el documento.' });
  }
};

/* ─────────────────────────────────────────
   GET /api/documentos/clientes/:clienteId/acompanantes
   Obtiene los acompañantes guardados de un cliente
───────────────────────────────────────── */
exports.obtenerAcompanantesCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const [rows] = await db.query('SELECT * FROM acompanantes WHERE cliente_id = ?', [clienteId]);
    return res.json({ acompanantes: rows });
  } catch (err) {
    console.error('[Acompañantes] Error al obtener (posible tabla faltante):', err.message);
    return res.json({ acompanantes: [] });
  }
};

/* ─────────────────────────────────────────
   POST /api/documentos/clientes/:clienteId/acompanantes
   Guarda o actualiza los acompañantes de un cliente de forma independiente
───────────────────────────────────────── */
exports.guardarAcompanantesCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { acompanantes } = req.body;

    // 1. Borramos los acompañantes anteriores de este cliente
    await db.query('DELETE FROM acompanantes WHERE cliente_id = ?', [clienteId]);

    // 2. Si vienen acompañantes, los insertamos usando únicamente las columnas reales
    if (Array.isArray(acompanantes) && acompanantes.length > 0) {
      for (const acomp of acompanantes) {
        if (acomp.nombre && acomp.nombre.trim() !== '') {
          await db.query(
            `INSERT INTO acompanantes (cliente_id, nombre, parentesco) VALUES (?, ?, ?)`,
            [clienteId, acomp.nombre.trim(), acomp.parentesco ? acomp.parentesco.trim() : 'Acompañante']
          );
        }
      }
    }

    return res.json({ message: 'Acompañantes guardados exitosamente.' });
  } catch (err) {
    console.error('[Acompañantes] Error al guardar:', err);
    return res.status(500).json({ message: 'Error interno al guardar acompañantes.' });
  }
};