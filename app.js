/* ===== BIRTHDAY SITE V4 — APP.JS ===== */
(function () {
  'use strict';

  // State
  let currentPage = 'hub';
  let isTransitioning = false;
  let mouseX = 0, mouseY = 0;
  let particleAnimId = null;

  // DOM refs
  const cursorGlow = document.getElementById('cursor-glow');
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  const scanlines = document.getElementById('scanlines');
  const overlay = document.getElementById('transition-overlay');
  const luluxPopup = document.getElementById('lulux-popup');

  // ===== CANVAS SETUP =====
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ===== CURSOR GLOW =====
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorGlow.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
  });

  function updateCursorColor(accent) {
    const r = parseInt(accent.slice(1, 3), 16);
    const g = parseInt(accent.slice(3, 5), 16);
    const b = parseInt(accent.slice(5, 7), 16);
    cursorGlow.style.background = `radial-gradient(circle, rgba(${r},${g},${b},0.15) 0%, transparent 70%)`;
  }

  // ===== PARTICLES =====
  let particles = [];

  const particleConfigs = {
    stars: { count: 60, speed: 0.3, size: [1, 3], drift: true },
    embers: { count: 45, speed: 0.8, size: [1, 4], rise: true },
    cosmic: { count: 50, speed: 0.2, size: [1, 3], drift: true },
    sparkle: { count: 40, speed: 0.4, size: [1, 3], twinkle: true },
    sparks: { count: 35, speed: 0.6, size: [1, 3], rise: true },
    mist: { count: 25, speed: 0.15, size: [3, 8], drift: true, mist: true },
    fireflies: { count: 30, speed: 0.25, size: [2, 5], twinkle: true, drift: true },
    hexagons: { count: 20, speed: 0.2, size: [4, 10], drift: true, hex: true },
    petals: { count: 35, speed: 0.4, size: [2, 5], fall: true },
    motes: { count: 40, speed: 0.3, size: [1, 3], fall: true, twinkle: true }
  };

  function createParticles(colorStr, type) {
    const config = particleConfigs[type] || particleConfigs.stars;
    const rgb = colorStr.split(',').map(Number);
    particles = [];
    for (let i = 0; i < config.count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: config.size[0] + Math.random() * (config.size[1] - config.size[0]),
        vx: (Math.random() - 0.5) * config.speed,
        vy: config.rise ? -Math.random() * config.speed * 2 :
            config.fall ? Math.random() * config.speed * 1.5 :
            (Math.random() - 0.5) * config.speed,
        alpha: 0.2 + Math.random() * 0.6,
        alphaDir: config.twinkle ? (Math.random() > 0.5 ? 1 : -1) : 0,
        rgb: rgb,
        mist: config.mist || false,
        hex: config.hex || false,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02
      });
    }
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.mist) {
        // Soft misty blob
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        grad.addColorStop(0, `rgba(${p.rgb.join(',')},0.15)`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - p.r * 4, p.y - p.r * 4, p.r * 8, p.r * 8);
      } else if (p.hex) {
        // Hexagon shape
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const hx = Math.cos(a) * p.r;
          const hy = Math.sin(a) * p.r;
          i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(${p.rgb.join(',')},${p.alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Regular dot/circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.rgb.join(',')},${p.alpha})`;
        ctx.fill();
      }

      ctx.restore();

      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.rotSpeed;

      // Twinkle
      if (p.alphaDir !== 0) {
        p.alpha += p.alphaDir * 0.008;
        if (p.alpha > 0.8) p.alphaDir = -1;
        if (p.alpha < 0.1) p.alphaDir = 1;
      }

      // Wrap around
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;
    }
    particleAnimId = requestAnimationFrame(drawParticles);
  }

  // ===== CHARACTER PARALLAX =====
  function updateParallax() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    const imgs = activePage.querySelectorAll('[data-parallax]');
    const cx = (mouseX / window.innerWidth - 0.5) * 2;
    const cy = (mouseY / window.innerHeight - 0.5) * 2;
    imgs.forEach(img => {
      const offsetX = cx * -15; // 2-3% of a ~500px element
      const offsetY = cy * -10;
      img.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    });
    requestAnimationFrame(updateParallax);
  }
  requestAnimationFrame(updateParallax);

  // ===== SCROLL REVEAL =====
  function setupReveal() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  // Add reveal class to placeholders
  document.querySelectorAll('.placeholder').forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${i * 80}ms`;
  });
  document.querySelectorAll('.section-title').forEach(el => el.classList.add('reveal'));
  setupReveal();

  // ===== NAVIGATION =====
  function getPageEl(id) {
    return document.getElementById(id);
  }

  function showPage(targetId, transitionType) {
    if (isTransitioning || targetId === currentPage) return;
    isTransitioning = true;

    const currentEl = getPageEl(currentPage);
    const targetEl = getPageEl(targetId);
    if (!targetEl) { isTransitioning = false; return; }

    const targetAccent = targetEl.dataset.accent || '#4f98a3';
    const targetBg = targetEl.dataset.bg || '#0a0a0f';
    const particleColor = targetEl.dataset.particleColor || '79,152,163';
    const particleType = targetEl.dataset.particleType || 'stars';

    // Update scanlines
    const hasScanlines = targetEl.classList.contains('has-scanlines');
    scanlines.classList.toggle('visible', hasScanlines);
    scanlines.classList.toggle('hidden', !hasScanlines);

    // Update cursor glow
    updateCursorColor(targetAccent);

    // Determine transition
    if (transitionType === 'portal') {
      // Hub -> anime: overlay zoom
      overlay.style.background = targetBg;
      overlay.classList.add('active');
      setTimeout(() => {
        currentEl.classList.remove('active');
        currentEl.classList.add('hidden');
        targetEl.classList.remove('hidden');
        targetEl.classList.add('active');
        document.body.style.background = targetBg;

        // Reset reveal animations
        resetReveals(targetEl);

        // Update particles
        createParticles(particleColor, particleType);

        setTimeout(() => {
          overlay.classList.remove('active');
          currentPage = targetId;
          isTransitioning = false;
        }, 300);
      }, 400);

    } else if (transitionType === 'sub') {
      // Sub-page slide transition
      // Determine direction based on page order
      const allPages = [...document.querySelectorAll('.page')];
      const currentIdx = allPages.indexOf(currentEl);
      const targetIdx = allPages.indexOf(targetEl);
      const goingRight = targetIdx > currentIdx;

      currentEl.classList.add(goingRight ? 'slide-out-left' : 'slide-out-right');

      setTimeout(() => {
        currentEl.classList.remove('active', 'slide-out-left', 'slide-out-right');
        currentEl.classList.add('hidden');
        targetEl.classList.remove('hidden');
        targetEl.classList.add('active', goingRight ? 'slide-in-right' : 'slide-in-left');
        document.body.style.background = targetBg;

        resetReveals(targetEl);
        createParticles(particleColor, particleType);

        setTimeout(() => {
          targetEl.classList.remove('slide-in-right', 'slide-in-left');
          currentPage = targetId;
          isTransitioning = false;
        }, 350);
      }, 300);

    } else if (transitionType === 'letter') {
      // Fade + blur
      currentEl.classList.add('fade-blur-out');
      setTimeout(() => {
        currentEl.classList.remove('active', 'fade-blur-out');
        currentEl.classList.add('hidden');
        targetEl.classList.remove('hidden');
        targetEl.classList.add('active', 'fade-blur-in');
        document.body.style.background = targetBg;

        resetReveals(targetEl);
        createParticles(particleColor, particleType);

        setTimeout(() => {
          targetEl.classList.remove('fade-blur-in');
          currentPage = targetId;
          isTransitioning = false;
        }, 400);
      }, 350);

    } else {
      // Default: back to hub (reverse overlay)
      overlay.style.background = '#0a0a0f';
      overlay.classList.add('active');
      setTimeout(() => {
        currentEl.classList.remove('active');
        currentEl.classList.add('hidden');
        targetEl.classList.remove('hidden');
        targetEl.classList.add('active');
        document.body.style.background = '#0a0a0f';

        resetReveals(targetEl);
        createParticles(particleColor, particleType);

        setTimeout(() => {
          overlay.classList.remove('active');
          currentPage = targetId;
          isTransitioning = false;
        }, 300);
      }, 300);
    }
  }

  function resetReveals(pageEl) {
    pageEl.querySelectorAll('.reveal').forEach(el => {
      el.classList.remove('visible');
      // Trigger re-observe
      void el.offsetHeight;
    });
    // Re-setup observer for new page
    setTimeout(() => setupReveal(), 50);
  }

  // ===== DETERMINE TRANSITION TYPE =====
  function getAnimeGroup(pageId) {
    if (pageId.startsWith('soul-eater')) return 'soul-eater';
    if (pageId.startsWith('lol-')) return 'lol';
    if (pageId.startsWith('jjk-')) return 'jjk';
    if (pageId.startsWith('maid-')) return 'maid';
    if (pageId.startsWith('eva-')) return 'eva';
    if (pageId === 'stardew') return 'stardew';
    return null;
  }

  function getTransitionType(fromId, toId) {
    if (toId === 'letter') return 'letter';
    if (fromId === 'hub') return 'portal';
    if (toId === 'hub') return 'back';

    const fromGroup = getAnimeGroup(fromId);
    const toGroup = getAnimeGroup(toId);
    if (fromGroup && toGroup && fromGroup === toGroup) return 'sub';

    return 'portal';
  }

  // ===== EVENT LISTENERS =====

  // Portal clicks
  document.querySelectorAll('.portal').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      showPage(target, 'portal');
    });
  });

  // Back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showPage('hub', 'back');
    });
  });

  // Letter links
  document.querySelectorAll('.letter-link, .letter-icon').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showPage('letter', 'letter');
    });
  });

  // Sub-nav buttons
  document.querySelectorAll('.sub-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      if (target === currentPage) return;
      const type = getTransitionType(currentPage, target);
      showPage(target, type);
    });
  });

  // ===== EASTER EGG — LULUX =====
  const luluxTrigger = document.getElementById('lulux-trigger');
  if (luluxTrigger) {
    luluxTrigger.addEventListener('click', () => {
      luluxPopup.classList.remove('hidden');
      // Shake animation
      setTimeout(() => {
        luluxPopup.classList.add('shake');
        setTimeout(() => luluxPopup.classList.remove('shake'), 500);
      }, 100);
    });
  }

  // Close lulux
  luluxPopup.querySelector('.lulux-close').addEventListener('click', () => {
    luluxPopup.classList.add('hidden');
  });
  luluxPopup.addEventListener('click', (e) => {
    if (e.target === luluxPopup) luluxPopup.classList.add('hidden');
  });

  // ===== INIT =====
  // Start with hub particles
  createParticles('79,152,163', 'stars');
  drawParticles();
  updateCursorColor('#4f98a3');

  // Mark initial reveals
  setTimeout(() => {
    document.querySelectorAll('.hub .reveal').forEach(el => el.classList.add('visible'));
  }, 300);

})();
