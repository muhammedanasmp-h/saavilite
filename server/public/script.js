/**
 * SAAVI LITE - Interactive Engine v2.0
 * Optimized for performance and mobile responsiveness
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECTORS
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const header = document.querySelector('header');
    const galleryGrid = document.getElementById('gallery-grid');
    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbCap = document.getElementById('lightbox-caption');

    // 2. MOBILE NAVIGATION
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.innerHTML = navLinks.classList.contains('active') ? '&times;' : '☰';
            // Prevent body scroll when menu is open
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : 'auto';
        });

        // Close menu on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuToggle.innerHTML = '☰';
                document.body.style.overflow = 'auto';
            });
        });
    }

    // 3. HEADER SCROLL DYNAMICS
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 4. GALLERY LOGIC (Async Fetch)
    async function loadGallery() {
        if (!galleryGrid) return;

        try {
            galleryGrid.innerHTML = '<div class="loading-state">Accessing work vault...</div>';

            const res = await fetch('/api/gallery');
            const data = await res.json();

            if (!data || data.length === 0) {
                galleryGrid.innerHTML = '<div class="error-state">No projects currently public.</div>';
                return;
            }

            galleryGrid.innerHTML = data.map(item => `
                <div class="gallery-item" data-title="${item.title}" data-url="${item.imageUrl}">
                    <img src="${item.imageUrl}" alt="${item.title}" loading="lazy">
                    <div class="gallery-overlay">
                        <span>View Project</span>
                    </div>
                </div>
            `).join('');

            // Attach listeners to new items
            document.querySelectorAll('.gallery-item').forEach(item => {
                item.addEventListener('click', () => {
                    openLightbox(item.dataset.url, item.dataset.title);
                });
            });

        } catch (err) {
            console.error('Gallery Load Error:', err);
            galleryGrid.innerHTML = '<div class="error-state">Failed to synchronize with database.</div>';
        }
    }

    // 5. LIGHTBOX
    function openLightbox(url, title) {
        if (!lightbox) return;
        lbImg.src = url;
        lbCap.textContent = title;
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('close-lightbox')) {
                lightbox.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    // 6. HERO CANVAS (Tech Matrix)
    const canvas = document.getElementById('hero-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let width, height, points = [];
        const spacing = 50;

        function initCanvas() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            points = [];
            for (let x = 0; x < width; x += spacing) {
                for (let y = 0; y < height; y += spacing) {
                    points.push({ x, y, ox: x, oy: y });
                }
            }
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(0, 191, 255, 0.15)';
            points.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
                ctx.fill();
            });
            requestAnimationFrame(draw);
        }

        window.addEventListener('resize', initCanvas);
        initCanvas();
        draw();
    }

    // Initial Execution
    loadGallery();
    console.log('🚀 Saavi Lite Rebuild Complete');
});
