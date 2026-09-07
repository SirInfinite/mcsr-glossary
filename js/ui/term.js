import { slugifyTermName as slugify } from "../content-contract.js";
import { resolveRelatedTerms } from "../content/search.js";
import { escapeHTML, renderDefinitionWithMedia, renderTagLabels } from "./content.js";
import { copyText, showToast } from "./feedback.js";

export function createTermView({ data, router, voting, onEdit, onReport, onVoteChanged, bindTermLink }) {
    let renderGeneration = 0;
    let refreshVisibleVotes;
    const getVotes = voting.getVotes;
    const getVoteState = voting.getVoteState;
    const canVoteOnTerm = voting.canVote;
    const getVoteNote = voting.getNote;
function renderTermDetail(id) {
    const term = data.terms.find(t => t.id === id);
    const generation = ++renderGeneration;
    const page = document.getElementById("page-term");
    if (!term || !page) return;
    page.dataset.termId = term.id;

    const votes = getVotes(term.id);
    const currentVote = getVoteState(term.id);
    const votingEnabled = canVoteOnTerm(term.id);
    const voteNote = getVoteNote(term.id);
    const updatedDate = term.updatedDate ? new Date(`${term.updatedDate}T00:00:00`) : null;
    const dateStr = updatedDate && !Number.isNaN(updatedDate.getTime())
        ? updatedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "";
    const relatedTerms = resolveRelatedTerms(term, data.terms, 6);

    page.innerHTML = `
        <div class="term-detail-shell">
            <button class="back-btn" id="detail-back" type="button">← Browse glossary</button>
            <article class="term-detail-article">
                <header class="term-detail-header">
                    <div class="term-title-row">
                        <div class="term-title-copy">
                            <h1 class="term-detail-name">${escapeHTML(term.name)}</h1>
                            <div class="term-detail-classification">
                                <span class="term-category">${escapeHTML(term.category)}</span>
                                ${term.status && term.status !== "current" ? `<span class="term-status term-status-${escapeHTML(term.status)}">${escapeHTML(term.status)}</span>` : ""}
                                ${term.needsUpdating ? '<span class="term-status term-status-updating">Needs Updating</span>' : ""}
                            </div>
                        </div>
                        <div class="term-detail-actions" aria-label="Term actions">
                            <button class="term-utility-action copy-action" id="share-btn" type="button" aria-label="Copy link" title="Copy link">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10.6 13.4a2 2 0 0 0 2.8 0l4-4a2 2 0 1 0-2.8-2.8l-1.3 1.3M13.4 10.6a2 2 0 0 0-2.8 0l-4 4a2 2 0 1 0 2.8 2.8l1.3-1.3"/></svg>
                                <span>Copy Link</span>
                            </button>
                            <button class="term-utility-action edit-action" id="suggest-edit-btn" type="button" aria-label="Suggest an edit" aria-haspopup="dialog" aria-controls="submit-modal" title="Suggest an edit">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v6M12 16.8v.1"/></svg>
                                <span>Suggest an Edit</span>
                            </button>
                            <button class="term-utility-action report-action" id="report-term-btn" type="button" aria-label="Report a term" aria-haspopup="dialog" aria-controls="report-modal" title="Report a term">
                                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 21V4m0 1h10l-1.5 3L15 11H5"/></svg>
                                <span>Report a Term</span>
                            </button>
                        </div>
                    </div>
                    ${term.aliases?.length ? `<p class="term-aliases"><strong>Also known as:</strong> ${term.aliases.map(escapeHTML).join(", ")}</p>` : ""}
                    ${term.needsUpdating ? '<p class="term-review-note">This term is established; its definition or context needs community review.</p>' : ""}
                    ${term.historicalNote ? `<p class="term-historical-note">${escapeHTML(term.historicalNote)}</p>` : ""}
                    <div class="term-detail-meta">
                        ${dateStr ? `<span>Updated <time datetime="${escapeHTML(term.updatedDate)}" title="${dateStr}">${escapeHTML(term.updatedDate)}</time></span>` : ""}
                    </div>
                    ${term.tags?.length ? `
                    <div class="term-tags term-detail-tags">
                        ${renderTagLabels(term.tags)}
                    </div>` : ""}
                </header>
                <div class="term-reading-layout">
                    <section class="term-definition" aria-labelledby="term-definition-title">
                        <h2 class="sr-only" id="term-definition-title">Definition</h2>
                        <div class="term-detail-body term-content" id="term-definition-content"></div>
                    </section>
                    ${relatedTerms.length ? `
                    <section class="related-terms" aria-labelledby="related-terms-title">
                        <h2 id="related-terms-title">Related Terms</h2>
                        <div class="related-term-grid">
                            ${relatedTerms.map(related => `
                                <a class="related-card" data-id="${related.id}" href="?t=${encodeURIComponent(slugify(related.name))}">
                                    <span class="related-card-top"><strong>${escapeHTML(related.name)}</strong><span>${escapeHTML(related.category)}</span></span>
                                </a>
                            `).join("")}
                        </div>
                    </section>` : ""}
                    <section class="vote-section" aria-labelledby="term-vote-title">
                        <div class="vote-heading">
                            <div>
                                <p class="section-kicker">Community rating</p>
                                <h2 id="term-vote-title">Was this useful?</h2>
                            </div>
                            <div class="vote-row" id="vote-row">
                                <button class="vote-btn upvote ${currentVote === 1 ? 'voted' : ''}" id="vote-up" type="button" title="Mark ${escapeHTML(term.name)} as helpful" aria-pressed="${currentVote === 1}" ${votingEnabled ? '' : 'disabled'}>
                                    <svg class="vote-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4 3.5 16h17L12 4Z"/></svg><span>Helpful</span><span id="vote-up-count">${votes.up}</span>
                                </button>
                                <button class="vote-btn downvote ${currentVote === -1 ? 'voted' : ''}" id="vote-down" type="button" title="Mark ${escapeHTML(term.name)} as needing work" aria-pressed="${currentVote === -1}" ${votingEnabled ? '' : 'disabled'}>
                                    <svg class="vote-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 20 8.5-12h-17L12 20Z"/></svg><span>Needs work</span><span id="vote-down-count">${votes.down}</span>
                                </button>
                            </div>
                        </div>
                        <p class="vote-note" id="vote-status" role="status" aria-live="polite">${escapeHTML(voteNote)}</p>
                    </section>
                </div>
            </article>
        </div>
    `;
    document.title = `${term.name} | MCSR Glossary`;
    renderDefinitionWithMedia(term, document.getElementById("term-definition-content"));

    document.getElementById("detail-back")?.addEventListener("click", () => {
        router.back();
    });

    document.getElementById("share-btn")?.addEventListener("click", async () => {
        const url = `${location.origin}${location.pathname}?t=${slugify(term.name)}`;
        showToast(await copyText(url) ? "Link copied!" : "Could not copy the link.");
    });

    document.getElementById("suggest-edit-btn")?.addEventListener("click", () => {
        onEdit(term);
    });

    document.getElementById("report-term-btn")?.addEventListener("click", () => {
        onReport(term);
    });

    function refresh() {
        if (generation !== renderGeneration || !page.isConnected) return;
        const totals = voting.getVotes(id);
        const vote = voting.getVoteState(id);
        for (const [direction, value] of [["up", 1], ["down", -1]]) {
            const button = page.querySelector(`#vote-${direction}`);
            button.classList.toggle("voted", vote === value);
            button.setAttribute("aria-pressed", String(vote === value));
            button.disabled = !voting.canVote(id);
            page.querySelector(`#vote-${direction}-count`).textContent = String(totals[direction]);
        }
        const row = page.querySelector("#vote-row");
        if (voting.isPending(id)) row.setAttribute("aria-busy", "true");
        else row.removeAttribute("aria-busy");
        page.querySelector("#vote-status").textContent = voting.getNote(id);
    }
    refreshVisibleVotes = refresh;
    async function handleVote(direction) {
        if (!voting.canVote(id)) return;
        const request = voting.choose(id, direction);
        refresh();
        const result = await request;
        // Refresh the *current* mounted view, even after returning to this term.
        refreshVisibleVotes?.();
        if (generation === renderGeneration && !result.ok) page.querySelector("#vote-status").textContent = result.reason + " " + voting.getNote(id);
        if (result.ok) {
            void voting.loadTrending().then(onVoteChanged);
            showToast(result.currentVote === 0 ? "Vote removed." : result.currentVote === 1 ? "Upvote saved." : "Downvote saved.");
        } else showToast(result.reason);
    }
    refresh();

    document.getElementById("vote-up")?.addEventListener("click", () => handleVote(1));
    document.getElementById("vote-down")?.addEventListener("click", () => handleVote(-1));

    page.querySelectorAll(".related-card[data-id]").forEach(el => {
        const related = data.terms.find(t => t.id === el.dataset.id);
        if (related) bindTermLink(el, related);
    });
}

    return {
        render: renderTermDetail,
        refresh: () => refreshVisibleVotes?.(),
        clear() {
            renderGeneration += 1;
            refreshVisibleVotes = null;
            document.getElementById("page-term")?.replaceChildren();
        }
    };
}
