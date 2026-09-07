export async function productFlows(page, base, { output = 'output/structural/final' } = {}) {
    const context = await page.context().browser().newContext({
        viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce',
        permissions: ['clipboard-read', 'clipboard-write']
    });
    const tab = await context.newPage();
    const checks = [];
    const assert = (condition, message) => {
        if (!condition) throw new Error(message);
        checks.push(message);
    };
    const terms = (await (await context.request.get(base + 'data/terms.json')).json()).terms;
    const states = new Map(terms.map(term => [term.id, 0]));
    const requests = [];
    let failNext = '';
    let expectedFailure = false;
    let holdVote = false;
    let releaseVote;
    const errors = [];
    const externalDiagnostics = [];
    tab.on('pageerror', error => errors.push(error.message));
    tab.on('console', message => {
        if (message.type() !== 'error' || expectedFailure) return;
        if (message.location().url.includes('youtube')) externalDiagnostics.push(message.text());
        else errors.push(message.text());
    });
    const totals = id => ({ term_id: id, upvotes: 4 + (states.get(id) === 1 ? 1 : 0), downvotes: 1 + (states.get(id) === -1 ? 1 : 0), current_vote: states.get(id) });
    // Routing disables the browser cache, so a rerun checks current workspace files.
    await context.route('**/*', route => route.continue());
    await context.route('**/rest/v1/rpc/**', async route => {
        const name = route.request().url().split('/').pop();
        const body = route.request().postDataJSON();
        requests.push({ name, body });
        if (failNext === name) {
            failNext = '';
            return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Deliberate QA outage' }) });
        }
        let payload;
        if (name === 'get_glossary_vote_state') payload = [...states.keys()].map(totals);
        else if (name === 'set_glossary_vote') {
            if (holdVote) await new Promise(resolve => { releaseVote = resolve; });
            states.set(body.p_term_id, body.p_vote);
            payload = [{ ...totals(body.p_term_id), changed: true }];
        } else if (name === 'submit_glossary_term') {
            payload = [{ submission_id: '10000000-0000-4000-8000-000000000001', submission_status: 'pending' }];
        } else if (name === 'submit_glossary_term_report') {
            payload = [{ report_id: '10000000-0000-4000-8000-000000000002', report_status: 'pending', created: true }];
        } else if (name === 'get_glossary_trending_terms') {
            payload = [{ term_id: terms.find(t => t.name === 'Bastion').id, recent_upvotes: 5, recent_downvotes: 1 }];
        } else throw new Error('Unexpected RPC: ' + name);
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) });
    });
    const home = async () => { await tab.locator('.nav-btn[data-page="home"]').click(); };
    const openTerm = async name => { await home(); await tab.getByRole('link', { name: 'View ' + name, exact: true }).click(); };
    const count = () => tab.locator('#terms > article').count();
    const focusIs = id => tab.evaluate(value => document.activeElement.id === value, id);
    const waitVote = async () => tab.waitForFunction(() => !document.querySelector('#vote-up').disabled && !document.querySelector('#vote-row').hasAttribute('aria-busy'));
    try {
        await tab.goto(base);
        await tab.getByRole('link', { name: 'View Bastion', exact: true }).waitFor();
        assert(await count() === terms.length, 'All canonical terms appear on home');
        await tab.keyboard.press('/');
        assert(await focusIs('search-input'), 'Slash shortcut focuses search');
        await tab.locator('#search-input').fill('1 cycle');
        await tab.locator('#search-tooltip [role="option"]').first().waitFor();
        assert((await tab.locator('#search-tooltip').innerText()).includes('One Cycle'), 'Alias search discovers One Cycle');
        await tab.keyboard.press('ArrowUp');
        const selected = await tab.locator('#search-input').getAttribute('aria-activedescendant');
        assert(Boolean(selected) && await tab.locator('#' + selected).getAttribute('aria-selected') === 'true', 'Keyboard selection has a valid active descendant');
        await tab.keyboard.press('ArrowDown');
        await tab.keyboard.press('Enter');
        assert((await tab.locator('#page-term h1').innerText()) === 'One Cycle', 'Enter opens selected alias result');
        await home();
        await tab.locator('#search-clear').click();
        await tab.locator('#search-input').fill('zzzz-nothing-found');
        assert(await tab.locator('#no-results').isVisible(), 'Empty search offers a clear recovery');
        await tab.locator('#no-results button').click();
        assert(await count() === terms.length, 'Empty-state reset restores all entries');
        await tab.locator('#filter-btn').click();
        await tab.locator('#category-filters [data-value="technique"]').click();
        assert(await count() === terms.filter(t => t.category === 'technique').length, 'Category filtering matches canonical data');
        assert(await tab.locator('#filter-count').innerText() === '1', 'Active filter count is visible');
        await tab.locator('#clear-all-filters').click();
        await tab.locator('#tag-dropdown-btn').click();
        const tags = ['nether', 'end'];
        for (const tag of tags) await tab.locator('#tag-dropdown-list input[value="' + tag + '"]').check();
        for (const mode of ['any', 'all', 'none']) {
            await tab.locator('input[name="tag-match"][value="' + mode + '"]').check();
            const expected = terms.filter(t => mode === 'all' ? tags.every(x => t.tags.includes(x)) : mode === 'none' ? tags.every(x => !t.tags.includes(x)) : tags.some(x => t.tags.includes(x))).length;
            assert(await count() === expected, 'Tag matching: ' + mode);
        }
        await tab.locator('#clear-all-filters').click();
        await tab.locator('#filter-btn').click();
        await tab.getByRole('button', { name: 'Show terms beginning with B', exact: true }).click();
        assert(await count() === terms.filter(t => t.name.startsWith('B')).length, 'A–Z filtering matches the initial letter');
        await tab.getByRole('button', { name: 'Show all terms', exact: true }).click();
        const bastionLink = tab.getByRole('link', { name: 'View Bastion', exact: true });
        assert((await bastionLink.getAttribute('href')).endsWith('/mcsr-glossary/?t=bastion'), 'Reference rows expose native shareable links');
        await bastionLink.click();
        const originalTitle = await tab.locator('#page-term h1').boundingBox();
        await tab.keyboard.press('Tab');
        for (const id of ['share-btn', 'suggest-edit-btn', 'report-term-btn']) {
            await tab.locator('#' + id).focus();
            await tab.waitForFunction(value => document.getElementById(value).clientWidth > 100, id);
            assert((await tab.locator('#' + id).boundingBox()).width > 100, id + ' expands on keyboard focus');
            assert(JSON.stringify(await tab.locator('#page-term h1').boundingBox()) === JSON.stringify(originalTitle), id + ' causes no title reflow');
        }
        await tab.locator('#share-btn').click();
        assert((await tab.evaluate(() => navigator.clipboard.readText())).endsWith('/mcsr-glossary/?t=bastion'), 'Copy Link preserves the project subpath');
        await waitVote();
        for (const [id, up, down] of [['vote-up', true, false], ['vote-up', false, false], ['vote-down', false, true], ['vote-up', true, false], ['vote-up', false, false]]) {
            await tab.locator('#' + id).click();
            await waitVote();
            assert(await tab.locator('#vote-up').getAttribute('aria-pressed') === String(up) && await tab.locator('#vote-down').getAttribute('aria-pressed') === String(down), 'Vote transition ' + [id, up, down].join('/'));
        }
        failNext = 'set_glossary_vote'; expectedFailure = true;
        await tab.locator('#vote-up').click();
        await tab.waitForFunction(() => document.querySelector('#vote-status').textContent.includes('unavailable'));
        assert(await tab.locator('#vote-up').getAttribute('aria-pressed') === 'false', 'Failed vote restores the previous state');
        assert((await tab.locator('#vote-status').innerText()).includes('unavailable'), 'Failed vote explains the service problem');
        expectedFailure = false;
        await tab.reload(); await waitVote();
        holdVote = true;
        await tab.locator('#vote-up').click();
        await openTerm('Bridge Bastion');
        const completedVote = tab.waitForResponse('**/rest/v1/rpc/set_glossary_vote');
        releaseVote(); holdVote = false; await completedVote;
        await tab.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        assert(await tab.locator('#vote-up-count').innerText() === '4', 'Late vote response cannot overwrite the newly opened term');
        await openTerm('Bastion');
        await tab.locator('#vote-up').click(); await waitVote();
        await tab.locator('#suggest-edit-btn').click();
        assert(await focusIs('sub-definition'), 'Edit dialog focuses the correction field');
        assert(await tab.locator('#sub-name').inputValue() === 'Bastion' && !await tab.locator('#sub-name').isVisible(), 'Edit preserves hidden term identity');
        await tab.locator('#sub-submit').focus(); await tab.keyboard.press('Tab');
        assert(await focusIs('submit-modal-close'), 'Edit focus trap wraps forward');
        await tab.keyboard.press('Shift+Tab');
        assert(await focusIs('sub-submit'), 'Edit focus trap wraps backward');
        await tab.keyboard.press('Escape');
        assert(await focusIs('suggest-edit-btn'), 'Edit closing restores its trigger');
        await tab.locator('#report-term-btn').click();
        await tab.locator('#report-reason').selectOption('other');
        await tab.locator('#report-submit').click();
        assert(await tab.locator('#report-details').evaluate(el => !el.checkValidity()), 'Other reports require explanatory details');
        await tab.locator('#report-details').fill('Browser QA fixture: the example needs checking.');
        await tab.locator('#report-submit').click();
        await tab.waitForFunction(() => document.querySelector('#report-status').textContent.includes('Report sent'));
        assert(requests.some(r => r.name === 'submit_glossary_term_report' && r.body.p_reason === 'other'), 'Report sends the expected private-queue payload (fixture)');
        await tab.locator('#report-modal').waitFor({ state: 'hidden' });
        assert(await focusIs('report-term-btn'), 'Report success restores focus');
        await home(); await tab.locator('#submit-trigger').click();
        await tab.locator('#sub-submit').click();
        assert(await tab.locator('#sub-name').evaluate(el => !el.checkValidity()), 'Submission validates required fields');
        await tab.locator('#sub-name').fill('Browser QA fixture');
        await tab.locator('#sub-category').selectOption('technique');
        await tab.locator('.optional-fields summary').click();
        await tab.locator('#sub-aliases').fill('Fixture alias');
        await tab.locator('#sub-tags').fill('nether');
        await tab.locator('#sub-definition').fill('A browser-only fixture for checking the review form contract.');
        failNext = 'submit_glossary_term'; expectedFailure = true;
        await tab.locator('#sub-submit').click();
        await tab.waitForFunction(() => document.querySelector('#sub-status').textContent.includes('online delivery was not confirmed'));
        assert((await tab.evaluate(() => navigator.clipboard.readText())).includes('Browser QA fixture'), 'Submission outage copies the formatted contribution');
        expectedFailure = false;
        await tab.locator('#sub-submit').click();
        await tab.waitForFunction(() => document.querySelector('#sub-status').textContent.includes('Submitted successfully'));
        assert(requests.some(r => r.name === 'submit_glossary_term' && r.body.p_aliases[0] === 'Fixture alias'), 'Submission preserves aliases and tags (fixture)');
        await tab.locator('#submit-modal').waitFor({ state: 'hidden' });
        assert(await focusIs('submit-trigger'), 'Submission success restores focus');
        for (const view of ['stats', 'changelog', 'about']) {
            await tab.locator('.nav-btn[data-page="' + view + '"]').click();
            assert(await tab.locator('.nav-btn[data-page="' + view + '"]').getAttribute('aria-current') === 'page', view + ' navigation has an active state');
            assert(await tab.locator('#page-' + view + ' h1').evaluate(el => el === document.activeElement), view + ' navigation announces the new heading');
        }
        await home(); await tab.locator('#random-btn').click();
        assert(await tab.locator('#page-term h1').isVisible(), 'Random discovers a published term');
        await openTerm('Bastion');
        const relatedName = await tab.locator('.related-card strong').first().innerText();
        await tab.locator('.related-card').first().click();
        assert(await tab.locator('#page-term h1').innerText() === relatedName, 'Related entry opens its definition');
        await tab.goBack();
        assert(await tab.locator('#page-term h1').innerText() === 'Bastion', 'Browser history restores the previous definition');
        await tab.locator('#theme-toggle').click(); await tab.reload();
        assert(await tab.locator('html').getAttribute('data-theme') === 'light', 'Theme persists through reload');
        await tab.locator('#theme-toggle').click();
        await openTerm('Triangulation');
        const frame = tab.locator('#term-definition-content iframe');
        assert(await frame.count() === 1 && await frame.getAttribute('loading') === 'eager', 'Trusted video initializes automatically inside the definition');
        assert((await frame.getAttribute('src')).startsWith('https://www.youtube-nocookie.com/embed/') && !(await frame.getAttribute('src')).includes('autoplay=1'), 'Video uses the privacy-enhanced allowlisted origin without autoplay');
        await tab.locator('.media-image-button').click();
        assert(await tab.locator('dialog[open]').isVisible(), 'Inline diagram opens the lightbox');
        await tab.keyboard.press('Escape');
        assert(await tab.locator('.media-image-button').evaluate(el => el === document.activeElement), 'Lightbox restores image focus');
        await home();
        assert(await tab.locator('#page-term iframe').count() === 0, 'Leaving a definition removes its player');
        await context.route('**/js/config.js', async route => {
            const response = await route.fetch();
            await route.fulfill({ response, body: (await response.text()).replace('trendingEnabled: false', 'trendingEnabled: true') });
        });
        await tab.reload();
        await tab.locator('#trending-section').waitFor();
        assert((await tab.locator('#trending-list').innerText()).includes('Bastion'), 'Enabled trending renders verified recent activity (fixture)');
        await tab.locator('#search-input').fill('bastion');
        assert(!await tab.locator('#trending-section').isVisible(), 'Active search prioritizes matching entries over trending');
        await tab.locator('#search-clear').click();
        await context.route('**/data/terms.json', async route => {
            const response = await route.fetch();
            const payload = await response.json();
            payload.terms.find(t => t.name === 'Bastion').needsUpdating = true;
            await route.fulfill({ response, json: payload });
        });
        states.delete(terms.find(t => t.name === 'Bastion').id);
        await tab.goto(base + '?t=bastion');
        await tab.locator('.term-review-note').waitFor();
        assert((await tab.locator('.term-review-note').innerText()).includes('established'), 'Needs updating identifies a real term needing review (fixture)');
        await tab.waitForFunction(() => document.querySelector('#vote-status').textContent.includes('not yet available'));
        assert(await tab.locator('#vote-up').isDisabled(), 'Unseeded terms show an unavailable vote state without issuing invalid writes');
        assert(errors.length === 0, 'No unexpected application console errors or exceptions: ' + errors.join('; '));
        return { result: 'PASS', checks: checks.length, passed: checks, moderationWrites: 0, externalDiagnostics, note: 'RPC fixtures; run the live voting script separately.' };
    } catch (error) {
        await tab.screenshot({ path: `${output}/browser-test-failure.png` });
        throw new Error(error.message + '\nLast passed: ' + checks.at(-1) + '\nStatus: ' + await tab.locator('#sub-status, #report-status').allTextContents());
    } finally {
        await context.close();
    }
}
