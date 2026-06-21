const API = 'http://localhost:3000/api';

const modalBackdrop = document.getElementById('modalViajeBackdrop');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

document.addEventListener('DOMContentLoaded', () => {
    const user = requireAuth();
    if (!user) return;

    document.getElementById('sidebarNombre').textContent = user.nombre || 'Usuario';
    document.getElementById('sidebarRol').textContent    = user.rol    || 'Admin';
    if(document.getElementById('sidebarAvatar')) document.getElementById('sidebarAvatar').textContent = (user.nombre || 'U').charAt(0).toUpperCase();

    // Cargar datos
    cargarClientesEnSelect();
    cargarViajes();

    // Eventos del Modal
    document.getElementById('btnNuevoViaje').addEventListener('click', () => {
        limpiarFormulario();
        modalBackdrop.classList.add('open');
    });
    document.getElementById('modalViajeClose').addEventListener('click', () => modalBackdrop.classList.remove('open'));
    document.getElementById('btnCancelarViaje').addEventListener('click', () => modalBackdrop.classList.remove('open'));
    document.getElementById('btnGuardarViaje').addEventListener('click', guardarViaje);
});

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('vb_token')}`
    };
}

/* ── OBTENER CLIENTES PARA EL SELECT ── */
async function cargarClientesEnSelect() {
    try {
        const res = await fetch(`${API}/clientes`, { headers: getHeaders() });
        const data = await res.json();
        const select = document.getElementById('vCliente');
        
        select.innerHTML = '<option value="">Selecciona un cliente...</option>';
        data.clientes.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nombre} ${c.apellidos}</option>`;
        });
    } catch (err) {
        console.error('Error al cargar clientes:', err);
    }
}

/* ── CARGAR Y PINTAR LA TABLA DE VIAJES ── */
async function cargarViajes() {
    try {
        const res = await fetch(`${API}/viajes`, { headers: getHeaders() });
        const data = await res.json();
        const tbody = document.getElementById('tablaViajes');

        if (!data.viajes || data.viajes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--slate-400);">No hay viajes registrados aún.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.viajes.map(v => {
            const salida = v.fecha_salida ? new Date(v.fecha_salida).toLocaleDateString('es-MX') : '—';
            const regreso = v.fecha_regreso ? new Date(v.fecha_regreso).toLocaleDateString('es-MX') : '—';
            
            // Colores por estatus
            let colorEstatus = 'var(--slate-500)';
            if(v.estatus === 'Confirmado') colorEstatus = 'var(--teal-600)';
            if(v.estatus === 'Cotizando') colorEstatus = 'var(--amber-600)';
            if(v.estatus === 'En curso') colorEstatus = '#3b82f6'; // azul
            if(v.estatus === 'Cancelado') colorEstatus = 'var(--danger)';

            return `
            <tr>
                <td style="font-weight: 600; color: var(--slate-800);">👤 ${v.cliente_nombre} ${v.cliente_apellidos}</td>
                <td><strong style="color: var(--slate-700)">📍 ${v.destino}</strong></td>
                <td style="font-size: 13px; color: var(--slate-600);">🛫 ${salida}<br>🛬 ${regreso}</td>
                <td><span style="font-size: 12px; font-weight: 600; color: ${colorEstatus}; background: ${colorEstatus}15; padding: 4px 8px; border-radius: 4px;">${v.estatus}</span></td>
                <td>
                    <button class="btn-secondary" style="padding: 4px 10px; font-size: 12px; border-color: var(--danger); color: var(--danger);" onclick="eliminarViaje(${v.id}, '${v.destino}')">✕ Borrar</button>
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.error('Error al cargar viajes:', err);
    }
}

/* ── GUARDAR VIAJE NUEVO ── */
async function guardarViaje() {
    // 1. Datos básicos del viaje
    const data = {
        cliente_id: document.getElementById('vCliente').value,
        destino: document.getElementById('vDestino').value,
        fecha_salida: document.getElementById('vSalida').value,
        fecha_regreso: document.getElementById('vRegreso').value,
        presupuesto: document.getElementById('vPresupuesto').value,
        estatus: document.getElementById('vEstatus').value,
        // 2. Captura de acompañantes
        acompanantes: []
    };

    // Si el checkbox está marcado, recorremos los campos dinámicos
    if (document.getElementById('checkAcompanantes').checked) {
        document.querySelectorAll('.campo-acompanante').forEach(div => {
            const nombre = div.querySelector('.acomp-nombre').value;
            const apellidos = div.querySelector('.acomp-apellidos').value;
            const parentesco = div.querySelector('.acomp-parentesco').value;
            
            if (nombre) { // Solo agregamos si el nombre no está vacío
                data.acompanantes.push({ nombre, apellidos, parentesco });
            }
        });
    }

    if (!data.cliente_id || !data.destino) return mostrarToast('Selecciona cliente y destino', 'error');

    try {
        const res = await fetch(`${API}/viajes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });

        if (res.ok) {
            mostrarToast('Viaje guardado con acompañantes', 'success');
            modalBackdrop.classList.remove('open');
            cargarViajes();
        } else {
            mostrarToast('Error al guardar', 'error');
        }
    } catch (err) {
        mostrarToast('Error de conexión', 'error');
    }
}

