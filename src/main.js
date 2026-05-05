import './style.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import { Storage } from './storage';

let map;
let currentMarker;
let tempCoords = null;
let allLocations = [];
let markerClusterGroup;
let currentFilter = 'all';
let currentSearch = '';
let stream = null;
let capturedBlobs = [];
let existingUrls = [];

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    initMap();
    await refreshData();
    setupEventListeners();
    initCustomSelect();

    // Subscribe to real-time updates
    Storage.subscribeToChanges(() => {
        refreshData();
    });
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

    markerClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50
    });
    map.addLayer(markerClusterGroup);
}

function setupEventListeners() {
    const getBtn = document.getElementById('get-btn');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const nameInput = document.getElementById('location-name');
    const searchInput = document.getElementById('search-input');
    const filterTabs = document.querySelectorAll('.filter-tab');

    if (getBtn) getBtn.addEventListener('click', captureLocation);

    if (saveBtn) saveBtn.addEventListener('click', handleSave);

    if (cancelBtn) cancelBtn.addEventListener('click', hideCaptureCard);

    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSave();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase();
            renderList();
        });
    }

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderList();
        });
    });

    const captureBtn = document.getElementById('capture-btn');
    const shutterBtn = document.getElementById('shutter-btn');

    if (captureBtn) captureBtn.addEventListener('click', toggleCamera);
    if (shutterBtn) shutterBtn.addEventListener('click', takePhoto);
}

function initCustomSelect() {
    const container = document.getElementById('type-select-container');
    const trigger = document.getElementById('select-trigger');
    const options = document.querySelectorAll('.option');
    const hiddenInput = document.getElementById('location-type');
    const selectedText = document.getElementById('selected-type-text');

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        container.classList.toggle('open');
    });

    options.forEach(option => {
        option.addEventListener('click', () => {
            const val = option.dataset.value;
            setCustomSelectValue(val);
            container.classList.remove('open');
        });
    });

    document.addEventListener('click', () => {
        container.classList.remove('open');
    });
}

function setCustomSelectValue(val) {
    const hiddenInput = document.getElementById('location-type');
    const selectedText = document.getElementById('selected-type-text');
    const options = document.querySelectorAll('.option');

    hiddenInput.value = val;
    selectedText.textContent = val;

    options.forEach(opt => {
        if (opt.dataset.value === val) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}

async function refreshData() {
    allLocations = await Storage.getAll();
    renderList();
}

function captureLocation() {
    const status = document.getElementById('status-indicator');
    const btn = document.getElementById('get-btn');

    if (!window.isSecureContext) {
        showToast("Erreur de sécurité : La géolocalisation nécessite HTTPS.", "error");
        return;
    }

    status.classList.remove('hidden');
    btn.classList.add('hidden');

    if (!navigator.geolocation) {
        showToast('Géolocalisation non supportée.', 'error');
        status.classList.add('hidden');
        btn.classList.remove('hidden');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            tempCoords = { lat: latitude, lng: longitude };

            document.getElementById('lat').textContent = latitude.toFixed(6);
            document.getElementById('lng').textContent = longitude.toFixed(6);

            // Reset fields for NEW position
            document.getElementById('location-id').value = '';
            document.getElementById('location-name').value = '';
            document.getElementById('location-description').value = '';
            setCustomSelectValue('Autre');

            // Reset photo
            existingUrls = [];
            resetCamera();

            showCaptureCard();

            map.setView([latitude, longitude], 18);
            if (currentMarker) map.removeLayer(currentMarker);
            currentMarker = L.marker([latitude, longitude]).addTo(map)
                .bindPopup("Position actuelle")
                .openPopup();

            status.classList.add('hidden');
        },
        (error) => {
            showToast('Erreur de localisation : ' + error.message, 'error');
            status.classList.add('hidden');
            btn.classList.remove('hidden');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function showCaptureCard(isEdit = false) {
    const card = document.getElementById('capture-card');
    const title = card.querySelector('h3');
    const saveBtn = document.getElementById('save-btn');

    title.textContent = isEdit ? 'Modifier Position' : 'Nouvelle Position';
    saveBtn.textContent = isEdit ? 'Mettre à jour' : 'Sauvegarder';

    card.classList.remove('hidden');
    document.getElementById('list-container').classList.add('hidden');
    document.getElementById('get-btn').classList.add('hidden');
    document.getElementById('location-name').focus();
}

function hideCaptureCard() {
    document.getElementById('capture-card').classList.add('hidden');
    document.getElementById('list-container').classList.remove('hidden');
    document.getElementById('get-btn').classList.remove('hidden');
    if (currentMarker) map.removeLayer(currentMarker);
    tempCoords = null;
    stopCamera();
}

async function toggleCamera() {
    if (!stream) {
        await startCamera();
    } else {
        stopCamera();
    }
}

async function startCamera() {
    const video = document.getElementById('video');
    const cameraContainer = document.getElementById('camera-container');
    const captureBtn = document.getElementById('capture-btn');

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        video.srcObject = stream;
        cameraContainer.classList.remove('hidden');
        captureBtn.querySelector('span').textContent = 'Fermer la caméra';
    } catch (err) {
        showToast('Impossible d\'accéder à la caméra : ' + err.message, 'error');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    document.getElementById('camera-container').classList.add('hidden');
    const captureBtn = document.getElementById('capture-btn');
    if (captureBtn) captureBtn.querySelector('span').textContent = 'Ajouter des photos';
}

function takePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
        const id = Date.now();
        capturedBlobs.push({ id, blob });
        updateGallery();
    }, 'image/jpeg', 0.8);
}

function updateGallery() {
    const gallery = document.getElementById('photo-gallery');
    gallery.innerHTML = '';

    if (capturedBlobs.length > 0 || existingUrls.length > 0) {
        gallery.classList.remove('hidden');
    } else {
        gallery.classList.add('hidden');
    }

    // Render existing URLs
    existingUrls.forEach((url, index) => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.innerHTML = `
            <img src="${url}">
            <button class="remove-photo">&times;</button>
        `;
        div.querySelector('.remove-photo').addEventListener('click', () => {
            existingUrls.splice(index, 1);
            updateGallery();
        });
        gallery.appendChild(div);
    });

    // Render new Blobs
    capturedBlobs.forEach((item, index) => {
        const url = URL.createObjectURL(item.blob);
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.innerHTML = `
            <img src="${url}">
            <button class="remove-photo" data-id="${item.id}">&times;</button>
        `;
        div.querySelector('.remove-photo').addEventListener('click', () => {
            capturedBlobs = capturedBlobs.filter(b => b.id !== item.id);
            updateGallery();
        });
        gallery.appendChild(div);
    });
}

