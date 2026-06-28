let currentDrawData = null;
let drawCountdownInterval = null;
let isAnimating = false;
let drawRealtimeChannel = null;

async function loadLuckyDrawPage() {
  if (drawCountdownInterval) { clearInterval(drawCountdownInterval); drawCountdownInterval = null; }

  const { data: setting } = await sb.from('platform_settings').select('value').eq('key','lucky_draw_enabled').maybeSingle();
  if (setting?.value === 'false') {
    document.getElementById('draw-disabled-msg').classList.remove('hidden');
    document.getElementById('draw-main-content').classList.add('hidden');
    return;
  }
  document.getElementById('draw-disabled-msg').classList.add('hidden');
  document.getElementById('draw-main-content').classList.remove('hidden');

  await loadCurrentDraw();
  await loadPastDraws();
  setupDrawRealtime();
}

function setupDrawRealtime() {
  if (drawRealtimeChannel) sb.removeChannel(drawRealtimeChannel);
  drawRealtimeChannel = sb.channel('draw-page-updates')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lucky_draws' }, async (payload) => {
      const d = payload.new;
      if (d.status === 'completed' && !isAnimating) {
        await triggerDrawAnimation(d);
      } else {
        if (d.id === currentDrawData?.id) {
          document.getElementById('tickets-sold-count').textContent = d.tickets_sold || 0;
        }
      }
    }).subscribe();
}

async function loadCurrentDraw() {
  const { data, error } = await sb.from('lucky_draws').select('*')
    .in('status', ['open']).order('created_at', { ascending: false }).limit(1).maybeSingle();

  if (!data) {
    const { data: recentDone } = await sb.from('lucky_draws').select('*')
      .eq('status','completed').order('draw_at', { ascending: false }).limit(1).maybeSingle();
    if (recentDone) showCompletedDraw(recentDone);
    else {
      document.getElementById('no-draw-msg').classList.remove('hidden');
      document.getElementById('draw-active-section').classList.add('hidden');
      document.getElementById('draw-completed-section').classList.add('hidden');
    }
    return;
  }

  currentDrawData = data;
  document.getElementById('no-draw-msg').classList.add('hidden');
  document.getElementById('draw-active-section').classList.remove('hidden');
  document.getElementById('draw-completed-section').classList.add('hidden');
  document.getElementById('draw-title').textContent = data.title;
  document.getElementById('draw-jackpot').textContent = Number(data.jackpot_amount).toFixed(2) + ' USDT';
  document.getElementById('draw-ticket-price').textContent = Number(data.ticket_price).toFixed(2) + ' USDT';

  // Tickets sold
  const soldRow = document.getElementById('draw-tickets-sold-row');
  soldRow.classList.remove('hidden');
  document.getElementById('tickets-sold-count').textContent = data.tickets_sold || 0;
  const maxEl = document.getElementById('tickets-max-display');
  maxEl.textContent = data.max_tickets ? ' / ' + data.max_tickets : '';

  // My ticket
  const { data: myTicket } = await sb.from('lottery_tickets')
    .select('ticket_number').eq('draw_id', data.id).eq('user_id', currentUserProfile.id).maybeSingle();

  const buyBtn = document.getElementById('buy-ticket-btn');
  if (myTicket) {
    document.getElementById('my-ticket-info').classList.remove('hidden');
    document.getElementById('my-ticket-number').textContent = myTicket.ticket_number;
    buyBtn.disabled = true;
    buyBtn.querySelector('.btn-text').textContent = 'Already Purchased';
  } else {
    document.getElementById('my-ticket-info').classList.add('hidden');
    buyBtn.disabled = false;
    buyBtn.querySelector('.btn-text').textContent = 'Buy Ticket';
  }

  startDrawCountdown(data);
}

