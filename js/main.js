/* js/main.js
   Core UI behaviours for the static portfolio:
   - active nav link highlighting
   - smooth scrolling for in-page anchors
   - simple mobile nav toggle (if you add a .nav-toggle button)
   - section reveal on scroll (IntersectionObserver)
   - lazy-loading fallback for images with data-src
   - footer year auto-update
*/

document.addEventListener('DOMContentLoaded', () => {
  // Utilities
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- NAV: active state based on pathname or scroll ---------- */
  const navLinks = $$('.nav-links a');

  function setActiveNavByPath() {
    const path = location.pathname.split('/').pop() || 'index.html';
    navLinks.forEach(a => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('active', href === path);
    });
  }
  setActiveNavByPath();

  /* If page uses anchors and you want scroll-based active state, observe sections */
  const sections = $$('main section[id]');
  if (sections.length && navLinks.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          navLinks.forEach(a => {
            // match anchor or page link that ends with #id
            const href = a.getAttribute('href') || '';
            a.classList.toggle('active', href.includes(`#${id}`) || href.endsWith(`${id}`));
          });
        });
      },
      { root: null, rootMargin: '0px 0px -40% 0px', threshold: 0 }
    );
    sections.forEach(s => observer.observe(s));
  }

  /* ---------- SMOOTH SCROLL for in-page links ---------- */
  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // update history without jumping
        history.replaceState(null, '', href);
      }
    });
  });

  /* ---------- MOBILE NAV TOGGLE (progressive enhancement) ---------- */
  // Add a button with class .nav-toggle in HTML if you want a hamburger
  const navToggle = $('.nav-toggle');
  const navList = $('.nav-links');
  if (navToggle && navList) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      navList.classList.toggle('open');
    });

    // close nav when a link is clicked (mobile)
    navLinks.forEach(a => a.addEventListener('click', () => {
      if (navList.classList.contains('open')) {
        navList.classList.remove('open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      }
    }));
  }

  /* ---------- REVEAL ON SCROLL (simple fade/translate) ---------- */
  const revealables = $$('.reveal');
  if ('IntersectionObserver' in window && revealables.length) {
    const revObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealables.forEach(el => revObserver.observe(el));
  } else {
    // fallback: reveal all immediately
    revealables.forEach(el => el.classList.add('revealed'));
  }

  /* ---------- LAZY-LOAD FALLBACK for images (data-src) ---------- */
  const lazyImgs = $$('img[data-src]');
  if ('IntersectionObserver' in window && lazyImgs.length) {
    const imgObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.src = img.dataset.src;
        if (img.dataset.srcset) img.srcset = img.dataset.srcset;
        img.removeAttribute('data-src');
        img.addEventListener('load', () => img.classList.add('loaded'));
        obs.unobserve(img);
      });
    }, { rootMargin: '200px 0px' });
    lazyImgs.forEach(img => imgObserver.observe(img));
  } else {
    // eager-load fallback
    lazyImgs.forEach(img => {
      img.src = img.dataset.src;
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      img.classList.add('loaded');
    });
  }

  /* ---------- FOOTER YEAR AUTO UPDATE ---------- */
  const yearEls = $$('[data-year]');
  if (yearEls.length) {
    const y = new Date().getFullYear();
    yearEls.forEach(el => (el.textContent = String(y)));
  } else {
    // fallback: try to update plain copyright text if it contains a year-like pattern
    const footer = $('footer');
    if (footer) {
      const now = new Date().getFullYear();
      footer.innerHTML = footer.innerHTML.replace(/\b(19|20)\d{2}\b/g, now);
    }
  }

  /* ---------- OPTIONAL: keyboard accessibility helpers ---------- */
  // close mobile nav with ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navList && navList.classList.contains('open')) {
      navList.classList.remove('open');
      if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    }
  });
});
