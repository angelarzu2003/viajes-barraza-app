const API = 'http://localhost:3000/api';

let documentosGlobal = [];
let clienteActivoId = null;
const docsRequeridos = ['Pasaporte', 'Visa', 'Seguro', 'Boleto', 'INE'];

const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

/* ── 1. INICIALIZACIÓN ── */
document.addEventListener('DOMContentLoaded', () => {
    const user = requireAuth();
    if (!user) return;

    document.getElementById('sidebarNombre').textContent = user.nombre || 'Usuario';
    document.getElementById('sidebarRol').textContent    = user.rol    || 'Admin';
    document.getElementById('sidebarAvatar').textContent = (user.nombre || 'U').charAt(0).toUpperCase();

    cargarDocumentos();

    // Evento Subida Rápida
    const btnMiniSubir = document.getElementById('btnMiniSubir');
    if (btnMiniSubir) btnMiniSubir.addEventListener('click', subirDocumentoRápido);

    // Cerrar Modales
    document.getElementById('modalGestorClose').addEventListener('click', () => {
        document.getElementById('modalGestorBackdrop').classList.remove('open');
    });

    document.getElementById('modalVisorClose').addEventListener('click', () => {
        document.getElementById('modalVisorBackdrop').classList.remove('open');
        document.getElementById('iframeVisor').src = ""; 
        document.getElementById('imgVisor').src = ""; 
    });
});

/* ── 2. CARGAR Y DIBUJAR TABLA PRINCIPAL ── */
async function cargarDocumentos() {
    try {
        const token = localStorage.getItem('vb_token');
        const res = await fetch(`${API}/documentos`, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) {
            documentosGlobal = data.documentos || [];
            renderTablaChecklist(documentosGlobal);
        }
    } catch (err) {
        console.error('Error al cargar documentos:', err);
    }
}

function renderTablaChecklist(docs) {
    const tbody = document.getElementById('tablaDocumentos');
    if (!tbody) return;

    const clientesAgrupados = {};

    // Agrupar (Considerando a los clientes con 0 documentos gracias al doc_id)
    docs.forEach(d => {
        const idCliente = d.cliente_id;
        if (!clientesAgrupados[idCliente]) {
            clientesAgrupados[idCliente] = {
                id: idCliente,
                nombre: `${d.cliente_nombre || ''} ${d.cliente_apellidos || ''}`.trim(),
                documentos: [],
                ultimaSubida: null
            };
        }
        
        // Si hay un documento real adjunto, lo metemos al array
        if (d.doc_id) {
            d.id = d.doc_id; // Ajustamos el ID para reutilizar código
            clientesAgrupados[idCliente].documentos.push(d);
            
            if (!clientesAgrupados[idCliente].ultimaSubida || new Date(d.subido_en) > new Date(clientesAgrupados[idCliente].ultimaSubida)) {
                clientesAgrupados[idCliente].ultimaSubida = d.subido_en;
            }
        }
    });

    tbody.innerHTML = Object.values(clientesAgrupados).map(c => {
        const fecha = c.ultimaSubida ? new Date(c.ultimaSubida).toLocaleDateString('es-MX') : '—';
        const tiposQueTiene = c.documentos.map(d => d.tipo);
        
        const htmlChecklist = docsRequeridos.map(req => {
            const loTiene = tiposQueTiene.includes(req);
            const color = loTiene ? 'var(--teal-600)' : 'var(--slate-300)';
            const icono = loTiene ? '✓' : '○';
            return `<span style="display:inline-flex; align-items:center; gap:4px; font-size:12px; color:${color}; font-weight:600; margin-right: 12px;">
                        <span style="font-size:14px;">${icono}</span> ${req}
                    </span>`;
        }).join('');

        return `
        <tr>
            <td colspan="2">
                <div style="font-size:16px; font-weight:700; color:var(--slate-800); margin-bottom: 6px;">
                    👤 ${c.nombre}
                </div>
                <div style="display:flex; flex-wrap:wrap;">
                    ${htmlChecklist}
                </div>
            </td>
            <td style="font-size:13px; color:var(--slate-600)">${fecha}</td>
            <td style="font-size:13px; color:var(--slate-600)">${c.documentos.length} archivo(s)</td>
            <td>
                <button class="btn-secondary" style="padding: 6px 14px;" onclick="abrirGestor('${c.id}')">Ver</button>
            </td>
        </tr>`;
    }).join('');
}

