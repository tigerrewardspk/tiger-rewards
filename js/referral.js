// ===== LOAD INVITE PAGE =====
async function loadInvitePage() {
  if (!currentUserProfile) return;

  const link = window.location.origin + window.location.pathname + '?ref=' + currentUserProfile.referral_code;
  const linkEl = document.getElementById('invite-link');
  if (linkEl) linkEl.textContent = link;

  try {
    const { data, error } = await sb.rpc('get_referral_stats');
    if (!error && data) {
      const countEl = document.getElementById('referral-count');
      if (countEl) countEl.textContent = data.referral_count || 0;
    }
  } catch (err) {
    // Silent fail
  }

  await loadReferralEarnings();
}

// ===== LOAD REFERRAL EARNINGS =====
async function loadReferralEarnings() {
  const container = document.getElementById('referral-earnings-list');
  if (!container) return;

  try {
    const { data, error } = await sb
      .from('referral_earnings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load earnings', 'error'); return; }

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No referral earnings yet</p>';
      return;
    }

    container.innerHTML = data.map(r => {
      const date = new Date(r.created_at);
      return `<div class="mail-card">
        <div class="history-row">
          <span class="history-amount">+${Number(r.amount).toFixed(2)} USDT</span>
          <span class="status-badge status-${r.status === 'claimed' ? 'approved' : 'pending'}">
            ${r.status}
          </span>
        </div>
        <div class="mail-meta">
          ${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>`;
    }).join('');

  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}