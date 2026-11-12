(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Mobile navigation: toggles the menu, closes on link click, Escape,
   * outside click, or when the viewport grows to desktop width.
   */
  const initNav = () => {
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

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('is-open')) return;
      if (!nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });

    window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  };

  /**
   * Light/dark theme. The initial theme is set by an inline script in <head>
   * (saved choice, else system preference); this wires up the toggle.
   */
  const initTheme = () => {
    const THEME_KEY = 'portfolio-theme';
    const root = document.documentElement;
    const button = document.getElementById('theme-toggle');
    if (!button) return;

    const sync = () => {
      const isLight = root.getAttribute('data-theme') === 'light';
      button.setAttribute('aria-pressed', String(isLight));
      button.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
    };

    sync();
    button.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      sync();
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (error) {
        /* storage unavailable: the theme still applies for this visit */
      }
    });
  };

  /**
   * Scroll-linked UI in one rAF-batched handler: progress bar, header border,
   * back-to-top visibility, and a small parallax on the hero preview.
   */
  const initScrollEffects = () => {
    const bar = document.getElementById('scroll-progress-bar');
    const header = document.getElementById('site-header');
    const toTop = document.getElementById('to-top');
    const parallaxEls = Array.from(document.querySelectorAll('[data-parallax]'));
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;

      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      if (header) header.classList.toggle('is-scrolled', y > 8);

      if (toTop) {
        const show = y > window.innerHeight * 0.8;
        toTop.hidden = false;
        toTop.classList.toggle('is-shown', show);
        toTop.tabIndex = show ? 0 : -1;
        toTop.setAttribute('aria-hidden', String(!show));
      }

      if (!reduceMotion && y < window.innerHeight * 1.5) {
        parallaxEls.forEach((el) => {
          const speed = Number(el.dataset.parallax) || 0;
          el.style.transform = `translate3d(0, ${(-y * speed).toFixed(1)}px, 0)`;
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

    if (toTop) {
      toTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        const home = document.getElementById('home');
        if (home) history.replaceState(null, '', '#home');
      });
    }
  };

  /**
   * Highlights the nav link for the section nearest the top of the viewport.
   */
  const initScrollSpy = () => {
    const links = Array.from(document.querySelectorAll('[data-nav-link]'));
    const sections = links
      .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
      .filter(Boolean);
    if (sections.length === 0) return;

    const update = () => {
      const line = window.innerHeight * 0.35;
      const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      let current = null;

      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= line) current = section;
      });
      if (atBottom) current = sections[sections.length - 1];

      links.forEach((link) => {
        const active = current !== null && link.getAttribute('href') === `#${current.id}`;
        link.classList.toggle('is-active', active);
        if (active) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          update();
        });
      },
      { passive: true }
    );
    update();
  };

  /**
   * Reveals `.reveal` elements once as they scroll into view. Children of a
   * `.stagger` group get an index that CSS turns into a transition delay.
   */
  const initReveal = () => {
    document.querySelectorAll('.stagger').forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        child.style.setProperty('--i', String(index));
      });
    });

    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
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
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
    );
    items.forEach((el) => observer.observe(el));
  };

  /**
   * Opens project dialogs (native <dialog>) from any [data-dialog-open] button.
   * Closes on the X button, Escape (built in), or a click on the backdrop.
   * Focus returns to the button that opened it.
   */
  const initDialogs = () => {
    document.querySelectorAll('[data-dialog-open]').forEach((trigger) => {
      const dialog = document.getElementById(trigger.dataset.dialogOpen);
      if (!dialog || typeof dialog.showModal !== 'function') return;

      trigger.addEventListener('click', () => {
        dialog.returnValue = '';
        dialog._opener = trigger;
        dialog.showModal();
      });
    });

    document.querySelectorAll('dialog.dialog').forEach((dialog) => {
      dialog.querySelectorAll('[data-dialog-close]').forEach((btn) => {
        btn.addEventListener('click', () => dialog.close());
      });

      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });

      dialog.addEventListener('close', () => {
        dialog.querySelectorAll('video').forEach((video) => video.pause());
        if (dialog._opener) dialog._opener.focus();
      });
    });
  };

  /**
   * ACES viewer tabs: swap the demo video / screenshots and caption.
   * Click plus Arrow/Home/End keys (roving tabindex).
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
   * Contact form: inline validation, clear success/error messages, and
   * submission to Formspree via fetch so the visitor stays on the page.
   */
  const initContactForm = () => {
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');
    if (!form || !status) return;

    const fields = Array.from(form.querySelectorAll('input[required], textarea[required]'));
    const submitButton = form.querySelector('button[type="submit"]');
    const submitLabel = submitButton.textContent;

    const messageFor = (field) => {
      const value = field.value.trim();
      if (!value) return `Enter your ${field.name === 'message' ? 'message' : field.name}.`;
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

      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';

      try {
        const response = await fetch(form.action, {
          method: 'POST',
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
        submitButton.disabled = false;
        submitButton.textContent = submitLabel;
      }
    });
  };

  const initFooterYear = () => {
    const year = document.getElementById('current-year');
    if (year) year.textContent = String(new Date().getFullYear());
  };

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initTheme();
    initScrollEffects();
    initScrollSpy();
    initReveal();
    initDialogs();
    initAcesTabs();
    initContactForm();
    initFooterYear();
  });
})();
