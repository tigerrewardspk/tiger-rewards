async function loadProfileStats() {
  const { data, error } = await sb.rpc('get_profile_stats');
  if (error || !data.success) return;

  document.getElementById('stat-total-earned').textContent = Number(data.total_earned || 0).toFixed(2);
  document.getElementById('stat-referrals').textContent = data.referral_count || 0;
  document.getElementById('stat-streak').textContent = data.checkin_streak || 0;
  document.getElementById('stat-tasks').textContent = data.approved_tasks || 0;

  const bioText = document.getElementById('bio-text');
  if (bioText) {
    bioText.textContent = data.bio || 'Tap to add bio...';
    bioText.style.color = data.bio ? 'var(--text-primary)' : 'var(--text-secondary)';
    bioText.style.fontStyle = data.bio ? 'normal' : 'italic';
  }

  await loadEarningChart();
}

function openBioEdit() {
  document.getElementById('bio-display').classList.add('hidden');
  document.getElementById('bio-edit-section').classList.remove('hidden');
  const current = document.getElementById('bio-text').textContent;
  const input = document.getElementById('bio-input');
  input.value = current === 'Tap to add bio...' ? '' : current;
  updateBioCharCount();
  input.focus();
  input.addEventListener('input', updateBioCharCount);
}

function updateBioCharCount() {
  const len = document.getElementById('bio-input').value.length;
  document.getElementById('bio-char-count').textContent = len + '/120';
}

function cancelBioEdit() {
  document.getElementById('bio-edit-section').classList.add('hidden');
  document.getElementById('bio-display').classList.remove('hidden');
}

async function saveBio() {
  const btn = document.getElementById('bio-save-btn');
  const bio = document.getElementById('bio-input').value.trim();
  btn.disabled = true; btn.textContent = 'Saving...';

  try {
    const { data, error } = await sb.rpc('update_profile_bio', { p_bio: bio });
    if (error) { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message, 'error'); return; }

    const bioText = document.getElementById('bio-text');
    bioText.textContent = bio || 'Tap to add bio...';
    bioText.style.color = bio ? 'var(--text-primary)' : 'var(--text-secondary)';
    bioText.style.fontStyle = bio ? 'normal' : 'italic';

    cancelBioEdit();
    showToast('Bio updated!', 'success');
    currentUserProfile.bio = bio;
  } catch (err) { showToast('Something went wrong', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Save'; }
}

async function loadEarningChart() {
  const container = document.getElementById('earning-chart');
  if (!container) return;

  const { data, error } = await sb.rpc('get_earning_analytics');
  if (error || !data.success || !data.data) {
    container.innerHTML = '<div class="chart-loading" style="color:var(--text-secondary)">No data yet</div>';
    return;
  }

  const days = data.data;
  const amounts = days.map(d => Number(d.amount) || 0);
  const maxAmount = Math.max(...amounts, 0.01);
  const total = amounts.reduce((a, b) => a + b, 0);

  document.getElementById('analytics-total').textContent = total.toFixed(2) + ' USDT';

  container.innerHTML = `
    <div class="chart-bars">
      ${days.map((d, i) => {
        const height = Math.max((amounts[i] / maxAmount) * 100, amounts[i] > 0 ? 8 : 2);
        const isToday = i === days.length - 1;
        return `<div class="chart-bar-wrap">
          <div class="chart-bar-amount">${amounts[i] > 0 ? amounts[i].toFixed(2) : ''}</div>
          <div class="chart-bar ${isToday ? 'chart-bar-today' : ''}"
            style="height:${height}%"
            title="${d.date}: ${amounts[i].toFixed(4)} USDT">
          </div>
          <div class="chart-day-label">${d.day_name || ''}</div>
        </div>`;
      }).join('')}
    </div>`;
}