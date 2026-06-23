const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocal ? 'http://localhost:3000/api' : 'http://134.209.70.88/api';

document.addEventListener('DOMContentLoaded', () => {
    const user = requireAuth();
    if (!user) return;

    document.getElementById('sidebarNombre').textContent = user.nombre || 'Usuario';
    document.getElementById('sidebarRol').textContent    = user.rol    || 'Admin';
    if(document.getElementById('sidebarAvatar')) document.getElementById('sidebarAvatar').textContent = (user.nombre || 'U').charAt(0).toUpperCase();

    // Disparamos ambas cargas al mismo tiempo
    cargarClientesRecientes();
    cargarEstadisticas();
});

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('vb_token')}`
    };
}

/* ── ESTADÍSTICAS GLOBALES Y ACTIVIDAD ── */
async function cargarEstadisticas() {
    try {
        const res = await fetch(`${API}/dashboard/resumen`, { headers: getHeaders() });
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Error en servidor');
            
        // 1. Números
        if(document.getElementById('dashClientes')) document.getElementById('dashClientes').textContent = data.total_clientes;
        if(document.getElementById('dashDocumentos')) document.getElementById('dashDocumentos').textContent = data.total_documentos;
        if(document.getElementById('dashAlertas')) document.getElementById('dashAlertas').textContent = data.total_alertas;
        if(document.getElementById('dashViajes')) document.getElementById('dashViajes').textContent = data.total_viajes;

        // 2. Alertas
        const contenedorAlertas = document.getElementById('listaAlertasReales');
        if (contenedorAlertas) {
            if (!data.alertas_lista || data.alertas_lista.length === 0) {
                contenedorAlertas.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--teal-600); font-size: 13px; font-weight: 500;">✓ Todos los documentos están vigentes y seguros.</div>`;
            } else {
                contenedorAlertas.innerHTML = data.alertas_lista.map(alerta => `
                <div class="alert-item">
                    <span class="alert-dot dot-${alerta.urgencia}"></span>
                    <div>
                        <div class="alert-text">${alerta.mensaje}</div>
                        <div class="alert-time">Vence el: ${alerta.fechaTexto}</div>
                    </div>
                </div>`).join('');
            }
        }

        // 3. Actividad Reciente
        const contenedorActividad = document.getElementById('listaActividad');
        if (contenedorActividad) {
            if (!data.actividad_reciente || data.actividad_reciente.length === 0) {
                contenedorActividad.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--slate-400); font-size: 13px;">Sin actividad reciente.</div>`;
            } else {
                contenedorActividad.innerHTML = data.actividad_reciente.map(act => {
                    let icon = '', bg = '', stroke = '';
                    if (act.tipo === 'cliente') {
                        bg = 'var(--teal-50)'; stroke = 'var(--teal-500)';
                        icon = `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>`;
                    } else if (act.tipo === 'documento') {
                        bg = 'var(--warn-bg)'; stroke = 'var(--amber-600)';
                        icon = `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>`;
                    } else if (act.tipo === 'viaje') {
                        bg = 'var(--slate-100)'; stroke = 'var(--slate-600)';
                        icon = `<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`;
                    }
                    return `
                    <div class="activity-item">
                        <div class="activity-icon" style="background:${bg}">
                            <svg viewBox="0 0 24 24" style="stroke:${stroke}; fill:none; stroke-width:2; stroke-linecap:round; width:15px; height:15px;">${icon}</svg>
                        </div>
                        <div>
                            <div class="activity-text">${act.texto}</div>
                            <div class="activity-time">${calcularTiempoAtras(new Date(act.fecha))}</div>
                        </div>
                    </div>`;
                }).join('');
            }
        }
    } catch (err) {
        console.error('[Dashboard] Error al cargar estadísticas:', err);
    }
}

/* ── TABLA DE CLIENTES RECIENTES ── */
async function cargarClientesRecientes() {
    try {
        const res = await fetch(`${API}/clientes`, { headers: getHeaders() });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const recientes = data.clientes.slice(0, 5);
        const tbody = document.getElementById('tablaRecientes');
        if(!tbody) return;

        if (recientes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--slate-400);">No hay clientes registrados aún.</td></tr>`;
            return;
        }

        tbody.innerHTML = recientes.map(c => {
            const iniciales = `${c.nombre.charAt(0)}${(c.apellidos || '').charAt(0)}`.toUpperCase();
            const fecha = new Date(c.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
            const colores = ['background:var(--teal-100);color:var(--teal-700)', 'background:var(--amber-50);color:var(--amber-600)', 'background:var(--danger-bg);color:var(--danger)'];
            const color = colores[c.id % colores.length];

            return `
                <tr>
                  <td>
                    <div class="client-row-inner">
                      <div class="client-avatar" style="${color}">${iniciales}</div>
                      <div>
                        <div class="client-name">${c.nombre} ${c.apellidos}</div>
                        <div class="client-id">${c.numero_cliente || '#—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="font-size:13px">${c.email || '—'}</div>
                    <div style="font-size:11.5px;color:var(--slate-400)">${c.telefono || '—'}</div>
                  </td>
                  <td>${c.ciudad || '—'}<br><span style="font-size:11px;color:var(--slate-400)">${c.estado || ''}</span></td>
                  <td style="font-size:13px;color:var(--slate-600)">${fecha}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('[Dashboard] Error al cargar recientes:', error);
    }
}

function calcularTiempoAtras(fecha) {
    const segundos = Math.floor((new Date() - fecha) / 1000);
    let intervalo = segundos / 86400;
    if (intervalo >= 1) return `Hace ${Math.floor(intervalo)} día(s)`;
    intervalo = segundos / 3600;
    if (intervalo >= 1) return `Hace ${Math.floor(intervalo)} hora(s)`;
    intervalo = segundos / 60;
    if (intervalo >= 1) return `Hace ${Math.floor(intervalo)} min`;
    return "Hace unos instantes";
}


/* ── CERRAR SESIÓN ── */
function cerrarSesion() {
    // 1. Borramos el token de seguridad
    localStorage.removeItem('vb_token');
    
    // 2. Redirigimos a la pantalla de Login (Asegúrate de que este sea el nombre correcto de tu archivo HTML de login)
    window.location.href = 'login.html'; 
}