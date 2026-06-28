// ===== SUBMIT SUPPORT TICKET =====
document.getElementById('ticket-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOnline()) return;

  const btn     = document.getElementById('ticket-submit-btn');
  const subject = document.getElementById('ticket-subject').value.trim();
  const message = document.getElementById('ticket-message').value.trim();

  if (!subject || !message) {
    showToast('Please fill all fields', 'error'); return;
  }

  btn.classList.add('loading'); btn.disabled = true;

  try {
    const { error } = await sb.from('support_tickets').insert({
      user_id: currentUserProfile.id,
      subject,
      message
    });

    if (error) { showToast(error.message, 'error'); return; }

    showToast('Ticket submitted successfully', 'success');
    document.getElementById('ticket-form').reset();
    loadMyTickets();

  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

// ===== LOAD MY TICKETS =====
async function loadMyTickets() {
  const container = document.getElementById('my-tickets-list');
  if (!container) return;

  try {
    // Load support links
    const { data: settings } = await sb
      .from('platform_settings')
      .select('key, value')
      .in('key', ['support_telegram', 'support_whatsapp', 'support_email']);

    if (settings) {
      const map = {};
      settings.forEach(r => map[r.key] = r.value);

      const telegramEl  = document.getElementById('support-telegram');
      const whatsappEl  = document.getElementById('support-whatsapp');
      const emailEl     = document.getElementById('support-email');

      if (telegramEl && map.support_telegram) {
        telegramEl.href = map.support_telegram;
      }
      if (whatsappEl && map.support_whatsapp) {
        whatsappEl.href = map.support_whatsapp;
      }
      if (emailEl && map.support_email) {
        emailEl.href = 'mailto:' + map.support_email;
      }
    }

    // Load tickets
    const { data, error } = await sb
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load tickets', 'error'); return; }

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No tickets yet</p>';
      return;
    }

    container.innerHTML = data.map(t => {
      const date      = new Date(t.created_at);
      const statusCls = t.status === 'closed' ? 'approved' : 'pending';
      return `<div class="mail-card">
        <div class="history-row">
          <span class="mail-subject">${escapeHtml(t.subject)}</span>
          <span class="status-badge status-${statusCls}">${t.status}</span>
        </div>
        <div class="mail-message">${escapeHtml(t.message)}</div>
        ${t.admin_reply
          ? `<div class="ticket-reply"><strong>Support:</strong> ${escapeHtml(t.admin_reply)}</div>`
          : ''}
        <div class="mail-meta">
          ${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>`;
    }).join('');

  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}