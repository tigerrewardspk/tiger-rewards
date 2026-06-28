// ===== SWITCH ADMIN TAB =====
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.admin-tab-btn[data-tab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
  const activeContent = document.getElementById('admin-' + tab + '-tab');
  if (activeContent) activeContent.classList.remove('hidden');

  if (tab === 'withdrawals')  loadPendingWithdrawals();
  if (tab === 'deposits')     loadPendingDeposits();
  if (tab === 'settings')     loadAdminSettings();
  if (tab === 'updates')      loadAdminUpdatesList();
  if (tab === 'tickets')      loadAdminTickets();
  if (tab === 'taskreviews')  { loadAdminTasks(); loadTaskSubmissions(); }
  if (tab === 'analytics')    loadAnalytics();
  if (tab === 'fraud')        loadFraudUsers();
  if (tab === 'marketplace')  loadDisputedOrders();
  if (tab === 'luckydraw')    loadAdminDraws();
  if (tab === 'games')        setTimeout(() => switchAdminGameTab('puzzle'), 0);
}

// ===== SEARCH USER =====
async function adminSearchUser() {
  const btn  = document.getElementById('admin-search-btn');
  const term = document.getElementById('admin-search-input').value.trim();
  if (!term) { showToast('Enter UID or username', 'error'); return; }

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_search_user', { p_search: term });
    if (error)          { showToast(error.message, 'error'); return; }
    if (!data.success)  { showToast(data.message,  'error'); return; }
    renderAdminSearchResults(data.users);
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

function renderAdminSearchResults(users) {
  const container = document.getElementById('admin-search-results');
  if (!users || users.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No users found</p>'; return;
  }
  container.innerHTML = users.map(u => `
    <div class="mail-card">
      <div class="history-row">
        <span class="history-amount">${escapeHtml(u.username)}</span>
        <span class="status-badge status-${u.role === 'admin' ? 'approved' : 'pending'}">${u.role}</span>
      </div>
      <div class="mail-meta">UID: ${escapeHtml(u.uid)}</div>
      <div class="mail-meta">Balance: ${Number(u.available_balance).toFixed(2)} USDT</div>
      <div class="mail-meta">${escapeHtml(u.email)}</div>
      <button class="btn-primary admin-adjust-btn" type="button"
        onclick="openAdjustForm('${escapeHtml(u.uid)}', '${escapeHtml(u.username)}')">
        <span class="btn-text">Adjust Balance</span><span class="btn-spinner"></span>
      </button>
    </div>
  `).join('');
}

function openAdjustForm(uid, username) {
  document.getElementById('adjust-target-uid').value       = uid;
  document.getElementById('adjust-target-label').textContent = `Adjusting: ${username} (${uid})`;
  document.getElementById('adjust-form-container').classList.remove('hidden');
  document.getElementById('adjust-form-container').scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('admin-adjust-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn       = document.getElementById('admin-adjust-btn-submit');
  const uid       = document.getElementById('adjust-target-uid').value;
  const amount    = parseFloat(document.getElementById('adjust-amount').value);
  const operation = document.getElementById('adjust-operation').value;
  const reason    = document.getElementById('adjust-reason').value.trim();

  if (!reason) { showToast('Reason is required', 'error'); return; }

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_adjust_balance', {
      p_target_uid: uid,
      p_amount:     amount,
      p_operation:  operation,
      p_reason:     reason
    });
    if (error)         { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message,  'error'); return; }

    showToast(data.message, 'success');
    document.getElementById('admin-adjust-form').reset();
    document.getElementById('adjust-form-container').classList.add('hidden');
    adminSearchUser();
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

// ===== WITHDRAWALS =====
async function loadPendingWithdrawals() {
  const btn = document.getElementById('admin-load-withdrawals-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_get_pending_withdrawals');
    if (error)         { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message,  'error'); return; }
    renderWithdrawalsList(data.withdrawals);
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

function renderWithdrawalsList(withdrawals) {
  const container = document.getElementById('admin-withdrawals-list');
  if (!withdrawals || withdrawals.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No pending withdrawals</p>'; return;
  }
  container.innerHTML = withdrawals.map(w => {
    const date = new Date(w.created_at);
    return `<div class="mail-card" id="wd-${w.id}">
      <div class="history-row">
        <span class="history-amount">${escapeHtml(w.username)} (${escapeHtml(w.uid)})</span>
      </div>
      <div class="mail-meta">
        Amount: ${Number(w.amount).toFixed(2)} USDT | Fee: ${Number(w.fee).toFixed(2)} | Net: ${Number(w.net_amount).toFixed(2)} USDT
      </div>
      <div class="address-row">
        <span class="mail-meta">${escapeHtml(w.wallet_address)}</span>
        <button class="copy-btn" type="button"
          onclick="copyToClipboard('${escapeHtml(w.wallet_address)}', 'Address copied')">
          <svg class="icon" viewBox="0 0 24 24">
            <rect x="9" y="9" width="11" height="11" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        </button>
      </div>
      <div class="mail-meta">
        ${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div class="admin-action-row">
        <button class="btn-approve" onclick="processWithdrawal('${w.id}', 'approve')">Approve</button>
        <button class="btn-reject"  onclick="processWithdrawal('${w.id}', 'reject')">Reject</button>
      </div>
    </div>`;
  }).join('');
}

async function processWithdrawal(id, action) {
  if (!isOnline()) return;
  const card    = document.getElementById('wd-' + id);
  const buttons = card ? card.querySelectorAll('button') : [];
  buttons.forEach(b => b.disabled = true);

  try {
    const { data, error } = await sb.rpc('admin_process_withdrawal', {
      p_withdrawal_id: id,
      p_action:        action
    });
    if (error)         { showToast(error.message, 'error'); buttons.forEach(b => b.disabled = false); return; }
    if (!data.success) { showToast(data.message,  'error'); buttons.forEach(b => b.disabled = false); return; }

    showToast(data.message, 'success');
    if (card) card.remove();
    const container = document.getElementById('admin-withdrawals-list');
    if (container && !container.querySelector('.mail-card')) {
      container.innerHTML = '<p class="placeholder-text">No pending withdrawals</p>';
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
    buttons.forEach(b => b.disabled = false);
  }
}

// ===== DEPOSITS =====
async function loadPendingDeposits() {
  const btn = document.getElementById('admin-load-deposits-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_get_pending_deposits');
    if (error) { showToast(error.message, 'error'); return; }
    renderDepositsList(data.deposits || []);
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

function renderDepositsList(deposits) {
  const container = document.getElementById('admin-deposits-list');
  if (!deposits || deposits.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No pending deposits</p>'; return;
  }
  container.innerHTML = deposits.map(d => {
    const date = new Date(d.created_at);
    return `<div class="mail-card" id="dep-${d.id}">
      <div class="history-row">
        <span class="history-amount">${escapeHtml(d.username)} (${escapeHtml(d.uid)})</span>
      </div>
      <div class="mail-meta">
        Amount: ${Number(d.amount).toFixed(2)} USDT | Fee: ${Number(d.fee).toFixed(2)} | Credit: ${Number(d.net_amount).toFixed(2)} USDT
      </div>
      <div class="address-row">
        <span class="mail-meta">TxID: ${escapeHtml(d.txid)}</span>
        <button class="copy-btn" type="button" onclick="copyToClipboard('${escapeHtml(d.txid)}', 'TxID copied')">
          <svg class="icon" viewBox="0 0 24 24">
            <rect x="9" y="9" width="11" height="11" rx="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
        </button>
      </div>
      ${d.screenshot_url
        ? `<div class="mail-meta"><a href="${escapeHtml(d.screenshot_url)}" target="_blank" style="color:var(--accent)">View Screenshot</a></div>`
        : ''}
      <div class="mail-meta">
        ${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div class="input-group" style="margin-top:10px;">
        <textarea id="dep-note-${d.id}" rows="2" placeholder="Optional note to user..."></textarea>
      </div>
      <div class="admin-action-row">
        <button class="btn-approve" onclick="processDeposit('${d.id}', 'approve')">Approve</button>
        <button class="btn-reject"  onclick="processDeposit('${d.id}', 'reject')">Reject</button>
      </div>
    </div>`;
  }).join('');
}

async function processDeposit(id, action) {
  if (!isOnline()) return;
  const card    = document.getElementById('dep-' + id);
  const noteEl  = document.getElementById('dep-note-' + id);
  const note    = noteEl ? noteEl.value.trim() : '';
  if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = true);

  try {
    const { data, error } = await sb.rpc('admin_process_deposit', {
      p_deposit_id: id,
      p_action:     action,
      p_note:       note || null
    });
    if (error)         { showToast(error.message, 'error'); if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false); return; }
    if (!data.success) { showToast(data.message,  'error'); if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false); return; }

    showToast(data.message, 'success');
    if (card) card.remove();
    const container = document.getElementById('admin-deposits-list');
    if (container && !container.querySelector('.mail-card')) {
      container.innerHTML = '<p class="placeholder-text">No pending deposits</p>';
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
    if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false);
  }
}

