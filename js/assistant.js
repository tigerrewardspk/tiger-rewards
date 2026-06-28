let assistantOpen = false;
let assistantContext = {};

async function initAssistant() {
  const { data } = await sb.from('platform_settings').select('key,value')
    .in('key', ['minimum_withdrawal','withdrawal_fee_percent','referral_commission_percent',
      'deposit_minimum','deposit_fee_percent','daily_checkin_bonus','game_hunt_win_reward',
      'game_puzzle_entry_fee','marketplace_listing_fee','gift_minimum','gift_fee_percent',
      'game_memory_entry_fee','lucky_draw_enabled','games_enabled']);
  if (data) data.forEach(r => assistantContext[r.key] = r.value);

  // Check karo ke user abhi bhi logged in hai ya nahi
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData?.session?.user) return;

  // Dobara check karo currentUserProfile bhi set hai
  if (typeof currentUserProfile === 'undefined' || !currentUserProfile) return;

  document.getElementById('assistant-fab').classList.remove('hidden');
}

function toggleAssistant() {
  assistantOpen = !assistantOpen;
  document.getElementById('assistant-panel').classList.toggle('hidden', !assistantOpen);
  if (assistantOpen) document.getElementById('assistant-input').focus();
}

function askBot(question) {
  document.getElementById('assistant-input').value = question;
  sendAssistantMessage();
}

