const API = 'http://localhost:3000/api';
let mapaGlobal;

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    inicializarMapa();
});

function getHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('vb_token')}` };
}

// Función para poner las fechas bonitas (DD/MM/YYYY)
function formatearFecha(fechaStr) {
    if (!fechaStr) return 'Por definir';
    // Se ajusta la zona horaria para evitar que se reste un día
    const fecha = new Date(fechaStr);
    const fechaAjustada = new Date(fecha.getTime() + fecha.getTimezoneOffset() * 60000);
    return fechaAjustada.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function inicializarMapa() {
    mapaGlobal = L.map('mapaPrincipal').setView([23.6345, -102.5528], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(mapaGlobal);

    cargarPines();
}

async function cargarPines() {
    try {
        const res = await fetch(`${API}/mapa/ubicaciones`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Error al traer datos del mapa');
        const data = await res.json();
        
        console.log("📦 DATOS DEL BACKEND:", data);

        const coordenadasCache = {};

        // --- PINES VIAJES (ROJOS EXCLUSIVAMENTE) ---
        const iconoViaje = new L.Icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        for (const viaje of data.viajes) {
            if (!viaje.destino) continue;
            const busqueda = viaje.destino; 
            
            console.log("🔍 Buscando destino en el satélite:", busqueda);

            if (!coordenadasCache[busqueda]) {
                try {
                    await new Promise(r => setTimeout(r, 1000)); 
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(busqueda)}`);
                    const geoData = await geoRes.json();
                    
                    if (geoData && geoData.length > 0) {
                        console.log(`✅ Satélite encontró: '${busqueda}' en Lat: ${geoData[0].lat}, Lon: ${geoData[0].lon}`);
                        coordenadasCache[busqueda] = { lat: geoData[0].lat, lon: geoData[0].lon };
                    } else {
                        console.warn(`⚠️ El satélite NO encontró coordenadas para: '${busqueda}'`);
                    }
                } catch (e) {
                    console.error("Error conectando al mapa para destino:", busqueda);
                }
            }

            const coords = coordenadasCache[busqueda];
            if (coords) {
                const fSalida = formatearFecha(viaje.fecha_salida);
                const fRegreso = formatearFecha(viaje.fecha_regreso);

                const marker = L.marker([coords.lat, coords.lon], { icon: iconoViaje }).addTo(mapaGlobal);
                
                marker.bindPopup(`
                    <div style="text-align:center;">
                        <b style="color: #e11d48; font-size: 14px;">✈️ ${viaje.destino}</b><br>
                        <span style="font-size: 12px; color: var(--slate-500); font-weight: 500;">
                            Estatus: ${viaje.estatus || 'Registrado'}
                        </span>
                        <hr style="margin: 8px 0; border: 0; border-top: 1px solid #e2e8f0;">
                        <div style="font-size: 12px; color: var(--slate-700); text-align: left; line-height: 1.5;">
                            👤 <b>Pasajero:</b> ${viaje.nombre || 'Desconocido'} ${viaje.apellidos || ''}<br>
                            📅 <b>Salida:</b> ${fSalida}<br>
                            🔙 <b>Regreso:</b> ${fRegreso}
                        </div>
                    </div>
                `);
            }
        }

    } catch (err) {
        console.error('Error procesando el mapa:', err);
    }
}