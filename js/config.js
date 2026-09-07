// Public browser configuration. Privileged credentials are rejected by backend/client.js.
const repository = "SirInfinite/mcsr-glossary";
export const APP_CONFIG = Object.freeze({
    repository,
    repositoryURL: `https://github.com/${repository}`,
    pagesURL: "https://sirinfinite.github.io/mcsr-glossary/",
    basePath: "/mcsr-glossary/",
    contentPath: "data/terms.json",
    changelogPath: "CHANGELOG.md",
    requestTimeoutMs: 8000,
    trendingEnabled: true,
    structuredCorrectionsEnabled: true,
    supabaseUrl: "https://olmazjfubvpgtpoxlxzy.supabase.co",
    supabasePublishableKey: "sb_publishable_a0WJXP6ARYxooUVFJuv9iA_CaEGt1E_"
});
