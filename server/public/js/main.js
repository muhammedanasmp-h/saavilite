/* ═══════════════════════════════════════
   SAAVI LITE — Main JavaScript
   ═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    // ── 1. Navbar Scroll Effect ──
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section, .hero');

    window.addEventListener('scroll', () => {
        // Scrolled state
        navbar.classList.toggle('scrolled', window.scrollY > 50);

        // Active nav link based on scroll position
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop - 120;
            if (window.scrollY >= top) {
                current = section.getAttribute('id');
            }
        });
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    // ── 2. Mobile Nav Toggle ──
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navLinks');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('open');
        navMenu.classList.toggle('open');
    });

    // Close mobile nav on link click
    navMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('open');
            navMenu.classList.remove('open');
        });
    });

    // ── 3. Scroll Animations (Intersection Observer) ──
    const fadeElements = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    // Stagger animation for siblings
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, index * 100);
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    fadeElements.forEach(el => observer.observe(el));

    // ── 4. Hero Particles ──
    createParticles();

    // ── 5. Gallery Loader ──
    loadGallery();


    // ── 7. Smooth scroll for CTA ──
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
});

// ══════════════════════════════
// HERO PARTICLES
// ══════════════════════════════
function createParticles() {
    const container = document.getElementById('heroParticles');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 4 + 1;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const dur = Math.random() * 3 + 4;
        const delay = Math.random() * 5;
        const isBlue = Math.random() > 0.4;

        particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}%;
      top: ${y}%;
      background: ${isBlue ? 'rgba(0, 212, 255, 0.4)' : 'rgba(0, 255, 136, 0.3)'};
      border-radius: 50%;
      animation: float ${dur}s ease-in-out ${delay}s infinite;
      pointer-events: none;
    `;
        container.appendChild(particle);
    }
}

// ══════════════════════════════
// GALLERY
// ══════════════════════════════
let galleryImages = [];
let currentLightboxIndex = 0;

async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    const emptyMsg = document.getElementById('galleryEmpty');
    if (!grid) return;

    try {
        const res = await fetch('/api/gallery');
        if (!res.ok) throw new Error('Failed to load gallery');
        galleryImages = await res.json();

        if (galleryImages.length === 0) {
            emptyMsg.style.display = 'block';
            return;
        }

        emptyMsg.style.display = 'none';
        grid.innerHTML = '';

        galleryImages.forEach((img, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item fade-in';
            item.innerHTML = `
        <img src="${img.url}" alt="${img.caption || 'Gallery image'}" loading="lazy">
        <div class="gallery-item-overlay">
          <span>${img.caption || 'View'}</span>
        </div>
      `;
            item.addEventListener('click', () => openLightbox(index));
            grid.appendChild(item);

            // Trigger fade-in
            setTimeout(() => item.classList.add('visible'), 100 + index * 80);
        });
    } catch (err) {
        console.error('Gallery load error:', err);
        emptyMsg.style.display = 'block';
    }
}

function openLightbox(index) {
    currentLightboxIndex = index;
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightboxImg');
    img.src = galleryImages[index].url;
    img.alt = galleryImages[index].caption || 'Gallery image';
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateLightbox(direction) {
    currentLightboxIndex += direction;
    if (currentLightboxIndex < 0) currentLightboxIndex = galleryImages.length - 1;
    if (currentLightboxIndex >= galleryImages.length) currentLightboxIndex = 0;

    const img = document.getElementById('lightboxImg');
    img.src = galleryImages[currentLightboxIndex].url;
    img.alt = galleryImages[currentLightboxIndex].caption || 'Gallery image';
}

// Lightbox event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev')?.addEventListener('click', () => navigateLightbox(-1));
    document.getElementById('lightboxNext')?.addEventListener('click', () => navigateLightbox(1));

    // Close on backdrop click
    document.getElementById('lightbox')?.addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') closeLightbox();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox || !lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
    });
});

