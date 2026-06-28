// ===== NEON STRIKE — RHYTHM GAME =====

var rhythmSessionId = null;
var rhythmPattern = [];
var rhythmState = null;
var rhythmAnimFrame = null;
var rhythmStartTimestamp = null;
var rhythmConfig = {};

var RHYTHM_DIFF = {
  easy:   { nodes: 20, window: 750, interval: 1500, types: [0,0,0,1] },
  medium: { nodes: 30, window: 500, interval: 1100, types: [0,0,1,1,2] },
  hard:   { nodes: 45, window: 320, interval: 750,  types: [0,0,0,1,1,2,2] }
};

var RNODE_TYPES = {
  0: { name: 'TAP',    color: '#ff7a00', hint: '⚡ TAP' },
  1: { name: 'HOLD',   color: '#3b82f6', hint: '✋ HOLD' },
  2: { name: 'DOUBLE', color: '#a855f7', hint: '👆 DOUBLE' }
};

// ===== SEEDED RNG (matches server logic) =====
function SeededRNG(seed) {
  var s = seed >>> 0;
  return {
    next: function() {
      s = ((Math.imul ? Math.imul(s, 1664525) : (s * 1664525)) + 1013904223) >>> 0;
      return s / 4294967296;
    }
  };
}

function generateRhythmPattern(seed, difficulty) {
  var rng = SeededRNG(seed);
  var cfg = RHYTHM_DIFF[difficulty];
  var pattern = [];
  var lastPos = -1;

  for (var i = 0; i < cfg.nodes; i++) {
    var pos, attempts = 0;
    do {
      pos = Math.floor(rng.next() * 12);
      attempts++;
    } while (pos === lastPos && attempts < 15);
    lastPos = pos;

    var typeIdx = Math.floor(rng.next() * cfg.types.length);
    var type = cfg.types[typeIdx];
    var jitter = Math.floor(rng.next() * 200 - 100);
    var startTime = 3800 + (i * cfg.interval) + jitter;

    pattern.push({
      id: i, pos: pos, type: type,
      startTime: startTime, window: cfg.window,
      activated: false, completed: false, hit: false,
      timerEl: null, tapCount: 0, holdStart: 0
    });
  }
  return pattern;
}

// ===== LOBBY =====
async function loadRhythmLobby() {
  document.getElementById('rhythm-lobby').classList.remove('hidden');
  document.getElementById('rhythm-arena').classList.add('hidden');
  document.getElementById('rhythm-result').classList.add('hidden');

  var rEasy = gameConfig.game_rhythm_reward_easy || '0.08';
  var rMed  = gameConfig.game_rhythm_reward_medium || '0.15';
  var rHard = gameConfig.game_rhythm_reward_hard || '0.25';

  document.getElementById('rhythm-reward-easy').textContent   = '+' + rEasy + ' USDT';
  document.getElementById('rhythm-reward-medium').textContent = '+' + rMed  + ' USDT';
  document.getElementById('rhythm-reward-hard').textContent   = '+' + rHard + ' USDT';

  var freeTotal = parseInt(gameConfig.game_rhythm_daily_free || 3);
  var playsRes = await sb.rpc('get_my_game_plays_today', { p_game_type: 'rhythm' });
  var played = playsRes.data || 0;
  var freeLeft = Math.max(0, freeTotal - played);
  var fee = gameConfig.game_rhythm_entry_fee || '0.05';

  document.getElementById('rhythm-plays-info').innerHTML = freeLeft > 0
    ? '<span style="color:var(--success)">✓ ' + freeLeft + ' free play' + (freeLeft > 1 ? 's' : '') + ' remaining today</span>'
    : '<span style="color:var(--text-secondary)">Entry fee: ' + fee + ' USDT per game</span>';
}

