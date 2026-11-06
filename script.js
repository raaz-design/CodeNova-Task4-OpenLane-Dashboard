const PAGE_SIZE = 6;
const SEARCH_DELAY = 280;

const elements = {
  search: document.querySelector("#search-input"),
  sort: document.querySelector("#sort-select"),
  domain: document.querySelector("#domain-filter"),
  level: document.querySelector("#level-filter"),
  remote: document.querySelector("#remote-filter"),
  grid: document.querySelector("#listing-grid"),
  empty: document.querySelector("#empty-state"),
  error: document.querySelector("#error-state"),
  pagination: document.querySelector("#pagination"),
  resultCount: document.querySelector("#result-count"),
  pageSummary: document.querySelector("#page-summary"),
  pageNumbers: document.querySelector("#page-numbers"),
  previous: document.querySelector("#prev-page"),
  next: document.querySelector("#next-page"),
  total: document.querySelector("#total-count"),
  remoteCount: document.querySelector("#remote-count"),
  saved: document.querySelector("#metric-saved"),
  savedCount: document.querySelector("#saved-count"),
  savedNav: document.querySelector("#saved-nav"),
  heading: document.querySelector("#results-heading"),
  toast: document.querySelector("#toast"),
  filters: document.querySelector(".filters")
};

let allListings = [];
let currentPage = 1;
let searchTimer;
let showingSaved = false;
let savedIds = new Set(JSON.parse(localStorage.getItem("openlane-saved") || "[]"));

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function updateSavedCount() {
  const count = savedIds.size;
  elements.saved.textContent = count;
  elements.savedCount.textContent = count;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.remove("show"), 1900);
}

function populateDomains() {
  const domains = [...new Set(allListings.map(item => item.domain))].sort();
  elements.domain.innerHTML = '<option value="all">All domains</option>' +
    domains.map(domain => `<option value="${escapeHTML(domain)}">${escapeHTML(domain)}</option>`).join("");
}

function getFilteredListings() {
  const query = elements.search.value.trim().toLowerCase();
  const domain = elements.domain.value;
  const level = elements.level.value;
  const remoteOnly = elements.remote.checked;

  let results = allListings.filter(item => {
    const searchableText = [
      item.title, item.company, item.domain, item.level,
      item.location, item.type, item.description, ...item.skills, ...item.keywords
    ].join(" ").toLowerCase();

    const matchesSearch = !query || searchableText.includes(query);
    const matchesDomain = domain === "all" || item.domain === domain;
    const matchesLevel = level === "all" || item.level === level;
    const matchesRemote = !remoteOnly || item.remote;
    const matchesSaved = !showingSaved || savedIds.has(item.id);

    // AND logic: a listing must pass every active filter.
    return matchesSearch && matchesDomain && matchesLevel && matchesRemote && matchesSaved;
  });

  switch (elements.sort.value) {
    case "oldest":
      results.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "az":
      results.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "za":
      results.sort((a, b) => b.title.localeCompare(a.title));
      break;
    default:
      results.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return results;
}

function createCard(item) {
  const isSaved = savedIds.has(item.id);
  const initials = item.company.split(/\s+/).map(word => word[0]).slice(0, 2).join("").toUpperCase();
  const skillTags = item.skills.slice(0, 3).map(skill =>
    `<span class="skill-tag">${escapeHTML(skill)}</span>`).join("");

  return `
    <article class="listing-card">
      <div class="card-top">
        <div class="company-mark" aria-hidden="true">${escapeHTML(initials)}</div>
        <span class="card-domain">${escapeHTML(item.domain)}</span>
        <button class="save-button ${isSaved ? "saved" : ""}" type="button"
          data-save-id="${escapeHTML(item.id)}" aria-label="${isSaved ? "Remove saved listing" : "Save listing"}"
          aria-pressed="${isSaved}">${isSaved ? "♥" : "♡"}</button>
      </div>
      <h3>${escapeHTML(item.title)}</h3>
      <p class="company-line">${escapeHTML(item.company)} · ${escapeHTML(item.location)}</p>
      <p class="card-description">${escapeHTML(item.description)}</p>
      <div class="skill-list">${skillTags}</div>
      <div class="card-bottom">
        <div class="card-meta"><span>${escapeHTML(item.level)}</span><span>${item.remote ? "Remote friendly" : "On-site / hybrid"}</span></div>
        <span class="card-type">${escapeHTML(item.type)}</span>
      </div>
    </article>`;
}

function render() {
  const results = getFilteredListings();
  const totalPages = Math.ceil(results.length / PAGE_SIZE);
  currentPage = Math.min(currentPage, Math.max(totalPages, 1));
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = results.slice(start, start + PAGE_SIZE);

  elements.grid.innerHTML = visible.map(createCard).join("");
  elements.grid.hidden = results.length === 0;
  elements.empty.hidden = results.length !== 0;
  elements.error.hidden = true;
  elements.pagination.hidden = results.length === 0;
  elements.resultCount.textContent = `${results.length} ${results.length === 1 ? "opportunity" : "opportunities"} found`;
  elements.pageSummary.textContent = `Page ${currentPage} of ${Math.max(totalPages, 1)}`;
  elements.previous.disabled = currentPage === 1;
  elements.next.disabled = currentPage >= totalPages;
  elements.pageNumbers.innerHTML = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    return `<button class="page-number ${page === currentPage ? "active" : ""}" type="button"
      data-page="${page}" aria-label="Page ${page}" ${page === currentPage ? 'aria-current="page"' : ""}>${page}</button>`;
  }).join("");
  elements.heading.textContent = showingSaved ? "Your shortlist" : "Explore opportunities";
}

