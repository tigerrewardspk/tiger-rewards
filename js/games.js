// ===== GAME STATE =====
let gameConfig          = {};
let memoryState         = null;
let memoryTimerInterval = null;
let huntSessionId       = null;
let huntConfig          = {};
let puzzleTimerInterval = null;
let currentGameTab      = 'puzzle';

// ===== LOAD GAME PAGE =====
async function loadGamePage() {
  try {
    const { data: setting } = await sb
      .from('platform_settings')
      .select('value')
      .eq('key', 'games_enabled')
      .maybeSingle();

    if (setting?.value === 'false') {
      document.getElementById('games-disabled-msg').classList.remove('hidden');
      document.getElementById('games-content').classList.add('hidden');
      return;
    }
  } catch (err) {
    // Continue even if settings fail
  }

  document.getElementById('games-disabled-msg').classList.add('hidden');
  document.getElementById('games-content').classList.remove('hidden');

  await loadGameConfigs();
  switchGameTab(currentGameTab);
}

// ===== LOAD GAME CONFIGS =====
async function loadGameConfigs() {
  try {
    const keys = [
      'game_memory_entry_fee', 'game_memory_daily_free',
      'game_memory_reward_easy', 'game_memory_reward_medium', 'game_memory_reward_hard',
      'game_memory_time_easy', 'game_memory_time_medium', 'game_memory_time_hard',
      'game_hunt_entry_fee', 'game_hunt_win_reward', 'game_hunt_daily_free',
      'game_hunt_max_guesses', 'game_hunt_range',
      'game_puzzle_entry_fee', 'game_puzzle_min_checkins',
      'game_rhythm_entry_fee','game_rhythm_daily_free',
      'game_rhythm_reward_easy','game_rhythm_reward_medium','game_rhythm_reward_hard',
      'game_rhythm_min_accuracy_easy','game_rhythm_min_accuracy_medium','game_rhythm_min_accuracy_hard'
    ];
    const { data } = await sb
      .from('platform_settings')
      .select('key, value')
      .in('key', keys);

    if (data) data.forEach(r => gameConfig[r.key] = r.value);

    // Memory rewards display
    const easyEl   = document.getElementById('memory-reward-easy');
    const mediumEl = document.getElementById('memory-reward-medium');
    const hardEl   = document.getElementById('memory-reward-hard');

    if (easyEl)   easyEl.textContent   = '+' + (gameConfig.game_memory_reward_easy   || '0.08') + ' USDT | ' + (gameConfig.game_memory_time_easy   || '60') + 's';
    if (mediumEl) mediumEl.textContent = '+' + (gameConfig.game_memory_reward_medium || '0.13') + ' USDT | ' + (gameConfig.game_memory_time_medium || '50') + 's';
    if (hardEl)   hardEl.textContent   = '+' + (gameConfig.game_memory_reward_hard   || '0.22') + ' USDT | ' + (gameConfig.game_memory_time_hard   || '45') + 's';

    // Hunt display
    const huntGuessesEl = document.getElementById('hunt-max-guesses-display');
    const huntRangeEl   = document.getElementById('hunt-range-display');
    if (huntGuessesEl) huntGuessesEl.textContent = gameConfig.game_hunt_max_guesses || '10';
    if (huntRangeEl)   huntRangeEl.textContent   = gameConfig.game_hunt_range       || '100';

    // Puzzle fee display
    const puzzleFee   = gameConfig.game_puzzle_entry_fee || '0';
    const puzzleFeeEl = document.getElementById('puzzle-entry-fee-display');
    if (puzzleFeeEl) {
      puzzleFeeEl.textContent = Number(puzzleFee) > 0
        ? 'Entry fee: ' + puzzleFee + ' USDT per attempt'
        : 'Free to attempt';
      puzzleFeeEl.style.color = Number(puzzleFee) > 0 ? 'var(--warning)' : 'var(--success)';

     document.getElementById('rhythm-reward-easy').textContent =
    '+' + (gameConfig.game_rhythm_reward_easy || '0.08') + ' USDT';
  document.getElementById('rhythm-reward-medium').textContent =
    '+' + (gameConfig.game_rhythm_reward_medium || '0.15') + ' USDT';
  document.getElementById('rhythm-reward-hard').textContent =
    '+' + (gameConfig.game_rhythm_reward_hard || '0.25') + ' USDT';
}

  } catch (err) {
    // Silent fail — use defaults
  }
}

