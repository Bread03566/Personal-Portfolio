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
 * Keeps the mobile topbar button, desktop sidebar button, <meta name="color-scheme">,
 * and <meta name="theme-color"> in sync, and wraps toggles in a radial View Transition
 * iris wipe when supported and motion is allowed.
 */
const initThemeToggle = () => {
  const THEME_KEY = 'portfolio-theme';
  const rootEl = document.documentElement;
  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const toggles = [
    document.getElementById('theme-toggle'),
    document.getElementById('theme-toggle-desktop'),
  ].filter(Boolean);
  const desktopLabel = document.getElementById('theme-toggle-label');

  if (toggles.length === 0) return;

  const applyTheme = (theme) => {
    rootEl.setAttribute('data-theme', theme);
    const isLight = theme === 'light';

    if (colorSchemeMeta) colorSchemeMeta.setAttribute('content', theme);
    if (themeColorMeta) themeColorMeta.setAttribute('content', isLight ? '#f6f5f2' : '#0a0a0a');

    toggles.forEach((toggle) => {
      toggle.setAttribute('aria-pressed', String(isLight));
      toggle.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    });

    if (desktopLabel) desktopLabel.textContent = isLight ? 'Light mode' : 'Dark mode';
    window.dispatchEvent(new CustomEvent('portfolio:themechange', { detail: { theme } }));
  };

  let storedTheme = null;
  try {
    storedTheme = localStorage.getItem(THEME_KEY);
  } catch (error) {
    storedTheme = null;
  }
  applyTheme(storedTheme === 'light' ? 'light' : 'dark');

  toggles.forEach((toggle) => {
    toggle.addEventListener('click', (event) => {
      const nextTheme = rootEl.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      const commit = () => {
        applyTheme(nextTheme);
        try {
          localStorage.setItem(THEME_KEY, nextTheme);
        } catch (error) {
          /* localStorage unavailable; theme still applies for this session */
        }
      };

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const motionPaused = rootEl.getAttribute('data-motion') === 'paused';

      if (!document.startViewTransition || reduceMotion || motionPaused) {
        commit();
        return;
      }

      /* Radiate the iris wipe from the clicked button (or pointer coordinates) */
      const rect = toggle.getBoundingClientRect();
      const x = event.clientX || rect.left + rect.width * 0.5;
      const y = event.clientY || rect.top + rect.height * 0.5;
      const maxR = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      rootEl.style.setProperty('--theme-tx', `${x.toFixed(1)}px`);
      rootEl.style.setProperty('--theme-ty', `${y.toFixed(1)}px`);
      rootEl.style.setProperty('--theme-tr', `${Math.ceil(maxR)}px`);

      document.startViewTransition(commit);
    });
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_KEY) return;
    applyTheme(event.newValue === 'light' ? 'light' : 'dark');
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
 * Shared state between the DAO-style scroll-scrubbed intro and the Event Horizon canvas.
 * Kept module-scoped without polluting the global namespace.
 */
const daoIntroState = {
  active: false,
  target: 0,
  shown: 0,
  vel: 0,
  blend: 0,
};

/**
 * DAO-style scroll-scrubbed intro sequence:
 *  - Opens on a pure void with a centered geometric mark.
 *  - Multi-scroll spring physics (critically damped, frame-rate independent)
 *    scrub the Event Horizon through bloom -> orbit -> collapse -> handoff.
 *  - Supports desktop wheel, mobile vertical swipe with flick momentum,
 *    keyboard navigation, and a Skip intro button.
 *  - Automatically bypassed for reduced motion, paused motion, or hash links.
 */
const initDaoIntro = () => {
  const introEl = document.getElementById('dao-intro');
  const centerEl = document.getElementById('dao-intro-center');
  const percentEl = document.getElementById('intro-percent');
  const barEl = document.getElementById('intro-progress-bar');
  const cueEl = document.getElementById('intro-cue');
  const skipBtn = document.getElementById('intro-skip');
  const rootEl = document.documentElement;

  const shouldRun =
    Boolean(introEl) &&
    rootEl.classList.contains('intro-active') &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    rootEl.getAttribute('data-motion') !== 'paused';

  const markDone = (instant = false) => {
    daoIntroState.active = false;
    daoIntroState.target = 1;
    daoIntroState.shown = 1;
    daoIntroState.vel = 0;
    if (instant) daoIntroState.blend = 0;

    rootEl.classList.remove('intro-active');
    if (introEl) {
      introEl.classList.add('is-done');
      introEl.setAttribute('aria-hidden', 'true');
      introEl.inert = true;
    }
    window.dispatchEvent(new CustomEvent('portfolio:introcomplete'));
  };

  if (!shouldRun) {
    markDone(true);
    return;
  }

  daoIntroState.active = true;
  daoIntroState.target = 0;
  daoIntroState.shown = 0;
  daoIntroState.vel = 0;
  daoIntroState.blend = 1;

  const INTRO_PULL = 840;
  const INTRO_GATE = 0.84;
  const INTRO_GRIP = 0.38;
  const SPRING_W0 = 10;
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  let raf = 0;
  let lastTime = 0;

  const paintIntro = () => {
    const p = daoIntroState.shown;
    if (percentEl) {
      const pct = Math.min(100, Math.round(p * 100));
      percentEl.textContent = String(pct).padStart(2, '0');
    }
    if (barEl) {
      barEl.style.transform = `scaleX(${p.toFixed(4)})`;
    }
    if (cueEl) {
      cueEl.classList.toggle('is-hidden', daoIntroState.target >= 0.035);
    }
    if (centerEl) {
      /* Stay crisp through bloom & orbit, then gently dissolve during the collapse */
      const fade = clamp01((1 - p) / (1 - 0.80));
      const scale = 1 + (1 - fade) * 0.07;
      centerEl.style.opacity = fade.toFixed(3);
      centerEl.style.transform = `scale(${scale.toFixed(4)})`;
    }
  };

  const finishIntro = (instant = false) => {
    if (!daoIntroState.active) return;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    window.scrollTo(0, 0);
    markDone(instant);
  };

  const stepSpring = (now) => {
    raf = 0;
    if (!daoIntroState.active) return;

    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0.016;
    lastTime = now;

    const diff = daoIntroState.target - daoIntroState.shown;
    if (Math.abs(diff) > 0.0004 || Math.abs(daoIntroState.vel) > 0.0004) {
      daoIntroState.vel += (SPRING_W0 * SPRING_W0 * diff - 2 * SPRING_W0 * daoIntroState.vel) * dt;
      daoIntroState.shown += daoIntroState.vel * dt;
      if (daoIntroState.shown < 0) {
        daoIntroState.shown = 0;
        daoIntroState.vel = 0;
      }
      if (daoIntroState.shown > 1) {
        daoIntroState.shown = 1;
        daoIntroState.vel = 0;
      }
      paintIntro();
      if (daoIntroState.shown >= 0.992) {
        finishIntro(false);
        return;
      }
      raf = requestAnimationFrame(stepSpring);
    } else {
      daoIntroState.vel = 0;
      lastTime = 0;
      paintIntro();
    }
  };

  const wakeSpring = () => {
    if (!raf && daoIntroState.active) {
      lastTime = 0;
      raf = requestAnimationFrame(stepSpring);
    }
  };

  const advance = (delta, pull = INTRO_PULL) => {
    if (!daoIntroState.active) return;
    let step = delta / pull;
    if (daoIntroState.target > INTRO_GATE || daoIntroState.target + step > INTRO_GATE) {
      step *= INTRO_GRIP;
    }
    daoIntroState.target = clamp01(daoIntroState.target + step);
    if (cueEl && daoIntroState.target >= 0.035) {
      cueEl.classList.add('is-hidden');
    }
    wakeSpring();
  };

  window.addEventListener(
    'wheel',
    (event) => {
      if (!daoIntroState.active) return;
      event.preventDefault();
      let d = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (event.deltaMode === 1) d *= 28;
      else if (event.deltaMode === 2) d *= 320;
      advance(d, INTRO_PULL);
    },
    { passive: false }
  );

  let touchState = null;
  const touchPull = () => Math.max(window.innerHeight, 560) * 1.85;

  window.addEventListener(
    'touchstart',
    (event) => {
      if (!daoIntroState.active || event.touches.length > 1) {
        touchState = null;
        return;
      }
      if (event.target && event.target.closest && event.target.closest('button, a')) {
        touchState = null;
        return;
      }
      const t = event.touches[0];
      touchState = { y: t.clientY, t: performance.now(), vy: 0 };
    },
    { passive: true }
  );

  window.addEventListener(
    'touchmove',
    (event) => {
      if (!daoIntroState.active || !touchState) return;
      event.preventDefault();
      const t = event.touches[0];
      const now = performance.now();
      const dy = touchState.y - t.clientY;
      touchState.vy = 0.7 * touchState.vy + 0.3 * (dy / Math.max(1, now - touchState.t));
      touchState.y = t.clientY;
      touchState.t = now;
      advance(dy, touchPull());
    },
    { passive: false }
  );

  window.addEventListener(
    'touchend',
    () => {
      if (!daoIntroState.active || !touchState) return;
      const g = touchState;
      touchState = null;
      if (performance.now() - g.t < 90) {
        advance(Math.max(-2.5, Math.min(2.5, g.vy)) * 200, touchPull());
      }
    },
    { passive: true }
  );

  window.addEventListener('keydown', (event) => {
    if (!daoIntroState.active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      finishIntro(false);
    } else if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      if (event.target && event.target.closest && event.target.closest('button, a')) return;
      event.preventDefault();
      advance(210, INTRO_PULL);
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      event.preventDefault();
      advance(-210, INTRO_PULL);
    }
  });

  if (skipBtn) {
    skipBtn.addEventListener('click', () => finishIntro(false));
  }

  window.addEventListener('portfolio:motionchange', (event) => {
    if (event.detail && event.detail.paused && daoIntroState.active) {
      finishIntro(true);
    }
  });

  paintIntro();
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
    themeBlend: isLightTheme() ? 1 : 0,
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

  /* Daylight Atelier: flowing harmonic contour ribbons & sunlit floating motes */
  const ribbonCount = 11;
  const daylightRibbons = Array.from({ length: ribbonCount }, (_, idx) => {
    const frac = idx / (ribbonCount - 1);
    return {
      yBase: 0.14 + frac * 0.72,
      amp: 16 + (idx % 3) * 11 + rand() * 8,
      freq: 0.0022 + frac * 0.0014,
      speed: 0.24 + (idx % 4) * 0.08,
      phase: rand() * Math.PI * 2,
      warm: idx % 3 === 1,
      width: idx % 4 === 0 ? 1.25 : 0.85,
      alpha: 0.085 + (1 - Math.abs(frac - 0.5) * 1.4) * 0.11,
    };
  });

  const solarNodes = Array.from({ length: 7 }, (_, idx) => ({
    ring: 0.62 + (idx % 3) * 0.34,
    angle: (idx / 7) * Math.PI * 2 + rand() * 0.4,
    speed: (idx % 2 === 0 ? 1 : -1) * (0.14 + rand() * 0.12),
    radius: idx % 3 === 0 ? 3.2 : 2.1,
    warm: idx % 2 === 0,
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

    /* Smoothly glide from intro center to resting portfolio position after handoff */
    if (!daoIntroState.active && daoIntroState.blend > 0 && dt > 0) {
      daoIntroState.blend = Math.max(0, daoIntroState.blend - dt * 1.15);
    }
    const rawB = daoIntroState.blend;
    const easeB = rawB * rawB * (3 - 2 * rawB);
    const introP = daoIntroState.shown;

    /* Front-loaded arrival: pure void at t=0, blooms immediately on the first scroll nudge */
    const arrive = daoIntroState.active
      ? Math.pow(Math.min(1, Math.max(0, daoIntroState.target / 0.08)), 0.55)
      : 1;
    const fieldVis = 1 - easeB + easeB * arrive;
    if (fieldVis < 0.004) return;

    /* Smoothly morph between Dark Event Horizon (0) and Daylight Atelier (1) */
    const targetTheme = isLightTheme() ? 1 : 0;
    if (dt > 0) {
      const step = Math.min(1, dt * 2.4);
      state.themeBlend += (targetTheme - state.themeBlend) * step;
      if (Math.abs(targetTheme - state.themeBlend) < 0.002) state.themeBlend = targetTheme;
    } else {
      state.themeBlend = targetTheme;
    }
    const tb = state.themeBlend;
    const easeTheme = tb * tb * (3 - 2 * tb);
    const darkWeight = 1 - easeTheme;
    const lightWeight = easeTheme;

    const rgbCore = '10, 10, 10';
    const rgbWarm = '244, 240, 232';
    const rgbCool = '206, 212, 222';
    const baseIntensity = 0.64 * fieldVis * darkWeight;
    const intensity = baseIntensity * (1 + easeB * 0.36);

    const p = state.scrollShown;
    /* Resting portfolio choreography */
    const portCenterX = state.cx + state.wakeX * 28 - Math.sin(p * Math.PI) * (state.w >= 1024 ? 54 : 20);
    const portCenterY = state.cy + state.wakeY * 20 - p * 30;
    const portRadius = state.baseRadius * (1 + Math.sin(p * Math.PI * 0.9) * 0.14);
    const portTilt = 0.25 + Math.sin(p * Math.PI * 0.85) * 0.22 + state.wakeY * 0.15;
    const portRoll = -0.25 + p * 0.46 + state.wakeX * 0.12;

    /* Intro 4-act choreography: birth/bloom -> relativistic orbit -> collapse into photon ring -> handoff */
    const bloomPhase = Math.min(1, introP / 0.36);
    const collapsePhase = Math.min(1, Math.max(0, (introP - 0.76) / 0.22));
    const introBaseR = Math.min(state.w, state.h) * (state.w >= 1024 ? 0.285 : 0.33);
    const introRadius = introBaseR * (0.48 + Math.sin(Math.min(1, introP / 0.78) * Math.PI * 0.5) * 0.72 - collapsePhase * 0.18);
    const introCenterX = state.w * 0.5 + state.wakeX * 18;
    const introCenterY = state.h * 0.5 + state.wakeY * 14 + introP * 10;
    const introTilt = 0.08 + bloomPhase * 0.26 - collapsePhase * 0.14 + state.wakeY * 0.12;
    const introRoll = -0.14 + introP * 0.52 + state.wakeX * 0.10;

    const centerX = portCenterX + (introCenterX - portCenterX) * easeB;
    const centerY = portCenterY + (introCenterY - portCenterY) * easeB;
    const radiusScale = portRadius + (introRadius - portRadius) * easeB;
    const tilt = portTilt + (introTilt - portTilt) * easeB;
    const roll = portRoll + (introRoll - portRoll) * easeB;

    const introDiscSpread = 0.30 + bloomPhase * 0.86 - collapsePhase * 0.62;
    const discSpread = 1 + (introDiscSpread - 1) * easeB;
    const discFade = 1 - easeB * collapsePhase * 0.72;
    const ringBoost = 1 + easeB * (0.25 + collapsePhase * 0.65);

    const cosRoll = Math.cos(roll);
    const sinRoll = Math.sin(roll);
    const spinBoost = p * 2.8 + easeB * introP * 7.2;
    const streakBoost = 1 + state.scrollVel * 2.4 + easeB * Math.min(2.6, Math.abs(daoIntroState.vel) * 3.8);

    const projectDisc = (r, angle, yOff) => {
      const scaledR = r * discSpread;
      const x3 = Math.cos(angle) * scaledR;
      const z3 = Math.sin(angle) * scaledR;
      const px = x3;
      const py = yOff * discSpread + z3 * tilt;
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

    /* ======================================================================
       DARK MODE WORLD: DAO Event Horizon (Keplerian Disc + Photon Ring)
       ====================================================================== */
    if (darkWeight > 0.005) {
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
      halo.addColorStop(0.22, `rgba(${rgbWarm}, ${(0.095 * darkWeight * fieldVis).toFixed(3)})`);
      halo.addColorStop(0.50, `rgba(${rgbWarm}, ${(0.036 * darkWeight * fieldVis).toFixed(3)})`);
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
        const alpha = Math.min(0.85, pt.alpha * doppler * 0.68 * intensity * discFade);
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
      coreGrad.addColorStop(0, `rgba(${rgbCore}, ${(0.94 * darkWeight * fieldVis).toFixed(3)})`);
      coreGrad.addColorStop(0.82, `rgba(${rgbCore}, ${(0.74 * darkWeight * fieldVis).toFixed(3)})`);
      coreGrad.addColorStop(1, `rgba(${rgbCore}, 0)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius * 1.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(${rgbWarm}, ${(0.22 * darkWeight * fieldVis).toFixed(3)})`;
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

        const alpha = Math.min(0.65, s.alpha * (p0.z > 0 ? 1 : 0.52) * intensity * discFade * (0.9 + state.scrollVel * 0.35));
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

        const alpha = Math.min(0.95, pt.alpha * intensity * ringBoost);
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
        const alpha = Math.min(0.94, pt.alpha * doppler * intensity * discFade);
        const rgb = pt.warmth > 0.3 ? rgbWarm : rgbCool;

        ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(fx, fy, pt.size * 1.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* ======================================================================
       LIGHT MODE WORLD: Daylight Atelier (Harmonic Silk Ribbons + Solar Astrolabe)
       ====================================================================== */
    if (lightWeight > 0.005) {
      const lw = lightWeight * fieldVis;
      const inkRgb = '28, 27, 25';
      const goldRgb = '178, 132, 64';
      const skyRgb = '132, 148, 166';

      /* 1. Warm sunlit atmospheric wash */
      const sunHalo = ctx.createRadialGradient(
        centerX,
        centerY,
        radiusScale * 0.1,
        centerX,
        centerY,
        radiusScale * 2.1
      );
      sunHalo.addColorStop(0, `rgba(255, 247, 232, ${(0.55 * lw).toFixed(3)})`);
      sunHalo.addColorStop(0.45, `rgba(${goldRgb}, ${(0.075 * lw).toFixed(3)})`);
      sunHalo.addColorStop(1, 'rgba(255, 247, 232, 0)');
      ctx.fillStyle = sunHalo;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radiusScale * 2.1, 0, Math.PI * 2);
      ctx.fill();

      /* 2. Flowing topographic silk contour ribbons that part gently around the pointer */
      const ribbonSteps = state.w >= 1024 ? 36 : 22;
      const dxStep = state.w / ribbonSteps;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let r = 0; r < ribbonCount; r++) {
        const rb = daylightRibbons[r];
        const baseY = rb.yBase * state.h - p * 44 * (0.4 + r * 0.06);
        const waveAmp = rb.amp * (1 + state.scrollVel * 0.35 + easeB * 0.35);
        const phase = rb.phase + state.elapsed * rb.speed + p * 2.4 + easeB * introP * 4.2;

        ctx.beginPath();
        for (let s = 0; s <= ribbonSteps; s++) {
          const x = s * dxStep;
          let y =
            baseY +
            Math.sin(x * rb.freq + phase) * waveAmp +
            Math.cos(x * rb.freq * 0.52 - phase * 0.7) * (waveAmp * 0.42);

          if (state.pointerActive) {
            const pdx = x - state.pointerX;
            const pdy = y - state.pointerY;
            const dSq = pdx * pdx + pdy * pdy;
            if (dSq < 48400) {
              const dist = Math.sqrt(dSq);
              const pull = Math.pow(1 - dist / 220, 2) * 34;
              y += (pdy >= 0 ? 1 : -1) * pull;
            }
          }

          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const rgb = rb.warm ? goldRgb : (r % 2 === 0 ? inkRgb : skyRgb);
        ctx.strokeStyle = `rgba(${rgb}, ${(rb.alpha * lw).toFixed(3)})`;
        ctx.lineWidth = rb.width;
        ctx.stroke();
      }

      /* 3. Architectural Solar Astrolabe (concentric drafting rings + degree ticks + orbiting nodes) */
      const astroR = radiusScale * (1.06 + easeB * (0.14 - collapsePhase * 0.16));
      const rot = state.elapsed * 0.11 + p * 1.4 + easeB * introP * 2.6;

      /* Outer fine dial + radial degree ticks */
      ctx.save();
      ctx.translate(centerX, centerY);

      ctx.strokeStyle = `rgba(${inkRgb}, ${(0.11 * lw).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, astroR * 1.18, 0, Math.PI * 2);
      ctx.stroke();

      const tickCount = 60;
      for (let i = 0; i < tickCount; i++) {
        const a = (i / tickCount) * Math.PI * 2 + rot * 0.35;
        const major = i % 5 === 0;
        const r0 = astroR * (major ? 1.13 : 1.155);
        const r1 = astroR * 1.18;
        ctx.strokeStyle = `rgba(${major ? goldRgb : inkRgb}, ${((major ? 0.28 : 0.10) * lw).toFixed(3)})`;
        ctx.lineWidth = major ? 1.1 : 0.7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
      }

      /* Middle dashed orbital track */
      ctx.save();
      ctx.rotate(-rot * 0.6);
      ctx.setLineDash([4, 9]);
      ctx.strokeStyle = `rgba(${goldRgb}, ${(0.24 * lw).toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, astroR * 0.88, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      /* Inner architectural meridian ellipse */
      ctx.save();
      ctx.rotate(roll * 0.9 + rot * 0.25);
      ctx.strokeStyle = `rgba(${inkRgb}, ${(0.12 * lw).toFixed(3)})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(0, 0, astroR * 0.96, astroR * (0.34 + Math.abs(tilt) * 0.4), 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${goldRgb}, ${(0.16 * lw).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, astroR * 0.62, astroR * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      /* Orbiting celestial nodes */
      for (let i = 0; i < solarNodes.length; i++) {
        const n = solarNodes[i];
        const a = n.angle + state.elapsed * n.speed + p * 1.6 + easeB * introP * 3.0;
        const nx = Math.cos(a) * astroR * n.ring;
        const ny = Math.sin(a) * astroR * n.ring;

        ctx.fillStyle = `rgba(${n.warm ? goldRgb : inkRgb}, ${(0.48 * lw).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(nx, ny, n.radius, 0, Math.PI * 2);
        ctx.fill();

        if (n.warm) {
          ctx.strokeStyle = `rgba(${goldRgb}, ${(0.22 * lw).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(nx, ny, n.radius + 4.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.restore();

      /* 4. Sunlit buoyant floating motes */
      for (let i = 0; i < Math.min(48, dustCount); i++) {
        const d = dustParticles[i];
        if (darkWeight <= 0.005 && dt > 0) {
          d.x = (d.x + d.vx * dt + 1) % 1;
          d.y = (d.y - Math.abs(d.vy) * dt * 1.3 + 1) % 1;
        }
        const x = d.x * state.w + state.wakeX * 16 * d.depth;
        const y = ((d.y * state.h - p * 55 * d.depth) % state.h + state.h) % state.h;
        const shimmer = 0.6 + 0.4 * Math.sin(state.elapsed * 1.2 + d.phase);
        const rgb = i % 2 === 0 ? goldRgb : inkRgb;
        ctx.fillStyle = `rgba(${rgb}, ${(d.alpha * shimmer * 0.58 * lw).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, d.size * 1.15, 0, Math.PI * 2);
        ctx.fill();
      }
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
  window.addEventListener('portfolio:themechange', () => {
    if (reduceMotion()) renderFrame(0);
  });
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
  const photoWrap = document.getElementById('about-photo-wrap');
  const photoLit = photoWrap ? photoWrap.querySelector('.about__photo--lit') : null;
  if (!ringEl || trailEls.length === 0) return;

  const isDisabled = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'paused' ||
    document.body.classList.contains('dao-dialog-open') ||
    Boolean(document.querySelector('dialog[open]'));

  const TRAIL_EASE = [0.42, 0.31, 0.235, 0.175, 0.13, 0.095];
  const trailPos = trailEls.map(() => ({ x: -999, y: -999 }));

  let cx = -999;
  let cy = -999;
  let active = false;
  let raf = 0;
  let pressTimer = 0;

  const clearPhotoLight = () => {
    if (photoWrap) photoWrap.classList.remove('is-lit');
  };

  /* Reveals color on the monochrome portrait wherever the cursor light pool reaches it */
  const updatePhotoLight = () => {
    if (!photoWrap || !photoLit) return;
    if (!active || isDisabled() || cx < -900) {
      clearPhotoLight();
      return;
    }

    const rect = photoWrap.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;
    const dx = cx - centerX;
    const dy = cy - centerY;
    const dist = Math.hypot(dx, dy);
    const lightReach = rect.width * 0.5 + 220;

    if (dist < lightReach) {
      photoLit.style.setProperty('--photo-lx', `${(cx - rect.left).toFixed(1)}px`);
      photoLit.style.setProperty('--photo-ly', `${(cy - rect.top).toFixed(1)}px`);
      photoWrap.classList.add('is-lit');
    } else {
      photoWrap.classList.remove('is-lit');
    }
  };

  const updateScrollCapsule = () => {
    const inIntro = document.documentElement.classList.contains('intro-active');
    const nearTop = inIntro || window.scrollY < Math.max(120, window.innerHeight * 0.35);
    document.body.classList.toggle('dao-cursor-scroll', nearTop && !document.body.classList.contains('dao-cursor-on'));
    updatePhotoLight();
  };

  const deactivate = () => {
    active = false;
    document.body.classList.remove('dao-cursor-active', 'dao-cursor-on', 'dao-cursor-scroll', 'dao-cursor-press');
    clearPhotoLight();
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
    updatePhotoLight();

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
  window.addEventListener('portfolio:introcomplete', updateScrollCapsule);
  document.addEventListener('mouseleave', deactivate);
  window.addEventListener('blur', deactivate);
  window.addEventListener('portfolio:dialogchange', (event) => {
    if (event.detail && event.detail.open) deactivate();
  });
  window.addEventListener('portfolio:motionchange', (event) => {
    if (event.detail && event.detail.paused) deactivate();
  });
};

/**
 * Cursor-follow spotlight + subtle 3D perspective tilt on project cards
 * (fine pointers only).
 */
const initCardSpotlight = () => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const isTiltDisabled = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.getAttribute('data-motion') === 'paused';

  document.querySelectorAll('.project-card, .cert-card, .contact-card').forEach((card) => {
    const isTiltCard = card.classList.contains('project-card') || card.classList.contains('cert-card');

    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);

      if (isTiltCard && !isTiltDisabled()) {
        const nx = (x / rect.width - 0.5) * 2;
        const ny = (y / rect.height - 0.5) * 2;
        card.style.setProperty('--rx', `${(-ny * 4.5).toFixed(2)}deg`);
        card.style.setProperty('--ry', `${(nx * 4.5).toFixed(2)}deg`);
      }
    });

    if (isTiltCard) {
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    }
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
 * Top-layer <dialog> helpers:
 *  - Detects native discrete display + overlay exit transition support (probing
 *    computed display to guard against Firefox 129+ bug 1882408).
 *  - Animates exit smoothly via [data-closing] fallback when unsupported.
 *  - Restores the native mouse cursor whenever a modal dialog is open so the
 *    custom DOM cursor never disappears behind the browser's Top Layer.
 */
let cachedDisplayTransitionSupport;
const canTransitionDisplay = () => {
  if (cachedDisplayTransitionSupport !== undefined) return cachedDisplayTransitionSupport;
  if (!window.CSS || !window.CSS.supports || !window.CSS.supports('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  cachedDisplayTransitionSupport = getComputedStyle(probe).display === 'block';
  probe.remove();
  return cachedDisplayTransitionSupport;
};

const supportsTopLayerExit = () =>
  Boolean(window.CSS && window.CSS.supports && window.CSS.supports('overlay', 'auto')) &&
  canTransitionDisplay();

const syncDialogCursorState = () => {
  const hasOpen = Boolean(document.querySelector('dialog[open]:not([data-closing])'));
  document.body.classList.toggle('dao-dialog-open', hasOpen);
  window.dispatchEvent(new CustomEvent('portfolio:dialogchange', { detail: { open: hasOpen } }));
};

const openTopLayerDialog = (dialog) => {
  dialog.removeAttribute('data-closing');
  dialog.showModal();
  syncDialogCursorState();
};

const closeTopLayerDialog = async (dialog) => {
  if (!dialog.open || dialog.hasAttribute('data-closing')) return;
  if (!supportsTopLayerExit()) {
    dialog.setAttribute('data-closing', '');
    const animations = dialog.getAnimations ? dialog.getAnimations({ subtree: true }) : [];
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((anim) => anim.finished)),
        new Promise((resolve) => setTimeout(resolve, 600)),
      ]);
    }
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
  }
  dialog.close();
};

/**
 * Certificate preview dialog: opens PDF or image certificates inside the
 * native top-layer <dialog> and restores focus to the trigger on close.
 */
const initCertDialog = () => {
  const dialog = document.getElementById('cert-dialog');
  const closeBtn = document.getElementById('cert-close');
  const titleEl = document.getElementById('cert-dialog-title');
  const subEl = document.getElementById('cert-dialog-sub');
  const imgEl = document.getElementById('cert-image');
  const frameEl = document.getElementById('cert-frame');
  const openTabEl = document.getElementById('cert-open-tab');
  const triggers = document.querySelectorAll('[data-cert-open]');

  if (!dialog || !closeBtn || !titleEl || !imgEl || !frameEl || triggers.length === 0 || typeof dialog.showModal !== 'function') {
    return;
  }

  let activeTrigger = null;

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      activeTrigger = trigger;
      const title = trigger.dataset.certTitle || 'Certificate';
      const issuer = trigger.dataset.certIssuer || '';
      const src = trigger.dataset.certSrc || '';
      const type = trigger.dataset.certType || 'image';

      titleEl.textContent = title;
      if (subEl) subEl.textContent = issuer;
      if (openTabEl) openTabEl.href = src;

      if (type === 'pdf') {
        imgEl.hidden = true;
        imgEl.removeAttribute('src');
        frameEl.hidden = false;
        frameEl.src = src;
        frameEl.title = `${title} PDF preview`;
      } else {
        frameEl.hidden = true;
        frameEl.removeAttribute('src');
        imgEl.hidden = false;
        imgEl.src = src;
        imgEl.alt = `${title} certificate`;
      }

      openTopLayerDialog(dialog);
    });
  });

  closeBtn.addEventListener('click', () => closeTopLayerDialog(dialog));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeTopLayerDialog(dialog);
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeTopLayerDialog(dialog);
  });
  dialog.addEventListener('close', () => {
    frameEl.removeAttribute('src');
    syncDialogCursorState();
    if (activeTrigger) activeTrigger.focus();
  });
};

/**
 * Detail dialogs for the other projects (Examnesia, this portfolio).
 * Any [data-dialog-open="id"] button opens the matching <dialog>.
 */
const initProjectDialogs = () => {
  document.querySelectorAll('[data-dialog-open]').forEach((trigger) => {
    const dialog = document.getElementById(trigger.dataset.dialogOpen);
    if (!dialog || typeof dialog.showModal !== 'function') return;

    trigger.addEventListener('click', () => openTopLayerDialog(dialog));
    dialog.querySelectorAll('[data-dialog-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeTopLayerDialog(dialog));
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeTopLayerDialog(dialog);
    });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeTopLayerDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      syncDialogCursorState();
      trigger.focus();
    });
  });
};


/**
 * ACES project viewer: tabs that swap the screenshot/video and caption with
 * directional glide animations. Supports click and arrow/Home/End keys.
 */
const initAcesTabs = () => {
  const tabs = Array.from(document.querySelectorAll('.aces__tab'));
  const image = document.getElementById('aces-image');
  const caption = document.getElementById('aces-caption');
  const panel = document.getElementById('aces-panel');
  const video = document.getElementById('aces-video');
  if (tabs.length === 0 || !image || !caption || !panel) return;

  let activeIndex = Math.max(0, tabs.findIndex((t) => t.classList.contains('is-active')));

  const replayAnimation = (el) => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  };

  const select = (tab, focus = false) => {
    const nextIndex = tabs.indexOf(tab);
    const direction = nextIndex >= activeIndex ? '16px' : '-16px';
    activeIndex = nextIndex;
    panel.style.setProperty('--slide-dir', direction);

    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });

    const showVideo = Boolean(tab.dataset.video) && Boolean(video);
    if (video) {
      video.hidden = !showVideo;
      if (!showVideo) {
        video.pause();
      } else {
        replayAnimation(video);
      }
    }
    image.hidden = showVideo;
    if (!showVideo) {
      image.src = tab.dataset.src;
      image.alt = tab.dataset.alt;
      replayAnimation(image);
    }

    caption.textContent = tab.dataset.caption;
    caption.classList.remove('is-swapping');
    void caption.offsetWidth;
    caption.classList.add('is-swapping');

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
 * Closes on the X button, Escape, or a click on the backdrop, with smooth
 * top-layer entry/exit animations and native cursor restoration.
 */
const initAcesDialog = () => {
  const dialog = document.getElementById('aces-dialog');
  const openButton = document.getElementById('aces-open');
  const closeButton = document.getElementById('aces-close');
  if (!dialog || !openButton || !closeButton || typeof dialog.showModal !== 'function') return;

  openButton.addEventListener('click', () => openTopLayerDialog(dialog));
  closeButton.addEventListener('click', () => closeTopLayerDialog(dialog));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeTopLayerDialog(dialog);
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeTopLayerDialog(dialog);
  });
  dialog.addEventListener('close', () => {
    const video = document.getElementById('aces-video');
    if (video) video.pause();
    syncDialogCursorState();
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
  initDaoIntro();
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
  initCertDialog();
  initProjectDialogs();
});