// ===== START GAME =====
async function startRhythmGame(difficulty) {
  if (!isOnline()) return;

  var playsRes = await sb.rpc('get_my_game_plays_today', { p_game_type: 'rhythm' });
  var played = playsRes.data || 0;
  var freeTotal = parseInt(gameConfig.game_rhythm_daily_free || 3);
  var needsFee = played >= freeTotal;
  var fee = gameConfig.game_rhythm_entry_fee || '0.05';
  var reward = gameConfig['game_rhythm_reward_' + difficulty] || '0.10';

  var doStart = async function() {
    var el = document.querySelector('.difficulty-card[onclick="startRhythmGame(\'' + difficulty + '\')"]');
    if (el) { el.style.opacity = '0.5'; el.style.pointerEvents = 'none'; }

    try {
      var res = await sb.rpc('start_rhythm_game', { p_difficulty: difficulty });
      if (el) { el.style.opacity = ''; el.style.pointerEvents = ''; }
      if (!res.data || !res.data.success) {
        showToast((res.data && res.data.message) || 'Failed to start', 'error'); return;
      }

      if (res.data.entry_fee_paid > 0) await refreshProfile();

      rhythmSessionId = res.data.session_id;
      rhythmPattern = generateRhythmPattern(res.data.seed, difficulty);

      rhythmState = {
        difficulty: difficulty,
        totalNodes: res.data.total_nodes,
        winReward: res.data.win_reward,
        score: 0, combo: 0, maxCombo: 0,
        perfect: 0, good: 0, miss: 0,
        activeNodeIds: [],
        running: false,
        gameStartTime: 0
      };

      document.getElementById('rhythm-lobby').classList.add('hidden');
      document.getElementById('rhythm-arena').classList.remove('hidden');
      document.getElementById('rhythm-result').classList.add('hidden');
      document.getElementById('rhythm-score-display').textContent = '0';
      document.getElementById('rhythm-accuracy-display').textContent = '100%';
      document.getElementById('rhythm-combo-display').textContent = '';
      document.getElementById('rhythm-progress-fill').style.width = '0%';
      resetAllNodes();
      startRhythmCountdown();
    } catch (err) {
      if (el) { el.style.opacity = ''; el.style.pointerEvents = ''; }
      showToast('Something went wrong', 'error');
    }
  };

  if (needsFee) {
    showGameConfirmModal('⚡ Neon Strike',
      '<div style="background:var(--bg-secondary);border-radius:12px;padding:14px;margin:10px 0;text-align:left;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text-secondary)">Difficulty:</span><strong>' + difficulty + '</strong></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="color:var(--text-secondary)">Entry Fee:</span><strong style="color:var(--warning)">' + fee + ' USDT</strong></div>' +
      '<div style="display:flex;justify-content:space-between;"><span style="color:var(--text-secondary)">Win Reward:</span><strong style="color:var(--success)">+' + reward + ' USDT</strong></div>' +
      '</div><p style="font-size:11px;color:var(--text-secondary);text-align:center;">Fee deducted on start. Win by hitting nodes accurately!</p>',
      doStart);
  } else {
    doStart();
  }
}

// ===== COUNTDOWN =====
function startRhythmCountdown() {
  var cdEl = document.getElementById('rhythm-countdown');
  var numEl = document.getElementById('rhythm-countdown-num');
  cdEl.classList.remove('hidden');
  var count = 3;
  numEl.textContent = count;
  numEl.className = 'rhythm-countdown-num rhythm-countdown-pop';

  var timer = setInterval(function() {
    count--;
    if (count <= 0) {
      clearInterval(timer);
      numEl.textContent = 'GO!';
      numEl.style.color = '#22c55e';
      setTimeout(function() {
        cdEl.classList.add('hidden');
        beginRhythmGame();
      }, 600);
    } else {
      numEl.textContent = count;
      numEl.style.color = '';
      numEl.className = 'rhythm-countdown-num';
      void numEl.offsetWidth;
      numEl.className = 'rhythm-countdown-num rhythm-countdown-pop';
    }
  }, 1000);
}