function startDrawCountdown(draw) {
  if (drawCountdownInterval) clearInterval(drawCountdownInterval);

  const saleEndSection = document.getElementById('draw-sale-section');
  const pendingSection = document.getElementById('draw-pending-section');
  const buyBtn = document.getElementById('buy-ticket-btn');
  const countdownEl = document.getElementById('draw-countdown');
  const pendingEl = document.getElementById('draw-pending-countdown');
  const countdownCard = saleEndSection.querySelector('.countdown-card');

  function update() {
    const now = new Date();
    const saleEnd = new Date(draw.ticket_sale_end);
    const drawAt = new Date(draw.draw_at);

    if (now < saleEnd) {
      saleEndSection.classList.remove('hidden');
      pendingSection.classList.add('hidden');
      if (countdownCard) countdownCard.classList.remove('hidden');
      countdownEl.textContent = formatCountdown(saleEnd - now);
      document.getElementById('countdown-label').textContent = 'Ticket Sales End In';
    } else if (now < drawAt) {
      // Sales ended phase
      // Sale section completely hide karo (button bhi)
      document.getElementById('draw-sale-section').classList.add('hidden');

      // Pending section show karo
      document.getElementById('draw-pending-section').classList.remove('hidden');
      document.getElementById('buy-ticket-btn').disabled = true;
      document.getElementById('buy-ticket-btn').querySelector('.btn-text').textContent = 'Sales Ended';

      const diff = drawAt - now;
      document.getElementById('draw-pending-countdown').textContent = formatCountdown(diff);
    } else {
      pendingEl.textContent = '00:00:00';
      if (drawCountdownInterval) clearInterval(drawCountdownInterval);
    }
  }

  update();
  drawCountdownInterval = setInterval(update, 1000);
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((diff => diff)(ms % 60000) / 1000);
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

// Fixed formatCountdown (inline issue above)
function formatCountdown(ms) {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

// Ticket confirm modal
function openTicketConfirmModal() {
  if (!currentDrawData) return;
  const fee = (currentDrawData.ticket_price).toFixed(2);
  document.getElementById('ticket-confirm-details').innerHTML =
    `<div style="background:var(--bg-secondary);border-radius:12px;padding:14px;margin:10px 0;">
      <div style="font-size:15px;font-weight:800;margin-bottom:8px;">${escapeHtml(currentDrawData.title)}</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:var(--text-secondary)">Ticket Price:</span><strong>${fee} USDT</strong></div>
      <div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary)">Your Balance:</span><strong>${Number(currentUserProfile.available_balance).toFixed(2)} USDT</strong></div>
    </div>
    <p style="font-size:12px;color:var(--text-secondary);text-align:center;">Ticket purchases are non-refundable. You can only buy 1 ticket per draw.</p>`;
  document.getElementById('ticket-confirm-modal').classList.remove('hidden');
}

function closeTicketModal() {
  document.getElementById('ticket-confirm-modal').classList.add('hidden');
}

async function confirmBuyTicket() {
  if (!isOnline() || !currentDrawData) return;
  const btn = document.getElementById('ticket-confirm-btn');
  btn.disabled = true; btn.textContent = 'Processing...';

  try {
    const { data, error } = await sb.rpc('buy_draw_ticket', { p_draw_id: currentDrawData.id });
    if (error) { showToast(error.message, 'error'); return; }
    if (!data.success) { showToast(data.message, 'error'); return; }

    showToast('🎫 Ticket #' + data.ticket_number + ' purchased!', 'success');
    closeTicketModal();

    // Update UI
    document.getElementById('my-ticket-info').classList.remove('hidden');
    document.getElementById('my-ticket-number').textContent = data.ticket_number;
    document.getElementById('buy-ticket-btn').disabled = true;
    document.getElementById('buy-ticket-btn').querySelector('.btn-text').textContent = 'Already Purchased';
    document.getElementById('tickets-sold-count').textContent = data.tickets_sold || data.ticket_number;
    currentDrawData.tickets_sold = data.tickets_sold || data.ticket_number;

    await refreshProfile();
  } catch (err) { showToast('Something went wrong', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Buy Ticket'; }
}

async function loadPastDraws() {
  const container = document.getElementById('past-draws-list');
  const { data, error } = await sb.from('lucky_draws').select('*')
    .eq('status','completed').order('draw_at', { ascending: false }).limit(5);
  if (!data || data.length === 0) { container.innerHTML = '<p class="placeholder-text">No past draws yet</p>'; return; }

container.innerHTML = data.map(d => {
    const date = new Date(d.draw_at);
    const isCancelled = d.winner_username === 'CANCELLED';
    return `<div class="mail-card">
      <div class="history-row">
        <span class="mail-subject">${escapeHtml(d.title)}</span>
        <span class="history-amount" style="color:${isCancelled ? 'var(--error)' : 'var(--accent)'}">
          ${isCancelled ? 'CANCELLED' : Number(d.jackpot_amount).toFixed(2) + ' USDT'}
        </span>
      </div>
      <div class="mail-meta">
        ${isCancelled
          ? '🚫 Cancelled — all tickets refunded'
          : '🏆 ' + escapeHtml(d.winner_username||'—') + ' | Ticket #' + (d.winner_ticket_number||'—') + ' | ' + (d.tickets_sold||0) + ' participants'}
      </div>
      <div class="mail-meta">${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
    </div>`;
  }).join('');
}

function showCompletedDraw(draw) {
  document.getElementById('draw-active-section').classList.add('hidden');
  document.getElementById('no-draw-msg').classList.add('hidden');

  const section = document.getElementById('draw-completed-section');
  section.classList.remove('hidden');

  if (draw.winner_username === 'CANCELLED' || draw.winner_uid === 'CANCELLED') {
    section.innerHTML = `
      <div class="cancelled-announcement">
        <div class="cancelled-icon">🚫</div>
        <div class="cancelled-title">DRAW CANCELLED</div>
        <div class="cancelled-sub">${escapeHtml(draw.title)}</div>
        <div class="cancelled-refund-badge">✓ All tickets have been refunded</div>
      </div>`;
    return;
  }

  section.innerHTML = `
    <div class="winner-announcement">
      <div class="winner-crown">🥳</div>
      <div class="winner-title">WINNER</div>
      <div class="winner-card">
        <div class="winner-avatar">
          <img src="winner.png" class="winner-avatar-img" alt="Winner"
            onerror="this.style.display='none';this.parentElement.textContent='${(draw.winner_username||'?').charAt(0).toUpperCase()}'">
        </div>
        <div class="winner-name">${escapeHtml(draw.winner_username || 'Unknown')}</div>
        <div class="winner-uid">${draw.winner_uid || ''}</div>
        <div class="winner-ticket">🎫 Ticket #${draw.winner_ticket_number || '—'}</div>
        <div class="winner-prize">💰 ${Number(draw.jackpot_amount).toFixed(2)} USDT 💰</div>
      </div>
    </div>`;
}

async function triggerDrawAnimation(drawData) {
  if (drawData.winner_username === 'CANCELLED' || drawData.winner_uid === 'CANCELLED') {
    isAnimating = false;
    loadLuckyDrawPage();
    return;
  }

  // Sirf Draw page par show karo
  const drawPage = document.getElementById('page-luckydraw');
  const isOnDrawPage = drawPage && !drawPage.classList.contains('hidden');

  isAnimating = true;
  if (drawCountdownInterval) { clearInterval(drawCountdownInterval); drawCountdownInterval = null; }

  const { data: participants, error } = await sb.rpc('get_draw_participants', { p_draw_id: drawData.id });
  if (error || !participants || participants.length === 0) {
    isAnimating = false;
    if (isOnDrawPage) loadLuckyDrawPage();
    return;
  }

  if (!isOnDrawPage) {
    // Draw page par nahi — sirf notification dikhao, animation nahi
    isAnimating = false;
    showToast('🏆 Lucky Draw complete! Winner: ' + (drawData.winner_username || 'Unknown'), 'success');
    return;
  }

  const winnerIndex = participants.findIndex(function(p) { return p.uid === drawData.winner_uid; });
  await runDrawAnimation(participants, winnerIndex >= 0 ? winnerIndex : 0, drawData);
  isAnimating = false;
  loadLuckyDrawPage();
}

async function handleDrawRealtime(newDraw) {
  if (newDraw.status === 'completed' && !isAnimating) {
    await triggerDrawAnimation(newDraw);
  } else if (newDraw.id === currentDrawData?.id) {
    document.getElementById('tickets-sold-count').textContent = newDraw.tickets_sold || 0;
    currentDrawData.tickets_sold = newDraw.tickets_sold;
  }
}

async function runDrawAnimation(participants, winnerIndex, drawData) {
  return new Promise(resolve => {
    const overlay = document.getElementById('draw-animation-overlay');
    const drum = document.getElementById('draw-drum');
    overlay.classList.remove('hidden');

    const CARD_H = 84;
    const n = participants.length;
    const COPIES = 7;

    // Build display: 7 copies, winner lands in last copy
    let displayList = [];
    for (let c = 0; c < COPIES; c++) participants.forEach(p => displayList.push(p));

    drum.innerHTML = displayList.map((p, globalIdx) => {
      const isTarget = globalIdx === (COPIES - 1) * n + winnerIndex;
      return `<div class="draw-card${isTarget ? ' draw-target-card' : ''}" data-win="${isTarget}">
        <div class="draw-avatar-small">${p.username.charAt(0).toUpperCase()}</div>
        <div class="draw-card-info">
          <div class="draw-card-name">${escapeHtml(p.username)}</div>
          <div class="draw-card-uid">${p.uid}</div>
        </div>
        <div class="draw-ticket-num">#${p.ticket_number}</div>
      </div>`;
    }).join('');

    // Target scroll: winner card centered in drum
    const winnerGlobalIndex = (COPIES - 1) * n + winnerIndex;
    const drumH = 252;
    const targetScroll = winnerGlobalIndex * CARD_H - (drumH / 2 - CARD_H / 2);

    // Suspense messages
    const msgs = ['🎰 Spinning tickets...', '⚡ Going fast!', '🔥 Slowing down...', '💫 Almost there...', '🎯 Final selection!'];
    let mIdx = 0;
    const suspenseEl = document.getElementById('draw-suspense-text');
    if (suspenseEl) suspenseEl.textContent = msgs[0];
    const msgTimer = setInterval(() => {
      mIdx = Math.min(mIdx + 1, msgs.length - 1);
      if (suspenseEl) suspenseEl.textContent = msgs[mIdx];
    }, 1100);

    // Smooth animation with easeOutQuint
    let startTime = null;
    const DURATION = 6000;

    function easeOutQuint(t) { return 1 - Math.pow(1 - t, 5); }

    function animate(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const t = Math.min(elapsed / DURATION, 1);
      drum.scrollTop = easeOutQuint(t) * targetScroll;

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        clearInterval(msgTimer);
        drum.scrollTop = targetScroll;
        if (suspenseEl) suspenseEl.textContent = '🎉 WINNER!';

        // Glow winner
        const winEl = drum.querySelector('[data-win="true"]');
        if (winEl) winEl.classList.add('draw-winner-glow');

        setTimeout(() => {
          overlay.classList.add('hidden');
          showWinnerModal(drawData);
          resolve();
        }, 2000);
      }
    }

    requestAnimationFrame(animate);
  });
}

function showWinnerModal(draw) {
  const existing = document.getElementById('winner-modal');
  if (existing) existing.remove();

  const isSelf = draw.winner_id === currentUserProfile.id;
  const modal = document.createElement('div');
  modal.id = 'winner-modal';
  modal.className = 'winner-modal';
  modal.innerHTML = `
    <div class="winner-modal-inner">
      <div style="font-size:48px;animation:float 1s infinite;">🏆</div>
      <h1 class="winner-congrats">🎉 WINNER! 🎉</h1>
       <div class="winner-avatar-large" style="overflow:hidden;padding:0;">
        <img src="winner.png" class="winner-avatar-img-lg" alt="Winner"
          onerror="this.parentElement.style.fontSize='32px';this.parentElement.style.display='flex';this.parentElement.style.alignItems='center';this.parentElement.style.justifyContent='center';this.outerHTML='${(draw.winner_username||'?').charAt(0).toUpperCase()}'">
      </div>
      <div class="winner-modal-name">${escapeHtml(draw.winner_username||'Winner')}</div>
      <div class="winner-modal-uid">${draw.winner_uid||''} | Ticket #${draw.winner_ticket_number||''}</div>
      <div class="winner-modal-prize">${Number(draw.jackpot_amount).toFixed(2)} USDT</div>
      <p style="font-size:12px;color:var(--text-secondary);margin:6px 0 16px;">Has won the "${escapeHtml(draw.title||'')}!"</p>
      ${isSelf ? '<div class="winner-self-msg">🎊 That\'s YOU! Check your balance!</div>' : ''}
      <button class="btn-primary" onclick="document.getElementById(\'winner-modal\').remove()">🎊 Close</button>
    </div>`;
  document.body.appendChild(modal);
  launchConfetti();
  setTimeout(() => { if (modal.parentNode) modal.remove(); }, 15000);
}

function launchConfetti() {
  const colors = ['#ff7a00','#ffb800','#22c55e','#3b82f6','#ec4899','#f43f5e','#a855f7','#ffd700'];
  for (let i = 0; i < 100; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const size = 6 + Math.random() * 12;
    p.style.cssText = `left:${Math.random()*100}vw;background:${colors[Math.floor(Math.random()*colors.length)]};width:${size}px;height:${size}px;animation-delay:${Math.random()*2}s;animation-duration:${3+Math.random()*2}s;border-radius:${Math.random()>.5?'50%':'3px'};`;
    document.body.appendChild(p);
    setTimeout(() => { if (p.parentNode) p.remove(); }, 6000);
  }
}