function resetCamera() {
    capturedBlobs = [];
    updateGallery();
    stopCamera();
}

async function handleSave() {
    const nameInput = document.getElementById('location-name');
    const name = nameInput.value.trim();
    const description = document.getElementById('location-description').value.trim();
    const id = document.getElementById('location-id').value;
    const type = document.getElementById('location-type').value;
    const campusRadio = document.querySelector('input[name="campus"]:checked');
    const campus = campusRadio ? campusRadio.value : 'Sud';
    const saveBtn = document.getElementById('save-btn');

    if (!name) {
        showToast('Veuillez entrer un nom.', 'info');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Patientez...';

    try {
        const imageUrls = [...existingUrls];

        if (capturedBlobs.length > 0) {
            const cleanName = name.replace(/\s+/g, '_').toLowerCase();
            const cleanCampus = campus.toLowerCase();

            // Upload all images in parallel
            const uploadPromises = capturedBlobs.map(async (item, index) => {
                const fileName = `${cleanName}_${cleanCampus}_${index}.jpg`;
                return await Storage.uploadImage(item.blob, fileName);
            });

            const results = await Promise.all(uploadPromises);
            imageUrls.push(...results);
        }

        const locationData = { name, campus, type, description, image_urls: imageUrls };

        if (id) {
            // Update
            await Storage.update(id, locationData);
        } else {
            // Create
            locationData.lat = tempCoords.lat;
            locationData.lng = tempCoords.lng;
            await Storage.save(locationData);
        }
        await refreshData();
        hideCaptureCard();
        showToast(id ? 'Position mise à jour !' : 'Position enregistrée !', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'enregistrement : ' + (err.message || 'Erreur inconnue'), 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = id ? 'Mettre à jour' : 'Sauvegarder';
    }
}

function renderList() {
    const list = document.getElementById('location-list');
    const countSpan = document.getElementById('count');

    if (!list) return;

    // Filter locations
    const filtered = allLocations.filter(loc => {
        const matchesSearch = loc.name.toLowerCase().includes(currentSearch);
        const matchesCampus = currentFilter === 'all' || loc.campus === currentFilter;
        return matchesSearch && matchesCampus;
    });

    countSpan.textContent = filtered.length;

    // Clear Map
    markerClusterGroup.clearLayers();

    if (filtered.length === 0) {
        list.innerHTML = '<div class="empty-state">Aucun résultat.</div>';
        return;
    }

    list.innerHTML = '';
    filtered.forEach(loc => {
        const item = document.createElement('div');
        item.className = 'location-item';
        const campusClass = loc.campus.toLowerCase();

        item.innerHTML = `
            <div class="item-top">
                <div class="loc-info">
                    <h4>
                        ${loc.name} 
                        <span class="campus-badge ${campusClass}">${loc.campus}</span>
                    </h4>
                    <div style="display:flex; gap:5px; margin: 4px 0;">
                        <span class="type-badge">${loc.type || 'Autre'}</span>
                    </div>
                    ${loc.description ? `<p class="loc-description">${loc.description}</p>` : ''}
                    <p>${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}</p>
                </div>
                <div class="action-btns">
                    <button class="nav-btn" title="Itinéraire">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    </button>
                    <button class="edit-btn" title="Modifier">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                    </button>
                    <button class="delete-btn" title="Supprimer">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
            ${loc.image_urls && loc.image_urls.length > 0 ? `
                <div class="images-container">
                    ${loc.image_urls.map(url => `<img src="${url}" loading="lazy">`).join('')}
                </div>
            ` : ''}
        `;

        item.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            map.setView([loc.lat, loc.lng], 18);
        });

        item.querySelector('.nav-btn').addEventListener('click', () => openInMaps(loc.lat, loc.lng));
        item.querySelector('.edit-btn').addEventListener('click', () => startEdit(loc));
        item.querySelector('.delete-btn').addEventListener('click', () => deleteLoc(loc.id));

        list.appendChild(item);

        // Add to Cluster with specific icons
        const icons = {
            'Amphi': '🎓',
            'Salle de cours': '📖',
            'Bureau': '💼',
            'Labo': '🔬',
            'Cafétéria': '☕',
            'Bibliothèque': '📚',
            'Autre': '📍'
        };

        const iconHtml = `
            <div style="
                background: var(--primary); 
                width: 30px; height: 30px; 
                border-radius: 50% 50% 50% 0; 
                transform: rotate(-45deg); 
                display: flex; align-items: center; justify-content: center;
                border: 2px solid white;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
            ">
                <span style="transform: rotate(45deg); font-size: 14px;">${icons[loc.type] || '📍'}</span>
            </div>
        `;

        const customIcon = L.divIcon({
            html: iconHtml,
            className: 'custom-marker',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon })
            .bindPopup(`
                <b>${loc.name}</b><br>
                <i style="font-size: 11px;">${loc.type || 'Autre'}</i>
                ${loc.description ? `<p style="font-size: 12px; margin-top: 5px; border-top: 1px solid #eee; pt-5">${loc.description}</p>` : ''}
            `);
        markerClusterGroup.addLayer(marker);
    });
}

