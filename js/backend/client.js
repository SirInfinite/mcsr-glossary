import { APP_CONFIG } from "../config.js";
import { AppError, request } from "../core/http.js";

export function assessConfiguration(config) {
    let url;
    try {
        url = new URL(config.supabaseUrl);
        const local = ["localhost", "127.0.0.1"].includes(url.hostname);
        if ((url.protocol !== "https:" && !(local && url.protocol === "http:"))
            || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    } catch { return { error: "The Supabase project URL is invalid." }; }
    const key = String(config.supabasePublishableKey || "").trim();
    let role = "";
    try { role = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role; }
    catch { /* Publishable keys are not JWTs. */ }
    if (key.startsWith("sb_secret_") || role === "service_role") return { error: "A privileged Supabase key was rejected." };
    if (!key.startsWith("sb_publishable_") && role !== "anon") return { error: "Only a Supabase publishable key or legacy anon key is allowed." };
    return { url: url.origin, key, error: "" };
}

export function createSupabaseClient(config = APP_CONFIG, transport = request) {
    const settings = assessConfiguration(config);
    return Object.freeze({
        enabled: !settings.error,
        configurationError: settings.error,
        async rpc(name, body, { signal } = {}) {
            if (settings.error) throw new AppError("configuration", settings.error);
            if (!/^[a-z][a-z0-9_]+$/.test(name)) throw new AppError("configuration", "Invalid RPC name.");
            return transport(`${settings.url}/rest/v1/rpc/${name}`, {
                method: "POST", signal,
                headers: { apikey: settings.key, "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
        }
    });
}
