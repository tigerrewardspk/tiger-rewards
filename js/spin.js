// ===== LOAD SPIN WHEEL =====
async function loadSpinWheel() {
  try {
    const { data, error } = await sb
      .from('platform_settings')
      .select('value')
      .eq('key', 'spin_wheel_rewards')
      .single();

    if (error || !data) return;

    const rewards = data.value.split(',');
    const container = document.getElementById('spin-wheel-grid');
    if (!container) return;

    container.innerHTML = rewards.map(r =>
      `<div class="spin-box">
        <span>${Number(r).toFixed(2)}</span>
        <span class="spin-unit">USDT</span>
      </div>`
    ).join('');

    updateSpinUI();
  } catch (err) {
    // Silent fail
  }
}

// ===== UPDATE SPIN UI =====
function updateSpinUI() {
  if (!currentUserProfile) return;

  const today = new Date().toISOString().slice(0, 10);
  const btn = document.getElementById('spin-btn');
  if (!btn) return;

  const textEl = btn.querySelector('.btn-text');

  if (currentUserProfile.last_spin_date === today) {
    btn.disabled = true;
    if (textEl) textEl.textContent = 'Come back tomorrow';
    else btn.textContent = 'Come back tomorrow';
  } else {
    btn.disabled = false;
    if (textEl) textEl.textContent = 'Spin Now';
    else btn.textContent = 'Spin Now';
  }
}

// ===== SPIN WHEEL =====
async function spinWheel() {
  if (!isOnline()) return;

  const btn = document.getElementById('spin-btn');
  btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('claim_daily_spin');
    if (error) { showToast(error.message, 'error'); btn.disabled = false; return; }
    if (!data.success) { showToast(data.message, 'info'); btn.disabled = false; return; }

    const spinCount = document.querySelectorAll('.spin-box').length;
    if (!spinCount) return;

    animateSpin(data.index, spinCount, () => {
      showToast(data.message, 'success');
      currentUserProfile.available_balance =
        Number(currentUserProfile.available_balance) + Number(data.reward);
      currentUserProfile.total_earned =
        Number(currentUserProfile.total_earned || 0) + Number(data.reward);
      currentUserProfile.last_spin_date = new Date().toISOString().slice(0, 10);
      renderProfilePage();
    });
  } catch (err) {
    showToast('Something went wrong', 'error');
    btn.disabled = false;
  }
}

// ===== ANIMATE SPIN =====
function animateSpin(targetIndex, count, onDone) {
  const boxes = document.querySelectorAll('.spin-box');
  if (!boxes.length) return;

  let currentIndex = 0;
  let step = 0;
  const totalSteps = count * 3 + targetIndex + 1;
  let delay = 60;

  function tick() {
    boxes.forEach(b => b.classList.remove('active'));
    boxes[currentIndex].classList.add('active');

    step++;
    currentIndex = (currentIndex + 1) % count;

    if (step < totalSteps) {
      if (step > totalSteps - count) delay += 35;
      setTimeout(tick, delay);
    } else {
      boxes.forEach(b => b.classList.remove('active'));
      boxes[targetIndex].classList.add('active', 'winner');
      setTimeout(() => {
        boxes[targetIndex].classList.remove('winner', 'active');
        onDone();
      }, 900);
    }
  }

  tick();
}