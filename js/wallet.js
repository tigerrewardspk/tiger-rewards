let withdrawSettings  = { min: 2, feePercent: 5 };
let depositSettings   = { min: 5, feePercent: 0, address: '', enabled: true };
let withdrawHistoryLoaded = false;
let depositHistoryLoaded  = false;

// ===== LOAD WALLET PAGE =====
async function loadWalletPage() {
  const balanceEl = document.getElementById('wallet-balance');
  if (balanceEl) {
    balanceEl.textContent = Number(currentUserProfile.available_balance).toFixed(2) + ' USDT';
  }
  await loadWalletSettings();
  switchWalletTab('deposit');
}

// ===== LOAD WALLET SETTINGS =====
async function loadWalletSettings() {
  try {
    const keys = [
      'minimum_withdrawal', 'withdrawal_fee_percent',
      'deposit_address', 'deposit_minimum',
      'deposit_fee_percent', 'deposit_enabled'
    ];
    const { data, error } = await sb
      .from('platform_settings')
      .select('key, value')
      .in('key', keys);

    if (error || !data) return;

    const map = {};
    data.forEach(row => map[row.key] = row.value);

    withdrawSettings.min        = Number(map.minimum_withdrawal || 2);
    withdrawSettings.feePercent = Number(map.withdrawal_fee_percent || 5);
    depositSettings.min         = Number(map.deposit_minimum || 5);
    depositSettings.feePercent  = Number(map.deposit_fee_percent || 0);
    depositSettings.address     = map.deposit_address || '';
    depositSettings.enabled     = map.deposit_enabled !== 'false';

    const addrEl = document.getElementById('deposit-address-text');
    if (addrEl) addrEl.textContent = depositSettings.address || 'Address not set';

    const disabledMsg  = document.getElementById('deposit-disabled-msg');
    const formWrap     = document.getElementById('deposit-form-wrap');

    if (!depositSettings.enabled) {
      if (disabledMsg) disabledMsg.classList.remove('hidden');
      if (formWrap)    formWrap.classList.add('hidden');
    } else {
      if (disabledMsg) disabledMsg.classList.add('hidden');
      if (formWrap)    formWrap.classList.remove('hidden');
    }

    updateDepositPreview();
  } catch (err) {
    // Silent fail
  }
}

// ===== UPDATE DEPOSIT PREVIEW =====
function updateDepositPreview() {
  const amountEl = document.getElementById('deposit-amount');
  const previewEl = document.getElementById('deposit-preview');
  if (!amountEl || !previewEl) return;

  const amount = parseFloat(amountEl.value) || 0;
  const fee    = amount * depositSettings.feePercent / 100;
  const net    = amount - fee;
  previewEl.textContent = `Fee: ${fee.toFixed(2)} USDT | You will receive: ${net.toFixed(2)} USDT`;
}

document.getElementById('deposit-amount').addEventListener('input', updateDepositPreview);

// ===== SUBMIT DEPOSIT =====
document.getElementById('deposit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;
  if (!depositSettings.enabled) { showToast('Deposits are disabled', 'error'); return; }

  const btn        = document.getElementById('deposit-btn');
  const amount     = parseFloat(document.getElementById('deposit-amount').value);
  const txid       = document.getElementById('deposit-txid').value.trim();
  const screenshot = document.getElementById('deposit-screenshot').value.trim();

  if (amount < depositSettings.min) {
    showToast('Minimum deposit is ' + depositSettings.min + ' USDT', 'error'); return;
  }
  if (!txid) { showToast('TxID is required', 'error'); return; }

  const fee = parseFloat((amount * depositSettings.feePercent / 100).toFixed(4));
  const net = parseFloat((amount - fee).toFixed(4));

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { error } = await sb.from('deposits').insert({
      user_id:        currentUserProfile.id,
      amount,
      fee,
      net_amount:     net,
      txid,
      screenshot_url: screenshot || null
    });

    if (error) {
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        showToast('This TxID has already been submitted', 'error');
      } else {
        showToast(error.message, 'error');
      }
      return;
    }

    showToast('Deposit submitted! Pending system verification.', 'success');
    document.getElementById('deposit-form').reset();
    updateDepositPreview();
    depositHistoryLoaded = false;

  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

