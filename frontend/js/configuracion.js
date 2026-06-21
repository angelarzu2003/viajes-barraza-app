const API = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verificar que el usuario tenga sesión iniciada
    if (!requireAuth()) return;
    
    // 2. Revisar los permisos y llenar los datos
    verificarPermisosAdmin();
});

function verificarPermisosAdmin() {
    const token = localStorage.getItem('vb_token');
    if (!token) return;

    try {
        // Desencriptamos el gafete virtual (token)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        console.log("Datos de tu sesión actual:", payload);

        // Llenado seguro: Primero validamos que el campo exista en el HTML
        const cUsername = document.getElementById('cUsername');
        const cEmail = document.getElementById('cEmail');
        
        if (cUsername) cUsername.value = payload.nombre || payload.username || '';
        if (cEmail) cEmail.value = payload.email || '';

        // Ahora el sistema acepta tanto 'admin' (tu bd) como 'Administrador'
        if (payload.rol === 'Administrador' || payload.rol === 'admin') {
            const panelesOcultos = document.querySelectorAll('.admin-only');
            panelesOcultos.forEach(panel => {
                panel.style.display = 'block'; // ¡Revelar paneles!
            });
        } else {
            console.log("Modo Empleado: Paneles ocultos por seguridad.");
        }
    } catch (error) {
        console.error("Error al leer los permisos de la sesión:", error);
    }
}

// Escuchador del formulario (protegido contra el error 'null')
const formNuevoUsuario = document.getElementById('formNuevoUsuario');

if (formNuevoUsuario) {
    formNuevoUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Atrapamos los campos del HTML de forma segura
        const inputUsername = document.getElementById('uUsername');
        const inputEmail = document.getElementById('uEmail');
        const inputPassword = document.getElementById('uPassword');
        const inputRol = document.getElementById('uRol');

        // Si por alguna razón un campo no existe, detenemos todo para que no explote
        if (!inputUsername || !inputEmail || !inputPassword || !inputRol) {
            alert('Error interno: No se encontraron los campos del formulario.');
            return;
        }

        // Armamos el paquete con los valores limpios
        const nuevoUsuario = {
            username: inputUsername.value,
            email: inputEmail.value,
            password: inputPassword.value,
            rol: inputRol.value
        };

        try {
            const res = await fetch(`${API}/usuarios/registrar`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('vb_token')}`
                },
                body: JSON.stringify(nuevoUsuario)
            });

            if (res.ok) {
                alert('¡Usuario creado con éxito!');
                formNuevoUsuario.reset(); // Limpiamos el formulario automáticamente
            } else {
                const errorData = await res.json();
                alert('Error del servidor: ' + (errorData.error || errorData.message || 'Inténtalo de nuevo.'));
            }
        } catch (err) {
            console.error('Error de red al guardar usuario:', err);
            alert('Error de conexión con el servidor.');
        }
    });
}

// ==========================================
// 1. MODIFICAR MI PERFIL Y CONTRASEÑA
// ==========================================
const formPerfil = document.getElementById('formPerfil');
if (formPerfil) {
    formPerfil.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('cUsername').value;
        const email = document.getElementById('cEmail').value;
        const password = document.getElementById('cPassword').value;

        try {
            const res = await fetch(`${API}/usuarios/perfil`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('vb_token')}` },
                body: JSON.stringify({ username, email, password })
            });
            if (res.ok) {
                alert('¡Perfil actualizado con éxito!\nSi cambiaste tu correo o contraseña, deberás cerrar sesión y volver a entrar.');
                document.getElementById('cPassword').value = ''; 
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (err) { console.error(err); }
    });
}

// ==========================================
// 2. CARGAR Y GUARDAR PARÁMETROS DE ALERTA
// ==========================================
const formAlertas = document.getElementById('formAlertas');
if (formAlertas) {
    formAlertas.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dias = document.getElementById('aDias').value;
        try {
            const res = await fetch(`${API}/configuracion/alertas`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('vb_token')}` },
                body: JSON.stringify({ dias })
            });
            if (res.ok) alert('✅ Parámetros de alerta actualizados.');
        } catch (err) { console.error(err); }
    });
}

// ==========================================
// 3. CARGAR GRÁFICA DE BÓVEDA Y DATOS AL INICIAR
// ==========================================
async function cargarDatosBovedaYAlertas() {
    const token = localStorage.getItem('vb_token');
    const payload = JSON.parse(atob(token.split('.')[1]));

    if (payload.rol === 'Administrador' || payload.rol === 'admin') {
        try {
            // Traemos los días de la BD y los ponemos en la casilla
            const resAlertas = await fetch(`${API}/configuracion/alertas`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resAlertas.ok) {
                const data = await resAlertas.json();
                if(data.dias_alerta) document.getElementById('aDias').value = data.dias_alerta;
            }

            // Calculamos el peso de los expedientes cifrados
            const resStorage = await fetch(`${API}/configuracion/almacenamiento`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (resStorage.ok) {
                const storage = await resStorage.json();
                document.getElementById('txtEspacioBoveda').innerText = `${storage.megabytes} MB usados`;
                document.getElementById('barBoveda').style.width = `${storage.porcentaje}%`;
            }
        } catch(err) { console.error("Error cargando configuración extra:", err); }
    }
}
// ⚠️ BUSCA LA FUNCIÓN DOMContentLoaded HASTA ARRIBA DEL ARCHIVO Y AGREGA:
// cargarDatosBovedaYAlertas(); justo debajo de verificarPermisosAdmin();

// ==========================================
// 4. BOTÓN DE RESPALDO DE BASE DE DATOS (.SQL)
// ==========================================
const btnBackup = document.getElementById('btnBackup');
if (btnBackup) {
    btnBackup.addEventListener('click', async () => {
        btnBackup.innerText = 'Empaquetando base de datos...';
        btnBackup.disabled = true;
        
        try {
            const res = await fetch(`${API}/configuracion/backup`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('vb_token')}` }
            });
            if (!res.ok) throw new Error("Fallo al generar SQL");

            // Truco para descargar el archivo directo al escritorio
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Respaldo_ViajesBarraza.sql`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            alert('Error al descargar el respaldo.');
            console.error(err);
        } finally {
            btnBackup.innerText = 'Generar y Descargar Respaldo (.SQL)';
            btnBackup.disabled = false;
        }
    });
}