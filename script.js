/**
 * Sidebar navigation: hamburger toggle (mobile/tablet), backdrop, Escape key,
 * and closing on link click.
 */
const initSidebarToggle = () => {
  const navToggle = document.getElementById('nav-toggle');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (!navToggle || !sidebar || !backdrop) return;

  const closeSidebar = () => {
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    backdrop.hidden = true;
    navToggle.setAttribute('aria-expanded', 'false');
  };

  const openSidebar = () => {
    sidebar.classList.add('is-open');
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add('is-open'));
    navToggle.setAttribute('aria-expanded', 'true');
  };

  const toggleSidebar = () => {
    if (sidebar.classList.contains('is-open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  };

  navToggle.addEventListener('click', toggleSidebar);
  backdrop.addEventListener('click', closeSidebar);

  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeSidebar);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSidebar();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) closeSidebar();
  });
};

/**
 * Light/Dark theme toggle, persisted in localStorage.
 * Keeps the mobile topbar button and the desktop sidebar button in sync.
 */
const initThemeToggle = () => {
  const THEME_KEY = 'portfolio-theme';
  const rootEl = document.documentElement;
  const toggles = [
    document.getElementById('theme-toggle'),
    document.getElementById('theme-toggle-desktop'),
  ].filter(Boolean);
  const desktopLabel = document.getElementById('theme-toggle-label');

  if (toggles.length === 0) return;

  const applyTheme = (theme) => {
    rootEl.setAttribute('data-theme', theme);
    const isLight = theme === 'light';

    toggles.forEach((toggle) => {
      toggle.setAttribute('aria-pressed', String(isLight));
      toggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    });

    if (desktopLabel) desktopLabel.textContent = isLight ? 'Light mode' : 'Dark mode';
  };

  const storedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(storedTheme === 'light' ? 'light' : 'dark');

  toggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const nextTheme = rootEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(nextTheme);

      try {
        localStorage.setItem(THEME_KEY, nextTheme);
      } catch (error) {
        /* localStorage unavailable; theme still applies for this session */
      }
    });
  });
};

/**
 * Highlights the sidebar link for the section currently in view.
 */
const initScrollSpy = () => {
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('[data-nav-link]');

  if (sections.length === 0 || navLinks.length === 0 || !('IntersectionObserver' in window)) return;

  const linksBySectionId = new Map();
  navLinks.forEach((link) => {
    const id = link.getAttribute('href').replace('#', '');
    linksBySectionId.set(id, link);
  });

  const setActive = (id) => {
    navLinks.forEach((link) => {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    });
    const activeLink = linksBySectionId.get(id);
    if (activeLink) {
      activeLink.classList.add('is-active');
      activeLink.setAttribute('aria-current', 'location');
    }
  };

  /* A short last section may never reach the observer's trigger band,
     so pin it as active once the page is scrolled to the bottom. */
  const lastId = sections[sections.length - 1].id;
  let bottomTicking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (bottomTicking) return;
      bottomTicking = true;
      requestAnimationFrame(() => {
        bottomTicking = false;
        const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
        if (atBottom) setActive(lastId);
      });
    },
    { passive: true }
  );

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length === 0) return;

      const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
      setActive(topMost.target.id);
    },
    { rootMargin: '-40% 0px -50% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
};

/**
 * Fades/slides elements in as they scroll into view.
 * Runs once per element, then stops observing it.
 */
const initScrollReveal = () => {
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length === 0 || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
  );

  revealEls.forEach((el) => observer.observe(el));
};

/**
 * Gives children of `.stagger` containers an index (--i) that CSS turns
 * into a staggered transition delay. Offset by 2 so they follow the
 * section heading and rule.
 */
const initStagger = () => {
  document.querySelectorAll('.stagger').forEach((group) => {
    Array.from(group.children).forEach((child, index) => {
      child.style.setProperty('--i', String(index + 2));
    });
  });
};

/**
 * Scroll-linked top progress bar, batched into one requestAnimationFrame per frame.
 */
