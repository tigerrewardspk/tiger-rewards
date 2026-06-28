let privateMailLoaded = false;
let globalMailLoaded = false;

// ===== LOAD UNREAD COUNTS =====
async function loadUnreadCounts() {
  try {
    const { data, error } = await sb.rpc('get_unread_counts');
    if (error || !data) return;

    const total = (data.private || 0) + (data.global || 0);
    const headerBadge = document.getElementById('mailbox-badge');
    const privateBadge = document.getElementById('private-badge');
    const globalBadge = document.getElementById('global-badge');

    if (headerBadge) {
      if (total > 0) {
        headerBadge.textContent = total > 99 ? '99+' : total;
        headerBadge.classList.remove('hidden');
      } else {
        headerBadge.classList.add('hidden');
      }
    }

    if (privateBadge) {
      if (data.private > 0) {
        privateBadge.textContent = data.private;
        privateBadge.classList.remove('hidden');
      } else {
        privateBadge.classList.add('hidden');
      }
    }

    if (globalBadge) {
      if (data.global > 0) {
        globalBadge.textContent = data.global;
        globalBadge.classList.remove('hidden');
      } else {
        globalBadge.classList.add('hidden');
      }
    }
  } catch (err) {
    // Silent fail
  }
}

// ===== SWITCH MAIL TAB =====
function switchMailTab(tab) {
  document.querySelectorAll('#page-mailbox .tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`#page-mailbox .tab-btn[data-tab="${tab}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.getElementById('private-mail-list').classList.toggle('hidden', tab !== 'private');
  document.getElementById('global-mail-list').classList.toggle('hidden', tab !== 'global');

  if (tab === 'private' && !privateMailLoaded) loadPrivateMail();
  if (tab === 'global' && !globalMailLoaded) loadGlobalMail();
}

// ===== LOAD PRIVATE MAIL =====
async function loadPrivateMail() {
  const container = document.getElementById('private-mail-list');
  container.innerHTML = '<p class="placeholder-text">Loading...</p>';

  try {
    const { data, error } = await sb
      .from('private_mail')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load mail', 'error'); return; }

    privateMailLoaded = true;

    if (!data || data.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No mail yet</p>';
      return;
    }

    // Mark unread as read
    const unreadIds = data.filter(m => !m.is_read).map(m => m.id);
    if (unreadIds.length > 0) {
      await Promise.all(unreadIds.map(id => sb.rpc('mark_private_mail_read', { p_mail_id: id })));
      loadUnreadCounts();
    }

    container.innerHTML = data.map(mail => {
      const date = new Date(mail.created_at);
      const wasUnread = unreadIds.includes(mail.id);
      return `<div class="mail-card ${wasUnread ? 'mail-new' : ''}">
        ${mail.subject ? `<h3 class="mail-subject">${escapeHtml(mail.subject)}</h3>` : ''}
        <div class="mail-message">${sanitizeHtml(mail.message)}</div>
        <div class="mail-meta">${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>`;
    }).join('');

  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

// ===== LOAD GLOBAL MAIL =====
async function loadGlobalMail() {
  const container = document.getElementById('global-mail-list');
  container.innerHTML = '<p class="placeholder-text">Loading...</p>';

  try {
    const { data: mails, error } = await sb
      .from('global_mail')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load mail', 'error'); return; }

    globalMailLoaded = true;

    if (!mails || mails.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No mail yet</p>';
      return;
    }

    const { data: reads } = await sb
      .from('global_mail_reads')
      .select('mail_id')
      .eq('user_id', currentUserProfile.id);

    const readSet = new Set((reads || []).map(r => r.mail_id));
    const unreadMails = mails.filter(m => !readSet.has(m.id));

    // Mark unread as read
    if (unreadMails.length > 0) {
      await Promise.all(unreadMails.map(m => sb.rpc('mark_global_mail_read', { p_mail_id: m.id })));
      loadUnreadCounts();
    }

    container.innerHTML = mails.map(mail => {
      const date = new Date(mail.created_at);
      const wasUnread = !readSet.has(mail.id);
      return `<div class="mail-card ${wasUnread ? 'mail-new' : ''}">
        ${mail.subject ? `<h3 class="mail-subject">${escapeHtml(mail.subject)}</h3>` : ''}
        <div class="mail-message">${sanitizeHtml(mail.message)}</div>
        <div class="mail-meta">${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>`;
    }).join('');

  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

// ===== RESET FLAGS (called when mailbox re-opened) =====
function resetMailboxFlags() {
  privateMailLoaded = false;
  globalMailLoaded = false;
}