import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { forbiddenTabs } from '../../src/public/auth-ui.js';

// login.js prunes the panels a role may not use and only then injects app.js.
// app.js wires most of its handlers at top level, so one lookup returning null
// aborts the entire file -- silently, and for one role only. There is no browser
// here, so app.js is executed against a fake DOM shaped like that role's page.

const read = name => fs.readFileSync(fileURLToPath(new URL(`../../src/public/${name}`, import.meta.url)), 'utf8');

const html = read('index.html');
const app = read('app.js');

function tabPanel(tabId) {
  const marker = html.indexOf(`id="${tabId}-tab"`);
  assert.notStrictEqual(marker, -1, `index.html has no panel for "${tabId}"`);

  const start = html.lastIndexOf('<div', marker);
  let depth = 0;
  let cursor = start;

  for (;;) {
    const open = html.indexOf('<div', cursor);
    const close = html.indexOf('</div>', cursor);
    assert.notStrictEqual(close, -1, `unbalanced markup around "${tabId}"`);

    if (open !== -1 && open < close) {
      depth += 1;
      cursor = open + 4;
    } else {
      depth -= 1;
      cursor = close + 6;
      if (depth === 0) return html.slice(start, cursor);
    }
  }
}

function removedIdsFor(role) {
  const removed = new Set();
  for (const tab of forbiddenTabs(role)) {
    for (const match of tabPanel(tab).matchAll(/id="([^"]+)"/g)) removed.add(match[1]);
  }
  return removed;
}

function fakeElement() {
  return {
    focusCount: 0,
    dataset: {}, style: {}, value: '', innerHTML: '', textContent: '', checked: false, options: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {}, removeEventListener() {}, appendChild() {}, remove() {},
    focus() { this.focusCount += 1; },
    setAttribute() {}, getAttribute: () => null, closest: () => null,
    querySelector: () => null, querySelectorAll: () => []
  };
}

function runAppAs(role) {
  const removed = removedIdsFor(role);
  const present = [...html.matchAll(/id="([^"]+)"/g)]
    .map(m => m[1])
    .filter(id => !removed.has(id));

  const elements = new Map(present.map(id => [id, fakeElement()]));

  const sandbox = {
    document: {
      readyState: 'complete',
      body: fakeElement(),
      getElementById: id => (removed.has(id) ? null : elements.get(id) ?? null),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => fakeElement(),
      addEventListener() {}
    },
    window: { location: { reload() {} } },
    console: { log() {}, error() {}, warn() {}, info() {} },
    fetch: async () => ({ ok: true, status: 200, json: async () => [], text: async () => '[]' }),
    setTimeout, clearTimeout, setInterval, clearInterval,
    alert() {}, confirm: () => true
  };

  vm.runInNewContext(`${app}\n;globalThis.__ranToEnd = true;`, sandbox, { filename: 'app.js' });
  return { sandbox, removed, elements };
}

for (const role of ['admin', 'orderuser']) {
  test(`AC50/AC51: app.js runs to completion for ${role} against that role's pruned DOM`, () => {
    let result;

    try {
      result = runAppAs(role);
    } catch (error) {
      const line = (error.stack.match(/app\.js:(\d+)/) ?? [])[1] ?? '?';
      assert.fail(`app.js aborted at line ${line} for ${role}: ${error.message}`);
    }

    assert.strictEqual(result.sandbox.__ranToEnd, true, `app.js stopped early for ${role}`);
  });
}

test('AC37: the Order Builder actually initialises though app.js loads after DOMContentLoaded', () => {
  const { sandbox, elements } = runAppAs('orderuser');

  assert.strictEqual(typeof sandbox.initOrderBuilder, 'function', 'initOrderBuilder must be defined');

  // readyState is 'complete' here, exactly as it is when login.js injects
  // app.js. Gating on DOMContentLoaded leaves initOrderBuilder defined but never
  // called, which is precisely how the product dropdown stayed empty -- so
  // assert it ran, not merely that it exists. Focusing the customer name field
  // is its first act.
  assert.strictEqual(
    elements.get('customer-name').focusCount,
    1,
    'initOrderBuilder never ran: the product dropdown would stay empty'
  );
});

test('AC51: the orderuser really does lose panels, so the checks above mean something', () => {
  assert.ok(removedIdsFor('orderuser').size > 0, 'an orderuser must lose at least one panel');
  assert.strictEqual(removedIdsFor('admin').size, 0, 'an admin loses nothing');
});
