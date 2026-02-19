/**
 * SAAVI LITE - Admin Management Engine v2.0
 * Secure session-based project management
 */

const API_BASE = '/api/gallery';

async function checkAuth() {
    try {
        const res = await fetch('/api/admin/status');
        const data = await res.json();

        if (data.authenticated) {
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            loadAdminGallery();
        } else {
            showLoginView();
        }
    } catch (err) {
        showLoginView();
    }
}

function showLoginView() {
    document.getElementById('login-overlay').style.display = 'flex';
    document.getElementById('admin-panel').style.display = 'none';
}

// 1. LOGIN HANDLER
document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Authenticating...';

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: e.target.user.value,
                password: e.target.pass.value
            })
        });

        if (res.ok) {
            await checkAuth();
        } else {
            alert('Invalid credentials. Please verify and try again.');
        }
    } catch (err) {
        alert('Security connection failed. Check your network.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Access System';
    }
};

// 2. LOGOUT
async function logout() {
    await fetch('/api/admin/logout');
    location.reload();
}

// 3. LOAD GALLERY
async function loadAdminGallery() {
    try {
        const res = await fetch(API_BASE);
        if (res.status === 401) return showLoginView();

        const data = await res.json();
        const list = document.getElementById('gallery-list');
        const count = document.getElementById('count');

        count.innerText = data.length;
        list.innerHTML = data.map(item => `
            <div class="item">
                <img src="${item.imageUrl}" alt="${item.title}">
                <div class="item-info">
                    <div class="item-title">${item.title}</div>
                    <div class="item-cat">${item.category}</div>
                    <div class="actions">
                        <button class="secondary" onclick='initEdit(${JSON.stringify(item)})'>Edit</button>
                        <button class="danger" onclick="deleteProject('${item._id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Gallery Fetch Error:', err);
    }
}

// 4. SUBMIT / EDIT HANDLER
document.getElementById('gallery-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const file = document.getElementById('image').files[0];

    if (!id && !file) return alert('An image is required for new projects.');

    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('category', document.getElementById('category').value);
    formData.append('description', document.getElementById('desc').value);
    if (file) formData.append('image', file);

    const loader = document.getElementById('upload-loading');
    const btn = document.getElementById('submit-btn');

    loader.style.display = 'block';
    btn.disabled = true;

    try {
        const url = id ? `${API_BASE}/${id}` : API_BASE;
        const res = await fetch(url, {
            method: id ? 'PUT' : 'POST',
            body: formData
        });

        if (res.ok) {
            resetAdminForm();
            loadAdminGallery();
            alert(id ? 'Project Updated Successfully' : 'New Project Launched Successfully');
        } else {
            const err = await res.json();
            alert(err.message || 'Transmission Failed');
        }
    } catch (err) {
        alert('Network stabilization error.');
    } finally {
        loader.style.display = 'none';
        btn.disabled = false;
    }
};

function initEdit(item) {
    document.getElementById('form-title').innerText = 'Modify Project';
    document.getElementById('edit-id').value = item._id;
    document.getElementById('title').value = item.title;
    document.getElementById('category').value = item.category;
    document.getElementById('desc').value = item.description || '';
    document.getElementById('submit-btn').innerText = 'Save Changes';
    document.getElementById('cancel-btn').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetAdminForm() {
    document.getElementById('form-title').innerText = 'Add Gallery Image';
    document.getElementById('edit-id').value = '';
    document.getElementById('gallery-form').reset();
    document.getElementById('submit-btn').innerText = 'Upload Project';
    document.getElementById('cancel-btn').style.display = 'none';
}

async function deleteProject(id) {
    if (!confirm('Permanent deletion? This action cannot be undone.')) return;
    try {
        const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
        if (res.ok) loadAdminGallery();
        else alert('Deletion failed.');
    } catch (err) {
        alert('Network error.');
    }
}

// Init
checkAuth();
