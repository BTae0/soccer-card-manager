/* ================================================
   DB Module - Dexie.js based IndexedDB
   ================================================ */

const DB = (() => {
  // Initialize Dexie database
  const db = new Dexie('SoccerCardManager');

  // Schema
  db.version(1).stores({
    cards: '++id, playerName, brand, series, season, grade, currency, createdAt, updatedAt',
    purchases: '++id, site, seller, purchaseDate, status, currency, createdAt, updatedAt'
  });

  // ---- Card CRUD ----

  async function addCard(card) {
    card.createdAt = new Date().toISOString();
    card.updatedAt = new Date().toISOString();
    return await db.cards.add(card);
  }

  async function updateCard(id, data) {
    data.updatedAt = new Date().toISOString();
    return await db.cards.update(id, data);
  }

  async function deleteCard(id) {
    return await db.cards.delete(id);
  }

  async function getCard(id) {
    return await db.cards.get(id);
  }

  async function getAllCards() {
    return await db.cards.orderBy('createdAt').reverse().toArray();
  }

  async function searchCards(query) {
    const q = query.toLowerCase();
    const all = await getAllCards();
    return all.filter(c =>
      (c.playerName || '').toLowerCase().includes(q) ||
      (c.grade || '').toLowerCase().includes(q) ||
      (c.memo || '').toLowerCase().includes(q)
    );
  }

  async function filterCards({ brand, season, grade }) {
    let collection = db.cards.orderBy('createdAt').reverse();
    let results = await collection.toArray();
    if (brand) results = results.filter(c => c.brand === brand);
    if (season) results = results.filter(c => c.season === season);
    if (grade) results = results.filter(c => c.grade === grade);
    return results;
  }

  async function getCardStats() {
    const cards = await getAllCards();
    const totalCards = cards.length;
    let totalPurchase = 0;
    let totalValue = 0;
    let hasValue = false;

    cards.forEach(c => {
      totalPurchase += (c.purchasePrice || 0);
      if (c.currentValue) {
        totalValue += c.currentValue;
        hasValue = true;
      }
    });

    return { totalCards, totalPurchase, totalValue, hasValue };
  }

  async function getUniqueBrands() {
    const cards = await getAllCards();
    return [...new Set(cards.map(c => c.brand).filter(Boolean))].sort();
  }

  async function getUniqueSeasons() {
    const cards = await getAllCards();
    return [...new Set(cards.map(c => c.season).filter(Boolean))].sort().reverse();
  }

  async function getUniqueGrades() {
    const cards = await getAllCards();
    return [...new Set(cards.map(c => c.grade).filter(Boolean))].sort();
  }

  // ---- Purchase CRUD ----

  async function addPurchase(purchase) {
    purchase.createdAt = new Date().toISOString();
    purchase.updatedAt = new Date().toISOString();
    return await db.purchases.add(purchase);
  }

  async function updatePurchase(id, data) {
    data.updatedAt = new Date().toISOString();
    return await db.purchases.update(id, data);
  }

  async function deletePurchase(id) {
    return await db.purchases.delete(id);
  }

  async function getPurchase(id) {
    return await db.purchases.get(id);
  }

  async function getAllPurchases() {
    return await db.purchases.orderBy('createdAt').reverse().toArray();
  }

  async function searchPurchases(query) {
    const q = query.toLowerCase();
    const all = await getAllPurchases();
    return all.filter(p =>
      (p.site || '').toLowerCase().includes(q) ||
      (p.seller || '').toLowerCase().includes(q) ||
      (p.itemDescription || '').toLowerCase().includes(q) ||
      (p.memo || '').toLowerCase().includes(q)
    );
  }

  async function filterPurchasesByStatus(status) {
    if (!status || status === 'all') return await getAllPurchases();
    const all = await getAllPurchases();
    return all.filter(p => p.status === status);
  }

  async function getPurchaseStats() {
    const purchases = await getAllPurchases();
    let totalSpent = 0;
    let totalShipping = 0;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    let monthSpent = 0;

    purchases.forEach(p => {
      totalSpent += (p.amount || 0);
      totalShipping += (p.shippingCost || 0);
      if (p.purchaseDate && p.purchaseDate.startsWith(thisMonth)) {
        monthSpent += (p.amount || 0) + (p.shippingCost || 0);
      }
    });

    return { totalSpent, totalShipping, monthSpent, count: purchases.length };
  }

  async function getShippingAlerts() {
    const all = await getAllPurchases();
    const shipping = all.filter(p => p.status === 'shipping');
    const keeping = all.filter(p => p.status === 'keeping');
    return { shipping, keeping };
  }

  async function getUniqueSites() {
    const purchases = await getAllPurchases();
    return [...new Set(purchases.map(p => p.site).filter(Boolean))].sort();
  }

  async function getUniqueSellers() {
    const purchases = await getAllPurchases();
    return [...new Set(purchases.map(p => p.seller).filter(Boolean))].sort();
  }

  // ---- Analytics ----

  async function getMonthlySpending() {
    const purchases = await getAllPurchases();
    const monthly = {};

    purchases.forEach(p => {
      if (!p.purchaseDate) return;
      const month = p.purchaseDate.substring(0, 7); // YYYY-MM
      if (!monthly[month]) monthly[month] = 0;
      monthly[month] += (p.amount || 0) + (p.shippingCost || 0);
    });

    // Sort by month and return last 12 months
    const sorted = Object.entries(monthly)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12);

    return sorted.map(([month, amount]) => ({ month, amount }));
  }

  async function getSiteSpending() {
    const purchases = await getAllPurchases();
    const sites = {};

    purchases.forEach(p => {
      const site = p.site || '기타';
      if (!sites[site]) sites[site] = 0;
      sites[site] += (p.amount || 0) + (p.shippingCost || 0);
    });

    return Object.entries(sites)
      .map(([site, amount]) => ({ site, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  async function getAvgMonthlySpending() {
    const monthly = await getMonthlySpending();
    if (monthly.length === 0) return 0;
    const total = monthly.reduce((sum, m) => sum + m.amount, 0);
    return Math.round(total / monthly.length);
  }

  // ---- Export / Import ----

  async function exportData() {
    const cards = await getAllCards();
    const purchases = await getAllPurchases();
    const settings = {
      currency: localStorage.getItem('defaultCurrency') || 'KRW',
      darkMode: localStorage.getItem('darkMode') !== 'false'
    };
    return { version: 1, exportDate: new Date().toISOString(), cards, purchases, settings };
  }

  async function importData(data) {
    if (!data || !data.cards || !data.purchases) {
      throw new Error('잘못된 백업 파일입니다.');
    }

    // Clear existing data
    await db.cards.clear();
    await db.purchases.clear();

    // Import cards (remove id to let auto-increment work)
    for (const card of data.cards) {
      delete card.id;
      await db.cards.add(card);
    }

    // Import purchases
    for (const purchase of data.purchases) {
      delete purchase.id;
      await db.purchases.add(purchase);
    }

    // Import settings
    if (data.settings) {
      if (data.settings.currency) localStorage.setItem('defaultCurrency', data.settings.currency);
      if (data.settings.darkMode !== undefined) localStorage.setItem('darkMode', data.settings.darkMode);
    }
  }

  async function clearAllData() {
    await db.cards.clear();
    await db.purchases.clear();
  }

  // Public API
  return {
    addCard, updateCard, deleteCard, getCard, getAllCards,
    searchCards, filterCards, getCardStats,
    getUniqueBrands, getUniqueSeasons, getUniqueGrades,
    addPurchase, updatePurchase, deletePurchase, getPurchase, getAllPurchases,
    searchPurchases, filterPurchasesByStatus, getPurchaseStats,
    getShippingAlerts, getUniqueSites, getUniqueSellers,
    getMonthlySpending, getSiteSpending, getAvgMonthlySpending,
    exportData, importData, clearAllData
  };
})();