/* ── 3. ABRIR GESTOR (MODAL DE ARCHIVOS) ── */
function abrirGestor(clienteId) {
    clienteActivoId = clienteId;
    const docsDelCliente = documentosGlobal.filter(d => String(d.cliente_id) === String(clienteId) && d.doc_id != null);
    
    // Obtenemos el nombre buscando en el array completo
    const infoCliente = documentosGlobal.find(d => String(d.cliente_id) === String(clienteId));
    if (infoCliente) {
        document.getElementById('tituloModalGestor').textContent = `Expediente: ${infoCliente.cliente_nombre} ${infoCliente.cliente_apellidos}`;
    }

    const contenedor = document.getElementById('listaDocumentosGestor');
    if (!contenedor) return;
    
    if (docsDelCliente.length === 0) {
        contenedor.innerHTML = '<p style="color: var(--slate-500); font-size: 13px; padding: 10px 0;">No hay documentos en este expediente.</p>';
    } else {
        contenedor.innerHTML = docsDelCliente.map(d => {
            const fechaSubida = d.subido_en ? new Date(d.subido_en).toLocaleDateString('es-MX') : 'N/A';
            const fechaVenc = d.fecha_vencimiento ? new Date(d.fecha_vencimiento).toLocaleDateString('es-MX') : 'Sin vencimiento';
            const colorVencimiento = d.fecha_vencimiento ? 'var(--amber-600)' : 'var(--slate-400)';

            return `
            <div style="border: 1px solid var(--slate-200); padding: 12px 16px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; background: #fff; margin-bottom: 8px;">
                <div>
                    <div style="font-weight: 700; color: var(--slate-800); font-size: 13px;">${d.tipo}</div>
                    <div style="font-size: 11.5px; color: var(--slate-500); margin-top: 4px;">
                        ${d.nombre_original} <br>
                        <span style="color:#94a3b8">Subido:</span> ${fechaSubida} &nbsp;|&nbsp; 
                        <span style="color:#94a3b8">Vence:</span> <span style="color:${colorVencimiento}; font-weight:500;">${fechaVenc}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-primary" style="padding: 4px 10px; font-size: 12px;" onclick="abrirVisorHD('${d.id}', '${d.nombre_original}')">Ver HD</button>
                    <button class="btn-secondary" style="padding: 4px 10px; font-size: 12px; border-color: var(--danger); color: var(--danger);" title="Eliminar" onclick="borrarUnDocumento('${d.id}', '${d.nombre_original}')">✕</button>
                </div>
            </div>`;
        }).join('');
    }

    document.getElementById('modalGestorBackdrop').classList.add('open');
}

/* ── 4. VISOR HD ── */
function abrirVisorHD(docId, nombreDoc) {
    document.getElementById('tituloVisorHD').textContent = nombreDoc;
    const token = localStorage.getItem('vb_token');
    const urlHD = `${API}/documentos/${docId}/ver?token=${token}`;
    
    const iframe = document.getElementById('iframeVisor');
    const img = document.getElementById('imgVisor');
    const ext = nombreDoc.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        iframe.style.display = 'none'; iframe.src = '';
        img.style.display = 'block'; img.src = urlHD;
    } else {
        img.style.display = 'none'; img.src = '';
        iframe.style.display = 'block'; iframe.src = urlHD;
    }
    
    document.getElementById('modalVisorBackdrop').classList.add('open');
}

/* ── 5. SUBIDA DESDE EL EXPEDIENTE (CON FECHA) ── */
async function subirDocumentoRápido() {
    const fileInput = document.getElementById('miniArchivo');
    const tipoInput = document.getElementById('miniTipo');
    const fechaInput = document.getElementById('miniFechaVenc');
    
    if (!fileInput || !fileInput.files[0]) return mostrarToast('Selecciona un archivo', 'error');
    if (!clienteActivoId) return mostrarToast('Error: Sin cliente', 'error');

    const formData = new FormData();
    formData.append('cliente_id', clienteActivoId);
    formData.append('tipo', tipoInput.value);
    // Agregamos la fecha al FormData si el usuario la llenó
    if (fechaInput && fechaInput.value) {
        formData.append('fecha_vencimiento', fechaInput.value);
    }
    formData.append('archivo', fileInput.files[0]);

    const btn = document.getElementById('btnMiniSubir');
    btn.textContent = '...'; btn.disabled = true;

    try {
        const token = localStorage.getItem('vb_token');
        const res = await fetch(`${API}/documentos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        if (res.ok) {
            mostrarToast('Archivo cifrado con éxito', 'success');
            fileInput.value = ''; 
            fechaInput.value = ''; // Limpiamos la fecha
            await cargarDocumentos(); 
            abrirGestor(clienteActivoId); 
        } else {
            const data = await res.json();
            mostrarToast(data.message || 'Error al subir', 'error');
        }
    } catch (err) {
        mostrarToast('Error de conexión', 'error');
    } finally {
        btn.textContent = 'Subir'; btn.disabled = false;
    }
}

/* ── 6. ELIMINAR UN DOCUMENTO ── */
async function borrarUnDocumento(docId, nombreDoc) {
    if (!confirm(`¿Eliminar permanentemente "${nombreDoc}"?`)) return;

    try {
        const token = localStorage.getItem('vb_token');
        const res = await fetch(`${API}/documentos/${docId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        if (res.ok) {
            mostrarToast('Eliminado', 'success');
            await cargarDocumentos(); 
            abrirGestor(clienteActivoId); 
        } else {
            mostrarToast('Error al eliminar', 'error');
        }
    } catch (err) {
        mostrarToast('Error de conexión', 'error');
    }
}

function mostrarToast(mensaje, tipo = 'success') {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = mensaje;
    toast.className = `toast show ${tipo}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

