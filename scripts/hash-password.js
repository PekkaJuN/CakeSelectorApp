import readline from 'node:readline';
import { generateSalt, hashPassword, DEFAULT_HASH_PARAMS } from '../src/auth/password.js';

const USAGE = 'Usage: npm run auth:hash -- <username> <admin|orderuser>';
const ROLES = ['admin', 'orderuser'];
const MIN_LENGTH = 8;

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Raw mode so the terminal never echoes the password, and so a shoulder-surfer
// sees only the asterisk count.
function promptHidden(label) {
  return new Promise(resolve => {
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let entered = '';

    const onData = chunk => {
      for (const char of chunk) {
        if (char === '\r' || char === '\n' || char === '\u0004') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          return resolve(entered);
        }

        if (char === '\u0003') {
          process.stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }

        if (char === '\u007f' || char === '\b') {
          if (entered.length > 0) {
            entered = entered.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }

        entered += char;
        process.stdout.write('*');
      }
    };

    process.stdin.on('data', onData);
  });
}

// Piped input has no terminal echo to suppress, which is how the tests drive this.
async function readPiped() {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  const lines = [];

  for await (const line of rl) {
    lines.push(line);
    if (lines.length === 2) break;
  }
  rl.close();

  process.stdout.write('Password: ********\nConfirm:  ********\n');
  return [lines[0] ?? '', lines[1] ?? ''];
}

async function readTwice() {
  if (process.stdin.isTTY) {
    return [await promptHidden('Password: '), await promptHidden('Confirm:  ')];
  }
  return readPiped();
}

async function main() {
  const [username, role] = process.argv.slice(2);

  if (!username || !role) fail(USAGE);
  if (!ROLES.includes(role)) {
    fail(`Invalid role "${role}": must be "admin" or "orderuser"`);
  }

  const [entered, confirmation] = await readTwice();

  if (entered !== confirmation) fail('Passwords do not match');
  if (entered.length < MIN_LENGTH) {
    // Hashing does not rescue a weak password.
    fail(`Password must be at least ${MIN_LENGTH} characters`);
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(entered, salt, DEFAULT_HASH_PARAMS);

  // Printed only — writing the file could clobber a working user list.
  console.log('\nAdd this to config/users.json:\n');
  console.log(JSON.stringify({ username, role, salt, passwordHash }, null, 2));
}

main().catch(error => fail(error.message));