// ===== SWITCH GAME TAB =====
function switchGameTab(tab) {
  currentGameTab = tab;
  document.querySelectorAll('#page-games .tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`#page-games .tab-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');

  document.getElementById('game-puzzle-tab').classList.toggle('hidden', tab !== 'puzzle');
  document.getElementById('game-memory-tab').classList.toggle('hidden', tab !== 'memory');
  document.getElementById('game-hunt-tab').classList.toggle('hidden', tab !== 'hunt');
  document.getElementById('game-rhythm-tab').classList.toggle('hidden', tab !== 'rhythm');

  if (tab === 'puzzle') loadPuzzleGame();
  if (tab === 'memory') loadMemoryLobby();
  if (tab === 'hunt') loadHuntLobby();
  if (tab === 'rhythm') loadRhythmLobby();
}

// ===== GAME CONFIRM MODAL =====
function showGameConfirmModal(title, details, onConfirm) {
  document.getElementById('game-confirm-title').textContent   = title;
  document.getElementById('game-confirm-details').innerHTML   = details;
  document.getElementById('game-confirm-btn').onclick = () => {
    closeGameConfirmModal();
    onConfirm();
  };
  document.getElementById('game-confirm-modal').classList.remove('hidden');
}

function closeGameConfirmModal() {
  document.getElementById('game-confirm-modal').classList.add('hidden');
}