function resetToFirstPage() {
  currentPage = 1;
  render();
}

function setLoading(isLoading) {
  elements.grid.setAttribute("aria-busy", String(isLoading));
  if (isLoading) {
    elements.grid.hidden = false;
    elements.grid.innerHTML = '<div class="state-panel"><p>Gathering the latest opportunities…</p></div>';
    elements.empty.hidden = true;
    elements.error.hidden = true;
    elements.pagination.hidden = true;
  }
}

async function loadListings() {
  setLoading(true);
  try {
    const response = await fetch("./listings.json");
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length < 12) throw new Error("The dataset is missing or incomplete.");
    allListings = data;
    populateDomains();
    elements.total.textContent = allListings.length;
    elements.remoteCount.textContent = allListings.filter(item => item.remote).length;
    elements.grid.setAttribute("aria-busy", "false");
    updateSavedCount();
    render();
  } catch (error) {
    console.error("Could not load listings:", error);
    elements.grid.hidden = true;
    elements.grid.setAttribute("aria-busy", "false");
    elements.empty.hidden = true;
    elements.error.hidden = false;
    elements.pagination.hidden = true;
    elements.resultCount.textContent = "Listings unavailable";
  }
}

elements.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(resetToFirstPage, SEARCH_DELAY);
});
[elements.domain, elements.level, elements.remote, elements.sort].forEach(control => {
  control.addEventListener("change", resetToFirstPage);
});

elements.grid.addEventListener("click", event => {
  const saveButton = event.target.closest("[data-save-id]");
  if (!saveButton) return;
  const id = saveButton.dataset.saveId;
  if (savedIds.has(id)) {
    savedIds.delete(id);
    showToast("Removed from your shortlist");
  } else {
    savedIds.add(id);
    showToast("Added to your shortlist");
  }
  localStorage.setItem("openlane-saved", JSON.stringify([...savedIds]));
  updateSavedCount();
  render();
});

elements.pageNumbers.addEventListener("click", event => {
  const button = event.target.closest("[data-page]");
  if (!button) return;
  currentPage = Number(button.dataset.page);
  render();
});
elements.previous.addEventListener("click", () => { currentPage--; render(); });
elements.next.addEventListener("click", () => { currentPage++; render(); });

function clearFilters() {
  elements.search.value = "";
  elements.domain.value = "all";
  elements.level.value = "all";
  elements.remote.checked = false;
  elements.sort.value = "newest";
  showingSaved = false;
  elements.savedNav.classList.remove("active");
  currentPage = 1;
  render();
}
document.querySelector("#clear-filters").addEventListener("click", clearFilters);
document.querySelector("#empty-reset").addEventListener("click", clearFilters);
document.querySelector("#retry-button").addEventListener("click", loadListings);

elements.savedNav.addEventListener("click", () => {
  showingSaved = !showingSaved;
  elements.savedNav.classList.toggle("active", showingSaved);
  currentPage = 1;
  render();
});
document.querySelector("#mobile-filter-button").addEventListener("click", () => {
  elements.filters.classList.toggle("mobile-open");
});

document.addEventListener("keydown", event => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }
});

loadListings();
