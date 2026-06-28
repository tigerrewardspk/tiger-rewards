let currentUserProfile = null;
const ADMIN_EMAIL = 'sajidjm100@gmail.com';

// ===== RESET ALL STATE =====
function resetAllState() {
  currentUserProfile = null;

  if (typeof privateMailLoaded !== 'undefined') privateMailLoaded = false;
  if (typeof globalMailLoaded !== 'undefined') globalMailLoaded = false;
  if (typeof withdrawHistoryLoaded !== 'undefined') withdrawHistoryLoaded = false;
  if (typeof depositHistoryLoaded !== 'undefined') depositHistoryLoaded = false;
  if (typeof tasksCache !== 'undefined') tasksCache = {};

  const adminNav = document.getElementById('admin-nav');
  if (adminNav) adminNav.classList.add('hidden');

  const mailboxBadge = document.getElementById('mailbox-badge');
  if (mailboxBadge) mailboxBadge.classList.add('hidden');
  const assistantFab   = document.getElementById('assistant-fab');
const assistantPanel = document.getElementById('assistant-panel');
if (assistantFab)   assistantFab.classList.add('hidden');
if (assistantPanel) assistantPanel.classList.add('hidden');
assistantOpen = false;

  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
}

// ===== INIT APP =====
// Auth ads hide karo after login
  var authTop = document.getElementById('ad-auth-top');
  var authBottom = document.getElementById('ad-auth-bottom');
  if (authTop) authTop.style.display = 'none';
  if (authBottom) authBottom.style.display = 'none';

async function initApp(authUser) {
  const user = authUser || (await sb.auth.getUser()).data?.user;
  if (!user) { await logoutUser(); return; }

  const { data: profile, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    showToast('Failed to load profile. Please re-login.', 'error');
    await logoutUser();
    return;
  }

  currentUserProfile = profile;

  await loadTierSettings();

  if (profile.role === 'admin') {
    document.getElementById('admin-nav').classList.remove('hidden');
  }

  loadUnreadCounts();
  loadAnnouncementBanner();
  loadSpinWheel();
  loadAdZones();
  renderProfilePage();
  await loadProfileStats();
  requestNotificationPermission();
  initAssistant();
  openPage('profile');
  startRealtimeSync();
}

// ===== REALTIME SYNC =====
function startRealtimeSync() {
  // 1. Profile balance real-time
  sb.channel('profile-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${currentUserProfile.id}`
    }, (payload) => {
      currentUserProfile = { ...currentUserProfile, ...payload.new };
      renderProfilePage();
      const walletBalance = document.getElementById('wallet-balance');
      const walletPage = document.getElementById('page-wallet');
      if (walletBalance && walletPage && !walletPage.classList.contains('hidden')) {
        walletBalance.textContent = Number(payload.new.available_balance).toFixed(2) + ' USDT';
      }
    })
    .subscribe();

  // 2. Private mail badge
  sb.channel('mail-changes')
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'private_mail',
      filter: `user_id=eq.${currentUserProfile.id}`
    }, (payload) => {
      loadUnreadCounts();
      const subject = payload.new?.subject || 'New message received';
      showBrowserNotification('New Message', subject);
    }).subscribe();

  // 3. Deposit status
  sb.channel('deposit-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'deposits',
      filter: `user_id=eq.${currentUserProfile.id}`
    }, () => {
      depositHistoryLoaded = false;
      const historyTab = document.getElementById('history-tab');
      if (historyTab && !historyTab.classList.contains('hidden')) {
        loadDepositHistory();
      }
      refreshProfile();
    })
    .subscribe();

  // 4. Withdrawal status
  sb.channel('withdrawal-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'withdrawals',
      filter: `user_id=eq.${currentUserProfile.id}`
    }, () => {
      withdrawHistoryLoaded = false;
      const historyTab = document.getElementById('history-tab');
      if (historyTab && !historyTab.classList.contains('hidden')) {
        loadWithdrawalHistory();
      }
    })
    .subscribe();

  // 5. Lucky Draw realtime
  sb.channel('draw-live')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'lucky_draws'
    }, (payload) => {
      if (typeof handleDrawRealtime === 'function') handleDrawRealtime(payload.new);
    })
    .subscribe();

  // 6. Gig realtime (new gigs appear in marketplace)
  sb.channel('gig-updates')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'gigs'
    }, () => {
      const marketPage = document.getElementById('page-market');
      const browseTab = document.getElementById('market-browse-tab');
      if (marketPage && !marketPage.classList.contains('hidden') &&
          browseTab && !browseTab.classList.contains('hidden')) {
        loadBrowseGigs();
      }
    })
    .subscribe();
}

