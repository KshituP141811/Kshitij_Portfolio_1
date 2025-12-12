/* js/projects.js
   Loads data/projects.json and renders project cards with:
   - filtering by tech
   - client-side search (debounced)
   - simple pagination
   - accessible updates (aria-live)
   - graceful error handling / no-data UI
*/

document.addEventListener('DOMContentLoaded', () => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from((ctx || document).querySelectorAll(sel));

  const GRID_ID = '#projects-grid';
  const FILTER_ID = '#filter-tech';
  const SEARCH_ID = '#projects-search';
  const PAGINATION_ID = '#projects-pagination';
  const PREV_BTN_ID = '#prev-page';
  const NEXT_BTN_ID = '#next-page';
  const PAGE_INFO_ID = '#page-info';

  const projectsGrid = $(GRID_ID);
  const filterSelect = $(FILTER_ID);
  const searchInput = $(SEARCH_ID);
  const pagination = $(PAGINATION_ID);
  const prevBtn = $(PREV_BTN_ID);
  const nextBtn = $(NEXT_BTN_ID);
  const pageInfo = $(PAGE_INFO_ID);

  if (!projectsGrid) return; // nothing to do

  // Config
  const PER_PAGE = 6;
  let projects = [];
  let filtered = [];
  let currentPage = 1;
  let totalPages = 1;

  // Utility: sanitize text into element via textContent
  function createText(tag, text, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    return el;
  }

  // Build a single project card
  function buildCard(p) {
    const card = document.createElement('article');
    card.className = 'project-card shadow-sm';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-labelledby', `project-title-${p.id}`);

    const img = document.createElement('img');
    img.alt = p.imageAlt || `${p.title} screenshot`;
    // lazy load via data-src (main.js will handle)
    if (p.image) {
      img.dataset.src = p.image;
    } else {
      img.src = 'assets/images/project-placeholder.png';
    }
    card.appendChild(img);

    const content = document.createElement('div');
    content.className = 'project-content';

    const h3 = createText('h3', p.title);
    h3.id = `project-title-${p.id}`;
    content.appendChild(h3);

    const desc = createText('p', p.description || '');
    content.appendChild(desc);

    const meta = document.createElement('p');
    meta.className = 'project-meta text-small text-muted';
    meta.innerHTML = `<strong>Tech:</strong> ${Array.isArray(p.tech) ? p.tech.join(' · ') : (p.tech || '—')}`;
    content.appendChild(meta);

    const links = document.createElement('p');
    links.className = 'project-links';

    if (p.detailsUrl) {
      const a = document.createElement('a');
      a.href = p.detailsUrl;
      a.className = 'btn small-btn';
      a.textContent = 'Details';
      a.setAttribute('aria-label', `View details for ${p.title}`);
      links.appendChild(a);
    }

    if (p.sourceUrl) {
      const a2 = document.createElement('a');
      a2.href = p.sourceUrl;
      a2.className = 'btn outline-btn';
      a2.textContent = 'Source';
      a2.setAttribute('aria-label', `View source for ${p.title}`);
      a2.target = '_blank';
      a2.rel = 'noopener';
      links.appendChild(a2);
    }

    content.appendChild(links);
    card.appendChild(content);

    return card;
  }

  // Render current page of filtered results
  function render() {
    projectsGrid.innerHTML = '';
    if (!filtered.length) {
      projectsGrid.innerHTML = `<div class="empty-state"><p>No projects found.</p></div>`;
      if (pagination) pagination.hidden = true;
      return;
    }

    totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    currentPage = Math.min(currentPage, totalPages);

    const start = (currentPage - 1) * PER_PAGE;
    const pageItems = filtered.slice(start, start + PER_PAGE);

    const fragment = document.createDocumentFragment();
    pageItems.forEach(p => {
      const card = buildCard(p);
      fragment.appendChild(card);
    });

    projectsGrid.appendChild(fragment);

    // Update pagination UI
    if (pagination) {
      pagination.hidden = totalPages <= 1;
      prevBtn.disabled = currentPage === 1;
      nextBtn.disabled = currentPage === totalPages;
      if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    // announce number of results for screen readers
    projectsGrid.setAttribute('aria-label', `${filtered.length} projects. Showing ${pageItems.length} on this page.`);
  }

  // Apply filter + search
  function applyFilters() {
    const tech = filterSelect ? filterSelect.value : 'all';
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    filtered = projects.filter(p => {
      let okTech = tech === 'all' || (Array.isArray(p.tags) ? p.tags.includes(tech) : (p.tags === tech)) || (Array.isArray(p.tech) && p.tech.map(t=>t.toLowerCase()).includes(tech));
      if (!okTech) return false;

      if (!query) return true;

      const hay = `${p.title} ${p.description || ''} ${(p.tech||'').toString()} ${(p.tags||'').toString()}`.toLowerCase();
      return hay.includes(query);
    });

    currentPage = 1;
    render();
  }

  // Debounce helper
  function debounce(fn, wait = 250) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // Fetch projects.json
  async function load() {
    try {
      const resp = await fetch('data/projects.json', { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`Failed to fetch projects.json (${resp.status})`);
      const data = await resp.json();
      if (!Array.isArray(data)) throw new Error('projects.json must be an array of project objects');
      // give each project a stable id if missing
      projects = data.map((p, i) => ({ id: p.id || `p${i+1}`, ...p }));
      filtered = projects.slice();
      render();
    } catch (err) {
      console.error('Error loading projects:', err);
      projectsGrid.innerHTML = `<div class="empty-state"><p>Unable to load projects. Check <code>data/projects.json</code> and server configuration.</p></div>`;
      if (pagination) pagination.hidden = true;
    }
  }

  // Event listeners
  if (filterSelect) {
    filterSelect.addEventListener('change', () => applyFilters());
  }

  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => applyFilters(), 220));
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        render();
        prevBtn.focus();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        render();
        nextBtn.focus();
      }
    });
  }

  // keyboard: Enter on search should jump to first result page
  if (searchInput) {
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        applyFilters();
      }
    });
  }

  // Initialize
  load();
});
