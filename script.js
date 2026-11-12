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
 * Detail dialogs for the other projects (Kabisado, this portfolio).
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

document.addEventListener('DOMContentLoaded', () => {
  initMotionPolish();
  initSidebarToggle();
  initThemeToggle();
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