const initScrollEffects = () => {
  const bar = document.getElementById('scroll-progress-bar');
  if (!bar) return;

  let ticking = false;

  const update = () => {
    ticking = false;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;
    bar.style.transform = `scaleX(${progress})`;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
};

/**
 * Pause/Play ambient motion control (WCAG 2.2.2 Pause, Stop, Hide).
 * Persists user preference in localStorage and notifies canvas/cursor modules.
 */
const initMotionToggle = () => {
  const MOTION_KEY = 'portfolio-motion';
  const rootEl = document.documentElement;
  const toggles = [
    document.getElementById('motion-toggle'),
    document.getElementById('motion-toggle-desktop'),
  ].filter(Boolean);
  const desktopLabel = document.getElementById('motion-toggle-label');
  const mobileToggle = document.getElementById('motion-toggle');
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (toggles.length === 0) return;

  const applyMotion = (paused) => {
    rootEl.setAttribute('data-motion', paused ? 'paused' : 'running');
    if (desktopLabel) desktopLabel.textContent = paused ? 'Play motion' : 'Pause motion';
    if (mobileToggle) {
      mobileToggle.setAttribute('aria-label', paused ? 'Play background motion' : 'Pause background motion');
    }
    window.dispatchEvent(new CustomEvent('portfolio:motionchange', { detail: { paused } }));
  };

  let stored = null;
  try {
    stored = localStorage.getItem(MOTION_KEY);
  } catch (error) {
    /* localStorage unavailable */
  }

  const initialPaused = stored === 'paused' || (stored !== 'running' && reduceMotionQuery.matches);
  applyMotion(initialPaused);

  toggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const nextPaused = rootEl.getAttribute('data-motion') !== 'paused';
      applyMotion(nextPaused);
      try {
        localStorage.setItem(MOTION_KEY, nextPaused ? 'paused' : 'running');
      } catch (error) {
        /* localStorage unavailable */
      }
    });
  });

  reduceMotionQuery.addEventListener('change', (event) => {
    if (event.matches) applyMotion(true);
  });
};

/**
 * DAO-inspired Event Horizon orbital point-cloud field.
 * Pure vanilla HTML5 Canvas 2D featuring:
 *  - Tilted 3D Keplerian accretion disc with front/back depth sorting
 *  - Gravitationally lensed upper & lower Einstein arcs around the dark core
 *  - Scroll-velocity-reactive relativistic light streaks
 *  - Luminous double-layered photon ring & ambient deep-field dust
 *  - Smooth multi-point cursor wake and pointer-responsive perspective tilt
 */
