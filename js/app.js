import { loadContent } from "./content/loader.js";
import { createRouter } from "./core/router.js";
import { createStorage, createVoterIdentity, STORAGE_KEYS } from "./core/storage.js";
import { createSupabaseClient } from "./backend/client.js";
import { createAnalytics } from "./backend/analytics.js";
import { createVoting } from "./backend/voting.js";
import { createContributions } from "./backend/contributions.js";
import { createHome } from "./ui/home.js";
import { createTermView } from "./ui/term.js";
import { createPages } from "./ui/pages.js";
import { createContributionModals } from "./ui/modals.js";

let started = false;
export async function start() {
    if (started) return;
    started = true;
    const storage = createStorage();
    const getBrowserID = createVoterIdentity(storage);
    const client = createSupabaseClient();
    const analytics = createAnalytics({ client, getBrowserID });
    const toggle = document.getElementById("theme-toggle");
    function applyTheme(theme) {
        const safe = theme === "light" ? "light" : "dark";
        document.documentElement.dataset.theme = safe;
        storage.write(STORAGE_KEYS.theme, safe);
        toggle.setAttribute("aria-label", safe === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
    applyTheme(document.documentElement.dataset.theme);
    toggle.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    document.querySelector(".skip-link")?.addEventListener("click", () => requestAnimationFrame(() => document.getElementById("main-content")?.focus()));
    const topButton = document.getElementById("btt-btn");
    window.addEventListener("scroll", () => topButton.classList.toggle("visible", window.scrollY > 400), { passive: true });
    topButton.addEventListener("click", () => window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));

    // Immutable published content is the application model. Route state belongs
    // to the router; browse, service and dialog state stay inside their owners.
    let data;
    let dataLoadFailed = false;
    try { data = await loadContent(); }
    catch (error) {
        console.error("Failed to load glossary data.", error);
        dataLoadFailed = true;
        data = Object.freeze({ terms: Object.freeze([]) });
    }
    const voting = createVoting({ client, getBrowserID, storage, terms: data.terms });
    const contributions = createContributions({ client, getBrowserID, terms: data.terms });
    const modals = createContributionModals({ client, contributions });
    const router = createRouter(data.terms, renderPage);
    const home = createHome({ data, dataLoadFailed, navigateToTerm: router.toTerm, bindTermLink: router.bindTermLink, showHome: () => router.navigate("home"), getTrending: voting.getTrending });
    const termView = createTermView({ data, router, voting, onEdit: modals.openSubmit, onReport: modals.openReport, onVoteChanged: home.renderTrending, bindTermLink: router.bindTermLink });
    const pages = createPages({ data, voting, analytics, navigateToTerm: router.toTerm });
    let lastPage;
    function renderPage(route) {
        home.hideSearchTooltip();
        if (lastPage === "term") termView.clear();
        lastPage = route.page;
        document.querySelectorAll(".page").forEach(element => { element.style.display = "none"; });
        const page = route.page === "not-found" ? "term" : route.page;
        const target = document.getElementById(`page-${page}`);
        target.style.display = "block";
        document.querySelectorAll(".nav-btn").forEach(button => {
            if (button.dataset.page === page || (page === "term" && button.dataset.page === "home")) button.setAttribute("aria-current", "page");
            else button.removeAttribute("aria-current");
        });
        if (route.page === "not-found") {
            target.innerHTML = '<div class="term-detail-shell"><h1>Term not found</h1><p>This link does not match a published glossary entry.</p><button type="button" class="back-btn">Browse glossary</button></div>';
            target.querySelector("button").addEventListener("click", () => router.navigate("home"));
        } else if (page === "term") termView.render(route.term.id);
        else if (page === "stats") pages.renderStats();
        else if (page === "changelog") void pages.renderChangelog();
        if (!route.term) document.title = route.page === "home" ? "MCSR Glossary" : `${route.page === "not-found" ? "Not found" : route.page[0].toUpperCase() + route.page.slice(1)} | MCSR Glossary`;
        window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        const heading = target.querySelector("h1");
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
    document.querySelectorAll(".nav-btn").forEach(button => button.addEventListener("click", () => router.navigate(button.dataset.page)));
    router.start();
    // Local content and routing never wait for optional community services.
    void voting.load().then(() => {
        if (router.current.page === "term") termView.refresh();
        if (router.current.page === "stats") pages.renderStats();
    });
    void voting.loadTrending().then(home.renderTrending);
    void analytics.load().then(() => {
        if (router.current.page === "stats") pages.renderStats();
    });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void start(), { once: true });
else void start();
