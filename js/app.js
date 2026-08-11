/* ================================================
   App Module - Main routing & utilities
   ================================================ */

const App = (() => {
  let currentTab = 'dashboard';

  // Currency symbols
  const currencySymbols = {
    KRW: '₩',
    USD: '$',
    EUR: '€',
    JPY: '¥',
    GBP: '£'
  };

  function init() {
    // Setup navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // FAB button
    document.getElementById('fab-add').addEventListener('click', () => {
      if (currentTab === 'collection') {
        Collection.openAddModal();
      } else if (currentTab === 'purchases') {
        Purchases.openAddModal();
      }
    });

    // Theme init
    const darkMode = localStorage.getItem('darkMode') !== 'false';
    document.getElementById('toggle-dark-mode').checked = darkMode;
    if (!darkMode) document.body.classList.add('light-mode');

    // Currency init
    const currency = localStorage.getItem('defaultCurrency') || 'KRW';
    document.getElementById('default-currency').value = currency;

    // Set default date for purchase form
    document.getElementById('purchase-date').valueAsDate = new Date();



    // Init all modules
    Dashboard.init();
    Collection.init();
    Purchases.init();
    Analytics.init();
    Settings.init();

    // Show dashboard
    switchTab('dashboard');
  }

  function switchTab(tabName) {
    currentTab = tabName;

    // Update panels
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.tab === tabName);
    });

    // Show/hide FAB
    const fab = document.getElementById('fab-add');
    if (tabName === 'collection' || tabName === 'purchases') {
      fab.classList.remove('hidden');
    } else {
      fab.classList.add('hidden');
    }

    // Update header title
    const titles = {
      dashboard: '⚽ 축구카드 매니저',
      collection: '🃏 내 카드',
      purchases: '🛒 구매 이력',
      analytics: '📊 지출 분석',
      settings: '⚙️ 설정'
    };
    document.getElementById('header-title').textContent = titles[tabName] || '⚽ 축구카드 매니저';

    // Refresh tab data
    if (tabName === 'dashboard') Dashboard.refresh();
    if (tabName === 'collection') Collection.refresh();
    if (tabName === 'purchases') Purchases.refresh();
    if (tabName === 'analytics') Analytics.refresh();
  }



  // Format number with commas
  function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Math.round(num).toLocaleString('ko-KR');
  }

  // Format price with currency
  function formatPrice(amount, currency) {
    if (amount === null || amount === undefined) return '-';
    const symbol = currencySymbols[currency] || currency || '₩';
    return `${symbol}${formatNumber(amount)}`;
  }

  // Format date
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  }

  // Status label
  function getStatusLabel(status) {
    const labels = {
      shipping: '📦 배송중',
      keeping: '📌 킵',
      received: '✅ 수령완료'
    };
    return labels[status] || status;
  }

  function getStatusClass(status) {
    return `status-${status}`;
  }

  // Toast notification
  function toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);

    setTimeout(() => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 300);
    }, 2500);
  }

  // Confirm dialog
  function confirm(message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-overlay');
      document.getElementById('confirm-message').textContent = message;
      overlay.classList.remove('hidden');

      const okBtn = document.getElementById('confirm-ok');
      const cancelBtn = document.getElementById('confirm-cancel');

      function cleanup() {
        overlay.classList.add('hidden');
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
      }

      function onOk() { cleanup(); resolve(true); }
      function onCancel() { cleanup(); resolve(false); }
      function onOverlay(e) { if (e.target === overlay) { cleanup(); resolve(false); } }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
    });
  }

  // Debounce
  function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // Get default currency
  function getDefaultCurrency() {
    return localStorage.getItem('defaultCurrency') || 'KRW';
  }

  // Init on DOM ready
  document.addEventListener('DOMContentLoaded', init);

  return {
    switchTab,
    formatNumber,
    formatPrice,
    formatDate,
    getStatusLabel,
    getStatusClass,
    toast,
    confirm,
    debounce,
    getDefaultCurrency,
    currencySymbols
  };
})();
