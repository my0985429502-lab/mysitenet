
// Referral front-end helper (TRON wallet format)
//
// Behavior:
// - On page load, if URL has ?ref=WALLET -> store in localStorage and show banner.
// - Shows user's referral link (requires `window.USER_WALLET` to be set after login).
// - Generates QR code by requesting /referral/qr?text=...
(function(){
  function getParam(name){
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  const ref = getParam('ref');
  if (ref) {
    localStorage.setItem('referrer_wallet', ref);
  }

  // Show referral link for logged-in user (if window.USER_WALLET exists)
  function updateReferralUI(){
    const linkEl = document.getElementById('ref-link');
    const qrEl = document.getElementById('ref-qr');
    const wallet = window.USER_WALLET || localStorage.getItem('USER_WALLET');
    if (!linkEl) return;
    if (wallet) {
      const link = window.location.origin + '/?ref=' + encodeURIComponent(wallet);
      linkEl.href = link;
      linkEl.innerText = link;
      // request QR image
      qrEl.src = '/referral/qr?text=' + encodeURIComponent(link);
    } else {
      linkEl.innerText = 'Войдите или зарегистрируйтесь, чтобы получить ссылку';
      qrEl.src = '';
    }
  }

  // Expose helper
  window.referral = {
    updateUI: updateReferralUI,
    getStoredReferrer: () => localStorage.getItem('referrer_wallet')
  };

  // auto update on load
  document.addEventListener('DOMContentLoaded', updateReferralUI);
})();
