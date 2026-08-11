/* ================================================
   Dashboard Module
   ================================================ */

const Dashboard = (() => {

  function init() {
    refresh();
  }

  async function refresh() {
    await updateStats();
    await updateShippingAlerts();
    await updateRecentCards();
  }

  async function updateStats() {
    const cardStats = await DB.getCardStats();
    const purchaseStats = await DB.getPurchaseStats();
    const currency = App.getDefaultCurrency();

    document.getElementById('stat-total-cards').textContent = App.formatNumber(cardStats.totalCards);
    document.getElementById('stat-total-spent').textContent = App.formatPrice(purchaseStats.totalSpent, currency);
    document.getElementById('stat-total-value').textContent = cardStats.hasValue
      ? App.formatPrice(cardStats.totalValue, currency)
      : '-';
    document.getElementById('stat-month-spent').textContent = App.formatPrice(purchaseStats.monthSpent, currency);
  }

  async function updateShippingAlerts() {
    const { shipping, keeping } = await DB.getShippingAlerts();
    const container = document.getElementById('shipping-alerts');
    const list = document.getElementById('shipping-alerts-list');

    if (shipping.length === 0 && keeping.length === 0) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    list.innerHTML = '';

    // Show shipping items
    shipping.forEach(p => {
      list.appendChild(createAlertItem(p, '📦', '배송중'));
    });

    // Show keeping items
    keeping.forEach(p => {
      list.appendChild(createAlertItem(p, '📌', '킵'));
    });
  }

  function createAlertItem(purchase, emoji, label) {
    const el = document.createElement('div');
    el.className = 'alert-item';
    el.onclick = () => {
      App.switchTab('purchases');
      setTimeout(() => Purchases.showDetail(purchase.id), 200);
    };

    el.innerHTML = `
      <span class="alert-badge">${emoji}</span>
      <div class="alert-text">
        <strong>${purchase.itemDescription || purchase.site || '구매 항목'}</strong>
        <span>${purchase.site} · ${App.formatPrice(purchase.amount, purchase.currency)} · ${label}</span>
      </div>
      <span class="status-badge status-${purchase.status}">${label}</span>
    `;
    return el;
  }

  async function updateRecentCards() {
    const cards = await DB.getAllCards();
    const list = document.getElementById('recent-cards-list');
    const empty = document.getElementById('recent-cards-empty');

    if (cards.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.innerHTML = '';

    // Show last 5 cards
    const recent = cards.slice(0, 5);
    recent.forEach(card => {
      const el = document.createElement('div');
      el.className = 'mini-card';
      el.onclick = () => {
        App.switchTab('collection');
        setTimeout(() => Collection.showDetail(card.id), 200);
      };

      const thumbContent = card.photo
        ? `<img src="${card.photo}" alt="${card.playerName}">`
        : '🃏';

      const subParts = card.grade || '';

      el.innerHTML = `
        <div class="mini-card-thumb">${thumbContent}</div>
        <div class="mini-card-info">
          <div class="card-name">${escapeHtml(card.playerName)}</div>
          <div class="card-sub">${escapeHtml(subParts)}</div>
        </div>
        <div class="mini-card-price">
          <div class="price">₩${App.formatNumber(card.purchasePrice)}</div>
          ${card.currentValue ? `<div class="price-label">시세 ₩${App.formatNumber(card.currentValue)}</div>` : ''}
        </div>
      `;
      list.appendChild(el);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, refresh };
})();
