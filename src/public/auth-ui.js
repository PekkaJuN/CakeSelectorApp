// Decisions the login UI makes, kept free of the DOM so they can be tested
// without a browser. login.js applies them; this module never touches document.

export const ALL_TABS = [
  'products',
  'order-builder',
  'order-history',
  'cake-recommendations',
  'order-reports'
];

export const ROLE_TABS = {
  admin: ['products', 'order-builder', 'order-history', 'cake-recommendations', 'order-reports'],
  orderuser: ['order-builder', 'cake-recommendations']
};

export const EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';
export const INVALID_MESSAGE = 'Invalid username or password';

// An unrecognised role gets nothing rather than everything: the same
// default-deny direction the server policy takes.
export function permittedTabs(role) {
  return ROLE_TABS[role] ?? [];
}

export function forbiddenTabs(role) {
  const allowed = permittedTabs(role);
  return ALL_TABS.filter(tab => !allowed.includes(tab));
}

export function landingTab(role) {
  return permittedTabs(role)[0] ?? null;
}

export function validateLogin(username, password) {
  const errors = {};

  if (typeof username !== 'string' || username.trim() === '') {
    errors.username = 'Username is required';
  }

  // Only the username is trimmed; a password of spaces is a password.
  if (typeof password !== 'string' || password === '') {
    errors.password = 'Password is required';
  }

  return errors;
}

export function headerText(user) {
  return user ? `Signed in as ${user.username} (${user.role})` : '';
}
