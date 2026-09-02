# Contributing to MCSR Glossary

Contributions are welcome from runners, researchers, and newcomers who notice something unclear. You do not need to be an expert developer to suggest an improvement.

## Suggesting a term through the website

1. Select **Submit** on the glossary home page.
2. Provide the term, category, aliases or tags if known, and a clear definition.
3. Submit the form. If online submissions are not configured, the site copies a formatted proposal instead; paste it into a [new-term issue](https://github.com/SirInfinite/mcsr-glossary/issues/new?template=suggest-new-term.yml).

Website submissions enter a private moderation queue. They do not automatically become public glossary entries.

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
- Add the new UUID to a Supabase migration that seeds `glossary_vote_totals`.

`data/termTemplate.txt` provides the field order used by the dataset. The validator prints the exact term and field when the contract is broken.

## Factual sourcing

Definitions should explain the term quickly, state relevant version or mode limitations, and avoid unsupported quotations or historical claims. Prefer sources in this order:

1. Official MCSR Ranked documentation for Ranked behavior
2. Official Minecraft speedrunning rules and leaderboards
3. Minecraft Wiki for game mechanics
4. Primary documentation or guides from a technique's creator or maintainer
5. Established MCSR community documentation when no primary source exists

Add the URLs and a short note about what they support to `CONTENT_SOURCES.md`. If a claim remains uncertain, say so in the pull request instead of guessing.

## Validation

Node.js 20 or newer is required. The repository has no install-time dependencies.

```sh
npm run check-content
```

This validates the current dataset and runs deliberate failure cases against the validator. Pull requests should leave this command passing and should load successfully through a local HTTP server:

```sh
python -m http.server 8000
```

Then open <http://localhost:8000/> and check the changed term, search aliases, filters, and related-term links.

## Pull request scope

Keep pull requests focused. Do not combine factual content work with a redesign or framework migration, and do not rewrite unrelated definitions. Include:

- A short summary of the change
- Source links for factual claims
- Validation or browser checks performed
- Any remaining question that needs experienced MCSR review

Never commit Supabase secret or service-role credentials. Browser code may use only a public publishable key or legacy anonymous key as described in the [Supabase setup guide](supabase/README.md).
