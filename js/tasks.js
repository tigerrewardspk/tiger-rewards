let currentTaskId = null;
let tasksCache = {};
let flashTimerInterval = null;

// ===== LOAD TASKS PAGE =====
async function loadTasksPage() {
  const container = document.getElementById('tasks-list');
  if (!container) return;
  container.innerHTML = '<p class="placeholder-text">Loading...</p>';

  if (flashTimerInterval) {
    clearInterval(flashTimerInterval);
    flashTimerInterval = null;
  }

  try {
    const { data: tasks, error } = await sb
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('is_flash', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) { showToast('Failed to load tasks', 'error'); return; }

    const now = new Date();
    const activeTasks = (tasks || []).filter(t => !t.expires_at || new Date(t.expires_at) > now);

    if (activeTasks.length === 0) {
      container.innerHTML = '<p class="placeholder-text">No tasks available yet</p>';
      return;
    }

    // Cache tasks for modal use
    tasksCache = {};
    activeTasks.forEach(t => tasksCache[t.id] = t);

    // Get user's existing submissions
    const { data: mySubmissions } = await sb
      .from('task_submissions')
      .select('task_id, status')
      .eq('user_id', currentUserProfile.id);

    const submittedMap = {};
    if (mySubmissions) mySubmissions.forEach(s => submittedMap[s.task_id] = s.status);

    container.innerHTML = activeTasks.map(t => {
      const status = submittedMap[t.id];
      let actionBtn = '';

      if (status === 'approved') {
        actionBtn = `<span class="status-badge status-approved">Approved</span>`;
      } else if (status === 'pending') {
        actionBtn = `<span class="status-badge status-pending">Under Review</span>`;
      } else if (status === 'rejected') {
        actionBtn = `<button class="btn-approve" onclick="openTaskModal('${t.id}')">Resubmit</button>`;
      } else {
        actionBtn = `<button class="btn-approve" onclick="openTaskModal('${t.id}')">Submit Proof</button>`;
      }

      const flashBadge = t.is_flash ? `<span class="flash-badge">⚡ FLASH</span> ` : '';
      const timerId    = (t.is_flash && t.expires_at) ? `flash-timer-${t.id}` : '';
      const timerHtml  = timerId ? `<div class="flash-timer" id="${timerId}">Calculating...</div>` : '';

      return `<div class="mail-card ${t.is_flash ? 'flash-task-card' : ''}">
        <div class="history-row">
          <span class="mail-subject">${flashBadge}${escapeHtml(t.title)}</span>
          <span class="history-amount">+${Number(t.reward).toFixed(2)} USDT</span>
        </div>
        <div class="mail-message">${escapeHtml(t.description)}</div>
        ${t.proof_instruction ? `<div class="task-proof-inst">${escapeHtml(t.proof_instruction)}</div>` : ''}
        ${timerHtml}
        <div class="admin-action-row">${actionBtn}</div>
      </div>`;
    }).join('');

    // Start flash task countdown timers
    const flashTasks = activeTasks.filter(t => t.is_flash && t.expires_at);
    if (flashTasks.length > 0) {
      flashTimerInterval = setInterval(() => {
        const now2 = new Date();
        let allExpired = true;

        flashTasks.forEach(t => {
          const el = document.getElementById('flash-timer-' + t.id);
          if (!el) return;

          const diff = new Date(t.expires_at) - now2;
          if (diff <= 0) {
            el.textContent = 'EXPIRED';
            el.style.color = 'var(--error)';
          } else {
            allExpired = false;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            el.textContent = `⏰ Expires in: ${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
          }
        });

        if (allExpired) {
          clearInterval(flashTimerInterval);
          flashTimerInterval = null;
        }
      }, 1000);
    }

  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

// ===== OPEN TASK MODAL =====
function openTaskModal(id) {
  const t = tasksCache[id];
  if (!t) return;

  currentTaskId = id;
  document.getElementById('modal-task-title').textContent    = t.title;
  document.getElementById('modal-task-desc').textContent     = t.description;
  document.getElementById('modal-task-proof-inst').textContent = t.proof_instruction || '';
  document.getElementById('modal-proof-url').value           = '';
  document.getElementById('modal-proof-text').value          = '';
  document.getElementById('task-submit-modal').classList.remove('hidden');
}

// ===== CLOSE TASK MODAL =====
function closeTaskModal() {
  document.getElementById('task-submit-modal').classList.add('hidden');
  currentTaskId = null;
}

// ===== SUBMIT TASK =====
async function submitTask() {
  if (!isOnline() || !currentTaskId) return;

  const proofUrl  = document.getElementById('modal-proof-url').value.trim();
  const proofText = document.getElementById('modal-proof-text').value.trim();

  if (!proofUrl && !proofText) {
    showToast('Please provide at least one type of proof', 'error');
    return;
  }

  const btn = document.getElementById('modal-submit-btn');
  btn.disabled = true;

  try {
    const { error } = await sb
      .from('task_submissions')
      .upsert({
        task_id:    currentTaskId,
        user_id:    currentUserProfile.id,
        proof_url:  proofUrl  || null,
        proof_text: proofText || null,
        status:       'pending',
        admin_note:   null,
        reviewed_at:  null
      }, { onConflict: 'task_id,user_id' });

    if (error) { showToast(error.message, 'error'); return; }

    showToast('Proof submitted! Under review.', 'success');
    closeTaskModal();
    loadTasksPage();
  } catch (err) {
    showToast('Something went wrong', 'error');
  } finally {
    btn.disabled = false;
  }
}