// ===== SETTINGS =====
async function loadAdminSettings() {
  try {
    const { data, error } = await sb.from('platform_settings').select('key, value');
    if (error) { showToast('Failed to load settings', 'error'); return; }

    const map = {};
    data.forEach(row => map[row.key] = row.value);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    const chk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };

    set('setting-deposit-address',    map.deposit_address || '');
    set('setting-deposit-min',        map.deposit_minimum || '');
    set('setting-deposit-fee',        map.deposit_fee_percent || '');
    chk('setting-deposit-enabled',    map.deposit_enabled !== 'false');
    set('setting-telegram',           map.support_telegram || '');
    set('setting-whatsapp',           map.support_whatsapp || '');
    set('setting-email',              map.support_email || '');
    set('setting-min-withdrawal',     map.minimum_withdrawal || '');
    set('setting-withdrawal-fee',     map.withdrawal_fee_percent || '');
    set('setting-referral-commission',map.referral_commission_percent || '');
    chk('setting-maintenance',        map.maintenance_mode === 'true');
    set('setting-checkin-bonus',      map.daily_checkin_bonus || '');
    set('setting-spin-rewards',       map.spin_wheel_rewards || '');
    set('setting-banner-text',        map.announcement_banner || '');
    chk('setting-banner-active',      map.announcement_banner_active === 'true');
    set('setting-adsterra-code',      map.adsterra_script_code || '');
    set('setting-offerwall-url',      map.offerwall_url || '');
    set('setting-offerwall-share',    map.offerwall_user_share_percent || '');
    set('ad-auth-top-code',           map.ad_zone_auth_top || '');
    set('ad-auth-bottom-code',        map.ad_zone_auth_bottom || '');
    set('ad-earn-top-code',           map.ad_zone_earn_top || '');
    set('ad-wallet-bottom-code',      map.ad_zone_wallet_bottom || '');
    set('ad-updates-bottom-code',     map.ad_zone_updates_bottom || '');
    set('ad-profile-bottom-code',     map.ad_zone_profile_bottom || '');
    set('setting-daily-cap',          map.daily_earning_cap || '');
    set('setting-min-checkins',       map.min_checkins_for_withdrawal || '');
    set('setting-min-tasks',          map.min_tasks_for_withdrawal || '');
    chk('setting-market-enabled',     map.marketplace_enabled !== 'false');
    set('setting-market-listing-fee', map.marketplace_listing_fee || '');
    set('setting-market-txn-fee',     map.marketplace_transaction_fee_percent || '');
    chk('setting-gift-enabled',       map.gift_enabled !== 'false');
    set('setting-gift-fee',           map.gift_fee_percent || '');
    set('setting-gift-min',           map.gift_minimum || '');
    chk('setting-draw-enabled',       map.lucky_draw_enabled !== 'false');
    chk('setting-games-enabled',      map.games_enabled !== 'false');

    const thresholds = (map.rank_tier_thresholds || '10,50,200,500').split(',');
    set('setting-tier-silver',   thresholds[0] || '');
    set('setting-tier-gold',     thresholds[1] || '');
    set('setting-tier-platinum', thresholds[2] || '');
    set('setting-tier-diamond',  thresholds[3] || '');

  document.getElementById('setting-stats-enabled').checked = map.stats_enabled !== 'false';
  document.getElementById('st-tagline').value = map.stats_tagline || '';
  document.getElementById('st-subtitle').value = map.stats_subtitle || '';
  document.getElementById('st-s1v').value = map.stats_stat1_value || '';
  document.getElementById('st-s1l').value = map.stats_stat1_label || '';
  document.getElementById('st-s2v').value = map.stats_stat2_value || '';
  document.getElementById('st-s2l').value = map.stats_stat2_label || '';
  document.getElementById('st-s3v').value = map.stats_stat3_value || '';
  document.getElementById('st-s3l').value = map.stats_stat3_label || '';
  document.getElementById('st-s4v').value = map.stats_stat4_value || '';
  document.getElementById('st-s4l').value = map.stats_stat4_label || '';
  document.getElementById('st-live-members').checked = map.stats_use_live_members !== 'false';
  document.getElementById('st-live-paid').checked = map.stats_use_live_paid !== 'false';

  const badges = [map.stats_badge1, map.stats_badge2, map.stats_badge3, map.stats_badge4, map.stats_badge5].filter(Boolean);
  document.getElementById('st-badges').value = badges.join('\n');

  const f1 = [map.stats_feature1_icon, map.stats_feature1_title, map.stats_feature1_desc].join('|');
  const f2 = [map.stats_feature2_icon, map.stats_feature2_title, map.stats_feature2_desc].join('|');
  const f3 = [map.stats_feature3_icon, map.stats_feature3_title, map.stats_feature3_desc].join('|');
  document.getElementById('st-f1').value = f1;
  document.getElementById('st-f2').value = f2;
  document.getElementById('st-f3').value = f3;
  document.getElementById('st-ticker').value = (map.stats_ticker_items || '').replace(/\|/g, '\n');

  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

async function saveSettings() {
  if (!isOnline()) return;

  const spinRewards = document.getElementById('setting-spin-rewards').value.split(',').map(s => s.trim());
  if (spinRewards.length !== 8 || spinRewards.some(v => isNaN(Number(v)) || Number(v) < 0)) {
    showToast('Spin rewards must be exactly 8 comma-separated numbers', 'error'); return;
  }

  const tierValues = [
    Number(document.getElementById('setting-tier-silver').value),
    Number(document.getElementById('setting-tier-gold').value),
    Number(document.getElementById('setting-tier-platinum').value),
    Number(document.getElementById('setting-tier-diamond').value)
  ];
  if (tierValues.some(v => isNaN(v) || v <= 0) ||
      tierValues[0] >= tierValues[1] ||
      tierValues[1] >= tierValues[2] ||
      tierValues[2] >= tierValues[3]) {
    showToast('Rank tiers must be increasing: Silver < Gold < Platinum < Diamond', 'error'); return;
  }

  const btn = document.getElementById('save-settings-btn');
  btn.classList.add('loading'); btn.disabled = true;

  const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const c = id => { const el = document.getElementById(id); return el ? (el.checked ? 'true' : 'false') : 'false'; };

  const updates = [
    { key: 'deposit_address',                      value: g('setting-deposit-address').trim() },
    { key: 'deposit_minimum',                      value: g('setting-deposit-min') },
    { key: 'deposit_fee_percent',                  value: g('setting-deposit-fee') },
    { key: 'deposit_enabled',                      value: c('setting-deposit-enabled') },
    { key: 'support_telegram',                     value: g('setting-telegram').trim() },
    { key: 'support_whatsapp',                     value: g('setting-whatsapp').trim() },
    { key: 'support_email',                        value: g('setting-email').trim() },
    { key: 'minimum_withdrawal',                   value: g('setting-min-withdrawal') },
    { key: 'withdrawal_fee_percent',               value: g('setting-withdrawal-fee') },
    { key: 'referral_commission_percent',          value: g('setting-referral-commission') },
    { key: 'maintenance_mode',                     value: c('setting-maintenance') },
    { key: 'daily_checkin_bonus',                  value: g('setting-checkin-bonus') },
    { key: 'spin_wheel_rewards',                   value: spinRewards.join(',') },
    { key: 'rank_tier_thresholds',                 value: tierValues.join(',') },
    { key: 'announcement_banner',                  value: g('setting-banner-text').trim() },
    { key: 'announcement_banner_active',           value: c('setting-banner-active') },
    { key: 'adsterra_script_code',                 value: g('setting-adsterra-code').trim() },
    { key: 'offerwall_url',                        value: g('setting-offerwall-url').trim() },
    { key: 'offerwall_user_share_percent',         value: g('setting-offerwall-share') },
    { key: 'ad_zone_auth_top',                     value: g('ad-auth-top-code').trim() },
    { key: 'ad_zone_auth_bottom',                  value: g('ad-auth-bottom-code').trim() },
    { key: 'ad_zone_earn_top',                     value: g('ad-earn-top-code').trim() },
    { key: 'ad_zone_wallet_bottom',                value: g('ad-wallet-bottom-code').trim() },
    { key: 'ad_zone_updates_bottom',               value: g('ad-updates-bottom-code').trim() },
    { key: 'ad_zone_profile_bottom',               value: g('ad-profile-bottom-code').trim() },
    { key: 'daily_earning_cap',                    value: g('setting-daily-cap') },
    { key: 'min_checkins_for_withdrawal',          value: g('setting-min-checkins') },
    { key: 'min_tasks_for_withdrawal',             value: g('setting-min-tasks') },
    { key: 'marketplace_enabled',                  value: c('setting-market-enabled') },
    { key: 'marketplace_listing_fee',              value: g('setting-market-listing-fee') },
    { key: 'marketplace_transaction_fee_percent',  value: g('setting-market-txn-fee') },
    { key: 'gift_enabled',                         value: c('setting-gift-enabled') },
    { key: 'gift_fee_percent',                     value: g('setting-gift-fee') },
    { key: 'gift_minimum',                         value: g('setting-gift-min') },
    { key: 'lucky_draw_enabled',                   value: c('setting-draw-enabled') },
    { key: 'games_enabled',                        value: c('setting-games-enabled') },
     { key: 'stats_enabled', value: document.getElementById('setting-stats-enabled').checked ? 'true' : 'false' },
    { key: 'stats_tagline', value: document.getElementById('st-tagline').value.trim() },
    { key: 'stats_subtitle', value: document.getElementById('st-subtitle').value.trim() },
    { key: 'stats_stat1_value', value: document.getElementById('st-s1v').value.trim() },
    { key: 'stats_stat1_label', value: document.getElementById('st-s1l').value.trim() },
    { key: 'stats_stat2_value', value: document.getElementById('st-s2v').value.trim() },
    { key: 'stats_stat2_label', value: document.getElementById('st-s2l').value.trim() },
    { key: 'stats_stat3_value', value: document.getElementById('st-s3v').value.trim() },
    { key: 'stats_stat3_label', value: document.getElementById('st-s3l').value.trim() },
    { key: 'stats_stat4_value', value: document.getElementById('st-s4v').value.trim() },
    { key: 'stats_stat4_label', value: document.getElementById('st-s4l').value.trim() },
    { key: 'stats_use_live_members', value: document.getElementById('st-live-members').checked ? 'true' : 'false' },
    { key: 'stats_use_live_paid', value: document.getElementById('st-live-paid').checked ? 'true' : 'false' },
    ...(() => {
      const badges = document.getElementById('st-badges').value.split('\n').map(s => s.trim()).filter(Boolean);
      const updates = [];
      for (let i = 1; i <= 5; i++) updates.push({ key: 'stats_badge' + i, value: badges[i-1] || '' });
      return updates;
    })(),
    ...(() => {
      const updates = [];
      [1,2,3].forEach(n => {
        const parts = (document.getElementById('st-f' + n).value || '').split('|');
        updates.push({ key: 'stats_feature' + n + '_icon', value: (parts[0] || '').trim() });
        updates.push({ key: 'stats_feature' + n + '_title', value: (parts[1] || '').trim() });
        updates.push({ key: 'stats_feature' + n + '_desc', value: (parts[2] || '').trim() });
      });
      return updates;
    })(),
    { key: 'stats_ticker_items', value: document.getElementById('st-ticker').value.split('\n').map(s => s.trim()).filter(Boolean).join('|') }
  ];

  try {
    for (const u of updates) {
      const { error } = await sb.from('platform_settings').upsert({
        key:        u.key,
        value:      u.value,
        updated_at: new Date().toISOString()
      });
      if (error) { showToast('Failed to save: ' + u.key, 'error'); return; }
    }
    showToast('Settings updated successfully', 'success');
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

// ===== MAILBOX ADMIN =====
function switchAdminMailTab(tab) {
  document.querySelectorAll('.admin-mail-tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.admin-mail-tab-btn[data-tab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('admin-mail-global-tab').classList.toggle('hidden',  tab !== 'global');
  document.getElementById('admin-mail-private-tab').classList.toggle('hidden', tab !== 'private');
  if (tab === 'global') loadAdminGlobalMails();
}

document.getElementById('admin-global-mail-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn     = document.getElementById('global-mail-btn');
  const subject = document.getElementById('global-mail-subject').value.trim();
  const message = document.getElementById('global-mail-message').value.trim();

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { error } = await sb.from('global_mail').insert({ subject, message });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Global mail sent', 'success');
    document.getElementById('admin-global-mail-form').reset();
    loadAdminGlobalMails();
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

document.getElementById('admin-private-mail-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn     = document.getElementById('private-mail-btn');
  const uid     = document.getElementById('private-mail-uid').value.trim();
  const subject = document.getElementById('private-mail-subject').value.trim();
  const message = document.getElementById('private-mail-message').value.trim();

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_send_private_mail', {
      p_target_uid: uid,
      p_subject:    subject,
      p_message:    message
    });
    if (error)         { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message,  'error'); return; }
    showToast(data.message, 'success');
    document.getElementById('admin-private-mail-form').reset();
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

async function loadAdminGlobalMails() {
  const btn       = document.getElementById('load-global-mails-btn');
  const container = document.getElementById('admin-global-mails-list');
  if (btn) { btn.classList.add('loading'); btn.disabled = true; }

  try {
    const { data, error } = await sb
      .from('global_mail')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { container.innerHTML = '<p class="placeholder-text">Failed to load</p>'; return; }
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No global mails sent yet</p>'; return;
    }

    container.innerHTML = data.map(m => {
      const date = new Date(m.created_at);
      return `<div class="mail-card" id="gmail-admin-${m.id}">
        ${m.subject ? `<div class="mail-subject">${escapeHtml(m.subject)}</div>` : ''}
        <div class="mail-message">${escapeHtml(m.message)}</div>
        <div class="mail-meta">
          ${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div class="admin-action-row">
          <button class="btn-reject" onclick="deleteGlobalMail('${m.id}')">Delete</button>
        </div>
      </div>`;
    }).join('');

  } catch (err) {
    container.innerHTML = '<p class="placeholder-text">Something went wrong</p>';
  } finally {
    if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
  }
}

async function deleteGlobalMail(id) {
  if (!isOnline()) return;
  const card = document.getElementById('gmail-admin-' + id);
  if (card) card.querySelectorAll('button').forEach(b => b.disabled = true);

  try {
    const { data, error } = await sb.rpc('admin_delete_global_mail', { p_mail_id: id });
    if (error || !data.success) {
      showToast(error?.message || data.message, 'error');
      if (card) card.querySelectorAll('button').forEach(b => b.disabled = false);
      return;
    }
    showToast('Mail deleted', 'success');
    if (card) card.remove();
    const container = document.getElementById('admin-global-mails-list');
    if (container && !container.querySelector('.mail-card')) {
      container.innerHTML = '<p class="placeholder-text">No global mails sent yet</p>';
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
    if (card) card.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

// ===== UPDATES ADMIN =====
document.getElementById('admin-update-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn       = document.getElementById('post-update-btn');
  const title     = document.getElementById('update-title').value.trim();
  const content   = document.getElementById('update-content').value.trim();
  const image_url = document.getElementById('update-image-url').value.trim() || null;
  const video_url = document.getElementById('update-video-url').value.trim() || null;

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { error } = await sb.from('updates').insert({ title, content, image_url, video_url });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Update posted', 'success');
    document.getElementById('admin-update-form').reset();
    loadAdminUpdatesList();
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

async function loadAdminUpdatesList() {
  try {
    const { data, error } = await sb
      .from('updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load updates', 'error'); return; }

    const container = document.getElementById('admin-updates-list');
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No updates posted yet</p>'; return;
    }

    container.innerHTML = data.map(u => {
      const date = new Date(u.created_at);
      return `<div class="mail-card">
        ${u.title ? `<h3 class="mail-subject">${escapeHtml(u.title)}</h3>` : ''}
        <div class="mail-meta">
          ${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div class="admin-action-row">
          <button class="btn-reject" onclick="deleteUpdate('${u.id}')">Delete</button>
        </div>
      </div>`;
    }).join('');
  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

async function deleteUpdate(id) {
  if (!isOnline()) return;
  try {
    const { error } = await sb.from('updates').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Update deleted', 'success');
    loadAdminUpdatesList();
  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

// ===== TICKETS ADMIN =====
async function loadAdminTickets() {
  const btn = document.getElementById('admin-load-tickets-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_get_open_tickets');
    if (error)         { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message,  'error'); return; }
    renderAdminTickets(data.tickets);
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

function renderAdminTickets(tickets) {
  const container = document.getElementById('admin-tickets-list');
  if (!tickets || tickets.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No open tickets</p>'; return;
  }
  container.innerHTML = tickets.map(t => {
    const date = new Date(t.created_at);
    return `<div class="mail-card" id="ticket-${t.id}">
      <div class="history-row">
        <span class="history-amount">${escapeHtml(t.username)} (${escapeHtml(t.uid)})</span>
      </div>
      <div class="mail-subject">${escapeHtml(t.subject)}</div>
      <div class="mail-message">${escapeHtml(t.message)}</div>
      <div class="mail-meta">
        ${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div class="input-group" style="margin-top:10px;">
        <textarea id="reply-${t.id}" rows="2" placeholder="Type your reply..."></textarea>
      </div>
      <div class="admin-action-row">
        <button class="btn-approve" onclick="replyTicket('${t.id}')">Send Reply</button>
      </div>
    </div>`;
  }).join('');
}

async function replyTicket(id) {
  if (!isOnline()) return;
  const reply = document.getElementById('reply-' + id)?.value.trim();
  if (!reply) { showToast('Reply cannot be empty', 'error'); return; }

  const card = document.getElementById('ticket-' + id);
  if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = true);

  try {
    const { data, error } = await sb.rpc('admin_reply_ticket', {
      p_ticket_id: id,
      p_reply:     reply
    });
    if (error)         { showToast(error.message, 'error'); if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false); return; }
    if (!data.success) { showToast(data.message,  'error'); if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false); return; }

    showToast(data.message, 'success');
    if (card) card.remove();
    const container = document.getElementById('admin-tickets-list');
    if (container && !container.querySelector('.mail-card')) {
      container.innerHTML = '<p class="placeholder-text">No open tickets</p>';
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
    if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false);
  }
}

// ===== TASKS ADMIN =====
document.getElementById('admin-task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn       = document.getElementById('post-task-btn');
  const isFlash   = document.getElementById('task-is-flash').checked;
  const expiryHrs = parseInt(document.getElementById('task-expiry-hours').value) || 6;
  const expiresAt = isFlash ? new Date(Date.now() + expiryHrs * 3600000).toISOString() : null;

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { error } = await sb.from('tasks').insert({
      title:            document.getElementById('task-title').value.trim(),
      description:      document.getElementById('task-desc').value.trim(),
      proof_instruction:document.getElementById('task-proof-inst').value.trim() || null,
      reward:           parseFloat(document.getElementById('task-reward').value),
      is_flash:         isFlash,
      expires_at:       expiresAt
    });
    if (error) { showToast(error.message, 'error'); return; }

    showToast(isFlash ? '⚡ Flash Task posted!' : 'Task posted!', 'success');
    document.getElementById('admin-task-form').reset();
    document.getElementById('task-expiry-wrap').classList.add('hidden');
    loadAdminTasks();
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

document.getElementById('task-is-flash').addEventListener('change', function () {
  document.getElementById('task-expiry-wrap').classList.toggle('hidden', !this.checked);
});

async function loadAdminTasks() {
  const btn = document.getElementById('load-admin-tasks-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) { showToast(error.message, 'error'); return; }

    const container = document.getElementById('admin-tasks-list');
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No active tasks</p>'; return;
    }

    container.innerHTML = data.map(t => `
      <div class="mail-card" id="admintask-${t.id}">
        <div class="history-row">
          <span class="mail-subject">${escapeHtml(t.title)}</span>
          <span class="history-amount">${Number(t.reward).toFixed(2)} USDT</span>
        </div>
        <div class="mail-message">${escapeHtml(t.description)}</div>
        <div class="admin-action-row">
          <button class="btn-reject" onclick="deleteTask('${t.id}')">Remove Task</button>
        </div>
      </div>`
    ).join('');
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

async function deleteTask(id) {
  if (!isOnline()) return;
  const card = document.getElementById('admintask-' + id);
  if (card) card.querySelectorAll('button').forEach(b => b.disabled = true);

  try {
    const { data, error } = await sb.rpc('admin_delete_task', { p_task_id: id });
    if (error)         { showToast(error.message, 'error'); if (card) card.querySelectorAll('button').forEach(b => b.disabled = false); return; }
    if (!data.success) { showToast(data.message,  'error'); if (card) card.querySelectorAll('button').forEach(b => b.disabled = false); return; }

    showToast('Task removed', 'success');
    if (card) card.remove();
    const container = document.getElementById('admin-tasks-list');
    if (container && !container.querySelector('.mail-card')) {
      container.innerHTML = '<p class="placeholder-text">No active tasks</p>';
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
    if (card) card.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

async function loadTaskSubmissions() {
  const btn = document.getElementById('load-submissions-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_get_task_submissions');
    if (error) { showToast(error.message, 'error'); return; }
    renderTaskSubmissions(data.submissions);
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

function renderTaskSubmissions(submissions) {
  const container = document.getElementById('admin-submissions-list');
  if (!submissions || submissions.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No pending submissions</p>'; return;
  }
  container.innerHTML = submissions.map(s => {
    const date = new Date(s.created_at);
    return `<div class="mail-card" id="sub-${s.id}">
      <div class="history-row">
        <span class="history-amount">${escapeHtml(s.username)} (${escapeHtml(s.uid)})</span>
        <span class="status-badge status-pending">Pending</span>
      </div>
      <div class="mail-subject">Task: ${escapeHtml(s.task_title)} | Reward: ${Number(s.reward).toFixed(2)} USDT</div>
      ${s.proof_url
        ? `<div class="mail-meta">Proof URL: <a href="${escapeHtml(s.proof_url)}" target="_blank" style="color:var(--accent)">${escapeHtml(s.proof_url)}</a></div>`
        : ''}
      ${s.proof_text ? `<div class="mail-message">Proof: ${escapeHtml(s.proof_text)}</div>` : ''}
      <div class="mail-meta">
        ${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div class="input-group" style="margin-top:10px;">
        <textarea id="note-${s.id}" rows="2" placeholder="Optional note to user..."></textarea>
      </div>
      <div class="admin-action-row">
        <button class="btn-approve" onclick="reviewTask('${s.id}', 'approve')">Approve</button>
        <button class="btn-reject"  onclick="reviewTask('${s.id}', 'reject')">Reject</button>
      </div>
    </div>`;
  }).join('');
}

async function reviewTask(id, action) {
  if (!isOnline()) return;
  const card   = document.getElementById('sub-' + id);
  const noteEl = document.getElementById('note-' + id);
  const note   = noteEl ? noteEl.value.trim() : '';
  if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = true);

  try {
    const { data, error } = await sb.rpc('admin_review_task', {
      p_submission_id: id,
      p_action:        action,
      p_note:          note || null
    });
    if (error)         { showToast(error.message, 'error'); if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false); return; }
    if (!data.success) { showToast(data.message,  'error'); if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false); return; }

    showToast(data.message, 'success');
    if (card) card.remove();
    const container = document.getElementById('admin-submissions-list');
    if (container && !container.querySelector('.mail-card')) {
      container.innerHTML = '<p class="placeholder-text">No pending submissions</p>';
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
    if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false);
  }
}

// ===== ANALYTICS =====
function switchAnalyticsTab(tab) {
  document.querySelectorAll('[data-atab]').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-atab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('analytics-activity-section').classList.toggle('hidden', tab !== 'activity');
  document.getElementById('analytics-revenue-section').classList.toggle('hidden',  tab !== 'revenue');

  if (tab === 'revenue')  loadRevenueReport();
  if (tab === 'activity') loadAnalytics();
}

async function loadAnalytics() {
  const btn = document.getElementById('load-analytics-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_get_active_stats');
    if (error)         { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message,  'error'); return; }

    document.getElementById('analytics-content').innerHTML = `
      <div class="analytics-grid">
        <div class="analytics-card">
          <span class="analytics-value">${data.total_users}</span>
          <span class="analytics-label">Total Users</span>
        </div>
        <div class="analytics-card">
          <span class="analytics-value">${data.active_today}</span>
          <span class="analytics-label">Check-ins Today</span>
        </div>
        <div class="analytics-card">
          <span class="analytics-value">${data.spun_today}</span>
          <span class="analytics-label">Spins Today</span>
        </div>
        <div class="analytics-card">
          <span class="analytics-value">${data.pending_withdrawals}</span>
          <span class="analytics-label">Pending Withdrawals</span>
        </div>
        <div class="analytics-card" style="grid-column:span 2">
          <span class="analytics-value">${Number(data.pending_withdrawals_amount).toFixed(2)} USDT</span>
          <span class="analytics-label">Pending Withdrawal Amount</span>
        </div>
      </div>`;
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

async function loadRevenueReport() {
  const btn = document.getElementById('load-revenue-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_get_revenue_dashboard');
    if (error)         { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message,  'error'); return; }

    const netProfit    = Number(data.net_profit    || 0);
    const lotteryNet   = Number(data.lottery_net   || 0);
    const profitColor  = netProfit  >= 0 ? 'var(--success)' : 'var(--error)';
    const lotteryColor = lotteryNet >= 0 ? 'var(--success)' : 'var(--error)';
    const profitBorder = netProfit  >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';
    const lotteryBorder= lotteryNet >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)';

    document.getElementById('revenue-content').innerHTML = `
      <div class="revenue-section">
        <h3 class="section-subtitle">Offerwall Revenue</h3>
        <div class="analytics-grid">
          <div class="analytics-card"><span class="analytics-value">${Number(data.offerwall_gross).toFixed(2)}</span><span class="analytics-label">Gross Revenue (USDT)</span></div>
          <div class="analytics-card"><span class="analytics-value">${Number(data.offerwall_admin_share).toFixed(2)}</span><span class="analytics-label">Admin Share (USDT)</span></div>
          <div class="analytics-card" style="grid-column:span 2"><span class="analytics-value">${Number(data.offerwall_user_share).toFixed(2)}</span><span class="analytics-label">Paid to Users (USDT)</span></div>
        </div>
      </div>
      <div class="revenue-section">
        <h3 class="section-subtitle">User Payouts</h3>
        <div class="analytics-grid">
          <div class="analytics-card"><span class="analytics-value">${Number(data.task_payouts).toFixed(2)}</span><span class="analytics-label">Task Rewards</span></div>
          <div class="analytics-card"><span class="analytics-value">${Number(data.spin_payouts).toFixed(2)}</span><span class="analytics-label">Spin Wheel</span></div>
          <div class="analytics-card"><span class="analytics-value">${Number(data.checkin_payouts).toFixed(2)}</span><span class="analytics-label">Daily Check-ins</span></div>
          <div class="analytics-card"><span class="analytics-value">${Number(data.referral_payouts).toFixed(2)}</span><span class="analytics-label">Referral Commissions</span></div>
          <div class="analytics-card" style="grid-column:span 2"><span class="analytics-value">${Number(data.total_user_payouts).toFixed(2)}</span><span class="analytics-label">Total User Payouts</span></div>
        </div>
      </div>
      <div class="revenue-section">
        <h3 class="section-subtitle">Withdrawals</h3>
        <div class="analytics-grid">
          <div class="analytics-card"><span class="analytics-value">${Number(data.total_withdrawn).toFixed(2)}</span><span class="analytics-label">Total Withdrawn</span></div>
          <div class="analytics-card"><span class="analytics-value">${Number(data.pending_withdrawal).toFixed(2)}</span><span class="analytics-label">Pending Amount</span></div>
        </div>
      </div>
      <div class="revenue-section">
        <h3 class="section-subtitle">Deposits</h3>
        <div class="analytics-grid">
          <div class="analytics-card"><span class="analytics-value">${Number(data.total_deposits_credited).toFixed(2)}</span><span class="analytics-label">Total Credited (USDT)</span></div>
          <div class="analytics-card"><span class="analytics-value">${Number(data.deposit_fees_collected).toFixed(2)}</span><span class="analytics-label">Fees Collected</span></div>
          <div class="analytics-card"><span class="analytics-value">${data.pending_deposits_count}</span><span class="analytics-label">Pending Count</span></div>
          <div class="analytics-card"><span class="analytics-value">${Number(data.pending_deposits_amount).toFixed(2)}</span><span class="analytics-label">Pending Amount</span></div>
        </div>
      </div>
      <div class="revenue-section">
        <h3 class="section-subtitle">Marketplace Revenue</h3>
        <div class="analytics-grid">
          <div class="analytics-card"><span class="analytics-value">${Number(data.marketplace_transaction_fees).toFixed(2)}</span><span class="analytics-label">Transaction Fees</span></div>
          <div class="analytics-card"><span class="analytics-value">${Number(data.marketplace_listing_fees).toFixed(2)}</span><span class="analytics-label">Listing Fees</span></div>
        </div>
      </div>
      <div class="revenue-section">
        <h3 class="section-subtitle">Lucky Draw</h3>
        <div class="analytics-grid">
          <div class="analytics-card"><span class="analytics-value">${Number(data.lottery_ticket_revenue || 0).toFixed(2)}</span><span class="analytics-label">Ticket Revenue</span></div>
          <div class="analytics-card"><span class="analytics-value">${Number(data.lottery_payouts || 0).toFixed(2)}</span><span class="analytics-label">Jackpot Paid Out</span></div>
          <div class="analytics-card" style="grid-column:span 2;border-color:${lotteryBorder}">
            <span class="analytics-value" style="color:${lotteryColor}">${lotteryNet >= 0 ? '+' : ''}${lotteryNet.toFixed(2)} USDT</span>
            <span class="analytics-label">Net Draw Revenue</span>
          </div>
        </div>
      </div>
      <div class="revenue-section">
        <h3 class="section-subtitle">Gifting Fees</h3>
        <div class="analytics-card">
          <span class="analytics-value">${Number(data.gift_fees || 0).toFixed(2)}</span>
          <span class="analytics-label">Total Gift Fees Collected</span>
        </div>
      </div>
      <div class="revenue-section">
        <h3 class="section-subtitle">Net Platform Profit</h3>
        <div class="analytics-card" style="border-color:${profitBorder}">
          <span class="analytics-value" style="color:${profitColor}">${netProfit >= 0 ? '+' : ''}${netProfit.toFixed(2)} USDT</span>
          <span class="analytics-label">Offerwall Gross - Total User Payouts</span>
        </div>
      </div>`;
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

// ===== FRAUD =====
async function loadFraudUsers() {
  const btn       = document.getElementById('load-fraud-btn');
  const container = document.getElementById('fraud-users-list');
  if (!btn) return;
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_get_flagged_users');
    if (error) { container.innerHTML = '<p class="placeholder-text">Error: ' + escapeHtml(error.message) + '</p>'; return; }

    const users = (data && data.users) ? data.users : [];
    if (users.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No flagged users</p>'; return;
    }

    container.innerHTML = users.map(u => `
      <div class="mail-card" id="fraud-${u.uid}">
        <div class="history-row">
          <span class="history-amount">${escapeHtml(u.username)} (${escapeHtml(u.uid)})</span>
          <span class="status-badge ${u.is_suspended ? 'status-rejected' : 'status-warning'}">
            ${u.is_suspended ? 'Suspended/Banned' : 'Flagged'}
          </span>
        </div>
        <div class="mail-meta">Rejected Tasks: ${u.rejected_task_count} | Balance: ${Number(u.available_balance).toFixed(2)} USDT</div>
        <div class="mail-meta">${escapeHtml(u.email)}</div>
        <div class="admin-action-row">
          <button class="btn-approve" onclick="quickReinstate('${u.uid}')">Reinstate</button>
          <button class="btn-reject"  onclick="quickSuspend('${u.uid}')">Suspend 7d</button>
        </div>
      </div>`
    ).join('');
  } catch (err) {
    container.innerHTML = '<p class="placeholder-text">Something went wrong</p>';
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

async function quickSuspend(uid) {
  try {
    const { data, error } = await sb.rpc('admin_manage_ban', {
      p_target_uid:   uid,
      p_action:       'suspend',
      p_reason:       'Suspicious activity detected',
      p_duration_days: 7
    });
    if (error || !data.success) { showToast(error?.message || data.message, 'error'); return; }
    showToast('User suspended 7 days', 'success');
    const card = document.getElementById('fraud-' + uid);
    if (card) card.remove();
    const container = document.getElementById('fraud-users-list');
    if (container && !container.querySelector('.mail-card')) {
      container.innerHTML = '<p class="placeholder-text">No flagged users</p>';
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

async function quickReinstate(uid) {
  try {
    const { data, error } = await sb.rpc('admin_manage_ban', { p_target_uid: uid, p_action: 'unban' });
    if (error || !data.success) { showToast(error?.message || data.message, 'error'); return; }
    await sb.rpc('admin_toggle_flag', { p_target_uid: uid, p_flag: false });
    showToast('User reinstated', 'success');
    const card = document.getElementById('fraud-' + uid);
    if (card) card.remove();
    const container = document.getElementById('fraud-users-list');
    if (container && !container.querySelector('.mail-card')) {
      container.innerHTML = '<p class="placeholder-text">No flagged users</p>';
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

async function manageBan(action) {
  if (!isOnline()) return;
  const uid      = document.getElementById('ban-uid').value.trim();
  const reason   = document.getElementById('ban-reason').value.trim();
  const durVal   = document.getElementById('ban-duration').value.trim();
  const duration = durVal ? parseInt(durVal) : null;

  if (!uid) { showToast('Enter UID', 'error'); return; }
  if (action !== 'unban' && !reason) { showToast('Reason is required', 'error'); return; }

  try {
    const { data, error } = await sb.rpc('admin_manage_ban', {
      p_target_uid:    uid,
      p_action:        action,
      p_reason:        reason || null,
      p_duration_days: duration
    });
    if (error || !data.success) { showToast(error?.message || data.message, 'error'); return; }
    showToast(data.message, 'success');
    document.getElementById('ban-uid').value      = '';
    document.getElementById('ban-reason').value   = '';
    document.getElementById('ban-duration').value = '';
    loadFraudUsers();
  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

// ===== MARKETPLACE DISPUTES =====
async function loadDisputedOrders() {
  const btn = document.getElementById('load-disputes-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_get_disputed_orders');
    if (error) { showToast(error.message, 'error'); return; }

    const container = document.getElementById('admin-disputes-list');
    const orders    = data.orders || [];
    if (orders.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No disputed orders</p>'; return;
    }

    container.innerHTML = orders.map(o => `
      <div class="mail-card" id="dispute-${o.id}">
        <div class="mail-subject">${escapeHtml(o.gig_title)}</div>
        <div class="mail-meta">Buyer: ${escapeHtml(o.buyer)} (${escapeHtml(o.buyer_uid)}) | Seller: ${escapeHtml(o.seller)} (${escapeHtml(o.seller_uid)})</div>
        <div class="mail-meta">Amount: ${Number(o.amount).toFixed(2)} USDT | Seller receives: ${Number(o.seller_receives).toFixed(2)} USDT</div>
        ${o.buyer_note    ? `<div class="ticket-reply"><strong>Buyer note:</strong> ${escapeHtml(o.buyer_note)}</div>`    : ''}
        ${o.delivery_note ? `<div class="ticket-reply"><strong>Delivery:</strong> ${escapeHtml(o.delivery_note)}</div>`  : ''}
        <div class="ticket-reply"><strong>Dispute:</strong> ${escapeHtml(o.dispute_note)}</div>
        <div class="input-group" style="margin-top:8px;">
          <textarea id="res-note-${o.id}" rows="2" placeholder="Resolution note to both parties..."></textarea>
        </div>
        <div class="admin-action-row">
          <button class="btn-approve" onclick="resolveDispute('${o.id}', 'release_to_seller')">Release to Seller</button>
          <button class="btn-reject"  onclick="resolveDispute('${o.id}', 'refund_buyer')">Refund Buyer</button>
        </div>
      </div>`
    ).join('');
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

async function resolveDispute(id, resolution) {
  if (!isOnline()) return;
  const card   = document.getElementById('dispute-' + id);
  const noteEl = document.getElementById('res-note-' + id);
  const note   = noteEl ? noteEl.value.trim() : '';
  if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = true);

  try {
    const { data, error } = await sb.rpc('admin_resolve_dispute', {
      p_order_id:       id,
      p_resolution:     resolution,
      p_resolution_note: note || null
    });
    if (error || !data.success) {
      showToast(error?.message || data.message, 'error');
      if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false);
      return;
    }
    showToast(data.message, 'success');
    if (card) card.remove();
    const container = document.getElementById('admin-disputes-list');
    if (container && !container.querySelector('.mail-card')) {
      container.innerHTML = '<p class="placeholder-text">No disputed orders</p>';
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
    if (card) card.querySelectorAll('button, textarea').forEach(el => el.disabled = false);
  }
}

// ===== LUCKY DRAW ADMIN =====
document.getElementById('admin-draw-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn        = document.getElementById('create-draw-btn');
  const saleEndVal = document.getElementById('draw-sale-end-input').value;
  const drawAtVal  = document.getElementById('draw-draw-at-input').value;
  const maxTickets = document.getElementById('draw-max-tickets-input').value;

  if (!saleEndVal || !drawAtVal) { showToast('Please fill all required fields', 'error'); return; }

  const saleEnd = new Date(saleEndVal).toISOString();
  const drawAt  = new Date(drawAtVal).toISOString();

  if (new Date(drawAt) <= new Date(saleEnd)) {
    showToast('Draw time must be after ticket sale end', 'error'); return;
  }

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { error } = await sb.from('lucky_draws').insert({
      title:           document.getElementById('draw-title-input').value.trim(),
      jackpot_amount:  parseFloat(document.getElementById('draw-jackpot-input').value),
      ticket_price:    parseFloat(document.getElementById('draw-ticket-price-input').value),
      max_tickets:     maxTickets ? parseInt(maxTickets) : null,
      ticket_sale_end: saleEnd,
      draw_at:         drawAt,
      status:          'open'
    });
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Draw created successfully!', 'success');
    document.getElementById('admin-draw-form').reset();
    loadAdminDraws();
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

async function loadAdminDraws() {
  const btn = document.getElementById('refresh-admin-draws-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb
      .from('lucky_draws')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) { showToast(error.message, 'error'); return; }

    const container = document.getElementById('admin-draws-list');
    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No draws created yet</p>'; return;
    }

    const cards = await Promise.all(data.map(async d => {
      const { count } = await sb
        .from('lottery_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('draw_id', d.id);

      const saleEnd  = new Date(d.ticket_sale_end);
      const drawAt   = new Date(d.draw_at);
      const statusCls = d.status === 'completed' ? 'approved' : d.status === 'open' ? 'pending' : 'claim';

      return `<div class="mail-card" id="adraw-${d.id}">
        <div class="history-row">
          <span class="mail-subject">${escapeHtml(d.title)}</span>
          <span class="status-badge status-${statusCls}">${d.status}</span>
        </div>
        <div class="mail-meta">Jackpot: ${Number(d.jackpot_amount).toFixed(2)} USDT | Ticket: ${Number(d.ticket_price).toFixed(2)} USDT</div>
        <div class="mail-meta">Tickets Sold: ${count || 0}${d.max_tickets ? ' / ' + d.max_tickets : ''}</div>
        <div class="mail-meta">Sale Ends: ${saleEnd.toLocaleDateString()} ${saleEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div class="mail-meta">Draw At: ${drawAt.toLocaleDateString()} ${drawAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        ${d.status === 'completed'
          ? `<div class="mail-meta">🏆 Winner: ${escapeHtml(d.winner_username || '—')} (${escapeHtml(d.winner_uid || '—')}) Ticket #${d.winner_ticket_number || '—'}</div>`
          : ''}
        ${d.status === 'open' ? `
          <div class="admin-action-row">
            <button class="btn-approve" onclick="conductDraw('${d.id}')">Conduct Draw Now</button>
            <button class="btn-reject"  onclick="cancelDraw('${d.id}')">Cancel Draw</button>
          </div>` : ''}
      </div>`;
    }));

    container.innerHTML = cards.join('');
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

async function conductDraw(id) {
  if (!isOnline()) return;
  if (!confirm('Conduct draw now? This cannot be undone.')) return;

  const card = document.getElementById('adraw-' + id);
  if (card) card.querySelectorAll('button').forEach(b => b.disabled = true);

  try {
    const { data, error } = await sb.rpc('admin_conduct_draw', { p_draw_id: id });
    if (error)         { showToast(error.message, 'error'); if (card) card.querySelectorAll('button').forEach(b => b.disabled = false); return; }
    if (!data.success) { showToast(data.message,  'error'); if (card) card.querySelectorAll('button').forEach(b => b.disabled = false); return; }

    showToast('Draw complete! Winner: ' + escapeHtml(data.winner_username) + ' | Ticket #' + data.winner_ticket, 'success');
    loadAdminDraws();
  } catch (err) {
    showToast('Something went wrong', 'error');
    if (card) card.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

async function cancelDraw(id) {
  if (!confirm('Cancel this draw? All ticket buyers will be refunded automatically.')) return;

  const card = document.getElementById('adraw-' + id);
  if (card) card.querySelectorAll('button').forEach(b => b.disabled = true);

  try {
    const { data, error } = await sb.rpc('admin_cancel_draw', { p_draw_id: id });
    if (error)         { showToast(error.message, 'error'); if (card) card.querySelectorAll('button').forEach(b => b.disabled = false); return; }
    if (!data.success) { showToast(data.message,  'error'); if (card) card.querySelectorAll('button').forEach(b => b.disabled = false); return; }

    showToast(data.message, 'success');
    loadAdminDraws();
  } catch (err) {
    showToast('Something went wrong', 'error');
    if (card) card.querySelectorAll('button').forEach(b => b.disabled = false);
  }
}

// ===== GAMES ADMIN =====
function switchAdminGameTab(tab) {
  document.querySelectorAll('[data-gtab]').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-gtab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('admin-game-puzzle-tab').classList.toggle('hidden',    tab !== 'puzzle');
  document.getElementById('admin-game-settings-tab').classList.toggle('hidden',  tab !== 'settings');
  document.getElementById('admin-game-analytics-tab').classList.toggle('hidden', tab !== 'analytics');

  if (tab === 'puzzle')    loadAdminActivePuzzle();
  if (tab === 'settings')  loadAdminGameSettings();
}

document.getElementById('admin-puzzle-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn = document.getElementById('ap-submit-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('admin_create_puzzle', {
      p_question:       document.getElementById('ap-question').value.trim(),
      p_hint:           document.getElementById('ap-hint').value.trim() || null,
      p_answer:         document.getElementById('ap-answer').value.trim(),
      p_answer_display: document.getElementById('ap-answer-display').value.trim() || null,
      p_reward:         parseFloat(document.getElementById('ap-reward').value),
      p_max_winners:    parseInt(document.getElementById('ap-max-winners').value),
      p_expires_hours:  parseInt(document.getElementById('ap-expires-hours').value)
    });
    if (error)         { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message,  'error'); return; }

    showToast('Puzzle posted! Previous puzzle deactivated.', 'success');
    document.getElementById('admin-puzzle-form').reset();
    loadAdminActivePuzzle();
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

async function loadAdminActivePuzzle() {
  const container = document.getElementById('admin-active-puzzle');
  if (!container) return;

  try {
    const { data } = await sb
      .from('brain_puzzles')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (!data) {
      container.innerHTML = '<p class="placeholder-text">No active puzzle</p>'; return;
    }

    const exp = new Date(data.expires_at);
    container.innerHTML = `<div class="mail-card">
      <div class="mail-subject">${escapeHtml(data.question)}</div>
      <div class="mail-meta">Winners: ${data.winners_count}/${data.max_winners} | Reward: ${data.reward} USDT</div>
      <div class="mail-meta">Expires: ${exp.toLocaleDateString()} ${exp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="admin-action-row">
        <button class="btn-reject" onclick="deactivatePuzzle('${data.id}')">Deactivate</button>
      </div>
    </div>`;
  } catch (err) {
    container.innerHTML = '<p class="placeholder-text">Failed to load</p>';
  }
}

async function deactivatePuzzle(id) {
  try {
    await sb.from('brain_puzzles').update({ is_active: false }).eq('id', id);
    showToast('Puzzle deactivated', 'success');
    loadAdminActivePuzzle();
  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

async function loadAdminGameSettings() {
  try {
    const { data } = await sb
      .from('platform_settings')
      .select('key, value')
      .in('key', [
        'games_enabled', 'game_memory_enabled', 'game_memory_entry_fee', 'game_memory_daily_free',
        'game_memory_reward_easy', 'game_memory_reward_medium', 'game_memory_reward_hard',
        'game_memory_time_easy', 'game_memory_time_medium', 'game_memory_time_hard',
        'game_hunt_enabled', 'game_hunt_entry_fee', 'game_hunt_win_reward',
        'game_hunt_daily_free', 'game_hunt_range', 'game_hunt_max_guesses'
      ]);

    if (!data) return;
    const map = {};
    data.forEach(r => map[r.key] = r.value);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    const chk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };

    chk('setting-games-enabled',        map.games_enabled !== 'false');
    chk('setting-game-memory-enabled',  map.game_memory_enabled !== 'false');
    set('sg-memory-fee',                map.game_memory_entry_fee || '');
    set('sg-memory-free',               map.game_memory_daily_free || '');
    set('sg-memory-easy',               map.game_memory_reward_easy || '');
    set('sg-memory-medium',             map.game_memory_reward_medium || '');
    set('sg-memory-hard',               map.game_memory_reward_hard || '');
    set('sg-memory-time-easy',          map.game_memory_time_easy || '');
    set('sg-memory-time-medium',        map.game_memory_time_medium || '');
    set('sg-memory-time-hard',          map.game_memory_time_hard || '');
    chk('setting-game-hunt-enabled',    map.game_hunt_enabled !== 'false');
    set('sg-hunt-fee',                  map.game_hunt_entry_fee || '');
    set('sg-hunt-reward',               map.game_hunt_win_reward || '');
    set('sg-hunt-free',                 map.game_hunt_daily_free || '');
    set('sg-hunt-range',                map.game_hunt_range || '');
    set('sg-hunt-guesses',              map.game_hunt_max_guesses || '');
  document.getElementById('setting-game-rhythm-enabled').checked = map.game_rhythm_enabled !== 'false';
  document.getElementById('sg-rhythm-fee').value = map.game_rhythm_entry_fee || '';
  document.getElementById('sg-rhythm-free').value = map.game_rhythm_daily_free || '';
  document.getElementById('sg-rhythm-easy').value = map.game_rhythm_reward_easy || '';
  document.getElementById('sg-rhythm-medium').value = map.game_rhythm_reward_medium || '';
  document.getElementById('sg-rhythm-hard').value = map.game_rhythm_reward_hard || '';
  document.getElementById('sg-rhythm-acc-easy').value = map.game_rhythm_min_accuracy_easy || '';
  document.getElementById('sg-rhythm-acc-medium').value = map.game_rhythm_min_accuracy_medium || '';
  document.getElementById('sg-rhythm-acc-hard').value = map.game_rhythm_min_accuracy_hard || '';

  } catch (err) {
    showToast('Failed to load game settings', 'error');
  }
}

async function saveGameSettings() {
  if (!isOnline()) return;
  const btn = document.getElementById('save-game-settings-btn');
  btn.classList.add('loading'); btn.disabled = true;

  const g = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const c = id => { const el = document.getElementById(id); return el ? (el.checked ? 'true' : 'false') : 'false'; };

  const updates = [
    { key: 'games_enabled',              value: c('setting-games-enabled') },
    { key: 'game_memory_enabled',        value: c('setting-game-memory-enabled') },
    { key: 'game_memory_entry_fee',      value: g('sg-memory-fee') },
    { key: 'game_memory_daily_free',     value: g('sg-memory-free') },
    { key: 'game_memory_reward_easy',    value: g('sg-memory-easy') },
    { key: 'game_memory_reward_medium',  value: g('sg-memory-medium') },
    { key: 'game_memory_reward_hard',    value: g('sg-memory-hard') },
    { key: 'game_memory_time_easy',      value: g('sg-memory-time-easy') },
    { key: 'game_memory_time_medium',    value: g('sg-memory-time-medium') },
    { key: 'game_memory_time_hard',      value: g('sg-memory-time-hard') },
    { key: 'game_hunt_enabled',          value: c('setting-game-hunt-enabled') },
    { key: 'game_hunt_entry_fee',        value: g('sg-hunt-fee') },
    { key: 'game_hunt_win_reward',       value: g('sg-hunt-reward') },
    { key: 'game_hunt_daily_free',       value: g('sg-hunt-free') },
    { key: 'game_hunt_range',            value: g('sg-hunt-range') },
    { key: 'game_hunt_max_guesses',      value: g('sg-hunt-guesses') },
    { key: 'game_rhythm_enabled', value: document.getElementById('setting-game-rhythm-enabled').checked ? 'true' : 'false' },
    { key: 'game_rhythm_entry_fee', value: document.getElementById('sg-rhythm-fee').value },
    { key: 'game_rhythm_daily_free', value: document.getElementById('sg-rhythm-free').value },
    { key: 'game_rhythm_reward_easy', value: document.getElementById('sg-rhythm-easy').value },
    { key: 'game_rhythm_reward_medium', value: document.getElementById('sg-rhythm-medium').value },
    { key: 'game_rhythm_reward_hard', value: document.getElementById('sg-rhythm-hard').value },
    { key: 'game_rhythm_min_accuracy_easy', value: document.getElementById('sg-rhythm-acc-easy').value },
    { key: 'game_rhythm_min_accuracy_medium', value: document.getElementById('sg-rhythm-acc-medium').value },
    { key: 'game_rhythm_min_accuracy_hard', value: document.getElementById('sg-rhythm-acc-hard').value }
  ];

  try {
    for (const u of updates) {
      await sb.from('platform_settings').upsert({
        key:        u.key,
        value:      u.value,
        updated_at: new Date().toISOString()
      });
    }
    showToast('Game settings saved!', 'success');
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
}

async function loadGameAnalytics() {
  const btn = document.getElementById('load-game-analytics-btn');
  btn.classList.add('loading'); btn.disabled = true;
  try {
    const { data, error } = await sb.rpc('admin_get_game_analytics');
    if (error || !data.success) { showToast('Failed to load analytics', 'error'); return; }

    var r = data.rhythm || {};
    var m = data.memory || {};
    var h = data.hunt || {};
    var p = data.puzzle || {};

    document.getElementById('game-analytics-content').innerHTML =
      '<div class="revenue-section">' +
        '<h3 class="section-subtitle">🃏 Memory Card</h3>' +
        '<div class="analytics-grid">' +
          '<div class="analytics-card"><span class="analytics-value">' + (m.plays || 0) + '</span><span class="analytics-label">Total Plays</span></div>' +
          '<div class="analytics-card"><span class="analytics-value">' + (m.wins || 0) + '</span><span class="analytics-label">Wins</span></div>' +
          '<div class="analytics-card"><span class="analytics-value">' + Number(m.fees || 0).toFixed(2) + '</span><span class="analytics-label">Fees Collected</span></div>' +
          '<div class="analytics-card" style="border-color:' + (Number(m.profit || 0) >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') + '">' +
            '<span class="analytics-value" style="color:' + (Number(m.profit || 0) >= 0 ? 'var(--success)' : 'var(--error)') + '">' + Number(m.profit || 0).toFixed(2) + '</span>' +
            '<span class="analytics-label">Net Profit</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="revenue-section">' +
        '<h3 class="section-subtitle">🎯 Number Hunt</h3>' +
        '<div class="analytics-grid">' +
          '<div class="analytics-card"><span class="analytics-value">' + (h.plays || 0) + '</span><span class="analytics-label">Total Plays</span></div>' +
          '<div class="analytics-card"><span class="analytics-value">' + (h.wins || 0) + '</span><span class="analytics-label">Wins</span></div>' +
          '<div class="analytics-card"><span class="analytics-value">' + Number(h.fees || 0).toFixed(2) + '</span><span class="analytics-label">Fees Collected</span></div>' +
          '<div class="analytics-card" style="border-color:' + (Number(h.profit || 0) >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') + '">' +
            '<span class="analytics-value" style="color:' + (Number(h.profit || 0) >= 0 ? 'var(--success)' : 'var(--error)') + '">' + Number(h.profit || 0).toFixed(2) + '</span>' +
            '<span class="analytics-label">Net Profit</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="revenue-section">' +
        '<h3 class="section-subtitle">🧩 Brain Puzzle</h3>' +
        '<div class="analytics-grid">' +
          '<div class="analytics-card"><span class="analytics-value">' + (p.plays || 0) + '</span><span class="analytics-label">Answers Submitted</span></div>' +
          '<div class="analytics-card"><span class="analytics-value">' + (p.wins || 0) + '</span><span class="analytics-label">Correct</span></div>' +
          '<div class="analytics-card" style="grid-column:span 2"><span class="analytics-value" style="color:var(--error)">' + Number(p.rewards || 0).toFixed(2) + '</span><span class="analytics-label">Total Rewards Paid</span></div>' +
        '</div>' +
      '</div>' +

      '<div class="revenue-section">' +
        '<h3 class="section-subtitle">⚡ Neon Strike</h3>' +
        '<div class="analytics-grid">' +
          '<div class="analytics-card"><span class="analytics-value">' + (r.plays || 0) + '</span><span class="analytics-label">Total Plays</span></div>' +
          '<div class="analytics-card"><span class="analytics-value">' + (r.wins || 0) + '</span><span class="analytics-label">Wins</span></div>' +
          '<div class="analytics-card"><span class="analytics-value">' + Number(r.fees || 0).toFixed(2) + '</span><span class="analytics-label">Fees Collected</span></div>' +
          '<div class="analytics-card" style="border-color:' + (Number(r.profit || 0) >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') + '">' +
            '<span class="analytics-value" style="color:' + (Number(r.profit || 0) >= 0 ? 'var(--success)' : 'var(--error)') + '">' + Number(r.profit || 0).toFixed(2) + '</span>' +
            '<span class="analytics-label">Net Profit</span></div>' +
          '<div class="analytics-card"><span class="analytics-value">' + (r.easy || 0) + '</span><span class="analytics-label">Easy Plays</span></div>' +
          '<div class="analytics-card"><span class="analytics-value">' + (r.medium || 0) + '</span><span class="analytics-label">Medium Plays</span></div>' +
          '<div class="analytics-card" style="grid-column:span 2"><span class="analytics-value">' + (r.hard || 0) + '</span><span class="analytics-label">Hard Plays</span></div>' +
        '</div>' +
      '</div>';

  } catch (err) { showToast('Something went wrong', 'error'); }
  finally { btn.classList.remove('loading'); btn.disabled = false; }
}