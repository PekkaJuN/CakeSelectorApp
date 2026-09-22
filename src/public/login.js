import {
  forbiddenTabs,
  landingTab,
  validateLogin,
  headerText,
  EXPIRED_MESSAGE,
  INVALID_MESSAGE
} from './auth-ui.js';

const EXPIRED_FLAG = 'cake-session-expired';

const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const usernameInput = document.getElementById('login-username');
const passwordInput = document.getElementById('login-password');
const usernameError = document.getElementById('login-username-error');
const passwordError = document.getElementById('login-password-error');
const appRoot = document.getElementById('app-root');
const userBar = document.getElementById('user-bar');
const userLabel = document.getElementById('user-label');
const logoutButton = document.getElementById('logout-btn');

// --- login screen ---------------------------------------------------------

function showLoginScreen(message) {
  // Removed, not hidden: a hidden tab bar is one devtools click from being used,
  // and nothing about the catalog should exist in the DOM without a session.
  appRoot?.remove();
  userBar.hidden = true;
  userLabel.textContent = '';

  loginMessage.textContent = message ?? '';
  loginScreen.hidden = false;
  usernameInput.focus();
}

function clearFieldErrors() {
  usernameError.textContent = '';
  passwordError.textContent = '';
}

async function submitLogin(event) {
  event.preventDefault();
  clearFieldErrors();
  loginMessage.textContent = '';

  const username = usernameInput.value;
  const password = passwordInput.value;

  const errors = validateLogin(username, password);
  if (errors.username || errors.password) {
    // No request is sent while a field is blank.
    usernameError.textContent = errors.username ?? '';
    passwordError.textContent = errors.password ?? '';
    (errors.username ? usernameInput : passwordInput).focus();
    return;
  }

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (response.ok) {
    // Reload rather than rebuild: the app shell was removed from the DOM, and a
    // fresh bootstrap is the simplest way to render exactly the permitted tabs.
    sessionStorage.removeItem(EXPIRED_FLAG);
    window.location.reload();
    return;
  }

  const body = await response.json().catch(() => ({}));
  loginMessage.textContent = body.error ?? INVALID_MESSAGE;

  // The username stays so it can be corrected; the password does not.
  passwordInput.value = '';
  passwordInput.focus();
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  sessionStorage.removeItem(EXPIRED_FLAG);
  window.location.reload();
}

// --- session loss while the page is open ----------------------------------

function handleUnauthorized() {
  sessionStorage.setItem(EXPIRED_FLAG, '1');
  window.location.reload();
}

// Every tab action goes through fetch, so one wrapper covers them all — and it
// covers the handlers in app.js without editing any of them.
function interceptUnauthorized() {
  const original = window.fetch;

  window.fetch = async (...args) => {
    const response = await original(...args);

    if (response.status === 401) {
      handleUnauthorized();
    }

    return response;
  };
}

// --- bootstrap ------------------------------------------------------------

function applyRole(user) {
  for (const tab of forbiddenTabs(user.role)) {
    document.querySelector(`.tab-button[data-tab="${tab}"]`)?.remove();
    document.getElementById(`${tab}-tab`)?.remove();
  }

  const landing = landingTab(user.role);
  for (const button of document.querySelectorAll('.tab-button')) {
    button.classList.toggle('active', button.dataset.tab === landing);
  }
  for (const panel of document.querySelectorAll('.tab-content')) {
    panel.classList.toggle('active', panel.id === `${landing}-tab`);
  }

  userLabel.textContent = headerText(user);
  userBar.hidden = false;
  loginScreen.hidden = true;
  appRoot.hidden = false;
}

function loadApp() {
  const script = document.createElement('script');
  script.src = 'app.js';
  document.body.appendChild(script);
}

async function bootstrap() {
  const response = await fetch('/api/auth/me');

  if (!response.ok) {
    const expired = sessionStorage.getItem(EXPIRED_FLAG) === '1';
    sessionStorage.removeItem(EXPIRED_FLAG);
    showLoginScreen(expired ? EXPIRED_MESSAGE : '');
    return;
  }

  applyRole(await response.json());

  // Installed only once a session exists, so the bootstrap's own 401 above
  // cannot trigger a reload loop.
  interceptUnauthorized();
  loadApp();
}

loginForm.addEventListener('submit', submitLogin);
logoutButton.addEventListener('click', logout);

bootstrap();
