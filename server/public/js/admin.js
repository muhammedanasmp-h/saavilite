/* ═══════════════════════════════════════
   SAAVI LITE — Admin Panel JavaScript
   ═══════════════════════════════════════ */

const API_BASE = '/api';
let authToken = localStorage.getItem('saavi_token');
let selectedFile = null;
let deleteTargetId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (authToken) {
        showDashboard();
    }

    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Upload area
    setupUploadArea();

    // Upload buttons
    document.getElementById('cancelUpload').addEventListener('click', cancelUpload);
    document.getElementById('confirmUpload').addEventListener('click', handleUpload);

    // Delete modal
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('confirmDelete').addEventListener('click', confirmDelete);
});

// ══════════════════════════════
// AUTH
// ══════════════════════════════
async function handleLogin(e) {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.textContent = '';

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            authToken = data.token;
            localStorage.setItem('saavi_token', authToken);
            showDashboard();
        } else {
            errorEl.textContent = data.error || 'Login failed.';
        }
    } catch (err) {
        errorEl.textContent = 'Network error. Please try again.';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('saavi_token');
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('loginView').style.display = 'flex';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showDashboard() {
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('dashboardView').style.display = 'block';
    loadAdminGallery();
}

// ══════════════════════════════
// UPLOAD
// ══════════════════════════════
function setupUploadArea() {
    const area = document.getElementById('uploadArea');
    const input = document.getElementById('fileInput');

    // Click to browse
    area.addEventListener('click', () => input.click());

    // Drag and drop
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('dragover');
    });

    area.addEventListener('dragleave', () => {
        area.classList.remove('dragover');
    });

    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) previewFile(file);
    });

    // File input change
    input.addEventListener('change', () => {
        if (input.files[0]) previewFile(input.files[0]);
    });
}

function previewFile(file) {
    const statusEl = document.getElementById('uploadStatus');
    statusEl.textContent = '';
    statusEl.className = 'upload-status';

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        statusEl.textContent = 'Invalid file type. Use JPG, PNG, WebP, or GIF.';
        statusEl.className = 'upload-status error';
        return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        statusEl.textContent = 'File too large. Max 5MB.';
        statusEl.className = 'upload-status error';
        return;
    }

    selectedFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('previewArea').style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

function cancelUpload() {
    selectedFile = null;
    document.getElementById('previewArea').style.display = 'none';
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('fileInput').value = '';
    document.getElementById('captionInput').value = '';
    document.getElementById('uploadStatus').textContent = '';
}

async function handleUpload() {
    if (!selectedFile) return;

    const statusEl = document.getElementById('uploadStatus');
    const btn = document.getElementById('confirmUpload');
    const caption = document.getElementById('captionInput').value.trim();

    btn.disabled = true;
    btn.textContent = 'Uploading...';
    statusEl.textContent = '';

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('caption', caption);

    try {
        const res = await fetch(`${API_BASE}/gallery`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        const data = await res.json();

        if (res.ok) {
            statusEl.textContent = 'Image uploaded successfully!';
            statusEl.className = 'upload-status success';
            cancelUpload();
            loadAdminGallery();
        } else if (res.status === 401) {
            handleLogout();
        } else {
            statusEl.textContent = data.error || 'Upload failed.';
            statusEl.className = 'upload-status error';
        }
    } catch (err) {
        statusEl.textContent = 'Network error during upload.';
        statusEl.className = 'upload-status error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Upload';
    }
}

// ══════════════════════════════
// GALLERY MANAGEMENT
// ══════════════════════════════
async function loadAdminGallery() {
    const grid = document.getElementById('adminGallery');
    const emptyMsg = document.getElementById('adminGalleryEmpty');
    const countEl = document.getElementById('photoCount');

    try {
        const res = await fetch(`${API_BASE}/gallery`);
        if (!res.ok) throw new Error('Failed to load');
        const images = await res.json();

        countEl.textContent = `${images.length} / 30`;

        if (images.length === 0) {
            grid.innerHTML = '';
            emptyMsg.style.display = 'block';
            return;
        }

        emptyMsg.style.display = 'none';
        grid.innerHTML = images.map(img => `
      <div class="admin-gallery-item">
        <img src="${img.url}" alt="${img.caption || 'Gallery image'}" loading="lazy">
        <button class="delete-btn" onclick="openDeleteModal('${img._id}')" title="Delete image">&times;</button>
      </div>
    `).join('');
    } catch (err) {
        console.error('Gallery load error:', err);
    }
}

function openDeleteModal(id) {
    deleteTargetId = id;
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    deleteTargetId = null;
    document.getElementById('deleteModal').style.display = 'none';
}

async function confirmDelete() {
    if (!deleteTargetId) return;

    const btn = document.getElementById('confirmDelete');
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
        const res = await fetch(`${API_BASE}/gallery/${deleteTargetId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            closeDeleteModal();
            loadAdminGallery();
        } else if (res.status === 401) {
            handleLogout();
        } else {
            const data = await res.json();
            alert(data.error || 'Delete failed.');
        }
    } catch (err) {
        alert('Network error during deletion.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Delete';
    }
}
