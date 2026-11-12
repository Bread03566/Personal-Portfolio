/**
 * Mobile navigation: toggle button, Escape key, and closing on link click.
 */
const initNavToggle = () => {
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) setOpen(false);
  });
};

/**
 * Light/dark theme toggle, persisted in localStorage.
 * The saved theme is applied by an inline script in <head> before first paint.
 */
const initThemeToggle = () => {
  const THEME_KEY = 'portfolio-theme';
  const rootEl = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const applyTheme = (theme) => {
    const isDark = theme === 'dark';
    rootEl.setAttribute('data-theme', theme);
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  };

  applyTheme(rootEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  toggle.addEventListener('click', () => {
    const next = rootEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (error) {
      /* localStorage unavailable; the theme still applies for this session */
    }
  });
};

/**
 * Marks the nav link for the section currently in view.
 */
const initScrollSpy = () => {
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('[data-nav-link]');
  if (sections.length === 0 || navLinks.length === 0 || !('IntersectionObserver' in window)) return;

  const linksById = new Map();
  navLinks.forEach((link) => linksById.set(link.getAttribute('href').slice(1), link));

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible.length === 0) return;

      const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
      navLinks.forEach((link) => {
        link.classList.remove('is-active');
        link.removeAttribute('aria-current');
      });
      const active = linksById.get(topMost.target.id);
      if (active) {
        active.classList.add('is-active');
        active.setAttribute('aria-current', 'true');
      }
    },
    { rootMargin: '-40% 0px -50% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
};

/**
 * Updates the footer copyright year.
 */
const initFooterYear = () => {
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
};

/**
 * Submits the contact form to Formspree via fetch so a successful send
 * stays on the page, and reports the result in a live status message.
 */
const initContactForm = () => {
  const form = document.querySelector('.contact-form');
  const status = document.getElementById('form-status');
  if (!form || !status) return;

  const showStatus = (message, isError) => {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    if (!submitButton) return;

    submitButton.disabled = true;
    showStatus('Sending...', false);

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });

      if (response.ok) {
        form.reset();
        showStatus('Message sent. I will reply by email soon.', false);
      } else {
        showStatus('The message did not send. Try again, or email me directly.', true);
      }
    } catch (error) {
      showStatus('The message did not send. Check your connection and try again.', true);
    }

    submitButton.disabled = false;
  });
};

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initThemeToggle();
  initScrollSpy();
  initFooterYear();
  initContactForm();
});
