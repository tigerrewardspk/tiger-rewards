// ===== SHOW LEGAL PAGE (from auth screen) =====
function showLegalPage(page) {
  const pageEl = document.getElementById('page-' + page);
  if (!pageEl) return;

  document.getElementById('auth-container').classList.add('hidden');
  document.getElementById('app-container').classList.add('hidden');

  // Remove old inline style if any
  pageEl.removeAttribute('style');
  pageEl.classList.remove('hidden');
  pageEl.classList.add('fullscreen-overlay-page');
  pageEl.style.padding = '24px 16px 40px';

  if (page === 'privacy') renderPrivacyPolicy();
  if (page === 'terms') renderTerms();

  const existing = pageEl.querySelector('.legal-back-btn');
  if (existing) existing.remove();

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-primary legal-back-btn';
  backBtn.style.marginBottom = '16px';
  backBtn.innerHTML = '← Back';
  backBtn.onclick = () => {
    pageEl.classList.add('hidden');
    pageEl.classList.remove('fullscreen-overlay-page');
    pageEl.style.padding = '';
    const isLoggedIn = typeof currentUserProfile !== 'undefined' && currentUserProfile;
    if (isLoggedIn) {
      document.getElementById('app-container').classList.remove('hidden');
    } else {
      document.getElementById('auth-container').classList.remove('hidden');
    }
  };
  pageEl.prepend(backBtn);
}

// ===== RENDER LEGAL SECTIONS HELPER =====
function renderLegalSections(sections) {
  return sections.map(sec =>
    `<div class="guide-section">
      <h3 class="guide-section-title">${sec.title}</h3>
      ${sec.items.map(item =>
        `<div class="guide-item">
          <svg class="icon guide-check" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>${item}</span>
        </div>`
      ).join('')}
    </div>`
  ).join('');
}

// ===== RENDER PRIVACY POLICY =====
function renderPrivacyPolicy() {
  const container = document.getElementById('privacy-content');
  if (!container) return;
  const sections = [
    {
      title: '1. Information We Collect',
      items: [
        'Account information: username, email address, and password (encrypted).',
        'Activity data: tasks, offers, check-ins, spin wheel, games, deposits, withdrawals, gifts, marketplace orders, lucky draw tickets.',
        'Referral data: referral codes used during registration and referral relationships.',
        'Deposit data: transaction IDs and screenshot URLs submitted for deposit verification.',
        'Device and usage data: browser type, IP address, and session timestamps for security purposes.',
        'Game session data: game results and timing (used for anti-cheat validation only — secret values never reach client).'
      ]
    },
    {
      title: '2. How We Use Your Information',
      items: [
        'To operate and maintain your account and display your balance and earnings.',
        'To verify deposit transactions and prevent duplicate or fraudulent submissions.',
        'To process withdrawal requests and verify identity for fraud prevention.',
        'To validate game results server-side and prevent cheating.',
        'To track game sessions and credit earned rewards securely.',
        'To process Lucky Draw ticket purchases and credit jackpot winnings.',
        'To record gift and tip transactions between users.',
        'To send platform notifications, balance updates, and system communications via in-app mailbox.',
        'To calculate referral commissions and track earning activity.',
        'To detect and prevent fraudulent activity, abuse, and policy violations.'
      ]
    },
    {
      title: '3. Data Security',
      items: [
        'All account data is stored securely using (PostgreSQL) with Row Level Security (RLS).',
        'Passwords are encrypted and never stored in plain text.',
        'Financial operations are protected using server-side PostgreSQL transactions with row locking.',
        'Game secrets (e.g. Number Hunt secret number, Brain Puzzle answers) are stored server-side only — never sent to client.',
        'We do not sell, rent, or share your personal data with third parties except as required by law.'
      ]
    },
    {
      title: '4. Third-Party Services',
      items: [
        'Advertising: We use Adsterra to display ads. Adsterra may collect anonymized data per their own privacy policy.',
        'Offerwall: Third-party offer networks may apply their own privacy policies when you complete their offers.',
        'Authentication: Handled by Supabase Auth with industry-standard security.',
        'We are not responsible for the privacy practices of third-party services linked from our platform.'
      ]
    },
    {
      title: '5. Your Rights',
      items: [
        'You may request deletion of your account and associated data by contacting support.',
        'You may update your account information through the support ticket system.',
        'You have the right to know what data we hold about you — contact support for a data inquiry.',
        'We reserve the right to retain transaction records for legal and fraud prevention purposes even after account deletion.'
      ]
    },
    {
      title: '6. Cookies and Local Storage',
      items: [
        'We use browser local storage to store your referral code and session preferences.',
        'No advertising cookies are set directly by Tiger Rewards.',
        'You can clear local storage at any time through your browser settings.'
      ]
    },
    {
      title: '7. Changes to This Policy',
      items: [
        'We may update this Privacy Policy from time to time. Changes will be announced via the Updates page.',
        'Continued use of the platform after changes constitutes acceptance of the updated policy.'
      ]
    }
  ];
  container.innerHTML = renderLegalSections(sections);
}

