import { TERM_CONTRACT } from "../content-contract.js";
import { APP_CONFIG } from "../config.js";
import { request } from "../core/http.js";
import { escapeHTML, parseDefinition } from "./content.js";

export function createPages({ data, navigateToTerm, voting, analytics }) {
const getVotes = voting.getVotes;
// Top N terms by all-time aggregate vote balance, used on the Stats page.
function getTopRatedTerms(n = 5) {
    return [...data.terms]
        .filter(t => {
            const v = getVotes(t.id);
            return v.up > 0;
        })
        .sort((a, b) => {
            const va = getVotes(a.id);
            const vb = getVotes(b.id);
            return (vb.up - vb.down) - (va.up - va.down);
        })
        .slice(0, n);
}

function renderStats() {
    const grid = document.getElementById("stats-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const allTags = new Set(data.terms.flatMap(term => term.tags || []));
    const categories = TERM_CONTRACT.categories
        .map(category => ({ category, count: data.terms.filter(term => term.category === category).length }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);
    const recentTerms = [...data.terms]
        .sort((a, b) => (b.updatedDate || b.creationDate || "").localeCompare(a.updatedDate || a.creationDate || "") || a.name.localeCompare(b.name))
        .slice(0, 8);
    const cards = [
        { label: "Published terms", value: data.terms.length },
        { label: "Categories", value: categories.length },
        { label: "Topic tags", value: allTags.size },
        { label: "Media-backed", value: data.terms.filter(term => term.media?.length).length },
        { label: "Site visits", value: analytics.totalVisits }
    ];

    cards.forEach(({ label, value }) => {
        const card = document.createElement("div");
        card.className = "stat-card";
        const displayValue = Number.isSafeInteger(value) ? value.toLocaleString("en-US") : "—";
        card.innerHTML = `<span class="stat-number">${displayValue}</span><span class="stat-label">${escapeHTML(label)}</span>`;
        grid.appendChild(card);
    });

    const categoryStats = document.getElementById("category-stats");
    if (categoryStats) {
        categoryStats.innerHTML = categories.map(({ category, count }) => {
            const percent = data.terms.length ? Math.round((count / data.terms.length) * 100) : 0;
            return `
                <div class="category-stat-row">
                    <div class="category-stat-label"><span>${escapeHTML(category.replace(/\b\w/g, letter => letter.toUpperCase()))}</span><strong>${count}</strong></div>
                    <div class="category-stat-track" role="img" aria-label="${count} ${escapeHTML(category)} terms, ${percent} percent of the glossary">
                        <span style="width:${percent}%"></span>
                    </div>
                    <span class="split-percentage" aria-hidden="true">${percent}%</span>
                </div>`;
        }).join("");
    }

    const statusStats = document.getElementById("status-stats");
    if (statusStats) {
        const statuses = ["current", "historical", "legacy"].map(status => ({ status, count: data.terms.filter(term => term.status === status).length }));
        const mediaCount = data.terms.reduce((total, term) => total + (term.media?.length || 0), 0);
        const mediaTerms = data.terms.filter(term => term.media?.length).length;
        statusStats.innerHTML = `<div class="status-distribution" role="img" aria-label="${statuses.map(item => `${item.count} ${item.status}`).join(', ')} terms">${statuses.map(item => `<span class="${item.status}" style="flex:${item.count}"></span>`).join("")}</div>
            <dl class="status-ledger">${statuses.map(item => `<div><dt>${item.status[0].toUpperCase() + item.status.slice(1)}</dt><dd>${item.count}</dd></div>`).join("")}</dl>
            <p class="coverage-note">${mediaCount} visual examples across ${mediaTerms} definitions · ${Math.round(mediaTerms / Math.max(1, data.terms.length) * 100)}% media coverage.</p>`;
    }

    const recent = document.getElementById("recent-terms");
    if (recent) {
        recent.replaceChildren();
        recentTerms.forEach(term => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "mini-term-card";
            button.innerHTML = `<strong>${escapeHTML(term.name)}</strong><span>${escapeHTML(term.category)} · ${escapeHTML(term.updatedDate || term.creationDate || "Date not recorded")}</span>`;
            button.addEventListener("click", () => navigateToTerm(term));
            recent.appendChild(button);
        });
    }

    const community = document.getElementById("community-stats");
    if (community) {
        const rated = getTopRatedTerms(5);
        if (!rated.length) {
            community.innerHTML = `<div class="stats-empty"><strong>Ratings are just getting started.</strong><p>Open a definition and mark whether it was useful. Only aggregate totals appear here; browser voter IDs remain private.</p></div>`;
        } else {
            community.replaceChildren();
            const intro = document.createElement("p");
            intro.className = "stats-note";
            intro.textContent = voting.available
                ? "Highest net-rated definitions from the public aggregate totals."
                : "Last available aggregate ratings. The live rating service is currently unavailable.";
            const list = document.createElement("div");
            list.className = "community-rating-list";
            rated.forEach(term => {
                const totals = getVotes(term.id);
                const button = document.createElement("button");
                button.type = "button";
                button.className = "community-rating-row";
                button.innerHTML = `<span><strong>${escapeHTML(term.name)}</strong><small>${escapeHTML(term.category)}</small></span><span class="rating-totals"><span><span class="vote-mark-up" aria-hidden="true">▲</span> ${totals.up}</span><span><span class="vote-mark-down" aria-hidden="true">▼</span> ${totals.down}</span></span>`;
                button.addEventListener("click", () => navigateToTerm(term));
                list.appendChild(button);
            });
            community.append(intro, list);
        }
    }
}

async function renderChangelog() {
    const content = document.getElementById("changelog-content");
    if (!content) return;

    content.innerHTML = `<p class="changelog-error" role="status">Loading project release notes…</p>`;

    try {
        const markdown = (await loadChangelog()).replace(/^#\s+changelog\s*$/im, "").trim();
        content.className = "term-content changelog-markdown";
        content.innerHTML = parseDefinition(markdown);
        const entries = [...content.children];
        let body = null;
        entries.forEach(element => {
            if (element.tagName === "H2") {
                const section = document.createElement("section");
                section.className = "changelog-release";
                body = document.createElement("div");
                body.className = "term-content";
                section.append(element, body);
                content.appendChild(section);
            } else if (body) body.appendChild(element);
        });
    } catch {
        content.className = "";
        content.innerHTML = `<div class="changelog-error" role="status"><p>The local release notes could not be loaded.</p><a href="${APP_CONFIG.repositoryURL}/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">Read the changelog on GitHub ↗</a></div>`;
    }
}

return { renderStats, renderChangelog };
}

let changelogRequest;
function loadChangelog() {
    // Share one request across navigation. A failed load can be retried.
    if (!changelogRequest) changelogRequest = request(APP_CONFIG.changelogPath, { format: "text" }).catch(error => {
        changelogRequest = null;
        throw error;
    });
    return changelogRequest;
}
