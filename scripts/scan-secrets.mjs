import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const patterns = [
    ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{20,}/g],
    ["GitHub token", /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g],
    ["Supabase access token", /sbp_[a-f0-9]{35,}/g],
    ["Private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g]
];
export function inspectText(text, location) {
    const findings = [];
    for (const [type, regex] of patterns) {
        regex.lastIndex = 0;
        if (regex.test(text)) findings.push({ type, location });
    }
    // Match the whole hostname: localhost.example is a remote host. Short
    // passwords are still credentials; only literal loopback fixtures are exempt.
    for (const match of text.matchAll(/postgres(?:ql)?:\/\/[^\s/:]+:[^\s/@]+@(\[[^\]]+\]|[^\s/?:#"'`]+)/gi)) {
        if (!["127.0.0.1", "localhost", "[::1]"].includes(match[1].toLowerCase())) {
            findings.push({ type: "Database password URL", location });
        }
    }
    for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
        try { if (JSON.parse(Buffer.from(match[1], "base64url").toString()).role === "service_role") findings.push({ type: "Service-role JWT", location }); }
        catch { /* Not every token-shaped string is a JWT. */ }
    }
    return findings;
}
function scan() {
    const findings = [];
    const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).toString().split("\0").filter(Boolean);
    for (const file of files) {
        if (!existsSync(file)) continue;
        if (/(?:^|\/)\.env(?:$|\.)/.test(file) && !file.endsWith(".example")) findings.push({ type: "Tracked environment file", location: file });
        const data = readFileSync(file);
        if (!data.includes(0)) findings.push(...inspectText(data.toString("utf8"), file));
    }
    let historicalBlobs = 0;
    if (process.argv.includes("--history")) {
        const objects = execFileSync("git", ["rev-list", "--objects", "--all"], { maxBuffer: 32 * 1024 * 1024 }).toString().trim().split("\n");
        const objectTypes = execFileSync("git", ["cat-file", "--batch-check=%(objecttype)"], {
            input: objects.map(entry => entry.split(" ")[0]).join("\n") + "\n",
            maxBuffer: 32 * 1024 * 1024
        }).toString().trim().split("\n");
        for (const [index, entry] of objects.entries()) {
            const [id, ...name] = entry.split(" ");
            const filename = name.join(" ");
            if (!filename || objectTypes[index] !== "blob") continue;
            const data = execFileSync("git", ["cat-file", "-p", id], { maxBuffer: 16 * 1024 * 1024 });
            if (data.includes(0)) continue;
            historicalBlobs++;
            if (/(?:^|\/)\.env(?:$|\.)/.test(filename) && !filename.endsWith(".example")) findings.push({ type: "Historical environment file", location: `blob ${id}: ${filename}` });
            findings.push(...inspectText(data.toString("utf8"), `blob ${id}: ${filename}`));
        }
    }
    // Findings contain only classification and location, never the matched secret.
    console.log(JSON.stringify({ result: findings.length ? "FAIL" : "PASS", files: files.length, historicalBlobs, findings }, null, 2));
    if (findings.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) scan();