// ===== RENDER TERMS & CONDITIONS =====
function renderTerms() {
  const container = document.getElementById('terms-content');
  if (!container) return;
  const sections = [
    {
      title: '1. Acceptance of Terms',
      items: [
        'By registering and using Tiger Rewards, you agree to these Terms and Conditions in full.',
        'If you do not agree with any part of these terms, you must not use the platform.',
        'These terms apply to all users including registered members and visitors.'
      ]
    },
    {
      title: '2. Eligibility',
      items: [
        'You must be at least 18 years of age to use Tiger Rewards.',
        'One account per person is allowed. Multiple accounts to exploit rewards or referrals are strictly prohibited.',
        'Accounts created to bypass limits or manipulate the platform will be permanently banned.'
      ]
    },
    {
      title: '3. Deposits',
      items: [
        'Only USDT on BEP-20 (Binance Smart Chain) network is accepted. Deposits on other networks cannot be recovered.',
        'You must submit a valid Transaction ID (TxID) as proof. Fake or duplicate TxIDs will result in account suspension.',
        'Deposits are reviewed and credited manually by Tiger Rewards. Processing time is not guaranteed.',
        'Tiger Rewards is not liable for funds sent to incorrect addresses or on wrong networks.',
        'Minimum deposit amount may change at any time — current amount is shown in the Deposit form.'
      ]
    },
    {
      title: '4. Earning and Rewards',
      items: [
        'Rewards are earned by completing legitimate tasks, offers, games, check-ins, and spin wheel activities.',
        'Tiger Rewards reserves the right to modify earning rates, daily caps, and reward amounts at any time.',
        'Earnings obtained through fraudulent means will be reversed and the account suspended.',
        'Daily earning caps apply to all users and may change without prior notice.',
        'Game rewards are validated server-side — client-side manipulation is not possible and will result in session invalidation.'
      ]
    },
    {
      title: '5. Withdrawals',
      items: [
        'Withdrawals are processed manually and subject to minimum amounts and fees shown in the Wallet section.',
        'You must provide a valid USDT BEP-20 wallet address. Tiger Rewards is not responsible for funds sent to incorrect addresses.',
        'Tiger Rewards reserves the right to delay, hold, or cancel any withdrawal if fraud is suspected.',
        'Withdrawal fees and minimum amounts may change at any time.'
      ]
    },
    {
      title: '6. Referral Program',
      items: [
        'Referral commissions are earned when your referred users complete valid earning activities.',
        'Self-referrals, fake accounts, and referral manipulation are strictly prohibited.',
        'Referral commission rates may change at any time. Current rates are visible on the Guide page.',
        'Tiger Rewards reserves the right to cancel referral earnings if fraud is detected.'
      ]
    },
    {
      title: '7. Task Board',
      items: [
        'Tasks are posted by Tiger Rewards. Users must submit genuine proof of completion.',
        'Submitting fake, altered, or fraudulent proofs will result in rejection and account flagging.',
        '3 or more rejections may result in account review and possible suspension.',
        'Flash Tasks are time-limited — proofs must be submitted before expiry.'
      ]
    },
    {
      title: '8. Game Zone',
      items: [
        'Game Zone features skill-based games. These are NOT gambling — outcomes depend on knowledge, memory, and logic.',
        'Entry fees are charged per attempt after daily free plays are exhausted. Fees are non-refundable once a game session starts.',
        'Win rewards are credited only upon verified server-side completion.',
        'Impossible completion times are automatically rejected as invalid (anti-cheat system).',
        'Brain Puzzle requires minimum platform activity to prevent abuse.',
        'Tiger Rewards reserves the right to modify game rules, rewards, fees, and difficulty at any time.',
        'Game results are final — no disputes will be entertained for completed sessions.'
      ]
    },
    {
      title: '9. Lucky Draw',
      items: [
        'Lottery tickets are non-refundable once purchased.',
        'Each user may purchase only one ticket per draw.',
        'The winner is selected randomly via a verified server-side process. Results are final.',
        'Tiger Rewards reserves the right to cancel a draw if insufficient tickets are sold.',
        'In case of cancellation, all ticket purchases are automatically refunded.',
        'Jackpot amounts are funded by the platform and guaranteed to the winner.'
      ]
    },
    {
      title: '10. Gifting and Tipping',
      items: [
        'Gifting is a voluntary feature allowing users to send USDT to other users.',
        'Platform fees apply on all gift transactions as shown in the gift form.',
        'Gifts are final and non-reversible. Tiger Rewards is not responsible for gifts sent to wrong UIDs.',
        'Using the gifting system to manipulate balances or conduct fake transactions will result in permanent banning.'
      ]
    },
    {
      title: '11. P2P Marketplace',
      items: [
        'Tiger Rewards acts only as the platform operator and escrow holder — not as a party to any transaction.',
        'Gig listing fees are non-refundable once a gig is posted.',
        'Buyer payment is held in escrow until delivery is confirmed or dispute is resolved.',
        'Tiger Rewards charges a transaction fee on each completed order.',
        'Sellers must deliver the service as described. Fake or misleading gigs will result in suspension.',
        'Buyers must raise disputes before confirming delivery. Once confirmed, payment is final.',
        'Tiger Rewards dispute resolution decisions are final.',
        'Tiger Rewards is not liable for the quality, legality, or delivery of any service listed.'
      ]
    },
    {
      title: '12. Account Suspension and Banning',
      items: [
        'Tiger Rewards reserves the right to suspend or permanently ban any account for policy violations.',
        'Suspended users will be notified via the suspension screen with the reason and duration.',
        'Users may submit up to 2 appeal tickets per suspension period.',
        'Tiger Rewards is not liable for any loss of earnings as a result of account suspension or banning.'
      ]
    },
    {
      title: '13. Prohibited Activities',
      items: [
        'Creating multiple accounts to exploit rewards, referrals, or daily limits.',
        'Submitting fake, altered, or fraudulent task proofs or deposit TxIDs.',
        'Using bots, scripts, or automated tools to complete tasks or earn rewards.',
        'Attempting to hack, exploit, or manipulate the platform in any way.',
        'Any activity that violates local, national, or international laws.'
      ]
    },
    {
      title: '14. Disclaimer of Liability',
      items: [
        'Tiger Rewards is provided as-is without guarantees of uptime or earning potential.',
        'We do not guarantee any specific earning amount.',
        'Tiger Rewards is not responsible for losses caused by network issues or third-party service outages.',
        'We reserve the right to modify, suspend, or terminate the platform at any time.'
      ]
    },
    {
      title: '15. Changes to Terms',
      items: [
        'We may update these Terms at any time. Updates will be announced via the Updates page.',
        'Continued use of the platform after changes constitutes acceptance of the updated terms.'
      ]
    }
  ];
  container.innerHTML = renderLegalSections(sections);
}