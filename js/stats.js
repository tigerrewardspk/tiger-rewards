let statsFromAuth = false;

async function loadStatsPage() {
  // Back button hamesha set karo PEHLE
  const backBtn = document.getElementById('stats-back-btn');
  if (backBtn) {
    backBtn.onclick = statsFromAuth ? hideStatsPage : () => {
      document.getElementById('page-stats').classList.add('hidden');
      document.getElementById('page-stats').classList.remove('fullscreen-overlay-page');
      openPage('profile');
    };
  }

  const { data: enabledSetting } = await sb.from('platform_settings')
    .select('value').eq('key', 'stats_enabled').maybeSingle();

  if (enabledSetting?.value === 'false') {
    document.getElementById('stats-tagline').textContent = 'Statistics Unavailable';
    document.getElementById('stats-subtitle').textContent = 'This page is currently disabled.';
    document.getElementById('stats-ticker-wrap').classList.add('hidden');
    document.getElementById('stats-grid-section').classList.add('hidden');
    document.getElementById('stats-badges-section').classList.add('hidden');
    document.getElementById('stats-features-section').classList.add('hidden');
    return;
  }

  // Show all sections
  document.getElementById('stats-ticker-wrap').classList.remove('hidden');
  document.getElementById('stats-grid-section').classList.remove('hidden');
  document.getElementById('stats-badges-section').classList.remove('hidden');
  document.getElementById('stats-features-section').classList.remove('hidden');

  const { data, error } = await sb.from('platform_settings').select('key,value')
    .in('key', [
      'stats_tagline','stats_subtitle',
      'stats_stat1_value','stats_stat1_label',
      'stats_stat2_value','stats_stat2_label',
      'stats_stat3_value','stats_stat3_label',
      'stats_stat4_value','stats_stat4_label',
      'stats_badge1','stats_badge2','stats_badge3','stats_badge4','stats_badge5',
      'stats_feature1_icon','stats_feature1_title','stats_feature1_desc',
      'stats_feature2_icon','stats_feature2_title','stats_feature2_desc',
      'stats_feature3_icon','stats_feature3_title','stats_feature3_desc',
      'stats_use_live_members','stats_use_live_paid','stats_ticker_items'
    ]);

  if (error || !data) return;
  const s = {};
  data.forEach(r => s[r.key] = r.value);

  // Hero
  document.getElementById('stats-tagline').textContent = s.stats_tagline || 'Pakistan\'s #1 USDT Earning Platform';
  document.getElementById('stats-subtitle').textContent = s.stats_subtitle || 'Real rewards. Real payouts. Real people.';

  // Ticker
  buildTicker(s.stats_ticker_items || '');

  // Badges
  const badgesRow = document.getElementById('stats-badges-row');
  badgesRow.innerHTML = ['stats_badge1','stats_badge2','stats_badge3','stats_badge4','stats_badge5']
    .filter(k => s[k]).map(k => '<div class="stats-badge-pill">' + escapeHtml(s[k]) + '</div>').join('');

  // Features
  const featGrid = document.getElementById('stats-features-grid');
  var featHtml = '';
  for (var n = 1; n <= 3; n++) {
    featHtml += '<div class="stats-feature-card">';
    featHtml += '<div class="stats-feature-icon">' + (s['stats_feature'+n+'_icon'] || '⭐') + '</div>';
    featHtml += '<div class="stats-feature-title">' + escapeHtml(s['stats_feature'+n+'_title'] || '') + '</div>';
    featHtml += '<div class="stats-feature-desc">' + escapeHtml(s['stats_feature'+n+'_desc'] || '') + '</div>';
    featHtml += '</div>';
  }
  featGrid.innerHTML = featHtml;

  // Live stats
  var liveData = null;
  try {
    const { data: ld } = await sb.rpc('get_platform_live_stats');
    if (ld) liveData = ld;
  } catch(e) {}

  const stats = [
    {
      numEl: 'sn1', labelEl: 'sl1', liveEl: 'slive1',
      value: (s.stats_use_live_members === 'true' && liveData)
        ? liveData.members + '+' : s.stats_stat1_value || '1,000+',
      label: s.stats_stat1_label || 'Active Members',
      isLive: s.stats_use_live_members === 'true' && !!liveData
    },
    {
      numEl: 'sn2', labelEl: 'sl2', liveEl: 'slive2',
      value: (s.stats_use_live_paid === 'true' && liveData)
        ? '$' + Number(liveData.paid).toFixed(0) + '+' : s.stats_stat2_value || '$500+',
      label: s.stats_stat2_label || 'USDT Paid Out',
      isLive: s.stats_use_live_paid === 'true' && !!liveData
    },
    {
      numEl: 'sn3', labelEl: 'sl3', liveEl: null,
      value: s.stats_stat3_value || '99%',
      label: s.stats_stat3_label || 'Satisfaction Rate',
      isLive: false
    },
    {
      numEl: 'sn4', labelEl: 'sl4', liveEl: null,
      value: s.stats_stat4_value || '10+',
      label: s.stats_stat4_label || 'Ways to Earn',
      isLive: false
    }
  ];

  stats.forEach(function(st, i) {
    document.getElementById(st.labelEl).textContent = st.label;
    if (st.liveEl) {
      document.getElementById(st.liveEl).classList.toggle('hidden', !st.isLive);
    }
    setTimeout(function() { animateStatCounter(st.numEl, st.value); }, i * 180);
  });
}

