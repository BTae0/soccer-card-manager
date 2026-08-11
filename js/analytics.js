/* ================================================
   Analytics Module - Charts & Statistics
   ================================================ */

const Analytics = (() => {
  const chartColors = [
    '#00E676', '#FFD600', '#42A5F5', '#AB47BC',
    '#EF5350', '#FFA726', '#26C6DA', '#66BB6A',
    '#EC407A', '#7E57C2', '#8D6E63', '#78909C'
  ];

  function init() {
    // Charts will render on refresh
  }

  async function refresh() {
    const purchases = await DB.getAllPurchases();

    if (purchases.length === 0) {
      document.getElementById('analytics-empty').classList.remove('hidden');
      return;
    }

    document.getElementById('analytics-empty').classList.add('hidden');
    await updateSummary();
    await drawMonthlyChart();
    await drawSiteChart();
  }

  async function updateSummary() {
    const stats = await DB.getPurchaseStats();
    const cardStats = await DB.getCardStats();
    const avgMonthly = await DB.getAvgMonthlySpending();
    const currency = App.getDefaultCurrency();

    document.getElementById('analytics-total-spent').textContent = App.formatPrice(stats.totalSpent, currency);
    document.getElementById('analytics-total-shipping').textContent = App.formatPrice(stats.totalShipping, currency);
    document.getElementById('analytics-avg-monthly').textContent = App.formatPrice(avgMonthly, currency);

    // Profit rate
    if (cardStats.hasValue && cardStats.totalPurchase > 0) {
      const profitRate = ((cardStats.totalValue - cardStats.totalPurchase) / cardStats.totalPurchase * 100).toFixed(1);
      const el = document.getElementById('analytics-profit-rate');
      el.textContent = `${profitRate > 0 ? '+' : ''}${profitRate}%`;
      el.style.color = profitRate >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    } else {
      document.getElementById('analytics-profit-rate').textContent = '-';
    }
  }

  async function drawMonthlyChart() {
    const monthly = await DB.getMonthlySpending();
    if (monthly.length === 0) return;

    const canvas = document.getElementById('chart-monthly');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = (rect.width - 32) * dpr;
    canvas.height = 200 * dpr;
    canvas.style.width = (rect.width - 32) + 'px';
    canvas.style.height = '200px';
    ctx.scale(dpr, dpr);

    const w = rect.width - 32;
    const h = 200;
    const padding = { top: 20, right: 10, bottom: 40, left: 60 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    const maxVal = Math.max(...monthly.map(m => m.amount), 1);
    const barWidth = Math.min(30, (chartW / monthly.length) * 0.6);
    const gap = chartW / monthly.length;

    // Y-axis grid
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border-color') || 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-tertiary') || '#6B7280';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + chartH - (chartH * i / 4);
      const val = maxVal * i / 4;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      ctx.fillText(formatShortNumber(val), padding.left - 8, y + 4);
    }

    // Bars
    monthly.forEach((item, i) => {
      const x = padding.left + gap * i + (gap - barWidth) / 2;
      const barH = (item.amount / maxVal) * chartH;
      const y = padding.top + chartH - barH;

      // Gradient bar
      const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartH);
      gradient.addColorStop(0, '#00E676');
      gradient.addColorStop(1, 'rgba(0, 230, 118, 0.2)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      roundedRect(ctx, x, y, barWidth, barH, 4);
      ctx.fill();

      // Month label
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-tertiary') || '#6B7280';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      const monthLabel = item.month.substring(5); // MM
      ctx.fillText(monthLabel + '월', x + barWidth / 2, h - padding.bottom + 16);
    });
  }

  async function drawSiteChart() {
    const sites = await DB.getSiteSpending();
    if (sites.length === 0) return;

    const canvas = document.getElementById('chart-site');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.parentElement.getBoundingClientRect();
    const size = Math.min(rect.width - 32, 200);
    canvas.width = (rect.width - 32) * dpr;
    canvas.height = size * dpr;
    canvas.style.width = (rect.width - 32) + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const w = rect.width - 32;
    const h = size;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, w, h);

    const total = sites.reduce((sum, s) => sum + s.amount, 0);
    let startAngle = -Math.PI / 2;

    const currency = App.getDefaultCurrency();
    const legend = document.getElementById('chart-site-legend');
    legend.innerHTML = '';

    sites.forEach((item, i) => {
      const sliceAngle = (item.amount / total) * 2 * Math.PI;
      const color = chartColors[i % chartColors.length];

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Separator line
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--bg-secondary') || '#111827';
      ctx.lineWidth = 2;
      ctx.stroke();

      startAngle += sliceAngle;

      // Legend
      const percent = ((item.amount / total) * 100).toFixed(1);
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.innerHTML = `
        <span class="legend-dot" style="background:${color}"></span>
        <span>${escapeHtml(item.site)} (${percent}%) ${App.formatPrice(item.amount, currency)}</span>
      `;
      legend.appendChild(legendItem);
    });

    // Center hole (donut)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-glass') ||
      (document.body.classList.contains('light-mode') ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.06)');
    ctx.fill();

    // Center text
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#F9FAFB';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(App.formatPrice(total, currency), centerX, centerY - 6);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-tertiary') || '#6B7280';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('총 지출', centerX, centerY + 12);
  }

  function roundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  function formatShortNumber(num) {
    if (num >= 10000000) return (num / 10000000).toFixed(1) + '천만';
    if (num >= 10000) return (num / 10000).toFixed(0) + '만';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return Math.round(num).toString();
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, refresh };
})();
