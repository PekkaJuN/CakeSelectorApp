import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../scripts/hash-password.js', import.meta.url));
const CONFIG = fileURLToPath(new URL('../../config/users.json', import.meta.url));

// What the operator types at the prompt; no account has this password.
const TYPED = 'a-test-password';
const TYPED_DIFFERENTLY = 'a-different-password';

// The tool reads the password from stdin rather than argv, so the tests drive it
// the same way a person would — by typing.
function runTool(args, stdinText) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SCRIPT, ...args]);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr, output: stdout + stderr }));

    child.stdin.end(stdinText);
  });
}

function snapshotConfig() {
  return fs.existsSync(CONFIG) ? fs.readFileSync(CONFIG, 'utf8') : null;
}

// "config/users.json is not modified" is a vacuous assertion while the file does
// not exist, so stand a sentinel in its place. A real one is left alone.
async function withSentinelConfig(body) {
  if (fs.existsSync(CONFIG)) return body();

  const sentinel = '{"sentinel": "must survive npm run auth:hash"}';
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  fs.writeFileSync(CONFIG, sentinel);

  try {
    return await body();
  } finally {
    if (fs.readFileSync(CONFIG, 'utf8') === sentinel) fs.rmSync(CONFIG);
  }
}

test('AC65: hash tool | happy path | prints a pasteable block with a 32-char salt and 128-char hash', () => withSentinelConfig(async () => {
  const before = snapshotConfig();

  const { code, output } = await runTool(['admin', 'admin'], `${TYPED}\n${TYPED}\n`);

  assert.strictEqual(code, 0, `expected exit 0, got ${code}. Output:\n${output}`);

  const block = output.slice(output.indexOf('{'), output.lastIndexOf('}') + 1);
  const parsed = JSON.parse(block);

  assert.strictEqual(parsed.username, 'admin');
  assert.strictEqual(parsed.role, 'admin');
  assert.match(parsed.salt, /^[0-9a-f]{32}$/, 'salt should be 32 hex characters');
  assert.match(parsed.passwordHash, /^[0-9a-f]{128}$/, 'hash should be 128 hex characters');

  assert.strictEqual(snapshotConfig(), before, 'config/users.json must not be touched');
}));

test('AC65: hash tool | echo off | the password is never printed back', async () => {
  const { output } = await runTool(['admin', 'admin'], `${TYPED}\n${TYPED}\n`);

  assert.ok(!output.includes(TYPED), 'the plaintext password must not appear in the output');

  // Piped input has no terminal echo, so the interactive path cannot be covered
  // by driving the process — assert on the source that it masks rather than echoes.
  const source = fs.readFileSync(SCRIPT, 'utf8');
  assert.ok(source.includes('setRawMode(true)'), 'the TTY path must disable terminal echo');
  assert.ok(source.includes("process.stdout.write('*')"), 'typed characters should be masked');
  assert.ok(!/stdout\.write\(\s*entered\s*\)/.test(source), 'the entered password must never be written out');
});

test('AC66: hash tool | confirmation mismatch | prints the message, exits 1, prints no hash', () => withSentinelConfig(async () => {
  const before = snapshotConfig();

  const { code, output } = await runTool(['admin', 'admin'], `${TYPED}\n${TYPED_DIFFERENTLY}\n`);

  assert.strictEqual(code, 1, `expected exit 1, got ${code}`);
  assert.ok(output.includes('Passwords do not match'), `expected the mismatch message, got:\n${output}`);
  assert.ok(!output.includes('passwordHash'), 'no hash should be printed');
  assert.strictEqual(snapshotConfig(), before, 'config/users.json must not be touched');
}));

test('AC67: hash tool | too short | prints the minimum-length message, exits 1, prints no hash', async () => {
  const { code, output } = await runTool(['admin', 'admin'], 'short\nshort\n');

  assert.strictEqual(code, 1, `expected exit 1, got ${code}`);
  assert.ok(
    output.includes('Password must be at least 8 characters'),
    `expected the length message, got:\n${output}`
  );
  assert.ok(!output.includes('passwordHash'), 'no hash should be printed');
});

test('AC65: hash tool | password not an argument | the script reads stdin and never argv for the password', () => {
  const source = fs.readFileSync(SCRIPT, 'utf8');

  // An argument would land in shell history and in the process list.
  assert.ok(source.includes('process.stdin'), 'the password should be read from stdin');

  // Whole lines, not a match anchored at process.argv — the destructuring that
  // names the slots sits to its left.
  const argvUses = source.split('\n').filter(line => line.includes('process.argv'));
  assert.ok(argvUses.length > 0, 'the script should read argv for the username and role');
  for (const use of argvUses) {
    assert.ok(
      !/password/i.test(use),
      `no argv slot may hold the password, found: ${use}`
    );
  }
});

test('Role: hash tool | role missing | prints usage and exits 1', async () => {
  const { code, output } = await runTool(['admin'], `${TYPED}\n${TYPED}\n`);

  assert.strictEqual(code, 1, `expected exit 1, got ${code}`);
  assert.ok(output.includes('Usage:'), `expected usage text, got:\n${output}`);
  assert.ok(!output.includes('passwordHash'), 'no hash should be printed');
});

test('Role: hash tool | unknown role | names the valid roles and exits 1', async () => {
  const { code, output } = await runTool(['admin', 'superuser'], `${TYPED}\n${TYPED}\n`);

  assert.strictEqual(code, 1, `expected exit 1, got ${code}`);
  assert.ok(
    output.includes('Invalid role "superuser": must be "admin" or "orderuser"'),
    `expected the role message, got:\n${output}`
  );
  assert.ok(!output.includes('passwordHash'), 'no hash should be printed');
});