const initDaoField = () => {
  const canvas = document.getElementById('dao-field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'paused';

  const isLightTheme = () => document.documentElement.getAttribute('data-theme') === 'light';

  const state = {
    w: 0,
    h: 0,
    dpr: 1,
    cx: 0,
    cy: 0,
    baseRadius: 185,
    scrollTarget: 0,
    scrollShown: 0,
    scrollVel: 0,
    prevScrollShown: 0,
    pointerX: -9999,
    pointerY: -9999,
    pointerActive: false,
    wakeX: 0,
    wakeY: 0,
    wakes: Array.from({ length: 5 }, () => ({ x: -9999, y: -9999, strength: 0 })),
    wakeIdx: 0,
    raf: 0,
    lastTime: 0,
    elapsed: 0,
  };

  /* Deterministic PRNG for a balanced, repeatable star & disc layout */
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const discCount = 460;
  const lensArcCount = 130;
  const strandCount = 58;
  const ringCount = 120;
  const dustCount = 95;

  const discParticles = Array.from({ length: discCount }, () => {
    const u = Math.pow(rand(), 1.65);
    const radius = 0.60 + u * 2.25;
    return {
      r: radius,
      angle: rand() * Math.PI * 2,
      omega: 0.44 * Math.pow(radius, -1.45),
      yOffset: (rand() - 0.5) * (0.035 + 0.055 * radius),
      size: 0.65 + rand() * 1.45,
      warmth: rand(),
      alpha: Math.pow(0.60 / radius, 1.18) * (0.38 + rand() * 0.62) * (1 - Math.max(0, (radius - 2.05) / 0.95) * 0.65),
    };
  });

  /* Gravitationally lensed particles bending over and under the event-horizon core */
  const lensArcParticles = Array.from({ length: lensArcCount }, () => {
    const sign = rand() > 0.45 ? -1 : 1; // slightly denser upper Einstein arch
    return {
      sign,
      angle: (rand() - 0.5) * Math.PI * 0.96,
      r: 0.56 + Math.pow(rand(), 1.8) * 0.46,
      omega: 0.34 + rand() * 0.28,
      size: 0.65 + rand() * 1.25,
      alpha: 0.24 + rand() * 0.48,
    };
  });

  /* Curved orbital motion streaks that lengthen during fast scrolls */
  const strands = Array.from({ length: strandCount }, () => {
    const u = Math.pow(rand(), 1.45);
    const radius = 0.64 + u * 1.75;
    return {
      r: radius,
      angle: rand() * Math.PI * 2,
      omega: 0.46 * Math.pow(radius, -1.45),
      yOffset: (rand() - 0.5) * 0.04 * radius,
      baseArc: 0.09 + rand() * 0.14,
      alpha: Math.pow(0.64 / radius, 1.1) * (0.24 + rand() * 0.34),
      width: 0.6 + rand() * 0.85,
    };
  });

  const ringParticles = Array.from({ length: ringCount }, () => ({
    r: 0.51 + (rand() - 0.5) * 0.075,
    angle: rand() * Math.PI * 2,
    omega: 0.66 + rand() * 0.38,
    size: 0.75 + rand() * 1.35,
    alpha: 0.35 + rand() * 0.55,
  }));

  const dustParticles = Array.from({ length: dustCount }, () => ({
    x: rand(),
    y: rand(),
    vx: (rand() - 0.5) * 0.007,
    vy: (rand() - 0.5) * 0.007,
    size: 0.55 + rand() * 1.15,
    alpha: 0.10 + rand() * 0.30,
    depth: 0.3 + rand() * 0.7,
    phase: rand() * Math.PI * 2,
  }));

  const resize = () => {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.w = window.innerWidth;
    state.h = window.innerHeight;
    canvas.width = Math.max(1, Math.round(state.w * state.dpr));
    canvas.height = Math.max(1, Math.round(state.h * state.dpr));
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    const sidebarOffset = state.w >= 1024 ? 260 : 0;
    const contentW = state.w - sidebarOffset;
    state.cx = sidebarOffset + contentW * (state.w >= 1024 ? 0.66 : 0.56);
    state.cy = state.h * 0.46;
    state.baseRadius = Math.min(contentW, state.h) * (state.w >= 1024 ? 0.255 : 0.285);
  };

  const updateScroll = () => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollTarget = maxScroll > 0 ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0;
  };

  const renderFrame = (dt) => {
    state.elapsed += dt;
    state.prevScrollShown = state.scrollShown;
    state.scrollShown += (state.scrollTarget - state.scrollShown) * Math.min(1, dt * 4.5);

    const instantVel = dt > 0 ? Math.abs(state.scrollShown - state.prevScrollShown) / dt : 0;
    state.scrollVel += (Math.min(instantVel, 2.2) - state.scrollVel) * Math.min(1, dt * 6);

    const targetWakeX = state.pointerActive ? (state.pointerX - state.cx) / Math.max(state.w, 1) : 0;
    const targetWakeY = state.pointerActive ? (state.pointerY - state.cy) / Math.max(state.h, 1) : 0;
    state.wakeX += (targetWakeX - state.wakeX) * Math.min(1, dt * 3.2);
    state.wakeY += (targetWakeY - state.wakeY) * Math.min(1, dt * 3.2);

    /* Decay pointer wake ripples */
    for (let i = 0; i < state.wakes.length; i++) {
      state.wakes[i].strength *= Math.pow(0.06, dt);
    }

    ctx.clearRect(0, 0, state.w, state.h);

    const light = isLightTheme();
    const rgbCore = light ? '236, 235, 232' : '10, 10, 10';
    const rgbWarm = light ? '27, 27, 26' : '244, 240, 232';
    const rgbCool = light ? '72, 72, 68' : '206, 212, 222';
    const intensity = light ? 0.45 : 0.64;

    const p = state.scrollShown;
    /* Subtle choreography across sections as the user scrolls */
    const centerX = state.cx + state.wakeX * 28 - Math.sin(p * Math.PI) * (state.w >= 1024 ? 54 : 20);
    const centerY = state.cy + state.wakeY * 20 - p * 30;
    const radiusScale = state.baseRadius * (1 + Math.sin(p * Math.PI * 0.9) * 0.14);

    const tilt = 0.25 + Math.sin(p * Math.PI * 0.85) * 0.22 + state.wakeY * 0.15;
    const roll = -0.25 + p * 0.46 + state.wakeX * 0.12;
    const cosRoll = Math.cos(roll);
    const sinRoll = Math.sin(roll);
    const spinBoost = p * 2.8;
    const streakBoost = 1 + state.scrollVel * 2.4;

    const projectDisc = (r, angle, yOff) => {
      const x3 = Math.cos(angle) * r;
      const z3 = Math.sin(angle) * r;
      const px = x3;
      const py = yOff + z3 * tilt;
      return {
        x: (px * cosRoll - py * sinRoll) * radiusScale + centerX,
        y: (px * sinRoll + py * cosRoll) * radiusScale + centerY,
        z: z3,
      };
    };

    const applyWake = (x, y) => {
      let fx = x;
      let fy = y;
      if (state.pointerActive) {
        const dx = fx - state.pointerX;
        const dy = fy - state.pointerY;
        const distSq = dx * dx + dy * dy;
        const maxR = 165;
        if (distSq < maxR * maxR && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = Math.pow(1 - dist / maxR, 2) * 20;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      }
      for (let i = 0; i < state.wakes.length; i++) {
        const w = state.wakes[i];
        if (w.strength < 0.02) continue;
        const dx = fx - w.x;
        const dy = fy - w.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 15625 && distSq > 1) {
          const dist = Math.sqrt(distSq);
          const push = Math.pow(1 - dist / 125, 2) * 14 * w.strength;
          fx += (dx / dist) * push;
          fy += (dy / dist) * push;
        }
      }
      return [fx, fy];
    };

    /* 1. Outer atmospheric bloom halo */
    const halo = ctx.createRadialGradient(
      centerX,
      centerY,
      radiusScale * 0.42,
      centerX,
      centerY,
      radiusScale * 1.55
    );
    halo.addColorStop(0, `rgba(${rgbWarm}, 0)`);
    halo.addColorStop(0.22, `rgba(${rgbWarm}, ${(light ? 0.055 : 0.095).toFixed(3)})`);
    halo.addColorStop(0.50, `rgba(${rgbWarm}, ${(light ? 0.02 : 0.036).toFixed(3)})`);
    halo.addColorStop(1, `rgba(${rgbWarm}, 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radiusScale * 1.55, 0, Math.PI * 2);
    ctx.fill();

    /* 2. Deep-field ambient dust with gentle twinkle */
    for (let i = 0; i < dustCount; i++) {
      const d = dustParticles[i];
      if (dt > 0) {
        d.x = (d.x + d.vx * dt + 1) % 1;
        d.y = (d.y + d.vy * dt + 1) % 1;
      }
      const x = d.x * state.w + state.wakeX * 20 * d.depth;
      const y = ((d.y * state.h - p * 80 * d.depth) % state.h + state.h) % state.h;
      const twinkle = 0.72 + 0.28 * Math.sin(state.elapsed * 1.4 + d.phase);
      ctx.fillStyle = `rgba(${rgbCool}, ${(d.alpha * twinkle * intensity * 0.78).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, d.size, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 3. Back half of the accretion disc (z <= 0, behind the core) */
    for (let i = 0; i < discCount; i++) {
      const pt = discParticles[i];
      const a = pt.angle + pt.omega * (state.elapsed * 0.65 + spinBoost);
      const proj = projectDisc(pt.r, a, pt.yOffset);
      if (proj.z > 0) continue;

      const [fx, fy] = applyWake(proj.x, proj.y);
      const doppler = 0.78 + 0.34 * Math.sin(a);
      const alpha = Math.min(0.85, pt.alpha * doppler * 0.68 * intensity);
      const rgb = pt.warmth > 0.35 ? rgbWarm : rgbCool;

      ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, pt.size * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 4. Gravitationally lensed Einstein arcs (light bending over/under the shadow) */
    for (let i = 0; i < lensArcCount; i++) {
      const pt = lensArcParticles[i];
      const sweep = pt.angle + Math.sin(state.elapsed * pt.omega * 0.45 + spinBoost * 0.4) * 0.28;
      const lx = Math.sin(sweep) * pt.r;
      const ly = pt.sign * Math.cos(sweep) * pt.r * (0.76 + (1 - Math.abs(tilt)) * 0.22);
      const rx = (lx * cosRoll - ly * sinRoll) * radiusScale + centerX;
      const ry = (lx * sinRoll + ly * cosRoll) * radiusScale + centerY;
      const [fx, fy] = applyWake(rx, ry);

      const archFade = Math.max(0, Math.cos(sweep));
      const alpha = Math.min(0.75, pt.alpha * archFade * intensity * 0.85);
      ctx.fillStyle = `rgba(${rgbWarm}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 5. Event-horizon core shadow + subtle crisp photon ring edge */
    const coreRadius = radiusScale * 0.50;
    const coreGrad = ctx.createRadialGradient(centerX, centerY, coreRadius * 0.65, centerX, centerY, coreRadius * 1.08);
    coreGrad.addColorStop(0, `rgba(${rgbCore}, ${light ? 0.86 : 0.94})`);
    coreGrad.addColorStop(0.82, `rgba(${rgbCore}, ${light ? 0.58 : 0.74})`);
    coreGrad.addColorStop(1, `rgba(${rgbCore}, 0)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 1.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(${rgbWarm}, ${(light ? 0.14 : 0.22).toFixed(3)})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreRadius * 1.02, 0, Math.PI * 2);
    ctx.stroke();

    /* 6. Relativistic orbital motion-streak strands */
    ctx.lineCap = 'round';
    for (let i = 0; i < strandCount; i++) {
      const s = strands[i];
      const a0 = s.angle + s.omega * (state.elapsed * 0.68 + spinBoost);
      const arcLen = Math.min(0.52, s.baseArc * streakBoost);
      const a1 = a0 - arcLen;
      const p0 = projectDisc(s.r, a0, s.yOffset);
      const pMid = projectDisc(s.r, (a0 + a1) * 0.5, s.yOffset);
      const p1 = projectDisc(s.r, a1, s.yOffset);

      const alpha = Math.min(0.65, s.alpha * (p0.z > 0 ? 1 : 0.52) * intensity * (0.9 + state.scrollVel * 0.35));
      ctx.strokeStyle = `rgba(${rgbWarm}, ${alpha.toFixed(3)})`;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(pMid.x, pMid.y, p1.x, p1.y);
      ctx.stroke();
    }

    /* 7. Luminous photon ring particles */
    for (let i = 0; i < ringCount; i++) {
      const pt = ringParticles[i];
      const a = pt.angle + pt.omega * (state.elapsed * 0.48 + spinBoost * 0.55);
      const rx = Math.cos(a) * pt.r * radiusScale + centerX;
      const ry = Math.sin(a) * pt.r * radiusScale + centerY;
      const [fx, fy] = applyWake(rx, ry);

      const alpha = Math.min(0.88, pt.alpha * intensity);
      ctx.fillStyle = `rgba(${rgbWarm}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }

    /* 8. Front half of the accretion disc (z > 0, sweeping across the core) */
    for (let i = 0; i < discCount; i++) {
      const pt = discParticles[i];
      const a = pt.angle + pt.omega * (state.elapsed * 0.65 + spinBoost);
      const proj = projectDisc(pt.r, a, pt.yOffset);
      if (proj.z <= 0) continue;

      const [fx, fy] = applyWake(proj.x, proj.y);
      const doppler = 0.84 + 0.36 * Math.sin(a);
      const alpha = Math.min(0.94, pt.alpha * doppler * intensity);
      const rgb = pt.warmth > 0.3 ? rgbWarm : rgbCool;

      ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, pt.size * 1.08, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const stopLoop = () => {
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
  };

  const loop = (now) => {
    state.raf = 0;
    if (document.hidden || reduceMotion()) return;
    const dt = state.lastTime ? Math.min(0.05, (now - state.lastTime) / 1000) : 0.016;
    state.lastTime = now;
    renderFrame(dt);
    state.raf = requestAnimationFrame(loop);
  };

  const startOrDrawStatic = () => {
    stopLoop();
    state.lastTime = 0;
    if (reduceMotion()) {
      renderFrame(0);
    } else if (!document.hidden) {
      state.raf = requestAnimationFrame(loop);
    }
  };

  resize();
  updateScroll();
  canvas.classList.add('is-ready');
  startOrDrawStatic();

  window.addEventListener('resize', () => {
    resize();
    if (reduceMotion()) renderFrame(0);
  }, { passive: true });

  window.addEventListener('scroll', updateScroll, { passive: true });

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let lastWakeX = -9999;
    let lastWakeY = -9999;

    window.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'touch') return;
      state.pointerX = event.clientX;
      state.pointerY = event.clientY;
      state.pointerActive = true;

      const dx = event.clientX - lastWakeX;
      const dy = event.clientY - lastWakeY;
      if (dx * dx + dy * dy > 625) {
        const slot = state.wakes[state.wakeIdx];
        slot.x = event.clientX;
        slot.y = event.clientY;
        slot.strength = 1;
        state.wakeIdx = (state.wakeIdx + 1) % state.wakes.length;
        lastWakeX = event.clientX;
        lastWakeY = event.clientY;
      }
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      state.pointerActive = false;
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopLoop();
    } else {
      startOrDrawStatic();
    }
  });

  window.addEventListener('portfolio:motionchange', startOrDrawStatic);

  const themeObserver = new MutationObserver(() => {
    if (reduceMotion()) renderFrame(0);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
};

/**
 * DAO-inspired ring cursor with 6-layer motion-blur trail, ambient light pool,
 * hero scroll-capsule morph, interactive hover indicator, and click orbital lap.
 * Automatically idles its animation frame once the trail converges.
 */
const initDaoCursor = () => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const ringEl = document.getElementById('dao-ring');
  const lightEl = document.getElementById('dao-light');
  const trailEls = Array.from(document.querySelectorAll('#dao-trail i'));
  if (!ringEl || trailEls.length === 0) return;

  const isDisabled = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'paused';

  const TRAIL_EASE = [0.42, 0.31, 0.235, 0.175, 0.13, 0.095];
  const trailPos = trailEls.map(() => ({ x: -999, y: -999 }));

  let cx = -999;
  let cy = -999;
  let active = false;
  let raf = 0;
  let pressTimer = 0;

  const updateScrollCapsule = () => {
    const nearTop = window.scrollY < Math.max(120, window.innerHeight * 0.35);
    document.body.classList.toggle('dao-cursor-scroll', nearTop && !document.body.classList.contains('dao-cursor-on'));
  };

  const deactivate = () => {
    active = false;
    document.body.classList.remove('dao-cursor-active', 'dao-cursor-on', 'dao-cursor-scroll', 'dao-cursor-press');
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const tick = () => {
    raf = 0;
    if (!active || isDisabled()) {
      deactivate();
      return;
    }

    ringEl.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    if (lightEl) {
      lightEl.style.setProperty('--dao-lx', `${cx}px`);
      lightEl.style.setProperty('--dao-ly', `${cy}px`);
    }

    let ax = cx;
    let ay = cy;
    let maxDelta = 0;
    for (let i = 0; i < trailEls.length; i++) {
      const p = trailPos[i];
      if (p.x < -900) {
        p.x = ax;
        p.y = ay;
      }
      p.x += (ax - p.x) * TRAIL_EASE[i];
      p.y += (ay - p.y) * TRAIL_EASE[i];

      const dx = ax - p.x;
      const dy = ay - p.y;
      maxDelta = Math.max(maxDelta, Math.abs(dx) + Math.abs(dy));

      const ex = Math.min(Math.abs(dx) / 20, 1.4);
      const ey = Math.min(Math.abs(dy) / 20, 1.4);
      const grow = i * 0.065;
      const sx = 1 + grow + ex * 0.55 - ey * 0.12;
      const sy = 1 + grow + ey * 0.55 - ex * 0.12;

      trailEls[i].style.transform =
        `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
      ax = p.x;
      ay = p.y;
    }

    /* Keep animating only while the trail is still converging */
    if (maxDelta > 0.15) {
      raf = requestAnimationFrame(tick);
    }
  };

  const wakeCursor = () => {
    if (!raf && active && !isDisabled()) {
      raf = requestAnimationFrame(tick);
    }
  };

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || isDisabled()) return;
    cx = event.clientX;
    cy = event.clientY;

    const hit = event.target && event.target.closest &&
      event.target.closest('a, button, input, textarea, select, label, [role="tab"]');
    document.body.classList.toggle('dao-cursor-on', Boolean(hit));
    updateScrollCapsule();

    if (!active) {
      active = true;
      document.body.classList.add('dao-cursor-active');
      for (let i = 0; i < trailPos.length; i++) {
        trailPos[i].x = cx;
        trailPos[i].y = cy;
      }
    }
    wakeCursor();
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch' || isDisabled()) return;
    const orbit = ringEl.querySelector('.dao-ring__orbit');
    if (!orbit) return;
    document.body.classList.remove('dao-cursor-press');
    void orbit.offsetWidth;
    document.body.classList.add('dao-cursor-press');
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      document.body.classList.remove('dao-cursor-press');
    }, 780);
  }, { passive: true });

  window.addEventListener('scroll', updateScrollCapsule, { passive: true });
  document.addEventListener('mouseleave', deactivate);
  window.addEventListener('blur', deactivate);
  window.addEventListener('portfolio:motionchange', (event) => {
    if (event.detail && event.detail.paused) deactivate();
  });
};

