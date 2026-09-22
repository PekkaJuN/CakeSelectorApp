import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ALL_TABS, forbiddenTabs } from '../../src/public/auth-ui.js';

const read = name => fs.readFileSync(fileURLToPath(new URL(`../../src/public/${name}`, import.meta.url)), 'utf8');

const html = read('index.html');
const app = read('app.js');

// The markup for one tab panel, from its opening <div> to the matching close.
function tabPanel(tabId) {
  const marker = html.indexOf(`id="${tabId}-tab"`);
  assert.notStrictEqual(marker, -1, `index.html has no panel for the "${tabId}" tab`);

  const start = html.lastIndexOf('<div', marker);
  let depth = 0;
  let cursor = start;

  while (true) {
    const nextOpen = html.indexOf('<div', cursor);
    const nextClose = html.indexOf('</div>', cursor);
    assert.notStrictEqual(nextClose, -1, `unbalanced markup around the "${tabId}" panel`);

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + 4;
    } else {
      depth -= 1;
      cursor = nextClose + 6;
      if (depth === 0) return html.slice(start, cursor);
    }
  }
}

function idsInside(markup) {
  return new Set([...markup.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
}

// Every id that disappears from the DOM for at least one role.
function removableIds() {
  const removable = new Set();

  for (const role of ['admin', 'orderuser']) {
    for (const tab of forbiddenTabs(role)) {
      for (const id of idsInside(tabPanel(tab))) removable.add(id);
    }
  }

  return removable;
}

test('AC52: every tab in ROLE_TABS has a panel in index.html', () => {
  for (const tab of ALL_TABS) {
    assert.ok(html.includes(`id="${tab}-tab"`), `no panel markup for the "${tab}" tab`);
    assert.ok(html.includes(`data-tab="${tab}"`), `no tab button for the "${tab}" tab`);
  }
});

test('AC51: app.js survives a pruned DOM | no top-level wiring on an element a role loses', () => {
  const removable = removableIds();
  assert.ok(removable.size > 0, 'the orderuser must lose at least one panel');

  // login.js removes forbidden panels before injecting app.js. A top-level
  // `getElementById(x).addEventListener(...)` on a removed element throws, and
  // because it is top level it aborts the whole file -- which is how an
  // orderuser lost the Order Builder's product dropdown.
  const offenders = [];

  for (const match of app.matchAll(/^document\.getElementById\('([^']+)'\)(\??)\./gm)) {
    const [, id, optional] = match;
    if (removable.has(id) && optional !== '?') {
      offenders.push(`app.js:${app.slice(0, match.index).split('\n').length} getElementById('${id}')`);
    }
  }

  assert.deepStrictEqual(
    offenders,
    [],
    `these run at load time against elements a role does not have:\n  ${offenders.join('\n  ')}`
  );
});

test('AC51: app.js survives a pruned DOM | list renderers tolerate a missing container', () => {
  // renderProductsList runs from the eager loadProducts() call even for an
  // orderuser, who has no products-list element to render into.
  const renderer = app.slice(app.indexOf('function renderProductsList'));

  assert.ok(
    /const list = document\.getElementById\('products-list'\);\s*(\/\/[^\n]*\n\s*)*if \(!list\)/.test(renderer),
    'renderProductsList must return early when its container has been removed'
  );
});
