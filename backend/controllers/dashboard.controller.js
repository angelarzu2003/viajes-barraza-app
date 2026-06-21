const db = require('../config/db');

exports.getResumen = async (req, res) => {
  try {
    const [clientes] = await db.query('SELECT COUNT(*) AS total FROM clientes WHERE activo = 1');
    const [documentos] = await db.query('SELECT COUNT(*) AS total FROM documentos');
    const [viajes] = await db.query("SELECT COUNT(*) AS total FROM viajes WHERE fecha_salida >= CURDATE() AND estatus != 'Cancelado'");

    // Alertas de Vencimiento
    const [docsConVencimiento] = await db.query(`
      SELECT d.id, d.tipo, d.fecha_vencimiento, d.nombre_original,
             c.nombre AS cliente_nombre, c.apellidos AS cliente_apellidos
      FROM documentos d
      JOIN clientes c ON d.cliente_id = c.id
      WHERE d.fecha_vencimiento IS NOT NULL
      ORDER BY d.fecha_vencimiento ASC
    `);

    const alertas = [];
    let contadorPorVencer = 0;
    const hoy = new Date();

    docsConVencimiento.forEach(d => {
        const fechaVenc = new Date(d.fecha_vencimiento);
        const diferenciaTiempo = fechaVenc.getTime() - hoy.getTime();
        const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));

        if (diferenciaDias <= 30) {
            contadorPorVencer++;
            let urgencia = diferenciaDias <= 0 ? 'red' : 'amber';
            let mensaje = diferenciaDias < 0 
                ? `${d.tipo} de <strong>${d.cliente_nombre} ${d.cliente_apellidos || ''}</strong> venció hace ${Math.abs(diferenciaDias)} día(s).`
                : diferenciaDias === 0 
                    ? `${d.tipo} de <strong>${d.cliente_nombre} ${d.cliente_apellidos || ''}</strong> VENCE HOY.`
                    : `${d.tipo} de <strong>${d.cliente_nombre} ${d.cliente_apellidos || ''}</strong> vence en ${diferenciaDias} días.`;

            alertas.push({ id: d.id, mensaje, urgencia, fechaTexto: fechaVenc.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) });
        }
    });

    // Actividad Reciente (SQL Blindado contra NULLs y Collation)
    const [actividad] = await db.query(`
        SELECT CAST('cliente' AS CHAR) AS tipo, CAST(CONCAT('Nuevo cliente: <strong>', IFNULL(nombre,''), ' ', IFNULL(apellidos,''), '</strong>') AS CHAR) AS texto, creado_en AS fecha FROM clientes
        UNION ALL
        SELECT CAST('documento' AS CHAR) AS tipo, CAST(CONCAT('Expediente actualizado: <strong>', IFNULL(tipo,'Documento'), '</strong>') AS CHAR) AS texto, subido_en AS fecha FROM documentos
        UNION ALL
        SELECT CAST('viaje' AS CHAR) AS tipo, CAST(CONCAT('Nuevo viaje a <strong>', IFNULL(destino,'Destino'), '</strong>') AS CHAR) AS texto, creado_en AS fecha FROM viajes
        ORDER BY fecha DESC
        LIMIT 5
    `);

    const [clientesRecientes] = await db.query(`
        SELECT id, nombre, apellidos, email, telefono, ciudad, estado, creado_en 
        FROM clientes 
        WHERE activo = 1 
        ORDER BY creado_en DESC 
        LIMIT 5
    `);

    return res.json({
        total_clientes: clientes[0].total,
        total_documentos: documentos[0].total,
        total_viajes: viajes[0].total,
        total_alertas: contadorPorVencer,
        alertas_lista: alertas.slice(0, 5),
        actividad_reciente: actividad
    });

  } catch (err) {
    // Si algo falla, ahora nos dirá exactamente qué línea explotó en la terminal
    console.error('[Dashboard Error Critico]:', err);
    return res.status(500).json({ message: 'Error interno al cargar el dashboard.' });
  }
};