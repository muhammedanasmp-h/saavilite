// let token = localStorage.getItem('token'); // Removed for session-based auth
const api = '/api/gallery';

async function checkAuth() {
    try {
        const res = await fetch('/api/admin/status');
        if (res.ok) {
            document.getElementById('login-overlay').style.display = 'none';
            document.getElementById('admin-panel').style.display = 'block';
            loadGallery();
        } else {
            document.getElementById('login-overlay').style.display = 'flex';
            document.getElementById('admin-panel').style.display = 'none';
        }
    } catch (err) {
        console.error('Auth check failed:', err);
    }
}

document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: e.target.user.value, password: e.target.pass.value })
        });
        const data = await res.json();
        if (res.ok) {
            checkAuth();
        } else { alert(data.message || 'Login failed'); }
    } catch (err) { alert('Connection error'); }
};

async function logout() {
    try {
        await fetch('/api/admin/logout');
    } catch (err) { }
    location.reload();
}

async function loadGallery() {
    try {
        const res = await fetch(api);
        if (res.status === 401) {
            checkAuth(); // Redirect to login
            return;
        }

        const data = await res.json();
        const list = document.getElementById('gallery-list');
        const count = document.getElementById('count');
        list.innerHTML = '';
        count.innerText = data.length;
        data.forEach(item => {
            list.innerHTML += `
                <div class="item">
                    <img src="${item.imageUrl}">
                    <div class="item-info">
                        <div class="item-title">${item.title}</div>
                        <div class="item-cat">${item.category}</div>
                        <div class="actions">
                            <button class="secondary" onclick='editItem(${JSON.stringify(item)})'>Edit</button>
                            <button class="danger" onclick="deleteItem('${item._id}')">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (err) { console.error(err); }
}

document.getElementById('gallery-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const file = document.getElementById('image').files[0];

    if (!id && !file) return alert('Image is required for new projects');

    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('category', document.getElementById('category').value);
    formData.append('description', document.getElementById('desc').value);
    if (file) formData.append('image', file);

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${api}/${id}` : api;

    const loader = document.getElementById('upload-loading');
    const btn = document.getElementById('submit-btn');
    loader.style.display = 'block';
    btn.disabled = true;

    try {
        const res = await fetch(url, {
            method: method,
            body: formData
        });
        const result = await res.json();
        if (res.ok) {
            resetForm();
            loadGallery();
            alert(id ? 'Updated successfully' : 'Uploaded successfully');
        } else {
            alert(result.message || 'Action failed');
        }
    } catch (err) { alert('Network error'); }
    finally {
        loader.style.display = 'none';
        btn.disabled = false;
    }
};

function editItem(item) {
    document.getElementById('form-title').innerText = 'Edit Project';
    document.getElementById('edit-id').value = item._id;
    document.getElementById('title').value = item.title;
    document.getElementById('category').value = item.category;
    document.getElementById('desc').value = item.description || '';
    document.getElementById('submit-btn').innerText = 'Update Project';
    document.getElementById('cancel-btn').style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('form-title').innerText = 'Add Gallery Image';
    document.getElementById('edit-id').value = '';
    document.getElementById('gallery-form').reset();
    document.getElementById('submit-btn').innerText = 'Upload Project';
    document.getElementById('cancel-btn').style.display = 'none';
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
        const res = await fetch(`${api}/${id}`, {
            method: 'DELETE'
        });
        if (res.ok) loadGallery();
        else alert('Delete failed');
    } catch (err) { alert('Network error'); }
}

checkAuth();