/**
 * Cursor-follow spotlight on project and contact cards (fine pointers only).
 */
const initCardSpotlight = () => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.querySelectorAll('.project-card, .contact-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });
  });
};

/**
 * Updates the footer copyright year.
 */
const initFooterYear = () => {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
};

/**
 * Submits the contact form to Formspree via fetch, so a successful send
 * stays on the page instead of redirecting to Formspree's own page.
 */
const initContactForm = () => {
  const form = document.querySelector('.contact-form');
  const status = document.getElementById('form-status');
  if (!form || !status) return;

  const fields = Array.from(form.querySelectorAll('input[required], textarea[required]'));
  const submitButton = form.querySelector('button[type="submit"]');
  if (!submitButton) return;
  const originalText = submitButton.textContent;

  const messageFor = (field) => {
    const value = field.value.trim();
    if (!value) return `Enter your ${field.name}.`;
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Enter an email address like name@example.com.';
    }
    if (field.name === 'message' && value.length < 10) {
      return 'Write at least 10 characters so I know how to help.';
    }
    return '';
  };

  const validate = (field) => {
    const error = document.getElementById(`${field.id}-error`);
    const message = messageFor(field);
    field.setAttribute('aria-invalid', String(Boolean(message)));
    if (error) {
      error.textContent = message;
      error.hidden = !message;
    }
    return !message;
  };

  const showStatus = (type, text) => {
    status.hidden = false;
    status.className = `form-status is-${type}`;
    status.textContent = text;
  };

  fields.forEach((field) => {
    field.addEventListener('blur', () => {
      if (field.value) validate(field);
    });
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validate(field);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.hidden = true;

    const invalid = fields.filter((field) => !validate(field));
    if (invalid.length > 0) {
      invalid[0].focus();
      return;
    }

    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        form.reset();
        fields.forEach((field) => field.removeAttribute('aria-invalid'));
        showStatus('success', 'Message sent. Thanks for reaching out, I will reply by email.');
      } else {
        showStatus('error', 'The message was not sent. Try again, or email benchcanzana@gmail.com directly.');
      }
    } catch (error) {
      showStatus('error', 'Could not reach the server. Check your connection, or email benchcanzana@gmail.com directly.');
    } finally {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });
};

