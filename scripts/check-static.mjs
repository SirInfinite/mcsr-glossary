import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { APP_CONFIG } from "../js/config.js";
import { MEDIA_CONTRACT } from "../js/content-contract.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const graph = new Map();
function inspectModule(filename) {
    if (graph.has(filename)) return;
    assert.ok(fs.existsSync(filename), `Missing module: ${path.relative(root, filename)}`);
    const source = fs.readFileSync(filename, "utf8");
    execFileSync(process.execPath, ["--check", filename], { stdio: "pipe" });
    assert.ok(!/\b(?:window|globalThis)\.[A-Za-z_]+\s*=/.test(source), `Unexpected global assignment in ${path.relative(root, filename)}`);
    const imports = [...source.matchAll(/(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?["'](\.[^"']+)["']/g)].map(match => path.resolve(path.dirname(filename), match[1]));
    graph.set(filename, imports);
    imports.forEach(inspectModule);
}
inspectModule(path.join(root, "js/app.js"));
function visit(file, stack = []) {
    assert.ok(!stack.includes(file), `Circular import: ${[...stack, file].map(value => path.relative(root, value)).join(" -> ")}`);
    graph.get(file).forEach(dependency => visit(dependency, [...stack, file]));
}
visit(path.join(root, "js/app.js"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const [, reference] of html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)) {
    if (/^(https?:|data:)/.test(reference)) continue;
    assert.ok(!reference.startsWith("/"), `Root-relative static path: ${reference}`);
    assert.ok(fs.existsSync(path.join(root, reference)), `Missing HTML asset: ${reference}`);
}
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
for (const [, reference] of css.matchAll(/url\(['"]?([^'"()]+)['"]?\)/g)) assert.ok(fs.existsSync(path.resolve(root, "css", reference)), `Missing CSS asset: ${reference}`);
assert.ok(!/z-index:\s*\d/.test(css), "Layer values belong in named tokens");
const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
for (const rule of ["script-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-src https://www.youtube-nocookie.com https://clips.twitch.tv"]) assert.ok(csp.includes(rule), `Missing CSP restriction: ${rule}`);
assert.ok(!csp.includes("unsafe-eval"));
assert.ok(!/script-src[^;]*unsafe-inline/.test(csp));
MEDIA_CONTRACT.externalImageHosts.forEach(host => assert.ok(csp.includes(`https://${host}`), `Media host absent from CSP: ${host}`));
assert.ok(html.includes(`href="${APP_CONFIG.pagesURL}"`), "Canonical metadata must match configuration");
assert.ok(APP_CONFIG.pagesURL.endsWith(APP_CONFIG.basePath), "Pages URL and project subpath must agree");
const prepaint = fs.readFileSync(path.join(root, "js/theme.js"), "utf8");
assert.ok(prepaint.includes("getItem('theme')"), "Prepaint storage key must match the documented theme key");
const migrations = fs.readdirSync(path.join(root, "supabase/migrations")).sort();
assert.ok(migrations.every(file => /^\d{14}_[a-z0-9_]+\.sql$/.test(file)), "Invalid migration filename");
assert.equal(new Set(migrations.map(file => file.slice(0, 14))).size, migrations.length, "Migration versions must be unique");
assert.ok(migrations.every(file => fs.readFileSync(path.join(root, "supabase/migrations", file), "utf8").trim()), "Empty migration");
const { dependencies = {}, devDependencies = {} } = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
assert.equal(Object.keys(dependencies).length, 0, "The browser has no npm runtime dependency tree");
assert.ok(Object.values(devDependencies).every(value => /^\d+\.\d+\.\d+$/.test(value)), "Development tooling must be exactly pinned");
console.log(`Static integrity passed: ${graph.size} reachable modules, acyclic imports, relative assets, CSP, configuration and ${migrations.length} ordered migrations.`);
