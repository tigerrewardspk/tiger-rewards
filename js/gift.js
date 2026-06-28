let giftSettings = { feePercent: 5, minimum: 0.1, enabled: true };

// ===== LOAD GIFT SETTINGS =====
async function loadGiftSettings() {
  try {
    const { data } = await sb
      .from('platform_settings')
      .select('key, value')
      .in('key', ['gift_fee_percent', 'gift_minimum', 'gift_enabled']);

    if (data) {
      const map = {};
      data.forEach(r => map[r.key] = r.value);
      giftSettings.feePercent = Number(map.gift_fee_percent || 5);
      giftSettings.minimum    = Number(map.gift_minimum || 0.1);
      giftSettings.enabled    = map.gift_enabled !== 'false';
    }
  } catch (err) {
    // Keep defaults on failure
  }
}

// ===== OPEN GIFT MODAL =====
async function openGiftModal() {
  await loadGiftSettings();
  document.getElementById('gift-modal').classList.remove('hidden');
  document.getElementById('gift-form').reset();
  document.getElementById('gift-preview').textContent =
    'Fee: 0.00 USDT | Recipient gets: 0.00 USDT';
}

// ===== CLOSE GIFT MODAL =====
function closeGiftModal() {
  document.getElementById('gift-modal').classList.add('hidden');
}

// ===== GIFT AMOUNT PREVIEW =====
document.getElementById('gift-amount').addEventListener('input', () => {
  const amount = parseFloat(document.getElementById('gift-amount').value) || 0;
  const fee    = Math.round(amount * giftSettings.feePercent / 100 * 10000) / 10000;
  const net    = Math.round((amount - fee) * 10000) / 10000;
  document.getElementById('gift-preview').textContent =
    `Fee: ${fee.toFixed(2)} USDT | Recipient gets: ${net.toFixed(2)} USDT`;
});

// ===== SUBMIT GIFT =====
document.getElementById('gift-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn     = document.getElementById('gift-submit-btn');
  const uid     = document.getElementById('gift-uid').value.trim();
  const amount  = parseFloat(document.getElementById('gift-amount').value);
  const message = document.getElementById('gift-message').value.trim();

  if (!giftSettings.enabled) {
    showToast('Gifting is currently disabled', 'error'); return;
  }
  if (!uid) {
    showToast('Please enter recipient UID', 'error'); return;
  }
  if (isNaN(amount) || amount < giftSettings.minimum) {
    showToast('Minimum gift: ' + giftSettings.minimum + ' USDT', 'error'); return;
  }
  if (uid === currentUserProfile.uid) {
    showToast('You cannot send a gift to yourself', 'error'); return;
  }

  btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('send_gift', {
      p_recipient_uid: uid,
      p_amount:        amount,
      p_message:       message || null
    });

    if (error) { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message, 'error'); return; }

    showToast(data.message, 'success');
    closeGiftModal();
    await refreshProfile();

  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.disabled = false;
  }
});