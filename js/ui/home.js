import { TERM_CONTRACT } from "../content-contract.js";
import { filterTerms, normalizeText as toLower } from "../content/search.js";
import { escapeHTML, highlightMatch, getDefinitionPreview, renderTagLabels, previewTags, formatTagLabel } from "./content.js";
import { showToast } from "./feedback.js";

export function createHome({ data, navigateToTerm, bindTermLink, showHome, getTrending, dataLoadFailed }) {
    let activeIndexLetter = "ALL";
    let searchQuery = "";
    let tooltipFocusIdx = -1;
    let tooltipItems = [];
    const filterState = { category: "all", tags: new Set(), tagMatch: "any" };
function buildTermCard(term) {
    const card = document.createElement("article");
    card.className = "term";
    card.id = `term-${term.id}`;
    card.innerHTML = `
        <div class="term-row-title">
            <h3 class="term-name-heading"><a class="term-name term-name-link" aria-label="View ${escapeHTML(term.name)}">${highlightMatch(term.name, searchQuery)}</a></h3>
            ${term.aliases?.length ? `<span class="term-aka">${highlightMatch(term.aliases.join(", "), searchQuery)}</span>` : ""}
        </div>
        <p class="term-card-preview">${highlightMatch(getDefinitionPreview(term), searchQuery)}</p>
        <div class="term-row-meta">
            <span class="term-category">${escapeHTML(term.category)}</span>
            ${renderTagLabels(previewTags(term.tags))}
            ${term.status !== "current" ? `<span class="term-status term-status-${escapeHTML(term.status)}">${escapeHTML(term.status)}</span>` : ""}
            ${term.needsUpdating ? '<span class="term-status term-status-updating">Needs Updating</span>' : ""}
        </div>`;
    bindTermLink(card.querySelector("a"), term);
    return card;
}

function getActiveFilterCount() {
    return (filterState.category === "all" ? 0 : 1) + filterState.tags.size;
}

function hasActiveBrowseState() {
    return Boolean(searchQuery.trim())
        || getActiveFilterCount() > 0
        || activeIndexLetter !== "ALL";
}

function updateResultsToolbar(count) {
    const resultCount = document.getElementById("result-count");
    const clearAll = document.getElementById("clear-all-filters");
    const filterCount = document.getElementById("filter-count");
    const filterButton = document.getElementById("filter-btn");
    const activeFilters = getActiveFilterCount();

    if (resultCount) {
        if (searchQuery.trim()) {
            resultCount.textContent = `${count} ${count === 1 ? "result" : "results"} for “${searchQuery.trim()}”`;
        } else if (activeFilters || activeIndexLetter !== "ALL") {
            resultCount.textContent = `${count} matching ${count === 1 ? "term" : "terms"}`;
        } else {
            resultCount.textContent = "";
        }
    }
    if (clearAll) clearAll.hidden = !hasActiveBrowseState();
    if (filterCount) {
        filterCount.hidden = activeFilters === 0;
        filterCount.textContent = String(activeFilters);
    }
    filterButton?.classList.toggle("has-active-filters", activeFilters > 0);
}

function clearAllBrowseState({ focusSearch = false } = {}) {
    searchQuery = "";
    activeIndexLetter = "ALL";
    filterState.category = "all";
    filterState.tags.clear();
    filterState.tagMatch = "any";

    const input = document.getElementById("search-input");
    if (input) input.value = "";
    const clearButton = document.getElementById("search-clear");
    if (clearButton) clearButton.style.display = "none";
    document.querySelectorAll("#category-filters .chip").forEach(chip => {
        const active = chip.dataset.value === "all";
        chip.classList.toggle("active", active);
        chip.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("#tag-dropdown-list input[type='checkbox']").forEach(inputElement => {
        inputElement.checked = false;
    });
    document.querySelectorAll("input[name='tag-match']").forEach(radio => {
        radio.checked = radio.value === "any";
    });
    updateTagDropdownLabel();
    updateIndexHighlights();
    hideSearchTooltip();
    renderTermsList(filterAndSearch());
    if (focusSearch) input?.focus();
}

function renderTermsList(terms) {
    const container = document.getElementById("terms");
    if (!container) return;

    container.innerHTML = "";
    updateResultsToolbar(terms.length);
    updateTrendingVisibility();

    if (!terms.length) {
        const msg = document.createElement("div");
        msg.id = "no-results";
        msg.setAttribute("role", "status");
        const heading = document.createElement("h3");
        heading.textContent = "No glossary terms match yet.";
        const detail = document.createElement("p");
        detail.textContent = "Try a shorter search, remove a filter, or suggest terminology that is missing.";
        const reset = document.createElement("button");
        reset.type = "button";
        reset.textContent = "Clear search and filters";
        reset.addEventListener("click", () => clearAllBrowseState({ focusSearch: true }));
        msg.append(heading, detail, reset);
        container.appendChild(msg);
        return;
    }

    const fragment = document.createDocumentFragment();
    terms.forEach(term => fragment.appendChild(buildTermCard(term)));
    container.appendChild(fragment);
}

function goToRandomTerm() {
    if (!data.terms.length) {
        showToast("No terms are available yet.");
        return;
    }
    const term = data.terms[Math.floor(Math.random() * data.terms.length)];
    navigateToTerm(term);
}

function positionTooltip() {
    const input = document.getElementById("search-input");
    const tooltip = document.getElementById("search-tooltip");
    if (!input || !tooltip) return;
    const rect = document.getElementById("search-input-wrap").getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + 6}px`;
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.width = `${rect.width}px`;
    tooltip.style.maxHeight = `${Math.max(120, Math.min(400, window.innerHeight - rect.bottom - 16))}px`;
}

function showSearchTooltip(query) {
    const tooltip = document.getElementById("search-tooltip");
    const inner = document.getElementById("search-tooltip-inner");
    if (!tooltip || !inner) return;

    if (!query) { hideSearchTooltip(); return; }

    const results = filterAndSearch().slice(0, 7);
    tooltipItems = results;
    tooltipFocusIdx = -1;
    document.getElementById("search-input")?.removeAttribute("aria-activedescendant");

    if (!results.length) { hideSearchTooltip(); return; }

    inner.innerHTML = "";
    results.forEach(term => {
        const item = document.createElement("div");
        item.className = "tooltip-item";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", "false");
        item.id = `search-option-${term.id}`;
        const matchingAlias = (term.aliases || []).find(alias => toLower(alias).includes(query));
        const matchingTag = (term.tags || []).find(tag => toLower(tag).includes(query));
        const matchContext = matchingAlias
            ? `Alias: ${matchingAlias}`
            : matchingTag
                ? `Tag: ${formatTagLabel(matchingTag)}`
                : toLower(term.category).includes(query)
                    ? `Category: ${term.category}`
                    : getDefinitionPreview(term, 120);
        item.innerHTML = `
            <span class="tooltip-name">${highlightMatch(term.name, query)}</span>
            <span class="tooltip-category">${escapeHTML(term.category || "")}</span>
            <span class="tooltip-preview">${highlightMatch(matchContext, query)}</span>
        `;
        // mousedown fires before blur, so we prevent default to stop input losing focus
        item.addEventListener("mousedown", e => { e.preventDefault(); selectTooltipItem(term); });
        inner.appendChild(item);
    });

    positionTooltip();
    tooltip.style.display = "block";
    document.getElementById("search-input")?.setAttribute("aria-expanded", "true");
}

function hideSearchTooltip() {
    const tooltip = document.getElementById("search-tooltip");
    if (tooltip) tooltip.style.display = "none";
    const input = document.getElementById("search-input");
    input?.setAttribute("aria-expanded", "false");
    input?.removeAttribute("aria-activedescendant");
    tooltipFocusIdx = -1;
}

function selectTooltipItem(term) {
    hideSearchTooltip();
    navigateToTerm(term);
}

// moves keyboard focus up/down through tooltip results
function moveFocus(dir) {
    const items = document.querySelectorAll("#search-tooltip-inner .tooltip-item");
    if (!items.length) return;
    items.forEach(i => {
        i.classList.remove("tooltip-focused");
        i.setAttribute("aria-selected", "false");
    });
    tooltipFocusIdx = tooltipFocusIdx < 0 ? (dir > 0 ? 0 : items.length - 1) : (tooltipFocusIdx + dir + items.length) % items.length;
    items[tooltipFocusIdx].classList.add("tooltip-focused");
    items[tooltipFocusIdx].setAttribute("aria-selected", "true");
    document.getElementById("search-input")?.setAttribute("aria-activedescendant", items[tooltipFocusIdx].id);
    items[tooltipFocusIdx].scrollIntoView({ block: "nearest" });
}

function buildIndex() {
    const container = document.getElementById("index");
    if (!container) return;
    container.innerHTML = "";

    const usedLetters = new Set(data.terms.map(t => (t.name || "").charAt(0).toUpperCase()));

    const allLink = document.createElement("button");
    allLink.type = "button";
    allLink.className = "index-letter active";
    allLink.textContent = "ALL";
    allLink.setAttribute("aria-label", "Show all terms");
    allLink.setAttribute("aria-current", "true");
    allLink.addEventListener("click", () => setIndexLetter("ALL"));
    container.appendChild(allLink);

    for (const letter of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        const a = document.createElement("button");
        a.type = "button";
        const exists = usedLetters.has(letter);
        a.className = "index-letter" + (exists ? "" : " inactive");
        a.textContent = letter;
        a.setAttribute("aria-label", exists ? `Show terms beginning with ${letter}` : `No terms begin with ${letter}`);
        if (exists) {
            a.addEventListener("click", () => setIndexLetter(letter));
        } else a.disabled = true;
        container.appendChild(a);
    }
}

function setIndexLetter(letter) {
    activeIndexLetter = letter;

    searchQuery = "";
    const input = document.getElementById("search-input");
    if (input) input.value = "";
    const clearBtn = document.getElementById("search-clear");
    if (clearBtn) clearBtn.style.display = "none";

    hideSearchTooltip();
    renderTermsList(filterAndSearch());
    updateIndexHighlights();
}

function updateIndexHighlights() {
    document.querySelectorAll(".index-letter").forEach(el => {
        const active = el.textContent === activeIndexLetter;
        el.classList.toggle("active", active);
        if (active) el.setAttribute("aria-current", "true");
        else el.removeAttribute("aria-current");
    });
}

let tagDropdownOpen = false;

function buildCategoryFilters() {
    const container = document.getElementById("category-filters");
    if (!container) return;

    container.querySelectorAll(".chip:not([data-value='all'])").forEach(chip => chip.remove());
    const usedCategories = new Set(data.terms.map(term => term.category));
    const categories = TERM_CONTRACT.categories.filter(category => usedCategories.has(category));
    categories.forEach(category => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.dataset.value = category;
        chip.textContent = category.replace(/\b\w/g, letter => letter.toUpperCase());
        chip.setAttribute("aria-pressed", "false");
        container.appendChild(chip);
    });
}

function buildTagDropdown() {
    const allTags = [...new Set(data.terms.flatMap(t => (t.tags || []).map(toLower)))].sort();
    const container = document.getElementById("tag-dropdown-list");
    if (!container) return;
    container.innerHTML = "";

    allTags.forEach(tag => {
        const item = document.createElement("label");
        item.className = "tag-dropdown-item";
        item.innerHTML = `<input type="checkbox" name="tag" value="${escapeHTML(tag)}"> <span>${escapeHTML(formatTagLabel(tag))}</span>`;
        const cb = item.querySelector("input");
        cb.addEventListener("change", () => {
            if (cb.checked) filterState.tags.add(tag);
            else filterState.tags.delete(tag);
            updateTagDropdownLabel();
            applyFilterAndSearch();
        });
        container.appendChild(item);
    });
}

function updateTagDropdownLabel() {
    const btn = document.getElementById("tag-dropdown-btn");
    if (!btn) return;
    const count = filterState.tags.size;
    btn.textContent = count > 0 ? `Tags (${count} selected)` : "Tags";
}

function initTagDropdown() {
    const btn = document.getElementById("tag-dropdown-btn");
    const dropdown = document.getElementById("tag-dropdown");
    if (!btn || !dropdown) return;

    btn.addEventListener("click", e => {
        e.stopPropagation();
        tagDropdownOpen = !tagDropdownOpen;
        dropdown.style.display = tagDropdownOpen ? "block" : "none";
        btn.setAttribute("aria-expanded", String(tagDropdownOpen));
    });

    document.addEventListener("click", e => {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            tagDropdownOpen = false;
            dropdown.style.display = "none";
            btn.setAttribute("aria-expanded", "false");
        }
    });

    dropdown.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        tagDropdownOpen = false;
        dropdown.style.display = "none";
        btn.setAttribute("aria-expanded", "false");
        btn.focus();
    });

    buildTagDropdown();
}

function initFilters() {
    document.querySelectorAll(".filter-chips[data-group]").forEach(group => {
        const groupName = group.dataset.group;
        group.querySelectorAll(".chip").forEach(chip => {
            chip.addEventListener("click", () => {
                group.querySelectorAll(".chip").forEach(c => {
                    c.classList.remove("active");
                    c.setAttribute("aria-pressed", "false");
                });
                chip.classList.add("active");
                chip.setAttribute("aria-pressed", "true");
                filterState[groupName] = chip.dataset.value;
                applyFilterAndSearch();
            });
        });
    });

    document.querySelectorAll("input[name='tag-match']").forEach(radio => {
        radio.addEventListener("change", () => {
            filterState.tagMatch = radio.value;
            applyFilterAndSearch();
        });
    });

    initTagDropdown();

    const filterBtn = document.getElementById("filter-btn");
    const filtersEl = document.getElementById("filters");
    if (filterBtn && filtersEl) {
        filterBtn.addEventListener("click", () => {
            const open = filtersEl.style.display !== "none";
            filtersEl.style.display = open ? "none" : "flex";
            filterBtn.setAttribute("aria-expanded", String(!open));
        });
    }
}

function applyFilterAndSearch() {
    renderTermsList(filterAndSearch());
    updateIndexHighlights();
}

function filterAndSearch() {
    return filterTerms(data.terms, { ...filterState, query: searchQuery, letter: activeIndexLetter });
}
function renderTrending() {
    const { terms: trendingTerms, available: trendingServiceAvailable } = getTrending();
    const section = document.getElementById("trending-section");
    const list = document.getElementById("trending-list");
    if (!section || !list) return;

    if (!trendingServiceAvailable || dataLoadFailed || !data.terms.length) {
        section.hidden = true;
        list.replaceChildren();
        return;
    }

    section.hidden = false;
    list.replaceChildren();

    if (!trendingTerms.length) {
        const empty = document.createElement("li");
        empty.className = "trending-empty";
        empty.textContent = "No term has a positive recent vote balance yet.";
        list.appendChild(empty);
        updateTrendingVisibility();
        return;
    }

    trendingTerms.forEach((entry, index) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        const voteLabel = `${entry.recentUpvotes} recent upvote${entry.recentUpvotes === 1 ? "" : "s"} and ${entry.recentDownvotes} recent downvote${entry.recentDownvotes === 1 ? "" : "s"}`;
        button.type = "button";
        button.className = "trending-term";
        button.setAttribute("aria-label", `Open ${entry.term.name}, trending score plus ${entry.score}; ${voteLabel}`);
        button.title = voteLabel;
        button.innerHTML = `
            <span class="trending-rank" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
            <span class="trending-term-copy"><strong>${escapeHTML(entry.term.name)}</strong><small>${escapeHTML(entry.term.category)}</small></span>
            <span class="trending-score"><strong>+${entry.score}</strong><small>7d</small></span>
        `;
        button.addEventListener("click", () => navigateToTerm(entry.term));
        item.appendChild(button);
        list.appendChild(item);
    });
    updateTrendingVisibility();
}

function updateTrendingVisibility() {
    const { available: trendingServiceAvailable } = getTrending();
    const section = document.getElementById("trending-section");
    if (!section) return;
    section.hidden = !trendingServiceAvailable || dataLoadFailed || !data.terms.length || hasActiveBrowseState();
}

function init() {
    const searchInput = document.getElementById("search-input");
    const clearBtn = document.getElementById("search-clear");
    if (searchInput && clearBtn) {
        searchInput.addEventListener("input", () => {
            searchQuery = searchInput.value;
            clearBtn.style.display = searchQuery ? "block" : "none";
            if (searchQuery) activeIndexLetter = "ALL";
            applyFilterAndSearch();
            showSearchTooltip(searchQuery.trim().toLowerCase());
        });

        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            searchQuery = "";
            clearBtn.style.display = "none";
            hideSearchTooltip();
            applyFilterAndSearch();
            searchInput.focus();
        });

        searchInput.addEventListener("keydown", event => {
            const tooltipOpen = document.getElementById("search-tooltip")?.style.display !== "none";
            if (event.key === "ArrowDown" && tooltipOpen) { event.preventDefault(); moveFocus(1); }
            else if (event.key === "ArrowUp" && tooltipOpen) { event.preventDefault(); moveFocus(-1); }
            else if (event.key === "Enter" && tooltipItems[tooltipFocusIdx]) { event.preventDefault(); selectTooltipItem(tooltipItems[tooltipFocusIdx]); }
            else if (event.key === "Escape") {
                event.preventDefault();
                if (tooltipOpen) hideSearchTooltip();
                else if (searchQuery) {
                    searchInput.value = "";
                    searchQuery = "";
                    clearBtn.style.display = "none";
                    applyFilterAndSearch();
                }
            }
        });

        searchInput.addEventListener("focus", () => {
            if (searchQuery.trim()) showSearchTooltip(searchQuery.trim().toLowerCase());
        });
        searchInput.addEventListener("blur", () => setTimeout(hideSearchTooltip, 180));
    }

    window.addEventListener("scroll", hideSearchTooltip, { passive: true });
    window.addEventListener("resize", () => {
        const tooltip = document.getElementById("search-tooltip");
        if (tooltip?.style.display !== "none") positionTooltip();
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
        const target = event.target;
        if (target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable)) return;
        if (!document.getElementById("submit-modal")?.hidden || !document.getElementById("report-modal")?.hidden) return;
        event.preventDefault();
        showHome();
        searchInput?.focus();
    });

    document.getElementById("random-btn")?.addEventListener("click", goToRandomTerm);
    document.getElementById("clear-all-filters")?.addEventListener("click", () => clearAllBrowseState({ focusSearch: true }));
    buildCategoryFilters();
    buildIndex();
    initFilters();
    if (dataLoadFailed) {
        document.getElementById("terms").innerHTML = '<p class="data-error" role="alert">The glossary could not be loaded. Please refresh the page and try again.</p>';
        [searchInput, document.getElementById("random-btn"), document.getElementById("filter-btn")].forEach(control => { control.disabled = true; });
    } else renderTermsList(data.terms);
}
init();
return { hideSearchTooltip, renderTrending };
}
