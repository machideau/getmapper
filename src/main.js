import './style.css';
import L from 'leaflet';
import { Storage } from './storage';

let map;
let currentMarker;
let tempCoords = null;

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    await renderList();
    setupEventListeners();
});

function initMap() {
    const defaultCoords = [-11.6607, 27.4842];
    
    map = L.map('map', {
        zoomControl: false,
        attributionControl: true
    }).setView(defaultCoords, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.control.scale({ position: 'bottomleft' }).addTo(map);
}

function setupEventListeners() {
    const getBtn = document.getElementById('get-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const input = document.getElementById('location-name');

    if (!getBtn) return; // Prevent errors if elements aren't loaded

    getBtn.addEventListener('click', captureLocation);
    
    saveBtn.addEventListener('click', async () => {
        const name = input.value.trim();
        if (!name) {
            alert('Veuillez entrer un nom pour cette position.');
            return;
        }
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Enregistrement...';
        
        try {
            await saveLocation(name);
        } catch (err) {
            alert('Erreur lors de la sauvegarde.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Sauvegarder';
        }
    });

    cancelBtn.addEventListener('click', () => {
        hideCaptureCard();
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveBtn.click();
    });
}

function captureLocation() {
    const status = document.getElementById('status-indicator');
    const btn = document.getElementById('get-btn');
    
    // Check for secure context (HTTPS)
    if (!window.isSecureContext) {
        alert("❌ Erreur de sécurité : La géolocalisation nécessite une connexion HTTPS (ou localhost). Si vous testez sur mobile, assurez-vous d'utiliser une URL sécurisée.");
        return;
    }

    status.classList.remove('hidden');
    btn.style.opacity = '0.5';
    btn.disabled = true;

    if (!navigator.geolocation) {
        alert('La géolocalisation n\'est pas supportée par votre navigateur.');
        status.classList.add('hidden');
        btn.style.opacity = '1';
        btn.disabled = false;
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            tempCoords = { lat: latitude, lng: longitude };
            
            document.getElementById('lat').textContent = latitude.toFixed(6);
            document.getElementById('lng').textContent = longitude.toFixed(6);
            
            showCaptureCard();
            
            map.setView([latitude, longitude], 18);
            if (currentMarker) map.removeLayer(currentMarker);
            currentMarker = L.marker([latitude, longitude]).addTo(map)
                .bindPopup("Position actuelle")
                .openPopup();

            status.classList.add('hidden');
            btn.style.opacity = '1';
            btn.disabled = false;
        },
        (error) => {
            console.error('Geolocation Error:', error);
            let msg = 'Impossible de récupérer votre position.';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    msg = "L'accès à la localisation a été refusé. Veuillez l'autoriser dans les paramètres de votre navigateur.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    msg = "Les informations de localisation sont indisponibles.";
                    break;
                case error.TIMEOUT:
                    msg = "La demande de localisation a expiré.";
                    break;
            }
            
            alert(msg);
            status.classList.add('hidden');
            btn.style.opacity = '1';
            btn.disabled = false;
        },
        { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

function showCaptureCard() {
    document.getElementById('capture-card').classList.remove('hidden');
    document.getElementById('get-btn').classList.add('hidden');
    document.getElementById('location-name').focus();
}

function hideCaptureCard() {
    document.getElementById('capture-card').classList.add('hidden');
    document.getElementById('get-btn').classList.remove('hidden');
    document.getElementById('location-name').value = '';
    if (currentMarker) map.removeLayer(currentMarker);
    tempCoords = null;
}

async function saveLocation(name) {
    const newLocation = {
        name: name,
        lat: tempCoords.lat,
        lng: tempCoords.lng
    };

    await Storage.save(newLocation);
    await renderList();
    hideCaptureCard();
}

async function renderList() {
    const list = document.getElementById('location-list');
    const count = document.getElementById('count');
    
    if (!list) return;

    // Clear existing markers first
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer !== currentMarker) map.removeLayer(layer);
    });

    const locations = await Storage.getAll();
    count.textContent = locations.length;
    
    if (locations.length === 0) {
        list.innerHTML = '<div class="empty-state">Aucune position enregistrée.</div>';
        return;
    }

    list.innerHTML = '';
    locations.forEach(loc => {
        const item = document.createElement('div');
        item.className = 'location-item';
        item.innerHTML = `
            <div class="loc-info">
                <h4>${loc.name}</h4>
                <p>${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</p>
                <p style="font-size: 10px; opacity: 0.6">${new Date(loc.created_at).toLocaleString('fr-FR')}</p>
            </div>
            <button class="delete-btn" data-id="${loc.id}">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;
        
        item.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) return;
            map.setView([loc.lat, loc.lng], 18);
        });

        const deleteBtn = item.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', () => deleteLoc(loc.id));
        
        list.appendChild(item);

        L.marker([loc.lat, loc.lng])
            .addTo(map)
            .bindPopup(`<b>${loc.name}</b>`);
    });
}

async function deleteLoc(id) {
    if (confirm('Voulez-vous supprimer cette position ?')) {
        try {
            await Storage.delete(id);
            await renderList();
        } catch (err) {
            alert('Erreur lors de la suppression.');
        }
    }
}
