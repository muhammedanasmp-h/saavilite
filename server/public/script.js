// Hero Canvas Animation (Tech Grid)
// ... (Keeping existing hero animation logic)
const canvas = document.getElementById('hero-canvas');
const ctx = canvas.getContext('2d');
let width, height, dots = [];
const spacing = 40, mouseRange = 150;
let mouse = { x: -1000, y: -1000 };

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initDots();
}
function initDots() {
    dots = [];
    for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
            dots.push({ x, y, originX: x, originY: y });
        }
    }
}
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
function animate() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(34, 211, 238, 0.5)';
    dots.forEach(dot => {
        const dx = mouse.x - dot.x, dy = mouse.y - dot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseRange) {
            const angle = Math.atan2(dy, dx), force = (mouseRange - dist) / mouseRange;
            dot.x -= Math.cos(angle) * force * 10; dot.y -= Math.sin(angle) * force * 10;
        } else {
            dot.x += (dot.originX - dot.x) * 0.1; dot.y += (dot.originY - dot.y) * 0.1;
        }
        ctx.beginPath(); ctx.arc(dot.x, dot.y, 1, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(animate);
}
window.addEventListener('resize', resize);
resize(); animate();

// Gallery Logic
let itemsShown = 9;
let currentFilter = 'all';
let filteredData = [];
let allGalleryData = [];

const galleryGrid = document.getElementById('gallery-grid');
const loadMoreBtn = document.getElementById('load-more');
const filterBtns = document.querySelectorAll('.filter-btn');

async function fetchGallery() {
    try {
        // Show skeleton loading or clear grid
        galleryGrid.innerHTML = '<div class="loading-state">Loading projects from secure vault...</div>';

        const res = await fetch('/api/gallery?limit=100');
        const data = await res.json();
        allGalleryData = data;

        // If API returns no images, use placeholders as fallback for demo
        if (allGalleryData.length === 0) {
            allGalleryData = [
                { src: 'https://images.unsplash.com/photo-1557597774-9d2739f85a76', category: 'CCTV Installation', title: 'CCTV Installation Kazhakuttom' },
                { src: 'https://images.unsplash.com/photo-1590483734724-383b9f4bad32', category: 'LED Board Installation', title: 'LED Board at Night' }
            ];
        }

        filterAndRender();
    } catch (err) {
        galleryGrid.innerHTML = '<div class="error-state">Failed to load projects. Please try again.</div>';
    }
}

function filterAndRender(append = false) {
    const filterMap = {
        'all': 'all',
        'cctv-installation': 'CCTV Installation',
        'cctv-maintenance': 'CCTV Maintenance',
        'led-board': 'LED Board Installation',
        'completed': 'Completed Projects'
    };

    const mappedFilter = filterMap[currentFilter];
    filteredData = mappedFilter === 'all' ? allGalleryData : allGalleryData.filter(i => i.category === mappedFilter);

    renderGallery(append);
}

function renderGallery(append = false) {
    if (!append) galleryGrid.innerHTML = '';

    const start = append ? itemsShown - 9 : 0;
    const dataToRender = filteredData.slice(start, itemsShown);

    dataToRender.forEach((item, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.style.opacity = '0';
        galleryItem.style.transform = 'translateY(20px)';

        const imgUrl = item.imageUrl || (item.src + '?auto=format&fit=crop&q=80&w=800');

        galleryItem.innerHTML = `
            <img src="${imgUrl}" alt="${item.title}" loading="lazy">
            <div class="gallery-overlay">
                <span>${item.title}</span>
            </div>
        `;

        galleryGrid.appendChild(galleryItem);

        setTimeout(() => {
            galleryItem.style.opacity = '1';
            galleryItem.style.transform = 'translateY(0)';
        }, index * 100);

        galleryItem.addEventListener('click', () => openLightbox(index + start));
    });

    loadMoreBtn.parentElement.style.display = itemsShown >= filteredData.length ? 'none' : 'block';
}

// Filtering
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        itemsShown = 9;
        filterAndRender();
    });
});

// Load More
loadMoreBtn.addEventListener('click', () => {
    itemsShown += 9;
    filterAndRender(true);
});

// Advanced Lightbox
let currentImgIndex = 0;
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lightbox-img');
const lbCaption = document.getElementById('lightbox-caption');
const prevBtn = document.querySelector('.lightbox-nav.prev');
const nextBtn = document.querySelector('.lightbox-nav.next');

function openLightbox(index) {
    currentImgIndex = index;
    updateLightbox();
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function updateLightbox() {
    const item = filteredData[currentImgIndex];
    if (!item) return;
    const imgUrl = item.imageUrl || (item.src + '?auto=format&fit=crop&q=80&w=1200');
    lbImg.src = imgUrl;
    lbCaption.textContent = item.title;
}

prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentImgIndex = (currentImgIndex - 1 + filteredData.length) % filteredData.length;
    updateLightbox();
});

nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentImgIndex = (currentImgIndex + 1) % filteredData.length;
    updateLightbox();
});

lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('close-lightbox')) {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// Initial Load
fetchGallery();

// Smooth Scrolling & Mobile Menu (Keeping existing)
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    navLinks.style.display = navLinks.classList.contains('active') ? 'flex' : 'none';
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
            navLinks.classList.remove('active');
            if (window.innerWidth <= 768) navLinks.style.display = 'none';
        }
    });
});
