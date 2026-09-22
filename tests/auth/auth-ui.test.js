import { test } from 'node:test';
import assert from 'node:assert';
import {
  ALL_TABS,
  ROLE_TABS,
  permittedTabs,
  forbiddenTabs,
  landingTab,
  validateLogin,
  headerText,
  EXPIRED_MESSAGE,
  INVALID_MESSAGE
} from '../../src/public/auth-ui.js';

// --- which tabs each role gets -------------------------------------------

test('AC50: permittedTabs | admin | all five tabs', () => {
  assert.deepStrictEqual(permittedTabs('admin'), [
    'products',
    'order-builder',
    'order-history',
    'cake-recommendations',
    'order-reports'
  ]);
});

test('AC51: permittedTabs | orderuser | exactly Order Builder and Recommendations', () => {
  assert.deepStrictEqual(permittedTabs('orderuser'), ['order-builder', 'cake-recommendations']);
});

test('AC52: forbiddenTabs | orderuser | products, order-history and order-reports', () => {
  assert.deepStrictEqual(forbiddenTabs('orderuser'), ['products', 'order-history', 'order-reports']);
});

test('AC50: forbiddenTabs | admin | nothing is removed', () => {
  assert.deepStrictEqual(forbiddenTabs('admin'), []);
});

test('Risk: permittedTabs | unknown or missing role | no tabs at all', () => {
  // Fail closed: an unrecognised role must not inherit the admin tab set.
  assert.deepStrictEqual(permittedTabs('superuser'), []);
  assert.deepStrictEqual(permittedTabs(undefined), []);
  assert.deepStrictEqual(forbiddenTabs('superuser'), ALL_TABS);
});

test('AC51: landingTab | the first permitted tab for each role', () => {
  assert.strictEqual(landingTab('admin'), 'products');
  assert.strictEqual(landingTab('orderuser'), 'order-builder');
  assert.strictEqual(landingTab('superuser'), null);
});

test('Risk: ROLE_TABS | every listed tab is a real tab', () => {
  for (const [role, tabs] of Object.entries(ROLE_TABS)) {
    for (const tab of tabs) {
      assert.ok(ALL_TABS.includes(tab), `${role} lists unknown tab "${tab}"`);
    }
  }
});

// --- client-side form validation -----------------------------------------

test('AC14: validateLogin | blank username | names the username field', () => {
  assert.deepStrictEqual(validateLogin('', 'any-password'), { username: 'Username is required' });
  assert.deepStrictEqual(validateLogin('   ', 'any-password'), { username: 'Username is required' });
});

test('AC15: validateLogin | blank password | names the password field', () => {
  assert.deepStrictEqual(validateLogin('admin', ''), { password: 'Password is required' });
});

test('AC14-AC15: validateLogin | both blank | reports both fields', () => {
  assert.deepStrictEqual(validateLogin('', ''), {
    username: 'Username is required',
    password: 'Password is required'
  });
});

test('AC7: validateLogin | both present | no errors, so the request may be sent', () => {
  assert.deepStrictEqual(validateLogin('admin', 'any-password'), {});
});

test('AC15: validateLogin | password of spaces | is not blank', () => {
  // A password may legitimately be whitespace; only the username is trimmed.
  assert.deepStrictEqual(validateLogin('admin', '   '), {});
});

// --- the strings the UI shows --------------------------------------------

test('AC53: headerText | names the user and the role', () => {
  assert.strictEqual(headerText({ username: 'admin', role: 'admin' }), 'Signed in as admin (admin)');
  assert.strictEqual(
    headerText({ username: 'orderuser', role: 'orderuser' }),
    'Signed in as orderuser (orderuser)'
  );
});

test('AC49: headerText | no user | empty, so the login screen shows no identity', () => {
  assert.strictEqual(headerText(null), '');
});

test('AC55: EXPIRED_MESSAGE | the exact wording the spec requires', () => {
  assert.strictEqual(EXPIRED_MESSAGE, 'Your session has expired. Please log in again.');
});

test('AC16: INVALID_MESSAGE | matches the server rejection body', () => {
  assert.strictEqual(INVALID_MESSAGE, 'Invalid username or password');
});
