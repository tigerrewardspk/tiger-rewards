async function loadGuidePage() {
  const container = document.getElementById('guide-content');
  container.innerHTML = '<p class="placeholder-text">Loading...</p>';

  const { data, error } = await sb.from('platform_settings').select('key, value');
  if (error) { container.innerHTML = '<p class="placeholder-text">Failed to load guide</p>'; return; }

  const s = {};
  data.forEach(row => s[row.key] = row.value);

  const ref = s.referral_commission_percent || '10';
  const minW = s.minimum_withdrawal || '2';
  const fee = s.withdrawal_fee_percent || '5';
  const checkin = s.daily_checkin_bonus || '0.01';
  const cap = s.daily_earning_cap || '0';
  const minC = parseInt(s.min_checkins_for_withdrawal || '0');
  const minT = parseInt(s.min_tasks_for_withdrawal || '0');
  const share = s.offerwall_user_share_percent || '70';
  const minDep = s.deposit_minimum || '5';
  const depFee = s.deposit_fee_percent || '0';
  const giftFee = s.gift_fee_percent || '5';
  const giftMin = s.gift_minimum || '0.1';
  const listFee = s.marketplace_listing_fee || '0.5';
  const txnFee = s.marketplace_transaction_fee_percent || '5';
  const huntReward = s.game_hunt_win_reward || '0.08';
  const huntRange = s.game_hunt_range || '100';
  const huntGuesses = s.game_hunt_max_guesses || '10';
  const puzzleFee = s.game_puzzle_entry_fee || '0.05';
  const memFee = s.game_memory_entry_fee || '0.05';
  const netExample = (Number(minW) * (1 - Number(fee)/100)).toFixed(2);
  const capText = cap === '0' ? 'Unlimited' : cap + ' USDT';
  const checkinReq = minC > 0 ? 'Minimum ' + minC + '-day check-in streak required.' : 'No check-in streak requirement.';
  const taskReq = minT > 0 ? 'Minimum ' + minT + ' approved tasks required.' : 'No task completion requirement.';
  const depFeeText = depFee === '0' ? 'No processing fee on deposits.' : 'Processing fee: ' + depFee + '%.';

  const sections = [
    {
      icon: '💰',
      title: 'How to Earn',
      items: [
        'Complete tasks on the Task Board — approved tasks credit your balance directly.',
        'Complete offers on the Earn page — you receive ' + share + '% of every offer payout.',
        'Claim Daily Check-in Bonus every day (' + checkin + ' USDT) from your Profile page.',
        'Spin the Daily Spin Wheel once per day for a random reward — completely free.',
        'Win the Lucky Draw jackpot by purchasing a ticket.',
        'Earn referral commissions when users you invited complete tasks or offers.',
        'Sell services on the P2P Marketplace.',
        'Play games (Brain Puzzle, Memory Card, Number Hunt) and win rewards.',
        'Receive gifts from other users via Wallet.'
      ]
    },
    {
      icon: '📊',
      title: 'Daily Earning Limit',
      items: [
        'Maximum earning per day from all sources combined: ' + capText + '.',
        'Limit resets automatically at midnight server time every day.',
        'Daily Check-in, Spin Wheel, games, tasks and offers all count toward the daily limit.'
      ]
    },
    {
      icon: '🔗',
      title: 'Referral System',
      items: [
        'Share your unique referral link from the Invite page.',
        'When a friend registers using your link and earns — you automatically get ' + ref + '% commission.',
        'Example: your referral earns 1.00 USDT → you get ' + (Number(ref)/100).toFixed(3) + ' USDT credited instantly.',
        'Referral commissions are visible in Invite → Referral Earnings.',
        'Commission rate shown here is always current — updates automatically if changed.'
      ]
    },
    {
      icon: '📥',
      title: 'Deposits',
      items: [
        'Go to Wallet → Deposit tab to fund your account.',
        'Network: USDT BEP-20 (Binance Smart Chain) ONLY.',
        'Minimum deposit: ' + minDep + ' USDT.',
        depFeeText,
        'After sending, enter your Transaction ID (TxID) as proof. Tiger Rewards verifies and credits balance.',
        '⚠️ Wrong network = permanent loss. Always double-check before sending.',
        'Each TxID can only be submitted once — no duplicate submissions.'
      ]
    },
    {
      icon: '📤',
      title: 'Withdrawals',
      items: [
        'Minimum withdrawal: ' + minW + ' USDT.',
        'Fee: ' + fee + '% deducted. Example: withdraw ' + minW + ' USDT → you receive ' + netExample + ' USDT.',
        checkinReq,
        taskReq,
        'Withdrawals are manually reviewed. You receive a mailbox notification when processed.',
        'Only USDT BEP-20 wallet address accepted — double check before submitting.'
      ]
    },
    {
      icon: '✅',
      title: 'Task Board',
      items: [
        'Tiger Rewards posts tasks (e.g. follow on social, watch a video, join a channel).',
        'Submit your proof (link or description) by tapping Submit Proof.',
        'Tiger Rewards Review Team reviews and approves or rejects. Decision sent via Private Mail.',
        'If rejected — resubmit with corrected proof. 3+ rejections may flag your account.',
        '⚡ Flash Tasks are time-limited with higher rewards — complete them before the timer runs out!',
        'Each task can only be submitted once per user.'
      ]
    },
    {
      icon: '🎮',
      title: 'Game Zone',
      items: [
        'Game Zone has 3 games: Brain Puzzle, Memory Card, and Number Hunt.',
        '🧩 BRAIN PUZZLE: Daily puzzle posted by Tiger Rewards. Entry fee: ' + puzzleFee + ' USDT. Answer correctly to win — first correct answers only. Requires minimum platform activity.',
        '🃏 MEMORY CARD: Match all card pairs before time runs out. 3 difficulty levels. Entry fee: ' + memFee + ' USDT after free plays.',
        '🎯 NUMBER HUNT: Find secret number (1–' + huntRange + ') in ' + huntGuesses + ' guesses. Each guess gives Higher/Lower hint. Win reward: ' + huntReward + ' USDT.',
        'Some game has free daily plays. After free plays, a small entry fee applies.',
        'Entry fees and rewards are always shown before you start — no hidden charges.',
        'All game results are validated server-side. Impossible results are automatically rejected.',
        'Daily free plays reset at midnight.'
      ]
    },
    {
      icon: '🎫',
      title: 'Lucky Draw',
      items: [
        'Periodic draws where you buy a ticket for a chance to win the jackpot.',
        'Only 1 ticket per draw per user. Ticket purchases are non-refundable.',
        'After sales end, a countdown shows when the draw will happen.',
        'Winner is randomly selected.',
        'Jackpot is instantly credited to the winner\'s balance.',
        'If a draw is cancelled, Tiger Rewards automatically refunds all ticket purchases.'
      ]
    },
    {
      icon: '🎁',
      title: 'Gifting and Tipping',
      items: [
        'Send a gift to any user using their UID — go to Wallet → Send Gift button.',
        'Minimum gift: ' + giftMin + ' USDT. Platform fee: ' + giftFee + '% deducted.',
        'Recipient receives the amount minus the fee instantly.',
        'Gifts are non-reversible. Always verify the UID before confirming.',
        'Gifting cannot be used to manipulate referral balances — suspicious patterns result in account review.'
      ]
    },
    {
      icon: '🛒',
      title: 'P2P Marketplace',
      items: [
        'Buy and sell services with other users using your USDT balance.',
        'Posting a gig costs a one-time listing fee of ' + listFee + ' USDT.',
        'When buyer places an order, payment is held in escrow until you deliver.',
        'Seller: mark order Delivered with proof. Buyer: confirm receipt or raise a dispute.',
        'Platform takes ' + txnFee + '% transaction fee on each completed order.',
        'Tiger Rewards resolves disputes — decision is final.'
      ]
    },
    {
      icon: '🏆',
      title: 'Rank and Achievements',
      items: [
        'Your rank (Bronze → Silver → Gold → Platinum → Diamond) is based on total lifetime earnings.',
        'Achievements unlock automatically at milestones: first check-in, 7-day streak, first payout, 5 referrals, 10 USDT earned.',
        'Top Earners and Top Referrers leaderboards are on the Rank page.'
      ]
    },
    {
      icon: '⚠️',
      title: 'Account Rules',
      items: [
        'One account per person. Multiple accounts = permanent ban.',
        'Fake proofs, fake TxIDs, or manipulation = suspension or permanent ban.',
        'Suspended accounts cannot sign in. Reason and duration shown on the suspension screen.',
        'Up to 2 appeal tickets allowed per suspension. Use the Appeal button on the suspension screen.',
        'All platform activity is monitored. Fair play protects everyone.'
      ]
    },
    {
      icon: '📞',
      title: 'Support',
      items: [
        'Contact via Telegram, WhatsApp, or Email from the Help page.',
        'Submit a Support Ticket from the Help page — Tiger Rewards replies via Private Mail.',
        'Check your Mailbox regularly for balance updates, approvals, and system messages.'
      ]
    }
  ];

  container.innerHTML = sections.map(sec =>
    '<div class="guide-section">' +
    '<h3 class="guide-section-title">' + sec.icon + ' ' + sec.title + '</h3>' +
    sec.items.map(item =>
      '<div class="guide-item">' +
      '<svg class="icon guide-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' +
      '<span>' + item + '</span>' +
      '</div>'
    ).join('') +
    '</div>'
  ).join('');
}
