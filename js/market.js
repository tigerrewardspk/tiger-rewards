let marketSettings = { enabled: true, listingFee: 0.5, txnFeePercent: 5 };
let currentOrderGigId = null;
let currentDeliverOrderId = null;
let currentDisputeOrderId = null;

async function loadMarketPage() {
  const { data, error } = await sb.from('platform_settings').select('key,value')
    .in('key', ['marketplace_enabled','marketplace_listing_fee','marketplace_transaction_fee_percent']);
  if (!error && data) {
    const map = {};
    data.forEach(r => map[r.key] = r.value);
    marketSettings.enabled = map.marketplace_enabled !== 'false';
    marketSettings.listingFee = Number(map.marketplace_listing_fee || 0.5);
    marketSettings.txnFeePercent = Number(map.marketplace_transaction_fee_percent || 5);
  }

  if (!marketSettings.enabled) {
    document.getElementById('market-disabled-msg').classList.remove('hidden');
    document.getElementById('market-content').classList.add('hidden');
    return;
  }
  document.getElementById('market-disabled-msg').classList.add('hidden');
  document.getElementById('market-content').classList.remove('hidden');
  switchMarketTab('browse');
}

function switchMarketTab(tab) {
  document.querySelectorAll('#page-market .tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`#page-market .tab-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('market-browse-tab').classList.toggle('hidden', tab !== 'browse');
  document.getElementById('market-my-gigs-tab').classList.toggle('hidden', tab !== 'my-gigs');
  document.getElementById('market-my-orders-tab').classList.toggle('hidden', tab !== 'my-orders');

  if (tab === 'browse') loadBrowseGigs();
  if (tab === 'my-gigs') loadMyGigs();
  if (tab === 'my-orders') loadMyOrders();
}

function switchOrderTab(tab) {
  document.querySelectorAll('[data-otab]').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-otab="${tab}"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('orders-buying-list').classList.toggle('hidden', tab !== 'buying');
  document.getElementById('orders-selling-list').classList.toggle('hidden', tab !== 'selling');
}

async function loadBrowseGigs() {
  const container = document.getElementById('browse-gigs-list');
  container.innerHTML = '<p class="placeholder-text">Loading...</p>';
  const { data, error } = await sb.from('gigs').select('*').eq('status', 'active').order('created_at', { ascending: false });
  if (error) { container.innerHTML = '<p class="placeholder-text">Failed to load gigs</p>'; return; }
  if (!data || data.length === 0) { container.innerHTML = '<p class="placeholder-text">No gigs posted yet!</p>'; return; }

  container.innerHTML = data.map(g => {
    const isMine = g.seller_id === currentUserProfile.id;
    const fee = (g.price * marketSettings.txnFeePercent / 100).toFixed(2);
    return `<div class="mail-card">
      <div class="history-row">
        <span class="mail-subject">${escapeHtml(g.title)}</span>
        <span class="history-amount">${Number(g.price).toFixed(2)} USDT</span>
      </div>
      <div class="mail-message">${escapeHtml(g.description)}</div>
      ${g.delivery_info ? `<div class="task-proof-inst">${escapeHtml(g.delivery_info)}</div>` : ''}
      <div class="mail-meta">By: ${escapeHtml(g.seller_username || 'User')} | Platform fee: ${fee} USDT</div>
      <div class="admin-action-row">
        ${!isMine
          ? `<button class="btn-approve" onclick="openOrderModal('${g.id}','${escapeHtml(g.title).replace(/'/g, "\\'")}',${g.price})">Order Now</button>`
          : '<span class="status-badge status-pending">Your Gig</span>'}
      </div>
    </div>`;
  }).join('');
}

function round2(n) { return Math.round(n * 100) / 100; }

async function loadMyGigs() {
  const container = document.getElementById('my-gigs-list');
  container.innerHTML = '<p class="placeholder-text">Loading...</p>';

  const { data, error } = await sb.from('gigs')
    .select('*')
    .eq('seller_id', currentUserProfile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) { container.innerHTML = '<p class="placeholder-text">Failed to load</p>'; return; }
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="placeholder-text">You have no active gigs</p>';
    return;
  }

  container.innerHTML = data.map(g => `
    <div class="mail-card" id="mygig-${g.id}">
      <div class="history-row">
        <span class="mail-subject">${escapeHtml(g.title)}</span>
        <span class="history-amount">${Number(g.price).toFixed(2)} USDT</span>
      </div>
      <div class="mail-message">${escapeHtml(g.description)}</div>
      <div class="admin-action-row">
        <button class="btn-reject" onclick="deleteMyGig('${g.id}')">Remove</button>
      </div>
    </div>
  `).join('');
}

async function deleteMyGig(id) {
  if (!isOnline()) return;
  const card = document.getElementById('mygig-' + id);
  if (card) card.querySelectorAll('button').forEach(b => b.disabled = true);
  const { error } = await sb.from('gigs').update({ status: 'deleted' }).eq('id', id).eq('seller_id', currentUserProfile.id);
  if (error) { showToast(error.message, 'error'); if (card) card.querySelectorAll('button').forEach(b => b.disabled = false); return; }
  showToast('Gig removed', 'success');
   if (card) {
    const statusEl = card.querySelector('.mail-meta');
    if (statusEl) statusEl.textContent = 'Status: deleted';
    card.querySelectorAll('button').forEach(b => {
      b.disabled = true;
      b.textContent = 'Removed';
      b.style.opacity = '0.4';
      b.style.cursor = 'not-allowed';
    });
  }
}

async function loadMyOrders() {
  const { data, error } = await sb.rpc('get_my_orders');
  if (error) { showToast('Failed to load orders', 'error'); return; }

  renderBuyingOrders(data.buying || []);
  renderSellingOrders(data.selling || []);
}

function getStatusBadge(status) {
  const map = {
    'escrow': 'status-pending', 'delivered': 'status-claim',
    'completed': 'status-approved', 'disputed': 'status-rejected',
    'refunded': 'status-warning', 'cancelled': 'status-rejected'
  };
  return `<span class="status-badge ${map[status] || 'status-pending'}">${status}</span>`;
}

function renderBuyingOrders(orders) {
  const container = document.getElementById('orders-buying-list');
  if (!orders || orders.length === 0) { container.innerHTML = '<p class="placeholder-text">No orders placed yet</p>'; return; }

  container.innerHTML = orders.map(o => {
    const date = new Date(o.created_at);
    let actions = '';
    if (o.status === 'delivered') {
      actions = `<button class="btn-approve" onclick="openConfirmDeliveryModal('${o.id}')">Confirm Receipt</button>
                 <button class="btn-reject" onclick="openDisputeModal('${o.id}')">Dispute</button>`;
    } else if (o.status === 'escrow') {
      actions = `<button class="btn-reject" onclick="openDisputeModal('${o.id}')">Raise Dispute</button>`;
    }
    return `<div class="mail-card">
      <div class="history-row"><span class="mail-subject">${escapeHtml(o.gig_title)}</span>${getStatusBadge(o.status)}</div>
      <div class="mail-meta">Seller: ${escapeHtml(o.seller)} | Paid: ${Number(o.amount).toFixed(2)} USDT</div>
      ${o.delivery_note ? `<div class="ticket-reply"><strong>Delivery:</strong> ${escapeHtml(o.delivery_note)}</div>` : ''}
      <div class="mail-meta">${date.toLocaleDateString()}</div>
      ${actions ? `<div class="admin-action-row" style="margin-top:8px;">${actions}</div>` : ''}
    </div>`;
  }).join('');
}

function renderSellingOrders(orders) {
  const container = document.getElementById('orders-selling-list');
  if (!orders || orders.length === 0) { container.innerHTML = '<p class="placeholder-text">No orders received yet</p>'; return; }

  container.innerHTML = orders.map(o => {
    const date = new Date(o.created_at);
    let actions = '';
    if (o.status === 'escrow') {
      actions = `<button class="btn-approve" onclick="openDeliverModal('${o.id}')">Mark Delivered</button>`;
    }
    return `<div class="mail-card">
      <div class="history-row"><span class="mail-subject">${escapeHtml(o.gig_title)}</span>${getStatusBadge(o.status)}</div>
      <div class="mail-meta">Buyer: ${escapeHtml(o.buyer)} | You receive: ${Number(o.seller_receives).toFixed(2)} USDT</div>
      ${o.buyer_note ? `<div class="task-proof-inst">Buyer note: ${escapeHtml(o.buyer_note)}</div>` : ''}
      <div class="mail-meta">${date.toLocaleDateString()}</div>
      ${actions ? `<div class="admin-action-row" style="margin-top:8px;">${actions}</div>` : ''}
    </div>`;
  }).join('');
}

// Post Gig Modal
function openPostGigModal() {
  document.getElementById('post-gig-fee-info').textContent =
    'Listing fee: ' + marketSettings.listingFee + ' USDT (one-time, non-refundable)';
  document.getElementById('post-gig-modal').classList.remove('hidden');
}
function closePostGigModal() { document.getElementById('post-gig-modal').classList.add('hidden'); }

document.getElementById('post-gig-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;
  const btn = document.getElementById('post-gig-submit-btn');
  btn.disabled = true;
  try {
    const { data, error } = await sb.rpc('create_gig', {
      p_title: document.getElementById('gig-title').value.trim(),
      p_description: document.getElementById('gig-desc').value.trim(),
      p_price: parseFloat(document.getElementById('gig-price').value),
      p_delivery_info: document.getElementById('gig-delivery').value.trim() || null
    });
    if (error) { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message, 'error'); return; }
    showToast('Gig posted! Fee: ' + data.listing_fee + ' USDT', 'success');
    closePostGigModal();
    document.getElementById('post-gig-form').reset();
    await refreshProfile();
    loadBrowseGigs();
  } catch (err) { showToast('Something went wrong', 'error'); }
  finally { btn.disabled = false; }
});

// Order Modal
function openOrderModal(gigId, title, price) {
  currentOrderGigId = gigId;
  const fee = round2(price * marketSettings.txnFeePercent / 100);
  const net = round2(price - fee);
  document.getElementById('order-modal-title').textContent = title;
  document.getElementById('order-modal-details').innerHTML =
    'Price: <strong>' + Number(price).toFixed(2) + ' USDT</strong><br>' +
    'Platform fee (' + marketSettings.txnFeePercent + '%): ' + fee.toFixed(2) + ' USDT<br>' +
    'Seller receives: ' + net.toFixed(2) + ' USDT<br>' +
    'Your balance: ' + Number(currentUserProfile.available_balance).toFixed(2) + ' USDT';
  document.getElementById('order-modal').classList.remove('hidden');
}
function closeOrderModal() { document.getElementById('order-modal').classList.add('hidden'); currentOrderGigId = null; }

async function confirmOrder() {
  if (!isOnline() || !currentOrderGigId) return;
  const btn = document.getElementById('order-confirm-btn');
  btn.disabled = true;
  try {
    const note = document.getElementById('order-buyer-note').value.trim();
    const { data, error } = await sb.rpc('place_order', { p_gig_id: currentOrderGigId, p_buyer_note: note || null });
    if (error) { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message, 'error'); return; }
    showToast(data.message, 'success');
    closeOrderModal();
    await refreshProfile();
    loadBrowseGigs();
  } catch (err) { showToast('Something went wrong', 'error'); }
  finally { btn.disabled = false; }
}

// Deliver Modal
function openDeliverModal(orderId) { currentDeliverOrderId = orderId; document.getElementById('deliver-note').value = ''; document.getElementById('deliver-modal').classList.remove('hidden'); }
function closeDeliverModal() { document.getElementById('deliver-modal').classList.add('hidden'); currentDeliverOrderId = null; }

async function confirmDelivery() {
  if (!isOnline() || !currentDeliverOrderId) return;
  const btn = document.getElementById('deliver-confirm-btn');
  const note = document.getElementById('deliver-note').value.trim();
  if (!note) { showToast('Please provide delivery details', 'error'); return; }
  btn.disabled = true;
  try {
    const { data, error } = await sb.rpc('mark_order_delivered', { p_order_id: currentDeliverOrderId, p_delivery_note: note });
    if (error) { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message, 'error'); return; }
    showToast(data.message, 'success');
    closeDeliverModal();
    loadMyOrders();
  } catch (err) { showToast('Something went wrong', 'error'); }
  finally { btn.disabled = false; }
}

// Confirm Receipt
function openConfirmDeliveryModal(orderId) {
  if (confirm('Confirm receipt and release payment to seller?')) releasePayment(orderId);
}
async function releasePayment(orderId) {
  if (!isOnline()) return;
  const { data, error } = await sb.rpc('confirm_delivery', { p_order_id: orderId });
  if (error || !data.success) { showToast(error?.message || data.message, 'error'); return; }
  showToast(data.message, 'success');
  await refreshProfile();
  loadMyOrders();
}

// Dispute Modal
function openDisputeModal(orderId) { currentDisputeOrderId = orderId; document.getElementById('dispute-note').value = ''; document.getElementById('dispute-modal').classList.remove('hidden'); }
function closeDisputeModal() { document.getElementById('dispute-modal').classList.add('hidden'); currentDisputeOrderId = null; }

async function confirmDispute() {
  if (!isOnline() || !currentDisputeOrderId) return;
  const btn = document.getElementById('dispute-confirm-btn');
  const note = document.getElementById('dispute-note').value.trim();
  if (note.length < 10) { showToast('Please provide more detail (min 10 chars)', 'error'); return; }
  btn.disabled = true;
  try {
    const { data, error } = await sb.rpc('raise_dispute', { p_order_id: currentDisputeOrderId, p_dispute_note: note });
    if (error) { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message, 'error'); return; }
    showToast(data.message, 'success');
    closeDisputeModal();
    loadMyOrders();
  } catch (err) { showToast('Something went wrong', 'error'); }
  finally { btn.disabled = false; }
}