function startEdit(loc) {
    document.getElementById('location-id').value = loc.id;
    document.getElementById('location-name').value = loc.name;
    document.getElementById('location-description').value = loc.description || '';
    setCustomSelectValue(loc.type || 'Autre');

    // Set campus radio
    const radio = document.querySelector(`input[name="campus"][value="${loc.campus}"]`);
    if (radio) radio.checked = true;

    // Set coords display
    document.getElementById('lat').textContent = loc.lat.toFixed(6);
    document.getElementById('lng').textContent = loc.lng.toFixed(6);

    tempCoords = { lat: loc.lat, lng: loc.lng };

    // Load existing images
    existingUrls = [...(loc.image_urls || [])];
    capturedBlobs = [];
    updateGallery();

    showCaptureCard(true);

    map.setView([loc.lat, loc.lng], 18);
    if (currentMarker) map.removeLayer(currentMarker);
    currentMarker = L.marker([loc.lat, loc.lng]).addTo(map)
        .bindPopup("Édition de : " + loc.name)
        .openPopup();
}

async function deleteLoc(id) {
    showConfirm('Voulez-vous supprimer cette position ?', async () => {
        try {
            await Storage.delete(id);
            await refreshData();
            showToast('Position supprimée !', 'success');
        } catch (err) {
            showToast('Erreur lors de la suppression.', 'error');
        }
    });
}

function showConfirm(message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');

    msgEl.textContent = message;
    modal.classList.remove('hidden');

    const cleanup = () => {
        modal.classList.add('hidden');
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
    };

    const handleYes = () => {
        cleanup();
        onConfirm();
    };

    const handleNo = () => {
        cleanup();
    };

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
        <span>${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function openInMaps(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
}
