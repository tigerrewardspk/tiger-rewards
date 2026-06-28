// ===== CAPTURE REFERRAL FROM URL =====
(function captureReferral() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) localStorage.setItem('tiger_ref_code', ref.toUpperCase());
})();

// ===== SWITCH AUTH SCREEN =====
function switchScreen(screen) {
  document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screen + '-screen');
  if (target) target.classList.add('active');
}

// ===== SUSPENSION TIMER =====
let suspensionTimerInterval = null;

function startSuspensionTimer(endDate) {
  function update() {
    const diff = endDate - new Date();
    const el = document.getElementById('suspension-timer');
    if (!el) { clearInterval(suspensionTimerInterval); return; }

    if (diff <= 0) {
      el.textContent = 'Expired — Please sign in again';
      clearInterval(suspensionTimerInterval);
      return;
    }
    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000) / 60000);
    const secs  = Math.floor((diff % 60000) / 1000);
    el.textContent = (days > 0 ? days + 'd ' : '') + hours + 'h ' + mins + 'm ' + secs + 's';
  }
  update();
  suspensionTimerInterval = setInterval(update, 1000);
}

// ===== SHOW SUSPENSION SCREEN =====
function showSuspensionScreen(banData) {
  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('suspension-screen').classList.remove('hidden');

  const isBanned = banData.ban_type === 'ban';
  document.getElementById('suspension-title').textContent = isBanned ? 'Account Banned' : 'Account Suspended';
  document.getElementById('suspension-icon').textContent  = isBanned ? '🔨' : '🚫';
  document.getElementById('suspension-uid').textContent   = 'UID: ' + (banData.uid || '');
  document.getElementById('suspension-reason').textContent = banData.ban_reason || 'Policy violation';

  if (banData.ban_date) {
    const d = new Date(banData.ban_date);
    document.getElementById('suspension-date').textContent =
      d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (banData.permanent) {
    document.getElementById('suspension-timer-wrap').classList.add('hidden');
    document.getElementById('suspension-permanent').classList.remove('hidden');
  } else if (banData.ban_until) {
    document.getElementById('suspension-permanent').classList.add('hidden');
    document.getElementById('suspension-timer-wrap').classList.remove('hidden');
    if (suspensionTimerInterval) clearInterval(suspensionTimerInterval);
    startSuspensionTimer(new Date(banData.ban_until));
  }

  // Reset appeal UI
  document.getElementById('suspension-ticket-wrap').classList.add('hidden');
  document.getElementById('sus-ticket-message').value = '';

  const contactBtn = document.querySelector('[onclick="toggleSuspensionTicket()"]');
  if (contactBtn) {
    contactBtn.disabled = false;
    contactBtn.style.opacity = '1';
    contactBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg><span>Contact Support / Appeal</span>`;
  }

  checkAppealCount();
  loadSuspensionMails();
}

// ===== CHECK APPEAL COUNT =====
async function checkAppealCount() {
  try {
    const { data } = await sb
      .from('profiles')
      .select('appeal_count')
      .eq('id', (await sb.auth.getUser()).data.user.id)
      .single();

    if (!data) return;

    const contactBtn = document.querySelector('[onclick="toggleSuspensionTicket()"]');
    if (data.appeal_count >= 2 && contactBtn) {
      contactBtn.disabled = true;
      contactBtn.style.opacity = '0.5';
      contactBtn.innerHTML = `<span>Appeal limit reached (2/2)</span>`;
    }
  } catch (err) {
    // Silent fail
  }
}

// ===== TOGGLE SUSPENSION TICKET FORM =====
function toggleSuspensionTicket() {
  document.getElementById('suspension-ticket-wrap').classList.toggle('hidden');
}

// ===== LOAD SUSPENSION MAILS =====
async function loadSuspensionMails() {
  const container = document.getElementById('sus-recent-mails');
  if (!container) return;

  try {
    const { data, error } = await sb
      .from('private_mail')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !data || data.length === 0) return;

    container.innerHTML =
      '<h3 class="section-subtitle" style="text-align:left;margin-bottom:8px;">Recent Notifications</h3>' +
      data.map(m => {
        const d = new Date(m.created_at);
        return `<div class="mail-card" style="text-align:left;margin-bottom:8px;">
          ${m.subject ? `<div class="mail-subject">${escapeHtml(m.subject)}</div>` : ''}
          <div class="mail-message" style="font-size:12px;">${escapeHtml(m.message)}</div>
          <div class="mail-meta">${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>`;
      }).join('');
  } catch (err) {
    // Silent fail
  }
}

// ===== SUBMIT SUSPENSION APPEAL =====
async function submitSuspensionTicket() {
  const btn     = document.getElementById('sus-ticket-btn');
  const subject = document.getElementById('sus-ticket-subject').value.trim();
  const message = document.getElementById('sus-ticket-message').value.trim();

  if (!message) { showToast('Please write your message', 'error'); return; }

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('submit_appeal', {
      p_subject: subject || 'Account Appeal',
      p_message: message
    });

    if (error) { showToast(error.message, 'error'); return; }
    if (!data.success) {
      showToast(data.message, 'error');
      const contactBtn = document.querySelector('[onclick="toggleSuspensionTicket()"]');
      if (contactBtn) {
        contactBtn.textContent = 'Appeal limit reached (2/2)';
        contactBtn.disabled = true;
        contactBtn.style.opacity = '0.5';
      }
      return;
    }

    showToast('Appeal submitted (' + data.appeals_used + '/2 used)', 'success');
    document.getElementById('sus-ticket-message').value = '';
    document.getElementById('suspension-ticket-wrap').classList.add('hidden');

    if (data.appeals_remaining === 0) {
      const contactBtn = document.querySelector('[onclick="toggleSuspensionTicket()"]');
      if (contactBtn) {
        contactBtn.textContent = 'Appeal limit reached (2/2)';
        contactBtn.disabled = true;
        contactBtn.style.opacity = '0.5';
      }
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

// ===== LOGOUT FROM SUSPENSION SCREEN =====
async function logoutFromSuspension() {
  if (suspensionTimerInterval) clearInterval(suspensionTimerInterval);
  resetAllState();
  await sb.auth.signOut();
  document.getElementById('suspension-screen').classList.add('hidden');
  document.getElementById('auth-container').classList.remove('hidden');
  switchScreen('signin');
}

// ===== CHECK BAN AND PROCEED =====
async function checkBanAndProceed(onClear) {
  try {
    const { data, error } = await sb.rpc('check_ban_status');
    if (error) { onClear(); return; }
    if (data && data.banned) {
      showSuspensionScreen(data);
    } else {
      onClear();
    }
  } catch (err) {
    onClear();
  }
}

// ===== SESSION CHECK (runs on page load) =====
async function checkSession() {
  try {
    // Splash hamesha dikhao PEHLE
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.remove('hidden');

    const { data } = await sb.auth.getSession();

    // Minimum 1.5s splash
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (splash) splash.classList.add('hidden');

    if (data?.session?.user) {
      const sessionUser = data.session.user;
      resetAllState();
      await checkBanAndProceed(() => {
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('suspension-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        initApp(sessionUser);
      });
    } else {
      document.getElementById('auth-container').classList.remove('hidden');
      if (typeof loadAdZones === 'function') loadAdZones();
    }
  } catch (err) {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
  }
}

checkSession();

// ===== SIGN IN =====
document.getElementById('signin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn      = document.getElementById('signin-btn');
  const email    = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { showToast(error.message, 'error'); return; }

    const { data: sessionData } = await sb.auth.getSession();
    const sessionUser = sessionData?.session?.user || null;

    await checkBanAndProceed(() => {
      showToast('Sign in Successful', 'success');
      resetAllState();
      document.getElementById('auth-container').classList.add('hidden');
      document.getElementById('suspension-screen').classList.add('hidden');
      document.getElementById('app-container').classList.remove('hidden');
      initApp(sessionUser);
    });
  } catch (err) {
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

// ===== REGISTER =====
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn      = document.getElementById('register-btn');
  const username = document.getElementById('register-username').value.trim();
  const email    = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm  = document.getElementById('register-confirm').value;

  if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    showToast('Username: 3-20 chars (letters, numbers, _)', 'error'); return;
  }

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const refCode = localStorage.getItem('tiger_ref_code') || null;
    const { error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { username, referred_by_code: refCode } }
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered')) showToast('Email already registered', 'error');
      else if (msg.includes('duplicate') || msg.includes('username')) showToast('Username already taken', 'error');
      else showToast(error.message, 'error');
      return;
    }

    localStorage.removeItem('tiger_ref_code');
    showToast('Please confirm your email', 'success');
    switchScreen('signin');
    document.getElementById('register-form').reset();
  } catch (err) {
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

// ===== LOGOUT =====
async function logoutUser() {
  if (!isOnline()) return;
  resetAllState();
  await sb.auth.signOut();
  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('suspension-screen').classList.add('hidden');
  document.getElementById('auth-container').classList.remove('hidden');
  switchScreen('signin');
  showToast('Logged out', 'info');
}