/* ── ELIMINAR VIAJE ── */
async function eliminarViaje(id, destino) {
    if (!confirm(`¿Eliminar el viaje a ${destino}?`)) return;

    try {
        const res = await fetch(`${API}/viajes/${id}`, { method: 'DELETE', headers: getHeaders() });
        if (res.ok) {
            mostrarToast('Viaje eliminado', 'success');
            cargarViajes();
        } else {
            mostrarToast('Error al eliminar', 'error');
        }
    } catch (err) {
        mostrarToast('Error de conexión', 'error');
    }
}

function limpiarFormulario() {
    document.getElementById('vCliente').value = '';
    document.getElementById('vDestino').value = '';
    document.getElementById('vSalida').value = '';
    document.getElementById('vRegreso').value = '';
    document.getElementById('vPresupuesto').value = '';
    document.getElementById('vEstatus').value = 'Cotizando';
}

function mostrarToast(mensaje, tipo = 'success') {
    if (!toast || !toastMsg) return;
    toastMsg.textContent = mensaje;
    toast.className = `toast show ${tipo}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}


// CORRECCIÓN: Ajusta los IDs para que coincidan con tu HTML
const inputSalida = document.getElementById('vSalida'); 
const inputRegreso = document.getElementById('vRegreso');

if (inputSalida && inputRegreso) {
    inputSalida.addEventListener('change', (e) => {
        const fechaSeleccionada = e.target.value;
        inputRegreso.min = fechaSeleccionada;
        if (!inputRegreso.value || inputRegreso.value < fechaSeleccionada) {
            inputRegreso.value = fechaSeleccionada;
        }
    });
}

function toggleAcompanantes() {
    const contenedor = document.getElementById('contenedorAcompanantes');
    contenedor.style.display = document.getElementById('checkAcompanantes').checked ? 'block' : 'none';
    if(contenedor.style.display === 'block' && document.querySelectorAll('.campo-acompanante').length === 0) {
        agregarCampoAcompanante();
    }
}

function agregarCampoAcompanante() {
    const div = document.createElement('div');
    div.className = 'campo-acompanante';
    div.style.marginBottom = '10px';
    div.innerHTML = `
        <input type="text" placeholder="Nombre" class="acomp-nombre" style="width: 30%;">
        <input type="text" placeholder="Apellidos" class="acomp-apellidos" style="width: 30%;">
        <input type="text" placeholder="Parentesco" class="acomp-parentesco" style="width: 25%;">
        <button type="button" onclick="this.parentElement.remove()" style="color:red; background:none; border:none; cursor:pointer;">✕</button>
    `;
    document.getElementById('listaAcompanantes').appendChild(div);
}