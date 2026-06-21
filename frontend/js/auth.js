// frontend/js/auth.js
// Maneja login, logout y protección de rutas con JWT

const API_BASE = 'http://localhost:3000/api'; // Ajusta al puerto de tu server.js

/* ─── Elementos del DOM ─── */
const emailInput  = document.getElementById('email');
const passInput   = document.getElementById('password');
const btnLogin    = document.getElementById('btnLogin');
const errorMsg    = document.getElementById('errorMsg');
const errorText   = document.getElementById('errorText');
const togglePass  = document.getElementById('togglePass');

/* ─── Mostrar / ocultar contraseña ─── */
if (togglePass) {
  togglePass.addEventListener('click', () => {
    const isPass = passInput.type === 'password';
    passInput.type = isPass ? 'text' : 'password';
    togglePass.textContent = isPass ? '🙈' : '👁';
  });
}

/* ─── Enviar formulario con Enter ─── */
[emailInput, passInput].forEach(el => {
  if (el) el.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin();
  });
});

/* ─── Click en botón ─── */
if (btnLogin) {
  btnLogin.addEventListener('click', handleLogin);
}

/* ─── Función principal de login ─── */
async function handleLogin() {
  const email    = emailInput?.value.trim();
  const password = passInput?.value;

  // Validación básica
  if (!email || !password) {
    showError('Por favor completa todos los campos.');
    return;
  }

  setLoading(true);
  hideError();

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.message || 'Credenciales incorrectas.');
      return;
    }

    // Guardar token y datos del usuario
    localStorage.setItem('vb_token', data.token);
    localStorage.setItem('vb_user',  JSON.stringify(data.usuario));

    // Redirigir al dashboard
    window.location.href = '../pages/index.html';

  } catch (err) {
    showError('No se pudo conectar con el servidor. Intenta más tarde.');
    console.error('[Auth] Error de red:', err);
  } finally {
    setLoading(false);
  }
}

/* ─── Helpers UI ─── */
function setLoading(state) {
  if (!btnLogin) return;
  btnLogin.classList.toggle('loading', state);
  btnLogin.disabled = state;
}

function showError(msg) {
  if (!errorMsg || !errorText) return;
  errorText.textContent = msg;
  errorMsg.classList.add('visible');
}

function hideError() {
  errorMsg?.classList.remove('visible');
}

/* ─── Protección de rutas (úsalo en pages que NO sean login) ─── */
function requireAuth() {
  const token = localStorage.getItem('vb_token');
  if (!token) {
    window.location.href = '../pages/login.html';
    return null;
  }
  return JSON.parse(localStorage.getItem('vb_user') || '{}');
}

/* ─── Logout ─── */
function logout() {
  localStorage.removeItem('vb_token');
  localStorage.removeItem('vb_user');
  window.location.href = '../pages/login.html';
}

// Exportar para uso en otros scripts si se usa como módulo
if (typeof module !== 'undefined') {
  module.exports = { requireAuth, logout };
}