// =====================
// ===== BRAIN PUZZLE =====
// =====================
async function loadPuzzleGame() {
  const loadingEl = document.getElementById('puzzle-loading');
  const contentEl = document.getElementById('puzzle-content');
  if (loadingEl) loadingEl.classList.remove('hidden');
  if (contentEl) contentEl.classList.add('hidden');

  try {
    const { data: puzzle, error } = await sb
      .from('brain_puzzles')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');

    const noPuzzleEl = document.getElementById('puzzle-no-puzzle');
    const activeEl   = document.getElementById('puzzle-active');

    if (!puzzle || error) {
      if (noPuzzleEl) noPuzzleEl.classList.remove('hidden');
      if (activeEl)   activeEl.classList.add('hidden');
      return;
    }

    if (noPuzzleEl) noPuzzleEl.classList.add('hidden');
    if (activeEl)   activeEl.classList.remove('hidden');

    document.getElementById('puzzle-question').textContent = puzzle.question;
    document.getElementById('puzzle-hint').textContent     = puzzle.hint || 'No hint available';

    const remaining  = puzzle.max_winners - puzzle.winners_count;
    const winnersEl  = document.getElementById('puzzle-winners-left');
    if (winnersEl) {
      winnersEl.textContent      = remaining > 0 ? remaining + ' reward spots left' : 'All spots filled';
      winnersEl.style.background = remaining > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
      winnersEl.style.color      = remaining > 0 ? 'var(--success)'        : 'var(--error)';
    }

    // Check if already submitted
    const { data: mySubmission } = await sb
      .from('puzzle_submissions')
      .select('is_correct, reward_earned')
      .eq('puzzle_id', puzzle.id)
      .eq('user_id', currentUserProfile.id)
      .maybeSingle();

    const answerSection = document.getElementById('puzzle-answer-section');
    const resultEl      = document.getElementById('puzzle-result');

    if (mySubmission) {
      if (answerSection) answerSection.classList.add('hidden');
      showPuzzleResultInline(mySubmission.is_correct, mySubmission.reward_earned, puzzle.answer_display);
      return;
    }

    if (answerSection) answerSection.classList.remove('hidden');
    if (resultEl)      resultEl.classList.add('hidden');

    // Update submit btn text
    const entryFee  = Number(gameConfig.game_puzzle_entry_fee || 0);
    const submitBtn = document.getElementById('puzzle-submit-btn');
    if (submitBtn) {
      const textEl = submitBtn.querySelector('.btn-text');
      if (textEl) textEl.textContent = entryFee > 0
        ? 'Submit Answer (' + entryFee + ' USDT)'
        : 'Submit Answer';
    }

    // Reset hint
    const hintBtn = document.getElementById('puzzle-hint-btn');
    const hintEl  = document.getElementById('puzzle-hint');
    if (hintBtn) hintBtn.classList.remove('hidden');
    if (hintEl)  hintEl.classList.add('hidden');

    // Timer
    if (puzzleTimerInterval) clearInterval(puzzleTimerInterval);
    const timerEl   = document.getElementById('puzzle-timer');
    const expiresAt = new Date(puzzle.expires_at);

    function updateTimer() {
      const diff = expiresAt - new Date();
      if (!timerEl) { clearInterval(puzzleTimerInterval); return; }
      if (diff <= 0) {
        timerEl.textContent = '⏰ Expired';
        clearInterval(puzzleTimerInterval);
        if (answerSection) answerSection.classList.add('hidden');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      timerEl.textContent = '⏰ ' + (h > 0 ? h + 'h ' : '') + m + 'm ' + s + 's';
    }
    updateTimer();
    puzzleTimerInterval = setInterval(updateTimer, 1000);

    window._currentPuzzleId = puzzle.id;

  } catch (err) {
    if (document.getElementById('puzzle-loading')) {
      document.getElementById('puzzle-loading').classList.add('hidden');
    }
    showToast('Failed to load puzzle', 'error');
  }
}

function showPuzzleHint() {
  document.getElementById('puzzle-hint').classList.remove('hidden');
  document.getElementById('puzzle-hint-btn').classList.add('hidden');
}

function showPuzzleResultInline(isCorrect, reward, answerDisplay) {
  const el = document.getElementById('puzzle-result');
  if (!el) return;
  el.classList.remove('hidden');

  if (isCorrect && Number(reward) > 0) {
    el.innerHTML = `<div class="game-result-inline success">🎉 Correct! +${Number(reward).toFixed(2)} USDT credited!</div>`;
  } else if (isCorrect) {
    el.innerHTML = `<div class="game-result-inline warning">✓ Correct but all reward spots were taken.</div>`;
  } else {
    el.innerHTML = `<div class="game-result-inline error">❌ Wrong answer.${answerDisplay
      ? '<br><small style="color:var(--text-secondary)">Answer: ' + escapeHtml(answerDisplay) + '</small>'
      : ''}</div>`;
  }
}

async function submitPuzzleAnswer() {
  if (!isOnline() || !window._currentPuzzleId) return;

  const answerInput = document.getElementById('puzzle-answer-input');
  const answer      = answerInput ? answerInput.value.trim() : '';
  if (!answer) { showToast('Please enter your answer', 'error'); return; }

  const entryFee = Number(gameConfig.game_puzzle_entry_fee || 0);

  const doSubmit = async () => {
    const btn = document.getElementById('puzzle-submit-btn');
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }

    try {
      const { data, error } = await sb.rpc('submit_puzzle_answer', {
        p_puzzle_id: window._currentPuzzleId,
        p_answer:    answer
      });

      if (error) { showToast(error.message, 'error'); return; }
      if (!data.success) { showToast(data.message, 'error'); return; }

      showToast(data.message, data.correct ? 'success' : 'error');
      const answerSection = document.getElementById('puzzle-answer-section');
      if (answerSection) answerSection.classList.add('hidden');
      showPuzzleResultInline(data.correct, data.reward, null);

      if (data.reward > 0 || data.entry_fee > 0) await refreshProfile();

    } catch (err) {
      showToast('Something went wrong', 'error');
    } finally {
      const btn = document.getElementById('puzzle-submit-btn');
      if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
    }
  };

  if (entryFee > 0) {
    showGameConfirmModal(
      '🧩 Confirm Puzzle Attempt',
      `<div style="background:var(--bg-secondary);border-radius:12px;padding:14px;margin:10px 0;text-align:left;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="color:var(--text-secondary)">Entry Fee:</span>
          <strong style="color:var(--warning)">${entryFee} USDT</strong>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:var(--text-secondary)">Win Reward:</span>
          <strong style="color:var(--success)">${gameConfig.game_puzzle_reward || '0.10'} USDT</strong>
        </div>
      </div>
      <p style="font-size:11px;color:var(--text-secondary);text-align:center;">
        Fee is deducted regardless of correct/wrong answer.
      </p>`,
      doSubmit
    );
  } else {
    await doSubmit();
  }
}

