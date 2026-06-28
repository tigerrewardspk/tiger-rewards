// ===== LOAD EARN PAGE =====
async function loadEarnPage() {
  const container = document.getElementById('earn-content');
  if (!container) return;

  try {
    const { data, error } = await sb
      .from('platform_settings')
      .select('value')
      .eq('key', 'offerwall_url')
      .maybeSingle();

    if (error || !data || !data.value) {
      container.innerHTML = '<p class="placeholder-text">Offers coming soon. Check back later!</p>';
    } else {
      const url = data.value.replace('{subid}', currentUserProfile.uid);
      container.innerHTML = `<iframe src="${url}" class="offerwall-frame" allowfullscreen></iframe>`;
    }
  } catch (err) {
    container.innerHTML = '<p class="placeholder-text">Failed to load offers. Try again later.</p>';
  }

  loadOfferHistory();
}

// ===== LOAD OFFER HISTORY =====
async function loadOfferHistory() {
  const container = document.getElementById('offer-history-list');
  if (!container) return;

  try {
    const { data, error } = await sb
      .from('offer_completions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) return;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No earnings yet</p>';
      return;
    }

    container.innerHTML = data.map(o => {
      const date = new Date(o.created_at);
      return `<div class="mail-card">
        <div class="history-row">
          <span class="mail-subject">${escapeHtml(o.offer_name || 'Task')}</span>
          <span class="history-amount">+${Number(o.user_share).toFixed(2)} USDT</span>
        </div>
        <div class="mail-meta">${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>`;
    }).join('');
  } catch (err) {
    // Silent fail
  }
}