let map;
let currentMarker;
let tempCoords = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    renderList();
    setupEventListeners();
});

function initMap() {
    // Default UK area (approximateKatanga coordinates or placeholder)
    // UK is often used for University of Katanga (-11.66, 27.48)
    const defaultCoords = [-11.6607, 27.4842];
    
    map = L.map('map', {
        zoomControl: false,
        attributionControl: true
    }).setView(defaultCoords, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Add scale
    L.control.scale({ position: 'bottomleft' }).addTo(map);
}

function setupEventListeners() {
    const getBtn = document.getElementById('get-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const input = document.getElementById('location-name');

    getBtn.addEventListener('click', captureLocation);
    
    saveBtn.addEventListener('click', () => {
        const name = input.value.trim();
        if (!name) {
            alert('Veuillez entrer un nom pour cette position.');
            return;
        }
        saveLocation(name);
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
    
    status.classList.remove('hidden');
    btn.style.opacity = '0.5';
    btn.disabled = true;

    if (!navigator.geolocation) {
        alert('La géolocalisation n\'est pas supportée par votre navigateur.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            tempCoords = { lat: latitude, lng: longitude };
            
            // Update UI
            document.getElementById('lat').textContent = latitude.toFixed(6);
            document.getElementById('lng').textContent = longitude.toFixed(6);
            
            // Show Card
            showCaptureCard();
            
            // Update Map
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
            console.error(error);
            alert('Impossible de récupérer votre position. Vérifiez vos permissions.');
            status.classList.add('hidden');
            btn.style.opacity = '1';
            btn.disabled = false;
        },
        { enableHighAccuracy: true }
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

function saveLocation(name) {
    const newLocation = {
        id: Date.now(),
        name: name,
        lat: tempCoords.lat,
        lng: tempCoords.lng,
        timestamp: new Date().toLocaleString('fr-FR')
    };

    Storage.save(newLocation);
    renderList();
    hideCaptureCard();
    
    // Add permanent marker
    L.marker([newLocation.lat, newLocation.lng])
        .addTo(map)
        .bindPopup(`<b>${newLocation.name}</b><br>${newLocation.timestamp}`);
}

function renderList() {
    const list = document.getElementById('location-list');
    const count = document.getElementById('count');
    const locations = Storage.getAll();
    
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
                <p style="font-size: 10px; opacity: 0.6">${loc.timestamp}</p>
            </div>
            <button class="delete-btn" onclick="deleteLoc(${loc.id})">
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
            </button>
        `;
        
        item.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) return;
            map.setView([loc.lat, loc.lng], 18);
        });
        
        list.appendChild(item);

        // Also add markers for all saved locations
        L.marker([loc.lat, loc.lng])
            .addTo(map)
            .bindPopup(`<b>${loc.name}</b>`);
    });
}

function deleteLoc(id) {
    if (confirm('Voulez-vous supprimer cette position ?')) {
        Storage.delete(id);
        renderList();
        // Refresh map markers
        map.eachLayer((layer) => {
            if (layer instanceof L.Marker) map.removeLayer(layer);
        });
        renderList(); // Re-adds markers
    }
}

// Global expose for onclick
window.deleteLoc = deleteLoc;
