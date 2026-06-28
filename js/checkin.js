const ACHIEVEMENTS = [
  { id: 'checkin_1',        name: 'Early Bird'    },
  { id: 'streak_7',         name: '7-Day Streak'  },
  { id: 'first_withdrawal', name: 'First Payout'  },
  { id: 'referral_5',       name: 'Recruiter'     },
  { id: 'earned_10',        name: '10 USDT Earned'}
];

// ===== UPDATE CHECKIN UI =====
function updateCheckinUI() {
  if (!currentUserProfile) return;

  const streak = currentUserProfile.checkin_streak || 0;
  const streakEl = document.getElementById('checkin-streak');
  if (streakEl) streakEl.textContent = `Streak: ${streak} day${streak === 1 ? '' : 's'}`;

  const today = new Date().toISOString().slice(0, 10);
  const btn = document.getElementById('checkin-btn');
  if (!btn) return;

  if (currentUserProfile.last_checkin_date === today) {
    btn.disabled = true;
    const textEl = btn.querySelector('.btn-text');
    if (textEl) textEl.textContent = 'Claimed';
    btn.classList.add('claimed');
  } else {
    btn.disabled = false;
    const textEl = btn.querySelector('.btn-text');
    if (textEl) textEl.textContent = 'Claim';
    btn.classList.remove('claimed');
  }
}

// ===== CLAIM DAILY CHECK-IN =====
async function claimDailyCheckin() {
  if (!isOnline()) return;

  const btn = document.getElementById('checkin-btn');
  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('claim_daily_checkin');
    if (error) { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message, 'info'); return; }

    showToast(`+${data.bonus} USDT — Streak: ${data.streak} days!`, 'success');

    currentUserProfile.available_balance =
      Number(currentUserProfile.available_balance) + Number(data.bonus);
    currentUserProfile.total_earned =
      Number(currentUserProfile.total_earned || 0) + Number(data.bonus);
    currentUserProfile.checkin_streak = data.streak;
    currentUserProfile.last_checkin_date = new Date().toISOString().slice(0, 10);

    renderProfilePage();
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading');
  }
}

// ===== LOAD ACHIEVEMENTS =====
async function loadAchievements() {
  try {
    const { data, error } = await sb.rpc('get_achievement_stats');
    if (error || !data) return;

    const unlocked = {
      checkin_1:        (currentUserProfile.checkin_streak || 0) >= 1,
      streak_7:         (currentUserProfile.checkin_streak || 0) >= 7,
      first_withdrawal: data.withdrawal_count >= 1,
      referral_5:       data.referral_count >= 5,
      earned_10:        Number(currentUserProfile.total_earned || 0) >= 10
    };

    const container = document.getElementById('achievements-list');
    if (!container) return;

    container.innerHTML = ACHIEVEMENTS.map(a => `
      <div class="badge-item ${unlocked[a.id] ? 'unlocked' : 'locked'}">
        <svg class="icon badge-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="6"/>
          <path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"/>
        </svg>
        <span class="badge-name">${escapeHtml(a.name)}</span>
      </div>
    `).join('');
  } catch (err) {
    // Silent fail
  }
}