import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { APP_CONFIG } from "../js/config.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".md": "text/plain", ".woff": "font/woff", ".webp": "image/webp", ".svg": "image/svg+xml", ".png": "image/png", ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".vtt": "text/vtt" };

// Development/QA only. The production site remains directly served static files.
export async function serve({ port = 8001, gzip = true } = {}) {
    const server = createServer(async (req, res) => {
        try {
            let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
            if (pathname.startsWith(APP_CONFIG.basePath)) pathname = pathname.slice(APP_CONFIG.basePath.length);
            else pathname = pathname.replace(/^\//, "");
            if (!pathname || pathname.endsWith("/")) pathname += "index.html";
            if (pathname.split(/[\\/]/).some(part => part.startsWith(".") || part === "node_modules")) throw new Error("Private path");
            const target = await realpath(path.resolve(root, pathname));
            if (!target.startsWith(root) || !(await stat(target)).isFile()) throw new Error("Outside root");
            let body = await readFile(target);
            const type = types[path.extname(target)] || "application/octet-stream";
            res.setHeader("Content-Type", type);
            res.setHeader("Cache-Control", "public, max-age=600");
            res.setHeader("Vary", "Accept-Encoding");
            if (gzip && /gzip/.test(req.headers["accept-encoding"] || "") && /text|json|svg/.test(type)) {
                body = gzipSync(body);
                res.setHeader("Content-Encoding", "gzip");
            }
            res.setHeader("Content-Length", body.length);
            res.end(req.method === "HEAD" ? undefined : body);
        } catch { res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Not found"); }
    });
    await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
    return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const server = await serve({ port: Number(process.env.PORT || 8001), gzip: process.env.QA_GZIP !== "false" });
    console.log(`MCSR Glossary: http://127.0.0.1:${server.address().port}${APP_CONFIG.basePath}`);
}
