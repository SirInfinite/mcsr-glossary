import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const patterns = [
    ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{20,}/g],
    ["GitHub token", /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g],
    ["Supabase access token", /sbp_[a-f0-9]{35,}/g],
    ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
    ["Database password URL", /postgres(?:ql)?:\/\/[^\s/:]+:[^\s/@]{5,}@(?!(?:127\.0\.0\.1|localhost))/g]
];
const findings = [];
function inspect(text, location) {
    for (const [type, regex] of patterns) {
        regex.lastIndex = 0;
        if (regex.test(text)) findings.push({ type, location });
    }
    for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
        try { if (JSON.parse(Buffer.from(match[1], "base64url").toString()).role === "service_role") findings.push({ type: "Service-role JWT", location }); }
        catch { /* Not every token-shaped string is a JWT. */ }
    }
}
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).toString().split("\0").filter(Boolean);
for (const file of files) {
    if (!existsSync(file)) continue;
    if (/(?:^|\/)\.env(?:$|\.)/.test(file) && !file.endsWith(".example")) findings.push({ type: "Tracked environment file", location: file });
    const data = readFileSync(file);
    if (!data.includes(0)) inspect(data.toString("utf8"), file);
}
let historicalBlobs = 0;
if (process.argv.includes("--history")) {
    const objects = execFileSync("git", ["rev-list", "--objects", "--all"], { maxBuffer: 32 * 1024 * 1024 }).toString().trim().split("\n");
    for (const entry of objects) {
        const [id, ...name] = entry.split(" ");
        const filename = name.join(" ");
        if (!filename || !(/\.(?:js|mjs|cjs|json|md|sql|ya?ml|toml|env|txt|html|py)$/i.test(filename) || /(?:^|\/)\.env(?:$|\.)/.test(filename))) continue;
        const data = execFileSync("git", ["cat-file", "-p", id], { maxBuffer: 16 * 1024 * 1024 });
        historicalBlobs++;
        if (/(?:^|\/)\.env(?:$|\.)/.test(filename) && !filename.endsWith(".example")) findings.push({ type: "Historical environment file", location: `blob ${id}: ${filename}` });
        if (!data.includes(0)) inspect(data.toString("utf8"), `blob ${id}: ${filename}`);
    }
}
// Findings contain only classification and location, never the matched secret.
console.log(JSON.stringify({ result: findings.length ? "FAIL" : "PASS", files: files.length, historicalBlobs, findings }, null, 2));
if (findings.length) process.exitCode = 1;