// ===== GAME LOOP =====
function beginRhythmGame() {
  rhythmState.running = true;
  rhythmState.gameStartTime = performance.now();
  rhythmStartTimestamp = Date.now();
  attachNodeListeners();
  rhythmAnimFrame = requestAnimationFrame(rhythmLoop);
}

function rhythmLoop(ts) {
  if (!rhythmState || !rhythmState.running) return;
  var elapsed = ts - rhythmState.gameStartTime;
  var cfg = RHYTHM_DIFF[rhythmState.difficulty];

  rhythmPattern.forEach(function(node) {
    if (node.completed) return;

    if (!node.activated && elapsed >= node.startTime) {
      activateRhythmNode(node);
    }

    if (node.activated && !node.completed && elapsed > node.startTime + node.window) {
      missRhythmNode(node);
    }
  });

  var done = rhythmPattern.every(function(n) { return n.completed; });
  if (done) { endRhythmGame(); return; }

  rhythmAnimFrame = requestAnimationFrame(rhythmLoop);
}

// ===== NODE ACTIVATION =====
function activateRhythmNode(node) {
  node.activated = true;
  var el = document.getElementById('rnode-' + node.pos);
  if (!el) return;

  var typeInfo = RNODE_TYPES[node.type];
  el.style.setProperty('--rnode-color', typeInfo.color);
  el.classList.add('rnode-active');
  el.setAttribute('data-node-id', node.id);
  el.setAttribute('data-node-type', node.type);

  // Type hint
  el.innerHTML = '<div class="rnode-hint">' + typeInfo.hint + '</div>' +
    '<svg class="rnode-timer-svg" viewBox="0 0 60 60">' +
    '<circle class="rnode-track" cx="30" cy="30" r="26"/>' +
    '<circle class="rnode-ring" cx="30" cy="30" r="26" style="animation-duration:' + node.window + 'ms"/>' +
    '</svg>';

  rhythmState.activeNodeIds.push(node.id);
  node.tapCount = 0;
  node.holdStart = 0;
  node.holdTimer = null;
}

function deactivateRhythmNode(node, result) {
  node.completed = true;
  var idx = rhythmState.activeNodeIds.indexOf(node.id);
  if (idx > -1) rhythmState.activeNodeIds.splice(idx, 1);

  var el = document.getElementById('rnode-' + node.pos);
  if (el) {
    el.classList.remove('rnode-active');
    el.removeAttribute('data-node-id');
    el.removeAttribute('data-node-type');
    el.innerHTML = '';

    if (result === 'perfect') {
      el.classList.add('rnode-perfect'); setTimeout(function() { el.classList.remove('rnode-perfect'); }, 400);
    } else if (result === 'good') {
      el.classList.add('rnode-good'); setTimeout(function() { el.classList.remove('rnode-good'); }, 400);
    } else {
      el.classList.add('rnode-miss'); setTimeout(function() { el.classList.remove('rnode-miss'); }, 400);
    }
  }

  updateRhythmHUD();
}

function missRhythmNode(node) {
  if (node.holdTimer) clearTimeout(node.holdTimer);
  rhythmState.miss++;
  rhythmState.combo = 0;
  showRhythmFeedback('MISS', 'miss');
  deactivateRhythmNode(node, 'miss');
}

// ===== NODE INTERACTION =====
function attachNodeListeners() {
  var grid = document.getElementById('rhythm-grid');
  grid.addEventListener('touchstart', onRhythmTouch, { passive: false });
  grid.addEventListener('mousedown', onRhythmMouse);
}

function detachNodeListeners() {
  var grid = document.getElementById('rhythm-grid');
  if (!grid) return;
  grid.removeEventListener('touchstart', onRhythmTouch);
  grid.removeEventListener('mousedown', onRhythmMouse);
}

function onRhythmTouch(e) {
  e.preventDefault();
  var touch = e.changedTouches[0];
  var target = document.elementFromPoint(touch.clientX, touch.clientY);
  handleRhythmInteraction(target);
}

function onRhythmMouse(e) {
  handleRhythmInteraction(e.target);
}

