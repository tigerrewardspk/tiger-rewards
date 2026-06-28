// ===== Toast Notification System =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== Password Show/Hide Toggle =====
function togglePassword(inputId, iconBtn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    iconBtn.classList.add('eye-open');
  } else {
    input.type = 'password';
    iconBtn.classList.remove('eye-open');
  }
}

// ===== Copy to Clipboard =====
function copyToClipboard(text, successMsg = 'Copied!') {
  if (!text || text === '—') {
    showToast('Nothing to copy', 'error');
    return;
  }
  navigator.clipboard.writeText(text)
    .then(() => showToast(successMsg, 'success'))
    .catch(() => showToast('Copy failed', 'error'));
}

// ===== Online/Offline Check =====
function isOnline() {
  if (!navigator.onLine) {
    showToast('Please connect to the internet or Wifi', 'error');
    return false;
  }
  return true;
}

// ===== Escape HTML (XSS prevention) =====
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// ===== Sanitize HTML (for trusted admin content) =====
function sanitizeHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['a', 'b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'li', 'img'],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt']
  });
}

// ===== Format Date =====
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' • ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ===== Round to 2 decimal places =====
function round2(n) {
  return Math.round(n * 100) / 100;
}