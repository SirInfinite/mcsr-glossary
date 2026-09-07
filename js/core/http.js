import { APP_CONFIG } from "../config.js";

export class AppError extends Error {
    constructor(kind, message, { status = 0, code = "", cause } = {}) {
        super(message, { cause });
        this.name = "AppError";
        this.kind = kind;
        this.status = status;
        this.code = code;
    }
}

export function serviceMessage(error, action) {
    if (error?.kind === "timeout") return `${action} timed out. Its outcome could not be confirmed.`;
    if ([400, 409, 422].includes(error?.status)) return `${action} was rejected by the server.`;
    if ([401, 403].includes(error?.status)) return `${action} is not enabled for public access.`;
    if (error?.kind === "malformed-response") return `${action} returned an invalid response.`;
    return `${action} is temporarily unavailable.`;
}

// The deadline includes body consumption, not just response headers. Writes are
// never retried here: aborting a browser request does not undo a server commit.
export async function request(url, {
    format = "json", timeoutMs = APP_CONFIG.requestTimeoutMs, signal,
    fetchImpl = globalThis.fetch, ...options
} = {}) {
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const timer = setTimeout(() => { timedOut = true; abort(); }, timeoutMs);
    let rejectAbort;
    const interrupted = new Promise((_, reject) => { rejectAbort = reject; });
    const rejectInterrupted = () => rejectAbort(new AppError(
        timedOut ? "timeout" : "aborted", timedOut ? "Request deadline exceeded." : "Request cancelled."
    ));
    controller.signal.addEventListener("abort", rejectInterrupted, { once: true });
    if (controller.signal.aborted) rejectInterrupted();
    try {
        return await Promise.race([interrupted, (async () => {
            const response = await fetchImpl(url, { ...options, signal: controller.signal });
            const body = await response.text();
            if (!response.ok) {
                let code = "";
                try { code = String(JSON.parse(body)?.code || ""); } catch { /* Error bodies need not be JSON. */ }
                throw new AppError(response.status >= 500 ? "unavailable" : "rejected", `Request rejected (${response.status}).`, { status: response.status, code });
            }
            if (format === "text") return body;
            try { return JSON.parse(body); }
            catch (cause) { throw new AppError("malformed-response", "Response is not valid JSON.", { cause }); }
        })()]);
    } catch (error) {
        if (error instanceof AppError) throw error;
        if (controller.signal.aborted) throw new AppError(timedOut ? "timeout" : "aborted", "Request interrupted.", { cause: error });
        throw new AppError("network", "Could not reach the service.", { cause: error });
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        controller.signal.removeEventListener("abort", rejectInterrupted);
    }
}