function handleRhythmInteraction(target) {
  if (!rhythmState || !rhythmState.running) return;
  var el = target ? target.closest('.rnode-active') : null;
  if (!el) return;

  var nodeId = parseInt(el.getAttribute('data-node-id'));
  if (isNaN(nodeId)) return;
  var nodeType = parseInt(el.getAttribute('data-node-type'));

  var node = rhythmPattern[nodeId];
  if (!node || node.completed) return;

  var elapsed = performance.now() - rhythmState.gameStartTime;
  var timeDiff = Math.abs(elapsed - (node.startTime + node.window / 2));
  var halfWindow = node.window / 2;

  if (nodeType === 0) {
    // TAP
    var accuracy = 1 - (timeDiff / halfWindow);
    scoreRhythmHit(node, accuracy);
  } else if (nodeType === 1) {
    // HOLD — start timer
    if (node.holdStart === 0) {
      node.holdStart = performance.now();
      el.classList.add('rnode-holding');
      node.holdTimer = setTimeout(function() {
        if (!node.completed) {
          var accuracy = 1 - (timeDiff / halfWindow);
          scoreRhythmHit(node, accuracy);
        }
      }, 400);
    }
  } else if (nodeType === 2) {
    // DOUBLE TAP
    node.tapCount = (node.tapCount || 0) + 1;
    if (node.tapCount === 2) {
      var accuracy = 1 - (timeDiff / halfWindow);
      scoreRhythmHit(node, accuracy);
    } else {
      // Wait for second tap
      setTimeout(function() {
        if (!node.completed && node.tapCount < 2) {
          missRhythmNode(node);
        }
      }, 300);
    }
  }
}

function scoreRhythmHit(node, accuracy) {
  if (node.holdTimer) clearTimeout(node.holdTimer);
  var result, pts, label;

  if (accuracy >= 0.7) {
    result = 'perfect'; pts = 100; label = 'PERFECT'; rhythmState.perfect++;
  } else if (accuracy >= 0.3) {
    result = 'good';    pts = 75;  label = 'GOOD';    rhythmState.good++;
  } else {
    result = 'good';    pts = 50;  label = 'OK';      rhythmState.good++;
  }

  rhythmState.combo++;
  if (rhythmState.combo > rhythmState.maxCombo) rhythmState.maxCombo = rhythmState.combo;

  var multiplier = 1 + Math.min(rhythmState.combo / 20, 1);
  rhythmState.score += Math.round(pts * multiplier);

  showRhythmFeedback(label + (rhythmState.combo > 2 ? ' x' + rhythmState.combo : ''), result);
  deactivateRhythmNode(node, result);
}

// ===== HUD =====
function updateRhythmHUD() {
  if (!rhythmState) return;
  document.getElementById('rhythm-score-display').textContent = rhythmState.score;

  var completed = rhythmState.perfect + rhythmState.good + rhythmState.miss;
  var total = rhythmState.totalNodes;
  document.getElementById('rhythm-progress-fill').style.width = Math.round((completed / total) * 100) + '%';

  var accNum = total > 0
    ? ((rhythmState.perfect * 100 + rhythmState.good * 75) / (total * 100)) * 100
    : 100;
  document.getElementById('rhythm-accuracy-display').textContent = Math.round(accNum) + '%';

  var comboEl = document.getElementById('rhythm-combo-display');
  if (rhythmState.combo > 2) {
    comboEl.textContent = 'x' + rhythmState.combo + ' COMBO';
    comboEl.style.opacity = '1';
  } else {
    comboEl.style.opacity = '0';
  }
}

function showRhythmFeedback(text, type) {
  var el = document.getElementById('rhythm-feedback');
  el.textContent = text;
  el.className = 'rhythm-feedback rhythm-fb-' + type;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(function() { el.classList.add('hidden'); }, 600);
}