// =====================
// ===== MEMORY CARD =====
// =====================
const MEMORY_EMOJIS = ['🐯','🦁','🐘','🦊','🐸','🦋','🐬','🦄','🐼','🦒','🐙','🦅','🐺','🦜','🐢','🦞','🐠','🦭','🐝','🦩'];
const MEMORY_PAIRS  = { easy: 6, medium: 10, hard: 15 };

async function loadMemoryLobby() {
  document.getElementById('memory-lobby').classList.remove('hidden');
  document.getElementById('memory-game').classList.add('hidden');

  if (memoryTimerInterval) {
    clearInterval(memoryTimerInterval);
    memoryTimerInterval = null;
  }

  try {
    const { data: playsData } = await sb.rpc('get_my_game_plays_today', { p_game_type: 'memory' });
    const played    = playsData || 0;
    const freeTotal = parseInt(gameConfig.game_memory_daily_free || 2);
    const freeLeft  = Math.max(0, freeTotal - played);
    const fee       = gameConfig.game_memory_entry_fee || '0.05';

    const infoEl = document.getElementById('memory-plays-info');
    if (infoEl) {
      infoEl.innerHTML = freeLeft > 0
        ? `<span style="color:var(--success)">✓ ${freeLeft} free play${freeLeft > 1 ? 's' : ''} remaining today</span>`
        : `<span style="color:var(--text-secondary)">Free plays used — Entry fee: ${fee} USDT per game</span>`;
    }
  } catch (err) {
    // Silent fail
  }
}