function sendAssistantMessage() {
  const input = document.getElementById('assistant-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';

  addUserMessage(msg);
  document.getElementById('assistant-quick-replies')?.remove();

  setTimeout(() => {
    const reply = getBotReply(msg.toLowerCase());
    addBotMessage(reply);
  }, 400);
}

function addUserMessage(text) {
  const el = document.createElement('div');
  el.className = 'user-message';
  el.innerHTML = `<div class="user-bubble">${escapeHtml(text)}</div>`;
  document.getElementById('assistant-messages').appendChild(el);
  scrollAssistant();
}

function addBotMessage(text) {
  const el = document.createElement('div');
  el.className = 'bot-message';
  el.innerHTML = `<div class="bot-bubble">${text}</div>`;
  document.getElementById('assistant-messages').appendChild(el);
  scrollAssistant();
}

function scrollAssistant() {
  const msgs = document.getElementById('assistant-messages');
  msgs.scrollTop = msgs.scrollHeight;
}

function getBotReply(msg) {
  const s = assistantContext;
  const minW = s.minimum_withdrawal || '2';
  const wFee = s.withdrawal_fee_percent || '5';
  const ref = s.referral_commission_percent || '10';
  const minDep = s.deposit_minimum || '5';
  const checkin = s.daily_checkin_bonus || '0.01';
  const huntReward = s.game_hunt_win_reward || '0.08';
  const puzzleFee = s.game_puzzle_entry_fee || '0.05';
  const giftFee = s.gift_fee_percent || '5';
  const listFee = s.marketplace_listing_fee || '0.5';

  // Greeting
  if (/^(hi|hello|hey|salam|assalam|helo|hai)\b/.test(msg)) {
    return `Hello ${escapeHtml(currentUserProfile?.username || '')}! 👋 I'm TigerBot, your Tiger Rewards assistant. How can I help you today?`;
  }

  // Withdrawal
  if (msg.includes('withdraw') || msg.includes('cash out') || msg.includes('payout')) {
    return `💸 <strong>Withdrawal Info:</strong><br>
• Minimum: <strong>${minW} USDT</strong><br>
• Fee: <strong>${wFee}%</strong> deducted from amount<br>
• Network: USDT BEP-20 only<br>
• Processing: by Tiger Rewards— you'll get a mailbox notification<br>
• Go to: <strong>Wallet → Withdraw tab</strong>`;
  }

  // Deposit
  if (msg.includes('deposit') || msg.includes('fund') || msg.includes('add money')) {
    return `📥 <strong>Deposit Info:</strong><br>
• Minimum: <strong>${minDep} USDT</strong><br>
• Network: USDT BEP-20 only ⚠️<br>
• Submit TxID as proof after sending<br>
• System verifies and credits your balance<br>
• Go to: <strong>Wallet → Deposit tab</strong>`;
  }

  // Referral
  if (msg.includes('referral') || msg.includes('invite') || msg.includes('refer')) {
    return `🔗 <strong>Referral System:</strong><br>
• Get your link from the <strong>Invite page</strong><br>
• When your referral earns → you get <strong>${ref}%</strong> commission automatically<br>
• Example: referral earns 1 USDT → you get ${(Number(ref)/100).toFixed(3)} USDT<br>
• Commissions appear in Invite → Referral Earnings`;
  }

  // Daily check-in
  if (msg.includes('check') || msg.includes('checkin') || msg.includes('daily bonus')) {
    return `✅ <strong>Daily Check-in:</strong><br>
• Claim <strong>${checkin} USDT</strong> every day from your Profile page<br>
• Build streaks for achievements<br>
• Resets at midnight server time<br>
• Can't miss a day — streak resets if you skip!`;
  }

  // Spin wheel
  if (msg.includes('spin') || msg.includes('wheel')) {
    return `🎡 <strong>Daily Spin Wheel:</strong><br>
• One free spin every day<br>
• Random reward from the displayed amounts<br>
• Find it on your <strong>Profile page</strong><br>
• Reward is instantly credited to your balance`;
  }

  // Games
  if (msg.includes('game') || msg.includes('puzzle') || msg.includes('memory') || msg.includes('hunt') || msg.includes('number')) {
    return `🎮 <strong>Game Zone has 3 games:</strong><br>
• 🧩 <strong>Brain Puzzle</strong> — Daily puzzle, entry fee ${puzzleFee} USDT, answer correctly to win<br>
• 🃏 <strong>Memory Card</strong> — Match pairs before time runs out<br>
• 🎯 <strong>Number Hunt</strong> — Find secret number in limited guesses, win ${huntReward} USDT<br>
Some games have free daily plays. Go to <strong>Games tab</strong>!`;
  }

  // Lucky Draw
  if (msg.includes('draw') || msg.includes('lottery') || msg.includes('raffle') || msg.includes('ticket')) {
    return `🎫 <strong>Lucky Draw:</strong><br>
• Buy 1 ticket per draw to participate<br>
• Winner randomly selected when draw happens<br>
• Jackpot instantly credited to winner's balance<br>
• Check countdown on <strong>Draw page</strong><br>
• Tickets are non-refundable once purchased`;
  }

  // Marketplace / Gig
  if (msg.includes('market') || msg.includes('gig') || msg.includes('service') || msg.includes('sell') || msg.includes('buy')) {
    return `🛒 <strong>P2P Marketplace:</strong><br>
• Sell your services to other users<br>
• Listing fee: <strong>${listFee} USDT</strong> per gig<br>
• Buyer pays → held in escrow until delivery confirmed<br>
• System resolves disputes<br>
• Go to <strong>Market tab</strong>`;
  }

  // Gift / Tip
  if (msg.includes('gift') || msg.includes('tip') || msg.includes('send') || msg.includes('transfer')) {
    return `🎁 <strong>Gift / Tip:</strong><br>
• Send USDT to any user via their UID<br>
• Platform fee: <strong>${giftFee}%</strong> deducted<br>
• Find it in: <strong>Wallet → Gift button</strong><br>
• Gifts are instant and non-reversible`;
  }

  // Balance / Wallet
  if (msg.includes('balance') || msg.includes('wallet') || msg.includes('usdt') || msg.includes('money')) {
    const bal = Number(currentUserProfile?.available_balance || 0).toFixed(2);
    return `💰 <strong>Your Balance:</strong> <strong>${bal} USDT</strong><br>
• Available balance = withdrawable anytime<br>
• Earn more via tasks, games, spin wheel, offers<br>
• Check full history in <strong>Wallet tab</strong>`;
  }

  // Tasks
  if (msg.includes('task') || msg.includes('proof') || msg.includes('submit')) {
    return `✅ <strong>Task Board:</strong><br>
• System posts tasks with rewards<br>
• Submit proof (link or description) for each task<br>
• Tiger Rewards reviews → you get mailbox notification<br>
• ⚡ Flash Tasks expire — complete them fast!<br>
• Find them in <strong>Tasks tab</strong>`;
  }

  // Earn page / Offers
  if (msg.includes('earn') || msg.includes('offer') || msg.includes('offerwall')) {
    return `💎 <strong>Earn Page:</strong><br>
• Complete offers from our partner networks<br>
• You receive a share of each offer's payout<br>
• Credited instantly after completion verified<br>
• Check <strong>Earn tab</strong> for available offers`;
  }

  // Account suspended/banned
  if (msg.includes('suspend') || msg.includes('ban') || msg.includes('blocked') || msg.includes('account issue')) {
    return `⚠️ <strong>Account Issues:</strong><br>
• If suspended: you'll see a suspension screen with reason<br>
• You can submit up to 2 appeal tickets from the suspension screen<br>
• Contact support via <strong>Help page</strong><br>
• Fair use policy protects all users`;
  }

  // Support
  if (msg.includes('support') || msg.includes('help') || msg.includes('contact') || msg.includes('problem')) {
    return `📞 <strong>Get Support:</strong><br>
• Go to <strong>Help page</strong> for Telegram/WhatsApp/Email<br>
• Submit a Support Ticket from Help page<br>
• System replies via Private Mail (Mailbox)<br>
• Also check the <strong>Guide page</strong> for detailed how-tos`;
  }

  // Privacy / Terms
  if (msg.includes('privacy') || msg.includes('terms') || msg.includes('policy') || msg.includes('rules')) {
    return `📜 <strong>Legal:</strong><br>
• Privacy Policy & Terms available in <strong>Help page → Legal section</strong><br>
• Or in the Guide page at the bottom<br>
• Platform rules are strictly enforced to protect all users`;
  }

  // Rank / Tier
  if (msg.includes('rank') || msg.includes('tier') || msg.includes('bronze') || msg.includes('diamond')) {
    return `🏆 <strong>Rank System:</strong><br>
• Ranks: Bronze → Silver → Gold → Platinum → Diamond<br>
• Based on your <strong>total lifetime earnings</strong><br>
• Check your progress on <strong>Rank tab</strong><br>
• Top earners appear on the leaderboard`;
  }

  // Default
  return `🤔 I'm not sure about that specific question. Here are your best options:<br>
• 📖 Check the <strong>Guide page</strong> for detailed info<br>
• 📞 Submit a ticket from <strong>Help page</strong><br>
• 💬 Try asking with different keywords!`;
}

// PWA Install
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // sessionStorage use karo — sirf ek session tak dismiss rahe, hamesha ke liye nahi
  if (!sessionStorage.getItem('pwa_dismissed')) {
    document.getElementById('pwa-install-banner').classList.remove('hidden');
  }
});

document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    document.getElementById('pwa-install-banner').classList.add('hidden');
  }
  deferredInstallPrompt = null;
});

function dismissPWA() {
  document.getElementById('pwa-install-banner').classList.add('hidden');
  sessionStorage.setItem('pwa_dismissed', '1');
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Notification Permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('Notifications enabled! ✓', 'success');
    }
  }
}

function showBrowserNotification(title, body) {
  if (document.visibilityState === 'visible') return;

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title: title,
      body: body
    });
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body: body,
        icon: '/monogram.png',
        badge: '/monogram.png',
        tag: 'tiger-' + Date.now()
      });
    }).catch(() => {});
  }
}