/**
 * Back-to-top button: appears after scrolling past the first screen.
 */
const initBackToTop = () => {
  const button = document.getElementById('to-top');
  if (!button) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false;

  const update = () => {
    ticking = false;
    const show = window.scrollY > window.innerHeight * 0.8;
    button.hidden = false;
    button.classList.toggle('is-shown', show);
    button.tabIndex = show ? 0 : -1;
    button.setAttribute('aria-hidden', String(!show));
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  update();
};

/**
 * Detail dialogs for the other projects (Examnesia, this portfolio).
 * Any [data-dialog-open="id"] button opens the matching <dialog>.
 */
const initProjectDialogs = () => {
  document.querySelectorAll('[data-dialog-open]').forEach((trigger) => {
    const dialog = document.getElementById(trigger.dataset.dialogOpen);
    if (!dialog || typeof dialog.showModal !== 'function') return;

    trigger.addEventListener('click', () => dialog.showModal());
    dialog.querySelectorAll('[data-dialog-close]').forEach((btn) => {
      btn.addEventListener('click', () => dialog.close());
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => trigger.focus());
  });
};


/**
 * ACES project viewer: tabs that swap the screenshot and caption.
 * Supports click and arrow/Home/End keys (roving tabindex).
 */
const initAcesTabs = () => {
  const tabs = Array.from(document.querySelectorAll('.aces__tab'));
  const image = document.getElementById('aces-image');
  const caption = document.getElementById('aces-caption');
  const panel = document.getElementById('aces-panel');
  const video = document.getElementById('aces-video');
  if (tabs.length === 0 || !image || !caption || !panel) return;

  const select = (tab, focus = false) => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    const showVideo = Boolean(tab.dataset.video) && Boolean(video);
    if (video) {
      video.hidden = !showVideo;
      if (!showVideo) video.pause();
    }
    image.hidden = showVideo;
    if (!showVideo) {
      image.src = tab.dataset.src;
      image.alt = tab.dataset.alt;
    }
    caption.textContent = tab.dataset.caption;
    panel.setAttribute('aria-labelledby', tab.id);
    if (focus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const last = tabs.length - 1;
      const moves = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      };
      if (!(event.key in moves)) return;
      event.preventDefault();
      select(tabs[moves[event.key]], true);
    });
  });
};