async function startMemoryGame(difficulty) {
  if (!isOnline()) return;

  try {
    const { data: playsData } = await sb.rpc('get_my_game_plays_today', { p_game_type: 'memory' });
    const played    = playsData || 0;
    const freeTotal = parseInt(gameConfig.game_memory_daily_free || 2);
    const needsFee  = played >= freeTotal;
    const fee       = gameConfig.game_memory_entry_fee                   || '0.05';
    const reward    = gameConfig['game_memory_reward_' + difficulty]     || '0.10';
    const timeLimit = gameConfig['game_memory_time_' + difficulty]       || '60';

    const doStart = async () => {
      const diffCard = document.querySelector(`.difficulty-card[onclick="startMemoryGame('${difficulty}')"]`);
      if (diffCard) { diffCard.style.opacity = '0.6'; diffCard.style.pointerEvents = 'none'; }

      try {
        const { data, error } = await sb.rpc('start_memory_game', { p_difficulty: difficulty });
        if (diffCard) { diffCard.style.opacity = ''; diffCard.style.pointerEvents = ''; }
        if (error)         { showToast(error.message, 'error'); return; }
        if (!data.success) { showToast(data.message,  'error'); return; }

        if (data.entry_fee_paid > 0) await refreshProfile();

        const pairs           = MEMORY_PAIRS[difficulty];
        const actualTimeLimit = data.time_limit || parseInt(timeLimit);

        memoryState = {
          sessionId:  data.session_id,
          difficulty,
          pairs,
          timeLeft:   actualTimeLimit,
          moves:      0,
          matched:    0,
          startTime:  Date.now(),
          flipped:    [],
          locked:     false,
          winReward:  data.win_reward
        };

        buildMemoryGrid(pairs);

        document.getElementById('memory-lobby').classList.add('hidden');
        document.getElementById('memory-game').classList.remove('hidden');
        document.getElementById('memory-result-overlay').classList.add('hidden');

        const pairsLeftEl   = document.getElementById('memory-pairs-left');
        const timerEl       = document.getElementById('memory-timer-display');
        const movesEl       = document.getElementById('memory-moves');

        if (pairsLeftEl) pairsLeftEl.textContent = pairs;
        if (timerEl)     { timerEl.textContent = actualTimeLimit; timerEl.style.color = ''; }
        if (movesEl)     movesEl.textContent = '0';

        if (memoryTimerInterval) clearInterval(memoryTimerInterval);
        memoryTimerInterval = setInterval(tickMemoryTimer, 1000);

      } catch (err) {
        if (diffCard) { diffCard.style.opacity = ''; diffCard.style.pointerEvents = ''; }
        showToast('Something went wrong', 'error');
      }
    };

    if (needsFee) {
      showGameConfirmModal(
        '🃏 Confirm Memory Game',
        `<div style="background:var(--bg-secondary);border-radius:12px;padding:14px;margin:10px 0;text-align:left;">
          <div style="margin-bottom:6px;"><span style="color:var(--text-secondary)">Difficulty:</span> <strong>${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--text-secondary)">Entry Fee:</span>
            <strong style="color:var(--warning)">${fee} USDT</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--text-secondary)">Win Reward:</span>
            <strong style="color:var(--success)">+${reward} USDT</strong>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--text-secondary)">Time Limit:</span>
            <strong>${timeLimit}s</strong>
          </div>
        </div>
        <p style="font-size:11px;color:var(--text-secondary);text-align:center;">
          Fee deducted on start. Reward only if you win.
        </p>`,
        doStart
      );
    } else {
      await doStart();
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

function buildMemoryGrid(pairs) {
  const grid      = document.getElementById('memory-grid');
  if (!grid) return;
  const emojiPool = MEMORY_EMOJIS.slice(0, pairs);
  const cards     = [...emojiPool, ...emojiPool].sort(() => Math.random() - 0.5);
  const cols      = pairs <= 6 ? 3 : pairs <= 10 ? 4 : 5;
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.innerHTML = cards.map((emoji, i) =>
    `<div class="memory-card" data-index="${i}" data-emoji="${emoji}" onclick="flipMemoryCard(this)">
      <div class="memory-card-inner">
        <div class="memory-card-front">❓</div>
        <div class="memory-card-back">${emoji}</div>
      </div>
    </div>`
  ).join('');
}

function tickMemoryTimer() {
  if (!memoryState) return;
  memoryState.timeLeft--;
  const timerEl = document.getElementById('memory-timer-display');
  if (timerEl) {
    timerEl.textContent  = memoryState.timeLeft;
    timerEl.style.color  = memoryState.timeLeft <= 10 ? 'var(--error)' : '';
  }
  if (memoryState.timeLeft <= 0) {
    clearInterval(memoryTimerInterval);
    memoryTimerInterval = null;
    showMemoryResult(false, 0, "Time's up!");
  }
}

function flipMemoryCard(card) {
  if (!memoryState || memoryState.locked) return;
  if (card.classList.contains('flipped') || card.classList.contains('matched')) return;
  if (memoryState.flipped.length >= 2) return;

  card.classList.add('flipped');
  memoryState.flipped.push(card);

  if (memoryState.flipped.length === 2) {
    memoryState.moves++;
    const movesEl = document.getElementById('memory-moves');
    if (movesEl) movesEl.textContent = memoryState.moves;
    memoryState.locked = true;

    const [a, b] = memoryState.flipped;
    if (a.dataset.emoji === b.dataset.emoji) {
      a.classList.add('matched');
      b.classList.add('matched');
      memoryState.matched++;
      memoryState.flipped = [];
      memoryState.locked  = false;

      const pairsLeftEl = document.getElementById('memory-pairs-left');
      if (pairsLeftEl) pairsLeftEl.textContent = memoryState.pairs - memoryState.matched;

      if (memoryState.matched === memoryState.pairs) {
        clearInterval(memoryTimerInterval);
        memoryTimerInterval = null;
        setTimeout(() => handleMemoryWin(Date.now() - memoryState.startTime), 300);
      }
    } else {
      setTimeout(() => {
        a.classList.remove('flipped');
        b.classList.remove('flipped');
        memoryState.flipped = [];
        memoryState.locked  = false;
      }, 700);
    }
  }
}

async function handleMemoryWin(elapsedMs) {
  if (!memoryState) return;
  try {
    const { data, error } = await sb.rpc('submit_memory_result', {
      p_session_id: memoryState.sessionId,
      p_time_ms:    elapsedMs
    });
    if (error || !data?.success) {
      showMemoryResult(false, 0, data?.message || 'Validation failed');
      return;
    }
    await refreshProfile();
    showMemoryResult(true, data.reward);
  } catch (err) {
    showMemoryResult(false, 0, 'Something went wrong');
  }
}

function showMemoryResult(won, reward, msg) {
  const overlay   = document.getElementById('memory-result-overlay');
  const iconEl    = document.getElementById('memory-result-icon');
  const titleEl   = document.getElementById('memory-result-title');
  const subEl     = document.getElementById('memory-result-sub');
  if (!overlay) return;

  overlay.classList.remove('hidden');
  if (iconEl)  iconEl.textContent  = won ? '🏆' : '💔';
  if (titleEl) titleEl.textContent = won ? 'You Win!' : 'Game Over!';
  if (subEl) {
    subEl.textContent  = won ? '+' + Number(reward).toFixed(2) + ' USDT credited!' : (msg || 'Better luck next time!');
    subEl.style.color  = won ? 'var(--success)' : 'var(--error)';
  }
}

function closeMemoryResult() {
  const overlay = document.getElementById('memory-result-overlay');
  if (overlay) overlay.classList.add('hidden');
  memoryState = null;
  loadMemoryLobby();
}

function quitMemoryGame() {
  if (memoryTimerInterval) {
    clearInterval(memoryTimerInterval);
    memoryTimerInterval = null;
  }
  memoryState = null;
  loadMemoryLobby();
}

// =====================
// ===== NUMBER HUNT =====
// =====================
async function loadHuntLobby() {
  document.getElementById('hunt-lobby').classList.remove('hidden');
  document.getElementById('hunt-game').classList.add('hidden');

  await loadGameConfigs();

  try {
    const { data: playsData } = await sb.rpc('get_my_game_plays_today', { p_game_type: 'hunt' });
    const played    = playsData || 0;
    const freeTotal = parseInt(gameConfig.game_hunt_daily_free || 3);
    const freeLeft  = Math.max(0, freeTotal - played);
    const fee       = gameConfig.game_hunt_entry_fee    || '0.10';
    const reward    = gameConfig.game_hunt_win_reward   || '0.08';

    const infoEl = document.getElementById('hunt-plays-info');
    if (infoEl) {
      infoEl.innerHTML = freeLeft > 0
        ? `<span style="color:var(--success)">✓ ${freeLeft} free play${freeLeft > 1 ? 's' : ''} remaining today</span>`
        : `<span style="color:var(--text-secondary)">Entry: ${fee} USDT | Win reward: ${reward} USDT</span>`;
    }
  } catch (err) {
    // Silent fail
  }
}

async function startHuntGame() {
  if (!isOnline()) return;

  try {
    const { data: playsData } = await sb.rpc('get_my_game_plays_today', { p_game_type: 'hunt' });
    const played    = playsData || 0;
    const freeTotal = parseInt(gameConfig.game_hunt_daily_free || 3);
    const needsFee  = played >= freeTotal;
    const fee       = gameConfig.game_hunt_entry_fee  || '0.10';
    const reward    = gameConfig.game_hunt_win_reward || '0.08';
    const range     = gameConfig.game_hunt_range      || '100';
    const maxGuesses = gameConfig.game_hunt_max_guesses || '10';

    const doStart = async () => {
      const btn = document.getElementById('hunt-start-btn');
      if (btn) { btn.classList.add('loading'); btn.disabled = true; }

      try {
        const { data, error } = await sb.rpc('start_number_hunt');
        if (error)         { showToast(error.message, 'error'); return; }
        if (!data)         { showToast('Failed to start game', 'error'); return; }
        if (!data.success) { showToast(data.message, 'error'); return; }

        if (data.entry_fee_paid > 0) await refreshProfile();

        huntSessionId = data.session_id;
        huntConfig    = {
          range:       data.range,
          maxGuesses:  data.max_guesses,
          guessesUsed: 0,
          low:         1,
          high:        data.range
        };

        document.getElementById('hunt-lobby').classList.add('hidden');
        document.getElementById('hunt-game').classList.remove('hidden');
        document.getElementById('hunt-result').classList.add('hidden');
        document.getElementById('hunt-input-section').classList.remove('hidden');
        document.getElementById('hunt-guess-btn').disabled = false;
        document.getElementById('hunt-guess-history').innerHTML = '';

        const guessInput = document.getElementById('hunt-guess-input');
        if (guessInput) {
          guessInput.value = '';
          guessInput.min   = '1';
          guessInput.max   = String(data.range);
        }

        const rangeBadge = document.getElementById('hunt-range-badge');
        if (rangeBadge) rangeBadge.textContent = data.range;

        updateHuntHeader();

      } catch (err) {
        showToast('Something went wrong. Please try again.', 'error');
      } finally {
        const btn = document.getElementById('hunt-start-btn');
        if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
      }
    };

    if (needsFee) {
      showGameConfirmModal(
        '🎯 Confirm Number Hunt',
        `<div style="background:var(--bg-secondary);border-radius:12px;padding:14px;margin:10px 0;text-align:left;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--text-secondary)">Entry Fee:</span>
            <strong style="color:var(--warning)">${fee} USDT</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--text-secondary)">Win Reward:</span>
            <strong style="color:var(--success)">+${reward} USDT</strong>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--text-secondary)">Range:</span>
            <strong>1 – ${range}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--text-secondary)">Max Guesses:</span>
            <strong>${maxGuesses}</strong>
          </div>
        </div>
        <p style="font-size:11px;color:var(--text-secondary);text-align:center;">
          Fee deducted on start. Reward if you find the number!
        </p>`,
        doStart
      );
    } else {
      await doStart();
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
  }
}

function updateHuntHeader() {
  const rangeBadge    = document.getElementById('hunt-range-badge');
  const guessesLeftEl = document.getElementById('hunt-guesses-remaining');

  if (rangeBadge)    rangeBadge.textContent = huntConfig.low + ' – ' + huntConfig.high;

  const remaining = huntConfig.maxGuesses - huntConfig.guessesUsed;
  if (guessesLeftEl) {
    guessesLeftEl.textContent  = remaining;
    guessesLeftEl.style.color  =
      remaining <= 2 ? 'var(--error)' :
      remaining <= 4 ? 'var(--warning)' :
      'var(--text-primary)';
  }
}

async function makeHuntGuess() {
  if (!isOnline() || !huntSessionId) return;

  const input = document.getElementById('hunt-guess-input');
  const guess = parseInt(input ? input.value : '');

  if (!guess || guess < 1 || guess > huntConfig.range) {
    showToast('Enter a number between 1 and ' + huntConfig.range, 'error'); return;
  }

  const btn = document.getElementById('hunt-guess-btn');
  if (btn) btn.disabled = true;

  try {
    const { data, error } = await sb.rpc('hunt_guess', {
      p_session_id: huntSessionId,
      p_guess:      guess
    });

    if (error)              { showToast(error.message, 'error');    if (btn) btn.disabled = false; return; }
    if (!data || !data.success) { showToast(data?.message || 'Error', 'error'); if (btn) btn.disabled = false; return; }

    huntConfig.guessesUsed = data.guesses_used;
    if (input) input.value = '';

    if (data.result === 'correct') {
      addHuntGuessToHistory(guess, 'correct', 0);
      huntConfig.guessesUsed = huntConfig.maxGuesses;
      updateHuntHeader();
      await refreshProfile();
      showHuntResult(true, data.secret, data.reward);

    } else if (data.result === 'out_of_guesses') {
      addHuntGuessToHistory(guess, 'wrong', 0);
      huntConfig.guessesUsed = huntConfig.maxGuesses;
      updateHuntHeader();
      showHuntResult(false, data.secret, 0);

    } else {
      if (data.result === 'higher') huntConfig.low  = Math.max(huntConfig.low,  guess + 1);
      else                          huntConfig.high = Math.min(huntConfig.high, guess - 1);
      updateHuntHeader();
      addHuntGuessToHistory(guess, data.result, data.guesses_remaining);
      if (btn) btn.disabled = false;
    }
  } catch (err) {
    showToast('Something went wrong', 'error');
    if (btn) btn.disabled = false;
  }
}

function addHuntGuessToHistory(guess, result, remaining) {
  const history = document.getElementById('hunt-guess-history');
  if (!history) return;

  const div = document.createElement('div');
  div.className = 'hunt-guess-item';

  let icon, text, color;
  if (result === 'correct') { icon = '✅'; text = 'Correct!'; color = 'var(--success)'; }
  else if (result === 'higher') { icon = '⬆️'; text = 'Higher'; color = 'var(--warning)'; }
  else { icon = '⬇️'; text = 'Lower'; color = 'var(--accent)'; }

  div.innerHTML = `
    <span class="hunt-guess-num">${guess}</span>
    <span class="hunt-guess-hint" style="color:${color}">${icon} ${text}</span>`;

  history.appendChild(div);
  history.scrollTop = history.scrollHeight;
}

function showHuntResult(won, secret, reward) {
  const inputSection = document.getElementById('hunt-input-section');
  const resultEl     = document.getElementById('hunt-result');
  if (inputSection) inputSection.classList.add('hidden');
  if (!resultEl)    return;

  resultEl.classList.remove('hidden');

  if (won) {
    resultEl.innerHTML = `
      <div class="game-result-inline success">
        🎯 You found it! Number was <strong>${secret}</strong>.<br>
        +${Number(reward).toFixed(2)} USDT credited!
      </div>
      <button class="btn-primary" onclick="loadHuntLobby()" style="margin-top:12px;">
        <span class="btn-text">Play Again</span><span class="btn-spinner"></span>
      </button>`;
  } else {
    resultEl.innerHTML = `
      <div class="game-result-inline error">
        💔 Out of guesses! The number was <strong>${secret}</strong>.
      </div>
      <button class="btn-primary" onclick="loadHuntLobby()" style="margin-top:12px;">
        <span class="btn-text">Try Again</span><span class="btn-spinner"></span>
      </button>`;
  }
} 