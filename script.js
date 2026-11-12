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
 * Scroll-linked effects, batched into one requestAnimationFrame per frame:
 *  - top scroll progress bar
 *  - subtle parallax on decorative background orbs
 *  - active nav link pinned to the last section when at the page bottom
 */
const initScrollEffects = () => {
  const bar = document.getElementById('scroll-progress-bar');
  const orbs = Array.from(document.querySelectorAll('[data-parallax]'));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false;

  const update = () => {
    ticking = false;
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;

    if (bar) bar.style.transform = `scaleX(${progress})`;

    if (!reduceMotion) {
      orbs.forEach((orb) => {
        const speed = Number(orb.dataset.parallax) || 0;
        orb.style.transform = `translate3d(0, ${(scrollY * speed).toFixed(1)}px, 0)`;
      });
    }
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
 * Cursor-follow spotlight on project cards (fine pointers only).
 */
const initCardSpotlight = () => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.querySelectorAll('.project-card').forEach((card) => {
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
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;

    const originalText = submitButton.textContent;
    submitButton.textContent = 'Sending...';
    submitButton.disabled = true;

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      submitButton.textContent = response.ok ? 'Message Sent!' : 'Something went wrong';
      if (response.ok) form.reset();
    } catch (error) {
      submitButton.textContent = 'Something went wrong';
    }

    setTimeout(() => {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }, 2500);
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
  if (tabs.length === 0 || !image || !caption || !panel) return;

  const select = (tab, focus = false) => {
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    image.src = tab.dataset.src;
    image.alt = tab.dataset.alt;
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

document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  initThemeToggle();
  initScrollSpy();
  initStagger();
  initScrollReveal();
  initScrollEffects();
  initCardSpotlight();
  initAcesTabs();
  initFooterYear();
  initContactForm();
});
