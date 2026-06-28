let TIERS = [
  { name: 'Bronze',   min: 0   },
  { name: 'Silver',   min: 10  },
  { name: 'Gold',     min: 50  },
  { name: 'Platinum', min: 200 },
  { name: 'Diamond',  min: 500 }
];

// ===== LOAD TIER SETTINGS FROM DB =====
async function loadTierSettings() {
  try {
    const { data, error } = await sb
      .from('platform_settings')
      .select('value')
      .eq('key', 'rank_tier_thresholds')
      .single();

    if (error || !data) return;

    const t = data.value.split(',').map(Number);
    if (t.length < 4) return;

    TIERS = [
      { name: 'Bronze',   min: 0    },
      { name: 'Silver',   min: t[0] },
      { name: 'Gold',     min: t[1] },
      { name: 'Platinum', min: t[2] },
      { name: 'Diamond',  min: t[3] }
    ];
  } catch (err) {
    // Keep default tiers on failure
  }
}

// ===== LOAD RANK PAGE =====
function loadRankPage() {
  renderTierCard();
  loadLeaderboard();
}

// ===== RENDER TIER CARD =====
function renderTierCard() {
  if (!currentUserProfile) return;

  const totalEarned = Number(currentUserProfile.total_earned || 0);
  let currentTier = TIERS[0];
  let nextTier    = null;

  for (let i = 0; i < TIERS.length; i++) {
    if (totalEarned >= TIERS[i].min) currentTier = TIERS[i];
    else { nextTier = TIERS[i]; break; }
  }

  const tierNameEl = document.getElementById('tier-name');
  const fillEl     = document.getElementById('tier-progress-fill');
  const textEl     = document.getElementById('tier-progress-text');

  if (tierNameEl) tierNameEl.textContent = currentTier.name + ' Member';

  if (nextTier) {
    const progress = ((totalEarned - currentTier.min) / (nextTier.min - currentTier.min)) * 100;
    if (fillEl) fillEl.style.width = Math.min(progress, 100) + '%';
    if (textEl) textEl.textContent =
      `${totalEarned.toFixed(2)} / ${nextTier.min} USDT to ${nextTier.name}`;
  } else {
    if (fillEl) fillEl.style.width = '100%';
    if (textEl) textEl.textContent =
      `Highest tier reached — ${totalEarned.toFixed(2)} USDT total earned`;
  }
}

// ===== LOAD LEADERBOARD =====
async function loadLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;

  try {
    const { data, error } = await sb.rpc('get_leaderboard');
    if (error) { showToast('Failed to load leaderboard', 'error'); return; }

    const list = (data && data.leaderboard) ? data.leaderboard : [];

    if (list.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No data yet</p>';
      return;
    }

    container.innerHTML = list.map((u, i) => {
      const pos      = i + 1;
      const posClass = pos === 1 ? 'top1' : pos === 2 ? 'top2' : pos === 3 ? 'top3' : '';
      const isSelf   = u.username === currentUserProfile.username;

      return `<div class="mail-card leaderboard-rank ${isSelf ? 'leaderboard-self' : ''}">
        <div class="leaderboard-position ${posClass}">${pos}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-username">${escapeHtml(u.username)}</div>
        </div>
        <div class="leaderboard-balance">${Number(u.balance).toFixed(2)} USDT</div>
      </div>`;
    }).join('');

  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

// ===== SWITCH RANK TAB =====
function switchRankTab(tab) {
  document.querySelectorAll('#page-rank .tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`#page-rank .tab-btn[data-tab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('leaderboard-balance-tab').classList.toggle('hidden', tab !== 'balance');
  document.getElementById('leaderboard-referrers-tab').classList.toggle('hidden', tab !== 'referrers');

  if (tab === 'referrers') loadTopReferrers();
  if (tab === 'balance')   loadLeaderboard();
}

// ===== LOAD TOP REFERRERS =====
async function loadTopReferrers() {
  const container = document.getElementById('referrers-list');
  if (!container) return;

  try {
    const { data, error } = await sb.rpc('get_top_referrers');
    if (error) { showToast('Failed to load referrers', 'error'); return; }

    const list = (data && data.referrers) ? data.referrers : [];

    if (list.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No referral data yet</p>';
      return;
    }

    container.innerHTML = list.map((u, i) => {
      const pos      = i + 1;
      const posClass = pos === 1 ? 'top1' : pos === 2 ? 'top2' : pos === 3 ? 'top3' : '';
      const isSelf   = u.username === currentUserProfile.username;

      return `<div class="mail-card leaderboard-rank ${isSelf ? 'leaderboard-self' : ''}">
        <div class="leaderboard-position ${posClass}">${pos}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-username">${escapeHtml(u.username)}</div>
        </div>
        <div class="leaderboard-balance">${u.referral_count} referrals</div>
      </div>`;
    }).join('');

  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}