// ===== END GAME =====
async function endRhythmGame() {
  if (!rhythmState || !rhythmState.running) return;
  rhythmState.running = false;
  cancelAnimationFrame(rhythmAnimFrame);
  detachNodeListeners();

  var durationMs = Date.now() - rhythmStartTimestamp;

  document.getElementById('rhythm-arena').classList.add('hidden');
  document.getElementById('rhythm-result').classList.remove('hidden');
  document.getElementById('rhythm-result-icon').textContent = '⏳';
  document.getElementById('rhythm-result-title').textContent = 'Submitting...';

  try {
    var res = await sb.rpc('submit_rhythm_score', {
      p_session_id: rhythmSessionId,
      p_score: rhythmState.score,
      p_perfect: rhythmState.perfect,
      p_good: rhythmState.good,
      p_miss: rhythmState.miss,
      p_duration_ms: durationMs
    });

    if (!res.data || !res.data.success) {
      document.getElementById('rhythm-result-icon').textContent = '❌';
      document.getElementById('rhythm-result-title').textContent = 'Error';
      document.getElementById('rhythm-result-msg').textContent = (res.data && res.data.message) || 'Submit failed';
      return;
    }

    var d = res.data;
    if (d.won) {
      await refreshProfile();
      document.getElementById('rhythm-result-icon').textContent = '🏆';
      document.getElementById('rhythm-result-title').textContent = 'YOU WON!';
      document.getElementById('rhythm-result-title').style.color = 'gold';
      document.getElementById('rhythm-result-msg').textContent = '+' + d.reward + ' USDT credited!';
      document.getElementById('rhythm-result-msg').style.color = 'var(--success)';
    } else {
      document.getElementById('rhythm-result-icon').textContent = '💔';
      document.getElementById('rhythm-result-title').textContent = 'Try Again';
      document.getElementById('rhythm-result-title').style.color = '';
      document.getElementById('rhythm-result-msg').textContent = d.message;
      document.getElementById('rhythm-result-msg').style.color = 'var(--error)';
    }

    document.getElementById('rhythm-result-stats').innerHTML =
      '<div class="rhythm-stats-row">' +
        '<span>Accuracy</span><strong>' + d.accuracy + '%</strong>' +
      '</div>' +
      '<div class="rhythm-stats-row">' +
        '<span>Score</span><strong>' + d.score + '</strong>' +
      '</div>' +
      '<div class="rhythm-stats-row">' +
        '<span>Perfect</span><strong style="color:var(--accent)">' + rhythmState.perfect + '</strong>' +
      '</div>' +
      '<div class="rhythm-stats-row">' +
        '<span>Good</span><strong style="color:#22c55e">' + rhythmState.good + '</strong>' +
      '</div>' +
      '<div class="rhythm-stats-row">' +
        '<span>Miss</span><strong style="color:var(--error)">' + rhythmState.miss + '</strong>' +
      '</div>' +
      (d.won ? '' : '<div class="rhythm-stats-row"><span>Need</span><strong>' + d.min_accuracy + '% accuracy</strong></div>');

  } catch (err) {
    document.getElementById('rhythm-result-icon').textContent = '❌';
    document.getElementById('rhythm-result-title').textContent = 'Error';
    document.getElementById('rhythm-result-msg').textContent = 'Something went wrong';
  }
}

function quitRhythmGame() {
  if (rhythmAnimFrame) cancelAnimationFrame(rhythmAnimFrame);
  if (rhythmState) rhythmState.running = false;
  detachNodeListeners();
  resetAllNodes();
  resetRhythmGame();
}

function resetRhythmGame() {
  rhythmSessionId = null;
  rhythmPattern = [];
  rhythmState = null;
  rhythmAnimFrame = null;
  document.getElementById('rhythm-arena').classList.add('hidden');
  document.getElementById('rhythm-result').classList.add('hidden');
  loadRhythmLobby();
}

function resetAllNodes() {
  for (var i = 0; i < 12; i++) {
    var el = document.getElementById('rnode-' + i);
    if (!el) continue;
    el.className = 'rnode';
    el.innerHTML = '';
    el.removeAttribute('data-node-id');
    el.removeAttribute('data-node-type');
  }
}