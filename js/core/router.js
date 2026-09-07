import { slugifyTermName } from "../content-contract.js";

export function resolveTermRoute(terms, route) {
    const value = String(route || "").trim().toLowerCase();
    if (!value) return null;
    return terms.find(term => term.id.toLowerCase() === value
        || slugifyTermName(term.name) === value || term.legacySlugs?.includes(value)) || null;
}

export function resolveRoute(terms, search) {
    const params = new URLSearchParams(search);
    if (params.has("t")) {
        const term = resolveTermRoute(terms, params.get("t"));
        return term ? { page: "term", term } : { page: "not-found", term: null };
    }
    const page = params.get("page") || "home";
    return { page: page === "credits" ? "about" : ["home", "stats", "changelog", "about"].includes(page) ? page : "not-found", term: null };
}

export function termPath(term, pathname) {
    return `${pathname}?t=${encodeURIComponent(slugifyTermName(term.name) || term.id)}`;
}

export function createRouter(terms, render, host = window) {
    let current = { page: "home", term: null };
    const apply = () => {
        current = resolveRoute(terms, host.location.search);
        if (current.term) {
            const canonical = termPath(current.term, host.location.pathname);
            if (host.location.pathname + host.location.search !== canonical) host.history.replaceState(host.history.state, "", canonical);
        }
        render(current);
    };
    function navigate(page, term = null, { replace = false } = {}) {
        const path = term ? termPath(term, host.location.pathname)
            : host.location.pathname + (page === "home" ? "" : `?page=${encodeURIComponent(page)}`);
        const state = { mcsr: true, from: replace ? null : host.location.href };
        if (host.location.pathname + host.location.search !== path) host.history[replace ? "replaceState" : "pushState"](state, "", path);
        apply();
    }
    return {
        get current() { return current; },
        navigate,
        toTerm: term => navigate("term", term),
        bindTermLink(link, term) {
            link.href = termPath(term, host.location.pathname);
            link.addEventListener("click", event => {
                if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                navigate("term", term);
            });
        },
        start() {
            if (!host.history.state?.mcsr) host.history.replaceState({ mcsr: true, from: null }, "", host.location.href);
            host.addEventListener("popstate", apply);
            apply();
        },
        back() {
            if (host.history.state?.mcsr && host.history.state.from) host.history.back();
            else navigate("home", null, { replace: true });
        }
    };
}
