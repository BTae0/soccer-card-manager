/* ================================================
   Purchases Module - Purchase CRUD & Status
   ================================================ */

const Purchases = (() => {
  let currentStatus = 'all';

  function init() {
    // Search
    document.getElementById('purchase-search').addEventListener('input',
      App.debounce((e) => refresh(e.target.value))
    );

    // Status filter chips
    document.querySelectorAll('#purchase-status-chips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#purchase-status-chips .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentStatus = chip.dataset.status;
        refresh();
      });
    });

    // Form submit
    document.getElementById('form-purchase').addEventListener('submit', handleSubmit);
  }

  async function refresh(searchQuery) {
    let purchases;

    if (searchQuery) {
      purchases = await DB.searchPurchases(searchQuery);
      if (currentStatus !== 'all') {
        purchases = purchases.filter(p => p.status === currentStatus);
      }
    } else {
      purchases = await DB.filterPurchasesByStatus(currentStatus);
    }

    renderPurchases(purchases);
    await updateSiteSuggestions();
    await updateSellerSuggestions();
  }

  function renderPurchases(purchases) {
    const list = document.getElementById('purchase-list');
    const empty = document.getElementById('purchase-empty');

    if (purchases.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.innerHTML = '';

    purchases.forEach(p => {
      const el = document.createElement('div');
      el.className = 'purchase-item';
      el.onclick = () => showDetail(p.id);

      const statusLabel = App.getStatusLabel(p.status);
      const statusClass = App.getStatusClass(p.status);

      el.innerHTML = `
        <div class="purchase-item-header">
          <span class="purchase-item-site">
            <span class="status-badge ${statusClass}">${statusLabel}</span>
            ${escapeHtml(p.site)}
          </span>
          <span class="purchase-item-date">${App.formatDate(p.purchaseDate)}</span>
        </div>
        <div class="purchase-item-body">
          <span class="purchase-item-desc">${escapeHtml(p.itemDescription || '-')}</span>
          <span class="purchase-item-amount">${App.formatPrice(p.amount, p.currency)}</span>
        </div>
        ${p.seller || p.shippingCost ? `
          <div class="purchase-item-footer">
            <span class="purchase-item-seller">${p.seller ? '판매자: ' + escapeHtml(p.seller) : ''}</span>
            ${p.shippingCost ? `<span class="purchase-item-seller">배송비: ${App.formatPrice(p.shippingCost, p.currency)}</span>` : ''}
          </div>
        ` : ''}
      `;
      list.appendChild(el);
    });
  }

  async function updateSiteSuggestions() {
    const sites = await DB.getUniqueSites();
    const datalist = document.getElementById('site-suggestions');
    datalist.innerHTML = '';
    sites.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      datalist.appendChild(opt);
    });
  }

  async function updateSellerSuggestions() {
    const sellers = await DB.getUniqueSellers();
    const datalist = document.getElementById('seller-suggestions');
    datalist.innerHTML = '';
    sellers.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      datalist.appendChild(opt);
    });
  }

  // ---- Modal ----

  function openAddModal() {
    document.getElementById('modal-purchase-title').textContent = '구매 기록';
    document.getElementById('form-purchase').reset();
    document.getElementById('purchase-id').value = '';
    document.getElementById('purchase-date').valueAsDate = new Date();
    document.getElementById('purchase-quantity').value = '1';
    // Reset status radio
    document.querySelector('input[name="purchase-status"][value="shipping"]').checked = true;
    document.getElementById('modal-purchase').classList.remove('hidden');
  }

  async function openEditModal(id) {
    const p = await DB.getPurchase(id);
    if (!p) return;

    document.getElementById('modal-purchase-title').textContent = '구매 수정';
    document.getElementById('purchase-id').value = p.id;
    document.getElementById('purchase-site').value = p.site || '';
    document.getElementById('purchase-seller').value = p.seller || '';
    document.getElementById('purchase-date').value = p.purchaseDate || '';
    document.getElementById('purchase-item-desc').value = p.itemDescription || '';
    document.getElementById('purchase-amount').value = p.amount || '';
    document.getElementById('purchase-shipping-cost').value = p.shippingCost || '';
    document.getElementById('purchase-quantity').value = p.quantity || 1;
    document.getElementById('purchase-memo').value = p.memo || '';

    // Set status radio
    const radio = document.querySelector(`input[name="purchase-status"][value="${p.status}"]`);
    if (radio) radio.checked = true;

    document.getElementById('modal-purchase').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-purchase').classList.add('hidden');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('purchase-id').value;
    const statusRadio = document.querySelector('input[name="purchase-status"]:checked');

    const purchase = {
      site: document.getElementById('purchase-site').value.trim(),
      seller: document.getElementById('purchase-seller').value.trim(),
      purchaseDate: document.getElementById('purchase-date').value,
      itemDescription: document.getElementById('purchase-item-desc').value.trim(),
      amount: parseFloat(document.getElementById('purchase-amount').value) || 0,
      currency: 'KRW',
      shippingCost: parseFloat(document.getElementById('purchase-shipping-cost').value) || 0,
      quantity: parseInt(document.getElementById('purchase-quantity').value) || 1,
      status: statusRadio ? statusRadio.value : 'shipping',
      memo: document.getElementById('purchase-memo').value.trim()
    };

    try {
      if (id) {
        await DB.updatePurchase(parseInt(id), purchase);
        App.toast('구매 기록이 수정되었습니다');
      } else {
        await DB.addPurchase(purchase);
        App.toast('구매 기록이 추가되었습니다');
      }
      closeModal();
      refresh();
    } catch (err) {
      App.toast('저장 중 오류가 발생했습니다', 'error');
      console.error(err);
    }
  }

  // ---- Detail Modal ----

  async function showDetail(id) {
    const p = await DB.getPurchase(id);
    if (!p) return;

    const content = document.getElementById('purchase-detail-content');
    document.getElementById('modal-purchase-detail-title').textContent = p.site || '구매 상세';

    const rows = [
      ['구매 사이트', p.site],
      ['판매자', p.seller],
      ['구매일', App.formatDate(p.purchaseDate)],
      ['구매 내용', p.itemDescription],
      ['구매 금액', App.formatPrice(p.amount, p.currency)],
      ['배송비', p.shippingCost ? App.formatPrice(p.shippingCost, p.currency) : '-'],
      ['수량', p.quantity || 1],
      ['배송 상태', App.getStatusLabel(p.status)],
      ['메모', p.memo],
      ['등록일', App.formatDate(p.createdAt)]
    ];

    let html = '';
    rows.forEach(([label, value]) => {
      if (value) {
        html += `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${escapeHtml(String(value))}</span></div>`;
      }
    });

    // Total cost
    const total = (p.amount || 0) + (p.shippingCost || 0);
    html += `<div class="detail-row" style="border-top: 2px solid var(--accent-green-dim); margin-top: 8px; padding-top: 12px;">
      <span class="detail-label" style="font-weight:700;">총 비용</span>
      <span class="detail-value" style="color: var(--accent-green); font-size: var(--font-lg);">${App.formatPrice(total, p.currency)}</span>
    </div>`;

    html += `
      <div class="detail-actions">
        <button class="btn btn-ghost" onclick="Purchases.openEditModal(${p.id}); Purchases.closeDetailModal();">✏️ 수정</button>
        <button class="btn btn-danger btn-sm" onclick="Purchases.deletePurchase(${p.id})">🗑️ 삭제</button>
      </div>
    `;

    content.innerHTML = html;
    document.getElementById('modal-purchase-detail').classList.remove('hidden');
  }

  function closeDetailModal() {
    document.getElementById('modal-purchase-detail').classList.add('hidden');
  }

  async function deletePurchase(id) {
    const confirmed = await App.confirm('이 구매 기록을 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      await DB.deletePurchase(id);
      App.toast('구매 기록이 삭제되었습니다');
      closeDetailModal();
      refresh();
    } catch (err) {
      App.toast('삭제 중 오류가 발생했습니다', 'error');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    init, refresh, openAddModal, openEditModal, closeModal,
    showDetail, closeDetailModal, deletePurchase
  };
})();