// ===== SWITCH WALLET TAB =====
function switchWalletTab(tab) {
  document.querySelectorAll('#page-wallet .tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`#page-wallet .tab-btn[data-tab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('deposit-tab').classList.toggle('hidden',  tab !== 'deposit');
  document.getElementById('withdraw-tab').classList.toggle('hidden', tab !== 'withdraw');
  document.getElementById('history-tab').classList.toggle('hidden',  tab !== 'history');

  if (tab === 'history') switchHistoryTab('deposits');
}

// ===== SWITCH HISTORY TAB =====
function switchHistoryTab(tab) {
  document.querySelectorAll('[data-htab]').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-htab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('deposit-history-list').classList.toggle('hidden', tab !== 'deposits');
  document.getElementById('withdraw-history').classList.toggle('hidden',      tab !== 'withdrawals');

  if (tab === 'deposits'    && !depositHistoryLoaded)  loadDepositHistory();
  if (tab === 'withdrawals' && !withdrawHistoryLoaded) loadWithdrawalHistory();
}

// ===== LOAD DEPOSIT HISTORY =====
async function loadDepositHistory() {
  depositHistoryLoaded = true;
  const container = document.getElementById('deposit-history-list');
  if (!container) return;

  try {
    const { data, error } = await sb
      .from('deposits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load history', 'error'); return; }

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No deposit history</p>';
      return;
    }

    container.innerHTML = data.map(d => {
      const date      = new Date(d.created_at);
      const statusCls = d.status === 'approved' ? 'approved' : d.status === 'rejected' ? 'rejected' : 'pending';
      return `<div class="mail-card">
        <div class="history-row">
          <span class="history-amount">${Number(d.amount).toFixed(2)} USDT</span>
          <span class="status-badge status-${statusCls}">${d.status}</span>
        </div>
        <div class="mail-meta">TxID: ${escapeHtml(d.txid)}</div>
        ${d.fee > 0
          ? `<div class="mail-meta">Fee: ${Number(d.fee).toFixed(2)} | Credited: ${Number(d.net_amount).toFixed(2)} USDT</div>`
          : ''}
        ${d.admin_note ? `<div class="mail-meta">Note: ${escapeHtml(d.admin_note)}</div>` : ''}
        <div class="mail-meta">
          ${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>`;
    }).join('');

  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

// ===== LOAD WITHDRAWAL HISTORY =====
async function loadWithdrawalHistory() {
  withdrawHistoryLoaded = true;
  const container = document.getElementById('withdraw-history');
  if (!container) return;

  try {
    const { data, error } = await sb
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load history', 'error'); return; }

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No withdrawal history</p>';
      return;
    }

    container.innerHTML = data.map(w => {
      const date      = new Date(w.created_at);
      const statusCls = w.status === 'approved' ? 'approved' : w.status === 'rejected' ? 'rejected' : 'pending';
      return `<div class="mail-card">
        <div class="history-row">
          <span class="history-amount">${Number(w.amount).toFixed(2)} USDT</span>
          <span class="status-badge status-${statusCls}">${w.status}</span>
        </div>
        <div class="mail-meta">
          Net: ${Number(w.net_amount).toFixed(2)} USDT | Fee: ${Number(w.fee).toFixed(2)} USDT
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

// ===== WITHDRAW PREVIEW =====
document.getElementById('withdraw-amount').addEventListener('input', () => {
  const amount  = parseFloat(document.getElementById('withdraw-amount').value) || 0;
  const fee     = amount * withdrawSettings.feePercent / 100;
  const net     = amount - fee;
  const preview = document.getElementById('withdraw-preview');
  if (preview) preview.textContent = `Fee: ${fee.toFixed(2)} USDT | Net Payout: ${net.toFixed(2)} USDT`;
});

// ===== SUBMIT WITHDRAWAL =====
document.getElementById('withdraw-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn     = document.getElementById('withdraw-btn');
  const amount  = parseFloat(document.getElementById('withdraw-amount').value);
  const address = document.getElementById('withdraw-address').value.trim();

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    showToast('Invalid BEP20 wallet address', 'error'); return;
  }
  if (amount < withdrawSettings.min) {
    showToast(`Minimum withdrawal is ${withdrawSettings.min} USDT`, 'error'); return;
  }

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('request_withdrawal', {
      p_amount:         amount,
      p_wallet_address: address
    });

    if (error) { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message, 'error'); return; }

    showToast(data.message, 'success');
    await refreshProfile();

    const balanceEl = document.getElementById('wallet-balance');
    if (balanceEl) {
      balanceEl.textContent = Number(currentUserProfile.available_balance).toFixed(2) + ' USDT';
    }

    document.getElementById('withdraw-form').reset();
    const preview = document.getElementById('withdraw-preview');
    if (preview) preview.textContent = 'Fee: 0.00 USDT | Net Payout: 0.00 USDT';
    withdrawHistoryLoaded = false;

  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});