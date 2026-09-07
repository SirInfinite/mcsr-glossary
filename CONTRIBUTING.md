# Contributing to MCSR Glossary

Contributions are welcome from runners, researchers, and newcomers who notice something unclear. You do not need to be an expert developer to suggest an improvement.

## Suggesting a term through the website

1. Select **Submit** on the glossary home page.
2. Provide the term, category, aliases or tags if known, and a clear definition.
3. Submit the form. If online delivery is unavailable or unconfirmed, the site offers a formatted copy; review it before pasting into a [new-term issue](https://github.com/SirInfinite/mcsr-glossary/issues/new?template=suggest-new-term.yml). A copied proposal has not been submitted automatically. A network failure can follow a successful write, so avoid repeated submissions.

Website submissions enter a private moderation queue. They do not automatically become public glossary entries.

Submissions are reviewed before publication, without a promised response time. Include evidence links/timestamps in the definition or suggestion text when known. The site has no private reply channel or review-status tracker for anonymous submissions. Public GitHub issues are suitable when you want a discussion; keep personal details and private evidence out of them. See [MODERATION.md](MODERATION.md) for the decision standard and [MODERATION_DECISIONS.md](MODERATION_DECISIONS.md) for why the project uses the existing Dashboard plus GitHub.

Published term pages include **Suggest an edit** and **Report a term**. Suggestions are pending proposals tied to the published entry; reports enter a distinct private queue. Neither action can publish or modify a definition. The released correction-compatible API is retained until the structured endpoint is deployed.

## Contributing through GitHub

For a small factual correction, [open a correction issue](https://github.com/SirInfinite/mcsr-glossary/issues/new?template=incorrect-or-outdated-term.yml) with the term name, the exact problem, the proposed correction, and supporting links. To contribute the change directly:

1. Fork the repository and create a focused branch.
2. Edit `data/terms.json`, preserving the existing term's `id` when correcting it.
3. Record the evidence for the change in `CONTENT_SOURCES.md`.
4. Keep the terms alphabetized by canonical name.
5. Run `npm run check-content`.
6. Open a pull request explaining what changed, why it is accurate, and which checks you ran.

## Adding a new term

Every entry follows the documented [glossary data contract](DATA_CONTRACT.md). In particular:

- Use a unique UUID and canonical name.
- Choose one of the five controlled categories: `format`, `strategy`, `technique`, `terminology`, or `tool`.
- Include only genuine aliases and useful lowercase kebab-case tags.
- Use exact canonical names in `relatedTerms`; every reference must resolve.
- Use `YYYY-MM-DD` for known editorial dates and an empty string when a date is unknown.
- Do not fabricate a historical creation date.
- Add the UUID, canonical name and category to a migration for `glossary_vote_totals`. Preserve previous routes in `legacySlugs` when renaming a term, and update target metadata through a migration.
- Add structured `media` only when it teaches something the definition cannot show as clearly. Use the provider allowlist and required attribution fields in `DATA_CONTRACT.md`; never paste iframe or script markup into a definition.

`data/termTemplate.txt` provides the field order used by the dataset. The validator prints the exact term and field when the contract is broken.

## Factual sourcing

Definitions should explain the term quickly, state relevant version or mode limitations, and avoid unsupported quotations or historical claims. Follow the claim-specific tiers in [MODERATION.md](MODERATION.md): primary MCSR rules, creator guides and tool documentation first; recognized runner explanations and independent community usage next; supporting comments and technical Minecraft references for corroboration.

Check genuine community usage separately from mechanics. A Minecraft Wiki explanation can support how a mechanic works without establishing the slang used for it. A clear runner clip can support a niche term without broad popularity. Add the URLs and what they support to `CONTENT_SOURCES.md`. Real but unresolved scope can use `needsUpdating` with a specific research question; unsupported existence is not repaired by adding that flag. Justify current/legacy/historical changes with era evidence, and remove a quality flag only when stronger evidence resolves the recorded question.

## Validation

Node.js 22 or newer is required. Install the pinned development tools, then run the same local checks as CI:

```sh
npm ci
npm run check
npx playwright install chromium
npm run test-browser
```

The checks cover content, runtime invariants, browser failure modes and accessibility. For backend changes also run the disposable database suite documented in [README.md](README.md). Serve the project with:

```sh
npm start
```

Then open <http://127.0.0.1:8001/mcsr-glossary/> and check the changed term, search aliases, filters and related links. Use [ARCHITECTURE.md](ARCHITECTURE.md) to find the responsible module and [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for release gates. Local results never substitute for actual hosted migration/advisor verification.

## Pull request scope

Keep pull requests focused. Do not combine factual content work with a redesign or framework migration, and do not rewrite unrelated definitions. Include:

- A short summary of the change
- Source links for factual claims
- Validation or browser checks performed
- Any remaining question that needs experienced MCSR review

Use the PR checklist for taxonomy, alias/route/relation integrity, source-backed status changes and media provenance. A source replacement belongs in an edit suggestion, correction issue or focused PR; it needs the creator, relevant timestamp, version/era and a working inline example. Website reports are for identifying a problem, not for directly approving a replacement. Votes only draw attention to terms worth review.

Never commit Supabase secret or service-role credentials. Browser code may use only a public publishable key or legacy anonymous key as described in the [Supabase setup guide](SUPABASE.md).
