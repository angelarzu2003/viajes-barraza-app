// frontend/js/clientes.js
// CRUD completo de clientes — conectado al backend Express

const API = 'http://localhost:3000/api';
const POR_PAGINA = 10;

/* ── Estado ── */
let clientes     = [];
let clienteFiltrado = [];
let editandoId   = null;
let eliminarId   = null;
let paginaActual = 1;

/* ── Token JWT ── */
function getHeaders() {
  const token = localStorage.getItem('vb_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

/* ══════════════════════════════════════════
   INICIALIZACIÓN
══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Proteger ruta
  const user = requireAuth();
  if (!user) return;

  // Mostrar usuario en sidebar
  document.getElementById('sidebarNombre').textContent = user.nombre || 'Usuario';
  document.getElementById('sidebarRol').textContent    = user.rol    || 'staff';
  document.getElementById('sidebarAvatar').textContent =
    (user.nombre || 'U').charAt(0).toUpperCase();

  cargarClientes();
  bindEventos();
});

/* ══════════════════════════════════════════
   FETCH — Cargar todos los clientes
══════════════════════════════════════════ */
async function cargarClientes() {
  try {
    const res  = await fetch(`${API}/clientes`, { headers: getHeaders() });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    clientes = data.clientes || [];
    poblarFiltros();
    aplicarFiltros();

  } catch (err) {
    console.error('[Clientes]', err);
    mostrarToast('Error al cargar clientes.', 'error');
    renderTabla([]);
  }
}

/* ══════════════════════════════════════════
   FILTROS Y BÚSQUEDA
══════════════════════════════════════════ */
function poblarFiltros() {
  const ciudades = [...new Set(clientes.map(c => c.ciudad).filter(Boolean))].sort();
  const sel = document.getElementById('filterCiudad');
  sel.innerHTML = '<option value="">Todas las ciudades</option>';
  ciudades.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    sel.appendChild(opt);
  });
}

function aplicarFiltros() {
  const buscar = document.getElementById('searchInput').value.toLowerCase().trim();
  const activo = document.getElementById('filterActivo').value;
  const ciudad = document.getElementById('filterCiudad').value;

  clienteFiltrado = clientes.filter(c => {
    const textoMatch = !buscar ||
      `${c.nombre} ${c.apellidos} ${c.email} ${c.numero_cliente}`.toLowerCase().includes(buscar);
    const activoMatch = activo === '' || String(c.activo === 1 || c.activo === true) === activo;
    const ciudadMatch = !ciudad || c.ciudad === ciudad;
    return textoMatch && activoMatch && ciudadMatch;
  });

  paginaActual = 1;
  document.getElementById('resultsCount').textContent =
    `${clienteFiltrado.length} cliente${clienteFiltrado.length !== 1 ? 's' : ''}`;

  renderTabla(paginaActual);
  renderPaginacion();
}

