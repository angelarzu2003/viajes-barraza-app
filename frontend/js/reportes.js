const API = 'http://localhost:3000/api';
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    cargarClientesEnSelect();
    document.getElementById('btnGenerarPDF').addEventListener('click', generarPDF);
});

function getHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('vb_token')}` };
}

async function cargarClientesEnSelect() {
    try {
        const res = await fetch(`${API}/clientes`, { headers: getHeaders() });
        const data = await res.json();
        const select = document.getElementById('selectClienteReporte');
        
        select.innerHTML = '<option value="">Elige un cliente...</option>';
        data.clientes.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nombre} ${c.apellidos}</option>`;
        });
    } catch (err) {
        console.error('Error al cargar clientes:', err);
    }
}

async function generarPDF() {
    const id = document.getElementById('selectClienteReporte').value;
    if (!id) return mostrarToast('Por favor selecciona un cliente primero.', 'error');

    const btn = document.getElementById('btnGenerarPDF');
    btn.textContent = 'Generando documento...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API}/reportes/cliente/${id}`, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const { cliente, documentos, viajes } = data;
        const nombreCompleto = `${cliente.nombre} ${cliente.apellidos || ''}`;

        // PORTADA Y DATOS
        doc.setFontSize(22);
        doc.setTextColor(26, 140, 114);
        doc.text("Viajes Barraza", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("Dossier Confidencial de Cliente", 14, 28);
        doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-MX')}`, 14, 33);
        
        doc.setDrawColor(226, 230, 237);
        doc.line(14, 38, 196, 38);

        doc.setFontSize(16);
        doc.setTextColor(45, 51, 64);
        doc.text(nombreCompleto, 14, 50);
        
        doc.setFontSize(11);
        doc.text(`Email: ${cliente.email || 'N/A'}`, 14, 58);
        doc.text(`Teléfono: ${cliente.telefono || 'N/A'}`, 14, 64);
        doc.text(`Ubicación: ${cliente.ciudad || 'N/A'}, ${cliente.estado || 'N/A'}`, 100, 58);
        doc.text(`No. Cliente: ${cliente.numero_cliente || 'N/A'}`, 100, 64);

        let yPos = 75;

        // TABLA DOCUMENTOS
        doc.setFontSize(14);
        doc.setTextColor(26, 140, 114);
        doc.text("Bóveda de Documentos", 14, yPos);
        yPos += 5;

        if (documentos.length === 0) {
            doc.setFontSize(10); doc.setTextColor(150);
            doc.text("No hay documentos registrados.", 14, yPos + 5);
            yPos += 15;
        } else {
            const docRows = documentos.map(d => [
                d.tipo, d.nombre_original, 
                d.fecha_vencimiento ? new Date(d.fecha_vencimiento).toLocaleDateString('es-MX') : 'Sin vigencia'
            ]);
            doc.autoTable({
                startY: yPos, head: [['Tipo', 'Archivo', 'Vencimiento']], body: docRows,
                headStyles: { fillColor: [26, 140, 114] }, margin: { left: 14, right: 14 }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // TABLA VIAJES
        doc.setFontSize(14);
        doc.setTextColor(26, 140, 114);
        doc.text("Historial de Viajes", 14, yPos);
        yPos += 5;

        if (viajes.length === 0) {
            doc.setFontSize(10); doc.setTextColor(150);
            doc.text("No hay viajes registrados.", 14, yPos + 5);
        } else {
            const viajeRows = viajes.map(v => [
                v.destino, 
                v.fecha_salida ? new Date(v.fecha_salida).toLocaleDateString('es-MX') : 'TBD',
                v.fecha_regreso ? new Date(v.fecha_regreso).toLocaleDateString('es-MX') : 'TBD',
                v.estatus
            ]);
            doc.autoTable({
                startY: yPos, head: [['Destino', 'Salida', 'Regreso', 'Estatus']], body: viajeRows,
                headStyles: { fillColor: [245, 166, 35] }, margin: { left: 14, right: 14 }
            });
        }

        // PROCESAMOS PRIMERO LAS IMÁGENES (JPG/PNG) EN EL JSPDF
        const imagenes = documentos.filter(d => d.nombre_original && ['jpg', 'jpeg', 'png'].includes(d.nombre_original.split('.').pop().toLowerCase()));
        
        if (imagenes.length > 0) {
            doc.addPage();
            doc.setFillColor(26, 140, 114);
            doc.rect(0, 0, 210, 297, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(28);
            doc.text("ANEXOS FOTOGRÁFICOS", 105, 140, { align: 'center' });
            
            for (let imgDoc of imagenes) {
                if (imgDoc.archivoBase64) {
                    doc.addPage();
                    doc.setFontSize(16); doc.setTextColor(26, 140, 114);
                    doc.text(`Documento: ${imgDoc.tipo.toUpperCase()}`, 14, 20);
                    
                    // 1. Medimos la imagen original
                    const dims = await obtenerDimensionesImagen(imgDoc.archivoBase64);
                    
                    // 2. Definimos el espacio máximo disponible en la hoja A4
                    const maxWidth = 182;  // Ancho máximo permitido
                    const maxHeight = 230; // Alto máximo permitido (dejando espacio para el título)
                    
                    // 3. Calculamos la proporción perfecta para no deformarla
                    const ratio = Math.min(maxWidth / dims.width, maxHeight / dims.height);
                    const finalWidth = dims.width * ratio;
                    const finalHeight = dims.height * ratio;
                    
                    // 4. Calculamos el espacio sobrante para centrarla perfectamente en la hoja
                    const xPos = 14 + ((maxWidth - finalWidth) / 2);
                    
                    // 5. La dibujamos respetando sus proporciones naturales
                    doc.addImage(
                        imgDoc.archivoBase64, 
                        imgDoc.nombre_original.toLowerCase().endsWith('png') ? 'PNG' : 'JPEG', 
                        xPos, 
                        30, 
                        finalWidth, 
                        finalHeight
                    );
                }
            }
        }

        // 🛑 MAGIA DE FUSIÓN CON PDF-LIB 🛑
        // 1. Extraemos el PDF que acabamos de dibujar como bytes crudos
        const mainPdfBytes = doc.output('arraybuffer');
        const { PDFDocument } = window.PDFLib;
        
        // 2. Lo abrimos con el fusionador
        const finalPdf = await PDFDocument.load(mainPdfBytes);

        // 3. Buscamos los PDFs que el backend nos mandó
        const pdfsExternos = documentos.filter(d => d.nombre_original && d.nombre_original.toLowerCase().endsWith('.pdf'));

        for (let pdfAnexo of pdfsExternos) {
            if (pdfAnexo.archivoBase64) {
                try {
                    // Convertimos la base64 a formato binario para que lo lea pdf-lib
                    const externalPdfBytes = await fetch(pdfAnexo.archivoBase64).then(res => res.arrayBuffer());
                    const externalDoc = await PDFDocument.load(externalPdfBytes);
                    
                    // Copiamos todas las páginas del seguro y las pegamos al final de nuestro reporte
                    const copiedPages = await finalPdf.copyPages(externalDoc, externalDoc.getPageIndices());
                    copiedPages.forEach(page => finalPdf.addPage(page));
                } catch (e) {
                    console.error('Error fusionando PDF externo:', e);
                }
            }
        }

        // 4. Guardamos y descargamos el archivo fusionado final
        const finalPdfBytes = await finalPdf.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Expediente_${cliente.nombre.replace(/\s+/g, '_')}.pdf`;
        link.click();
        
        mostrarToast('PDF generado correctamente', 'success');

    } catch (err) {
        console.error('Error general:', err);
        mostrarToast('Error al generar el PDF', 'error');
    } finally {
        btn.textContent = 'Generar y Descargar PDF';
        btn.disabled = false;
    }
}

function mostrarToast(mensaje, tipo = 'success') {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = mensaje;
    toast.className = `toast show ${tipo}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Función para medir la imagen real antes de dibujarla en el PDF
function obtenerDimensionesImagen(base64) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = base64;
    });
}
