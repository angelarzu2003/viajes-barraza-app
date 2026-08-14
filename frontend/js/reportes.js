// frontend/js/reportes.js
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
        const res = await fetch('/api/clientes', { headers: getHeaders() });
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
        const res = await fetch(`/api/reportes/cliente/${id}`, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Incluimos acompanantes desde la respuesta de la API
        const { cliente, documentos, viajes, acompanantes } = data;
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
            yPos += 15;
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
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // TABLA ACOMPAÑANTES
        doc.setFontSize(14);
        doc.setTextColor(26, 140, 114);
        doc.text("Acompañantes Registrados", 14, yPos);
        yPos += 5;

        if (!acompanantes || acompanantes.length === 0) {
            doc.setFontSize(10); doc.setTextColor(150);
            doc.text("No hay acompañantes registrados.", 14, yPos + 5);
            yPos += 15;
        } else {
            const acompRows = acompanantes.map(a => [
                a.nombre, 
                a.parentesco || 'Acompañante'
            ]);
            doc.autoTable({
                startY: yPos, head: [['Nombre', 'Parentesco']], body: acompRows,
                headStyles: { fillColor: [52, 73, 94] }, margin: { left: 14, right: 14 }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // PROCESAMOS IMÁGENES
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
                    
                    const dims = await obtenerDimensionesImagen(imgDoc.archivoBase64);
                    const maxWidth = 182;  
                    const maxHeight = 230; 
                    
                    const ratio = Math.min(maxWidth / dims.width, maxHeight / dims.height);
                    const finalWidth = dims.width * ratio;
                    const finalHeight = dims.height * ratio;
                    const xPos = 14 + ((maxWidth - finalWidth) / 2);
                    
                    doc.addImage(
                        imgDoc.archivoBase64, 
                        imgDoc.nombre_original.toLowerCase().endsWith('png') ? 'PNG' : 'JPEG', 
                        xPos, 30, finalWidth, finalHeight
                    );
                }
            }
        }

        // FUSIÓN CON PDF-LIB
        const mainPdfBytes = doc.output('arraybuffer');
        const { PDFDocument } = window.PDFLib;
        const finalPdf = await PDFDocument.load(mainPdfBytes);

        const pdfsExternos = documentos.filter(d => d.nombre_original && d.nombre_original.toLowerCase().endsWith('.pdf'));

        for (let pdfAnexo of pdfsExternos) {
            if (pdfAnexo.archivoBase64) {
                try {
                    const externalPdfBytes = await fetch(pdfAnexo.archivoBase64).then(res => res.arrayBuffer());
                    const externalDoc = await PDFDocument.load(externalPdfBytes);
                    const copiedPages = await finalPdf.copyPages(externalDoc, externalDoc.getPageIndices());
                    copiedPages.forEach(page => finalPdf.addPage(page));
                } catch (e) {
                    console.error('Error fusionando PDF externo:', e);
                }
            }
        }

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

function obtenerDimensionesImagen(base64) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.src = base64;
    });
}