/* ══════════════════════════════════════════
   RENDER TABLA
══════════════════════════════════════════ */
function renderTabla(pagina) {
  const tbody  = document.getElementById('tablaBody');
  const inicio = (pagina - 1) * POR_PAGINA;
  const slice  = clienteFiltrado.slice(inicio, inicio + POR_PAGINA);

  if (slice.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          <p>No se encontraron clientes.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = slice.map(c => {
    const iniciales = `${c.nombre.charAt(0)}${(c.apellidos || '').charAt(0)}`.toUpperCase();
    const colores = [
      'background:var(--teal-100);color:var(--teal-700)',
      'background:var(--amber-50);color:var(--amber-600)',
      'background:var(--danger-bg);color:var(--danger)',
    ];
    const color = colores[c.id % colores.length];
    const fecha = c.creado_en ? new Date(c.creado_en).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) : '—';
    const estadoBadge = c.activo
      ? '<span class="badge badge-green">Activo</span>'
      : '<span class="badge badge-slate">Inactivo</span>';

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
        <div style="font-size:11.5px;color:var(--slate-400)">${c.telefono || ''}</div>
      </td>
      <td>${c.ciudad || '—'}</td>
      <td>${estadoBadge}</td>
      <td style="font-size:12.5px;color:var(--slate-400)">${fecha}</td>
      <td style="display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn-editar" onclick="abrirEditar(${c.id})" title="Editar" style="background: transparent; border: 1px solid var(--slate-200); padding: 6px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--slate-600)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
        </button>
        <button class="btn-borrar" onclick="pedirEliminar(${c.id}, '${c.nombre} ${c.apellidos || ''}')" title="Eliminar" style="background: transparent; border: 1px solid #fecaca; padding: 6px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        </button>
      </td>
    </tr>`;
  }).join('');
}

/* ── Paginación ── */
function renderPaginacion() {
  const total  = Math.ceil(clienteFiltrado.length / POR_PAGINA);
  const pg     = document.getElementById('pagination');
  if (total <= 1) { pg.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="irPagina(${paginaActual-1})" ${paginaActual===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= total; i++) {
    html += `<button class="page-btn ${i===paginaActual?'active':''}" onclick="irPagina(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="irPagina(${paginaActual+1})" ${paginaActual===total?'disabled':''}>›</button>`;
  pg.innerHTML = html;
}

function irPagina(n) {
  const total = Math.ceil(clienteFiltrado.length / POR_PAGINA);
  if (n < 1 || n > total) return;
  paginaActual = n;
  renderTabla(paginaActual);
  renderPaginacion();
}

/* ══════════════════════════════════════════
   MODAL — Abrir / Cerrar
══════════════════════════════════════════ */
function abrirModal(titulo) {
  document.getElementById('modalTitle').textContent = titulo;
  document.getElementById('modalBackdrop').classList.add('open');
}

function cerrarModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
  limpiarForm();
  editandoId = null;
}

function limpiarForm() {
  ['fNombre','fApellidos','fEmail','fTelefono','fFechaNac','fCiudad','fEstado','fDireccion','fNotas']
    .forEach(id => { document.getElementById(id).value = ''; });
}

/* ── Nuevo cliente ── */
function abrirNuevo() {
  editandoId = null;
  document.getElementById('btnGuardarTxt').textContent = 'Guardar cliente';
  abrirModal('Nuevo cliente');
}

/* ── Editar cliente ── */
async function abrirEditar(id) {
  try {
    const res  = await fetch(`${API}/clientes/${id}`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    const c = data.cliente;
    editandoId = id;

    document.getElementById('fNombre').value    = c.nombre     || '';
    document.getElementById('fApellidos').value = c.apellidos  || '';
    document.getElementById('fEmail').value     = c.email      || '';
    document.getElementById('fTelefono').value  = c.telefono   || '';
    document.getElementById('fFechaNac').value  = c.fecha_nacimiento ? c.fecha_nacimiento.split('T')[0] : '';
    document.getElementById('fCiudad').value    = c.ciudad     || '';
    document.getElementById('fEstado').value    = c.estado     || '';
    document.getElementById('fDireccion').value = c.direccion  || '';
    document.getElementById('fNotas').value     = c.notas      || '';

    document.getElementById('btnGuardarTxt').textContent = 'Actualizar cliente';
    abrirModal('Editar cliente');

  } catch (err) {
    mostrarToast('No se pudo cargar el cliente.', 'error');
  }
}

/* ══════════════════════════════════════════
   GUARDAR (crear o editar)
══════════════════════════════════════════ */
async function guardarCliente() {
  const payload = {
    nombre:          document.getElementById('fNombre').value.trim(),
    apellidos:       document.getElementById('fApellidos').value.trim(),
    email:           document.getElementById('fEmail').value.trim(),
    telefono:        document.getElementById('fTelefono').value.trim(),
    fecha_nacimiento:document.getElementById('fFechaNac').value || null,
    ciudad:          document.getElementById('fCiudad').value.trim(),
    estado:          document.getElementById('fEstado').value.trim(),
    direccion:       document.getElementById('fDireccion').value.trim(),
    notas:           document.getElementById('fNotas').value.trim(),
  };

  if (!payload.nombre || !payload.apellidos) {
    mostrarToast('Nombre y apellidos son obligatorios.', 'error');
    return;
  }

  const btn = document.getElementById('btnGuardar');
  btn.disabled = true;
  btn.querySelector('#btnGuardarTxt').textContent = 'Guardando…';

  try {
    const url    = editandoId ? `${API}/clientes/${editandoId}` : `${API}/clientes`;
    const method = editandoId ? 'PUT' : 'POST';

    const res  = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    mostrarToast(editandoId ? 'Cliente actualizado.' : `Cliente creado (${data.numero_cliente}).`, 'success');
    cerrarModal();
    await cargarClientes();

  } catch (err) {
    mostrarToast(err.message || 'Error al guardar.', 'error');
  } finally {
    btn.disabled = false;
    document.getElementById('btnGuardarTxt').textContent =
      editandoId ? 'Actualizar cliente' : 'Guardar cliente';
  }
}

/* ══════════════════════════════════════════
   ELIMINAR
══════════════════════════════════════════ */
function pedirEliminar(id, nombre) {
  eliminarId = id;
  // Ajustamos el texto para reflejar que ahora es un borrado real y permanente
  document.getElementById('confirmText').textContent =
    `¿Estás seguro de eliminar a "${nombre}"? Se borrará de forma PERMANENTE junto con todos sus documentos y expedientes cifrados. Esta acción no se puede deshacer.`;
  document.getElementById('confirmBackdrop').classList.add('open');
}

async function confirmarEliminar() {
  if (!eliminarId) return;
  try {
    const res  = await fetch(`${API}/clientes/${eliminarId}`, { method: 'DELETE', headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    // Cambiamos el mensaje para que sea más claro
    mostrarToast('Cliente y expedientes eliminados permanentemente.', 'success');
    document.getElementById('confirmBackdrop').classList.remove('open');
    eliminarId = null;
    
    // Esto vuelve a llamar al backend y redibuja la tabla sin el cliente eliminado al instante
    await cargarClientes();

  } catch (err) {
    mostrarToast(err.message || 'Error al eliminar.', 'error');
  }
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
let toastTimer;
function mostrarToast(msg, tipo = 'success') {
  const el = document.getElementById('toast');
  document.getElementById('toastMsg').textContent   = msg;
  document.getElementById('toastIcon').textContent  = tipo === 'success' ? '✓' : '✕';
  el.className = `toast show ${tipo}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

/* ══════════════════════════════════════════
   BIND EVENTOS
══════════════════════════════════════════ */
function bindEventos() {
  document.getElementById('btnNuevoCliente').addEventListener('click', abrirNuevo);
  document.getElementById('btnGuardar').addEventListener('click', guardarCliente);
  document.getElementById('btnCancelar').addEventListener('click', cerrarModal);
  document.getElementById('modalClose').addEventListener('click', cerrarModal);

  // Cerrar modal al click fuera
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) cerrarModal();
  });

  // Confirmar eliminación
  document.getElementById('btnConfirmSi').addEventListener('click', confirmarEliminar);
  document.getElementById('btnConfirmNo').addEventListener('click', () => {
    document.getElementById('confirmBackdrop').classList.remove('open');
    eliminarId = null;
  });

  // Búsqueda en tiempo real (debounce)
  let debounce;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(aplicarFiltros, 300);
  });

  document.getElementById('filterActivo').addEventListener('change', aplicarFiltros);
  document.getElementById('filterCiudad').addEventListener('change', aplicarFiltros);
}

// Exponer funciones llamadas desde onclick en la tabla
window.abrirEditar    = abrirEditar;
window.pedirEliminar  = pedirEliminar;
window.irPagina       = irPagina;