/**
 * Opens and closes the ACES screenshot dialog (native <dialog>).
 * Closes on the X button, Escape (built in), or a click on the backdrop.
 */
const initAcesDialog = () => {
  const dialog = document.getElementById('aces-dialog');
  const openButton = document.getElementById('aces-open');
  const closeButton = document.getElementById('aces-close');
  if (!dialog || !openButton || !closeButton || typeof dialog.showModal !== 'function') return;

  openButton.addEventListener('click', () => dialog.showModal());
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    const video = document.getElementById('aces-video');
    if (video) video.pause();
    openButton.focus();
  });
};


/**
 * Motion helpers: splits the hero name into words for a masked rise,
 * indexes skill tags and About paragraphs for staggered entrances, and adds
 * a gentle magnetic pull to primary buttons on fine pointers.
 * Skipped entirely when the visitor prefers reduced motion.
 */
const initMotionPolish = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const name = document.querySelector('.hero__name');
  if (name) {
    const text = name.textContent.trim();
    name.setAttribute('aria-label', text);
    name.textContent = '';
    const words = text.split(/\s+/);
    words.forEach((word, index) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      outer.setAttribute('aria-hidden', 'true');
      const inner = document.createElement('span');
      inner.className = 'word__inner';
      inner.style.setProperty('--w', String(index));
      inner.textContent = word;
      outer.appendChild(inner);
      name.appendChild(outer);
      if (index < words.length - 1) name.appendChild(document.createTextNode(' '));
    });
  }

  document.querySelectorAll('.skill-group__tags').forEach((list) => {
    Array.from(list.children).forEach((tag, index) => tag.style.setProperty('--t', String(index)));
  });

  document.querySelectorAll('.about__text > p').forEach((p, index) => p.style.setProperty('--p', String(index)));

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.hero__actions .btn, .contact-form .btn--primary').forEach((btn) => {
      btn.addEventListener('pointermove', (event) => {
        const rect = btn.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / rect.width;
        const dy = (event.clientY - (rect.top + rect.height / 2)) / rect.height;
        btn.style.translate = `${(dx * 8).toFixed(1)}px ${(dy * 6).toFixed(1)}px`;
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.translate = '';
      });
    });
  }
};