// ===== OPEN PAGE =====
function openPage(pageName) {

  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

  const target = document.getElementById('page-' + pageName);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-page="${pageName}"]`);
  if (navBtn) navBtn.classList.add('active');

  const menuDropdown = document.getElementById('menu-dropdown');
  if (menuDropdown) menuDropdown.classList.add('hidden');

  if (pageName === 'mailbox')   { resetMailboxFlags(); switchMailTab('private'); loadUnreadCounts(); }
  if (pageName === 'updates') {
    loadUpdates();
    var zone = document.getElementById('ad-updates-bottom');
    if (zone && zone.dataset.loaded !== '1') {
      loadAdZones();
    }
  } else {
    const updatesList = document.getElementById('updates-list');
    if (updatesList) {
      updatesList.querySelectorAll('video').forEach(v => {
        v.pause();
        v.removeAttribute('src');
        v.load();
      });
      updatesList.querySelectorAll('iframe').forEach(f => {
        f.removeAttribute('src');
      });
    }
  }
  if (pageName === 'wallet')    { refreshProfile(); loadWalletPage(); }
  if (pageName === 'invite')    loadInvitePage();
  if (pageName === 'earn')      loadEarnPage();
  if (pageName === 'rank')      loadRankPage();
  if (pageName === 'help')      loadMyTickets();
  if (pageName === 'tasks')     loadTasksPage();
  if (pageName === 'guide')     loadGuidePage();
  if (pageName === 'profile')   { refreshProfile(); loadProfileStats(); }
  if (pageName === 'admin')     switchAdminTab('users');
  if (pageName === 'privacy')   renderPrivacyPolicy();
  if (pageName === 'terms')     renderTerms();
  if (pageName === 'market')    loadMarketPage();
  if (pageName === 'luckydraw') loadLuckyDrawPage();
  if (pageName === 'games')     loadGamePage();
  if (pageName === 'stats') {
  statsFromAuth = false;
  const statsPage = document.getElementById('page-stats');
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  statsPage.classList.remove('hidden');
  statsPage.classList.add('fullscreen-overlay-page');
  document.getElementById('stats-back-btn').onclick = () => {
    statsPage.classList.add('hidden');
    statsPage.classList.remove('fullscreen-overlay-page');
    openPage('profile');
  };
  document.getElementById('stats-cta').classList.add('hidden');
  loadStatsPage();
  return;
}
   if (pageName === 'privacy' || pageName === 'terms') {
    document.querySelectorAll('.page').forEach(p => {
      p.classList.add('hidden');
      p.classList.remove('fullscreen-overlay-page');
    });
    const pageEl = document.getElementById('page-' + pageName);
    pageEl.classList.remove('hidden');
    pageEl.classList.add('fullscreen-overlay-page');
    pageEl.style.padding = '24px 16px 40px';
    if (pageName === 'privacy') renderPrivacyPolicy();
    if (pageName === 'terms') renderTerms();

    const existing = pageEl.querySelector('.legal-back-btn');
    if (existing) existing.remove();
    const backBtn = document.createElement('button');
    backBtn.className = 'btn-primary legal-back-btn';
    backBtn.style.marginBottom = '16px';
    backBtn.innerHTML = '← Back';
    backBtn.onclick = () => {
      pageEl.classList.add('hidden');
      pageEl.classList.remove('fullscreen-overlay-page');
      pageEl.style.padding = '';
      openPage('help');
    };
    pageEl.prepend(backBtn);
    return;
  }

}

// ===== TOGGLE MENU =====
function toggleMenu() {
  const dropdown = document.getElementById('menu-dropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
}

// ===== REFRESH PROFILE =====
async function refreshProfile() {
  if (!currentUserProfile) return;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', currentUserProfile.id)
    .single();

  if (!error && data) {
    currentUserProfile = data;
    renderProfilePage();
    if (typeof updateCheckinUI === 'function') updateCheckinUI();
    if (typeof updateSpinUI === 'function') updateSpinUI();
  }
}

// ===== RENDER PROFILE PAGE =====
function renderProfilePage() {
  if (!currentUserProfile) return;

  document.getElementById('profile-username').textContent = currentUserProfile.username;
  document.getElementById('profile-uid').textContent = 'UID: ' + currentUserProfile.uid;
  document.getElementById('profile-balance').textContent =
    Number(currentUserProfile.available_balance).toFixed(2) + ' USDT';

  const totalEarned = Number(currentUserProfile.total_earned || 0);
  let currentTier = TIERS[0];
  for (let i = 0; i < TIERS.length; i++) {
    if (totalEarned >= TIERS[i].min) currentTier = TIERS[i];
  }
  document.getElementById('profile-vip').textContent = currentTier.name + ' Member';

  if (typeof updateCheckinUI === 'function') updateCheckinUI();
  if (typeof updateSpinUI === 'function') updateSpinUI();
  if (typeof loadAchievements === 'function') loadAchievements();
}

// ===== ANNOUNCEMENT BANNER =====
async function loadAnnouncementBanner() {
  try {
    const { data, error } = await sb
      .from('platform_settings')
      .select('key, value')
      .in('key', ['announcement_banner', 'announcement_banner_active']);

    if (error || !data) return;

    const s = {};
    data.forEach(row => s[row.key] = row.value);

    const banner = document.getElementById('announcement-banner');
    if (!banner) return;

    if (s.announcement_banner_active === 'true' && s.announcement_banner) {
      document.getElementById('banner-text').textContent = s.announcement_banner;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  } catch (err) {
    // Silent fail — banner is non-critical
  }
}

// ===== AD ZONES =====
async function loadAdZones() {
  try {
    const keys = ['adsterra_script_code','ad_zone_auth_top','ad_zone_auth_bottom',
      'ad_zone_earn_top','ad_zone_wallet_bottom','ad_zone_updates_bottom','ad_zone_profile_bottom'];
    const { data, error } = await sb.from('platform_settings').select('key,value').in('key', keys);
    if (error || !data) return;

    const map = {};
    data.forEach(r => map[r.key] = r.value);

    // Main Adsterra script (Social Bar / Popunder) — inject once in head
    if (map.adsterra_script_code && !document.getElementById('adsterra-main')) {
      injectAdCode(map.adsterra_script_code, document.head, 'adsterra-main');
    }

    // Zone-specific ads
    const zoneMap = {
      'ad_zone_auth_top': 'ad-auth-top',
      'ad_zone_auth_bottom': 'ad-auth-bottom',
      'ad_zone_earn_top': 'ad-earn-top',
      'ad_zone_wallet_bottom': 'ad-wallet-bottom',
      'ad_zone_updates_bottom': 'ad-updates-bottom',
      'ad_zone_profile_bottom': 'ad-profile-bottom'
    };

    Object.entries(zoneMap).forEach(function(entry) {
      var key = entry[0];
      var zoneId = entry[1];
      var zone = document.getElementById(zoneId);
      if (!zone) return;
      var code = (map[key] || '').trim();
      if (!code) { zone.classList.add('hidden'); return; }
      if (zone.dataset.loaded === '1') return;
      zone.dataset.loaded = '1';
      zone.classList.remove('hidden');
      injectAdCode(code, zone, null);
    });

  } catch(e) {
    console.warn('Ad zones error:', e);
  }
}

function injectAdCode(code, container, mainId) {
  if (!code || !code.trim()) return;

  var temp = document.createElement('div');
  temp.innerHTML = code;

  var scripts = temp.querySelectorAll('script');
  var divs = temp.querySelectorAll('div');
  var hasScript = scripts.length > 0;

  if (mainId) {
    var marker = document.createElement('span');
    marker.id = mainId;
    marker.style.display = 'none';
    container.appendChild(marker);
  }

  // Pehle div containers inject karo (Adsterra native banner ke liye zaroori)
  divs.forEach(function(div) {
    var newDiv = document.createElement('div');
    newDiv.id = div.id;
    newDiv.className = div.className;
    container.appendChild(newDiv);
  });

  // Phir scripts inject karo (order maintain karo — inline pehle, src baad mein)
  var inlineScripts = [];
  var externalScripts = [];

  scripts.forEach(function(s) {
    if (s.src) externalScripts.push(s);
    else inlineScripts.push(s);
  });

  // Inline scripts pehle (atOptions ya container IDs)
  inlineScripts.forEach(function(oldScript) {
    var newScript = document.createElement('script');
    newScript.textContent = oldScript.textContent;
    container.appendChild(newScript);
  });

  // External scripts baad mein
  externalScripts.forEach(function(oldScript) {
    var newScript = document.createElement('script');
    newScript.src = oldScript.src;
    newScript.async = true;
    newScript.setAttribute('data-cfasync', 'false');
    container.appendChild(newScript);
  });
}