function buildTicker(itemsStr) {
  const inner = document.getElementById('stats-ticker-inner');
  const items = itemsStr.split('|').filter(Boolean);
  if (!items.length) { inner.parentElement.parentElement.classList.add('hidden'); return; }

  const makeItem = (text) => `<div class="ticker-item">
    <span class="ticker-check">✓</span>${escapeHtml(text)}
  </div>`;

  // Duplicate for seamless loop
  const allItems = [...items, ...items, ...items];
  inner.innerHTML = allItems.map(makeItem).join('');

  // Set animation duration based on item count
  const duration = items.length * 4;
  inner.style.animationDuration = duration + 's';
}

function animateStatCounter(elId, rawValue) {
  const el = document.getElementById(elId);
  if (!el) return;

  // Parse value: extract prefix, number, suffix
  const prefix = rawValue.match(/^[^0-9]*/)?.[0] || '';
  const suffix = rawValue.match(/[^0-9,]*$/)?.[0] || '';
  const numStr = rawValue.replace(prefix, '').replace(suffix, '').replace(/,/g, '');
  const target = parseFloat(numStr);

  if (isNaN(target) || target === 0) { el.textContent = rawValue; return; }

  const duration = 1800;
  const start = performance.now();
  const hasComma = rawValue.includes(',') && !rawValue.includes('$');

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function formatNum(n) {
    if (hasComma || n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return Math.floor(n).toString();
  }

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);
    const current = eased * target;
    el.textContent = prefix + formatNum(current) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = rawValue; // land exactly
  }

  requestAnimationFrame(tick);
}

function showStatsFromAuth() {
  statsFromAuth = true;
  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('app-container').classList.add('hidden');

  const statsPage = document.getElementById('page-stats');
  statsPage.classList.remove('hidden');
  statsPage.classList.add('fullscreen-overlay-page');
  document.getElementById('stats-cta').classList.remove('hidden');
  document.getElementById('stats-back-btn').onclick = hideStatsPage;
  loadStatsPage();
}

function hideStatsPage() {
  const statsPage = document.getElementById('page-stats');
  statsPage.classList.add('hidden');
  statsPage.classList.remove('fullscreen-overlay-page');
  document.getElementById('stats-cta').classList.add('hidden');

  if (statsFromAuth) {
    document.getElementById('auth-container').classList.remove('hidden');
    statsFromAuth = false;
  } else {
    document.getElementById('app-container').classList.remove('hidden');
  }
}

function hideStatsPage() {
  document.getElementById('page-stats').classList.add('hidden');
  document.getElementById('page-stats').removeAttribute('style');
  document.getElementById('stats-cta').classList.add('hidden');
  if (statsFromAuth) {
    document.getElementById('auth-container').classList.remove('hidden');
    statsFromAuth = false;
  }
}