/**
 * Copy-email button with a short "Copied" confirmation.
 */
const initCopyEmail = () => {
  const button = document.getElementById('copy-email');
  const label = document.getElementById('copy-email-label');
  if (!button || !label) return;

  const original = label.textContent;
  let timer;

  const confirm = (text, copied) => {
    label.textContent = text;
    button.classList.toggle('is-copied', copied);
    clearTimeout(timer);
    timer = setTimeout(() => {
      label.textContent = original;
      button.classList.remove('is-copied');
    }, 2000);
  };

  const fallbackCopy = (text) => {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (error) {
      ok = false;
    }
    area.remove();
    return ok;
  };

  button.addEventListener('click', async () => {
    const email = button.dataset.email;
    let ok = false;
    try {
      await navigator.clipboard.writeText(email);
      ok = true;
    } catch (error) {
      ok = fallbackCopy(email);
    }
    confirm(ok ? 'Copied!' : `Copy failed: ${email}`, ok);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  window.__motionReady = true;
  initCopyEmail();
  initMotionPolish();
  initSidebarToggle();
  initThemeToggle();
  initMotionToggle();
  initDaoField();
  initDaoCursor();
  initScrollSpy();
  initStagger();
  initScrollReveal();
  initScrollEffects();
  initCardSpotlight();
  initAcesTabs();
  initAcesDialog();
  initFooterYear();
  initContactForm();
  initBackToTop();
  initProjectDialogs();
});
