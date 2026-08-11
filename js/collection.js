/* ================================================
   Collection Module - Card CRUD & Display (Simplified)
   ================================================ */

const Collection = (() => {
  let isGridView = false;

  function init() {
    // Search
    document.getElementById('collection-search').addEventListener('input',
      App.debounce((e) => refresh(e.target.value))
    );

    // View toggle
    document.getElementById('collection-view-toggle').addEventListener('click', toggleView);

    // Filter toggle (hide filter panel - simplified)
    document.getElementById('collection-filter-btn').addEventListener('click', toggleFilterPanel);
    document.getElementById('filter-apply').addEventListener('click', applyFilters);
    document.getElementById('filter-reset').addEventListener('click', resetFilters);

    // Form submit
    document.getElementById('form-card').addEventListener('submit', handleSubmit);

    // Photo input
    document.getElementById('card-photo').addEventListener('change', handlePhotoChange);
  }

  async function refresh(searchQuery) {
    let cards;

    if (searchQuery) {
      cards = await DB.searchCards(searchQuery);
    } else {
      cards = await DB.getAllCards();
    }

    renderCards(cards);
  }

  function renderCards(cards) {
    const list = document.getElementById('collection-list');
    const empty = document.getElementById('collection-empty');

    if (cards.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');
    list.className = `collection-grid${isGridView ? ' grid-view' : ''}`;
    list.innerHTML = '';

    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'card-item';
      el.onclick = () => showDetail(card.id);

      const thumbContent = card.photo
        ? `<img src="${card.photo}" alt="${escapeHtml(card.playerName)}">`
        : '🃏';

      const gradeBadge = card.grade
        ? `<span>${escapeHtml(card.grade)}</span>`
        : '';

      el.innerHTML = `
        <div class="card-item-thumb">${thumbContent}</div>
        <div class="card-item-info">
          <div class="player-name">${escapeHtml(card.playerName)}</div>
          <div class="card-meta">
            ${gradeBadge}
          </div>
        </div>
        <div class="card-item-price">
          <div class="buy-price">₩${App.formatNumber(card.purchasePrice)}</div>
          ${card.currentValue ? `<div class="cur-value">시세 ₩${App.formatNumber(card.currentValue)}</div>` : ''}
        </div>
      `;
      list.appendChild(el);
    });
  }

  function toggleFilterPanel() {
    const panel = document.getElementById('collection-filter-panel');
    const btn = document.getElementById('collection-filter-btn');
    panel.classList.toggle('hidden');
    btn.classList.toggle('active');
  }

  function toggleView() {
    isGridView = !isGridView;
    refresh(document.getElementById('collection-search').value);
  }

  function applyFilters() {
    document.getElementById('collection-filter-panel').classList.add('hidden');
    refresh();
  }

  function resetFilters() {
    document.getElementById('collection-filter-panel').classList.add('hidden');
    document.getElementById('collection-filter-btn').classList.remove('active');
    refresh();
  }

  // ---- Modal ----

  function openAddModal() {
    document.getElementById('modal-card-title').textContent = '카드 등록';
    document.getElementById('form-card').reset();
    document.getElementById('card-id').value = '';
    removePhoto();
    document.getElementById('modal-card').classList.remove('hidden');
  }

  async function openEditModal(id) {
    const card = await DB.getCard(id);
    if (!card) return;

    document.getElementById('modal-card-title').textContent = '카드 수정';
    document.getElementById('card-id').value = card.id;
    document.getElementById('card-player').value = card.playerName || '';
    document.getElementById('card-grade').value = card.grade || '';
    document.getElementById('card-purchase-price').value = card.purchasePrice || '';
    document.getElementById('card-current-value').value = card.currentValue || '';
    document.getElementById('card-memo').value = card.memo || '';

    if (card.photo) {
      document.getElementById('card-photo-img').src = card.photo;
      document.getElementById('card-photo-preview').classList.remove('hidden');
      document.getElementById('card-photo-placeholder').classList.add('hidden');
    } else {
      removePhoto();
    }

    document.getElementById('modal-card').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-card').classList.add('hidden');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('card-id').value;
    const photoImg = document.getElementById('card-photo-img');
    const photoPreview = document.getElementById('card-photo-preview');

    const card = {
      playerName: document.getElementById('card-player').value.trim(),
      grade: document.getElementById('card-grade').value.trim(),
      purchasePrice: parseFloat(document.getElementById('card-purchase-price').value) || 0,
      currency: 'KRW',
      currentValue: parseFloat(document.getElementById('card-current-value').value) || null,
      valueCurrency: 'KRW',
      memo: document.getElementById('card-memo').value.trim(),
      photo: (!photoPreview.classList.contains('hidden') && photoImg.src) ? photoImg.src : null
    };

    try {
      if (id) {
        await DB.updateCard(parseInt(id), card);
        App.toast('카드가 수정되었습니다');
      } else {
        await DB.addCard(card);
        App.toast('카드가 등록되었습니다');
      }
      closeModal();
      refresh();
    } catch (err) {
      App.toast('저장 중 오류가 발생했습니다', 'error');
      console.error(err);
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800;
        let w = img.width;
        let h = img.height;

        if (w > maxSize || h > maxSize) {
          if (w > h) {
            h = Math.round(h * maxSize / w);
            w = maxSize;
          } else {
            w = Math.round(w * maxSize / h);
            h = maxSize;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        document.getElementById('card-photo-img').src = dataUrl;
        document.getElementById('card-photo-preview').classList.remove('hidden');
        document.getElementById('card-photo-placeholder').classList.add('hidden');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    document.getElementById('card-photo-img').src = '';
    document.getElementById('card-photo-preview').classList.add('hidden');
    document.getElementById('card-photo-placeholder').classList.remove('hidden');
    document.getElementById('card-photo').value = '';
  }

  // ---- Detail Modal ----

  async function showDetail(id) {
    const card = await DB.getCard(id);
    if (!card) return;

    const content = document.getElementById('card-detail-content');
    document.getElementById('modal-detail-title').textContent = card.playerName;

    let html = '';

    if (card.photo) {
      html += `<img src="${card.photo}" alt="${escapeHtml(card.playerName)}" class="detail-photo">`;
    }

    const rows = [
      ['카드명', card.playerName],
      ['등급', card.grade],
      ['구매가', card.purchasePrice ? `₩${App.formatNumber(card.purchasePrice)}` : '-'],
      ['시세', card.currentValue ? `₩${App.formatNumber(card.currentValue)}` : '-'],
      ['메모', card.memo],
      ['등록일', App.formatDate(card.createdAt)]
    ];

    rows.forEach(([label, value]) => {
      if (value) {
        html += `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${escapeHtml(String(value))}</span></div>`;
      }
    });

    // Profit/Loss if both prices exist
    if (card.purchasePrice && card.currentValue) {
      const diff = card.currentValue - card.purchasePrice;
      const diffPercent = ((diff / card.purchasePrice) * 100).toFixed(1);
      const color = diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      const sign = diff >= 0 ? '+' : '';
      html += `<div class="detail-row" style="border-top: 2px solid var(--accent-green-dim); margin-top: 8px; padding-top: 12px;">
        <span class="detail-label" style="font-weight:700;">손익</span>
        <span class="detail-value" style="color: ${color}; font-size: var(--font-lg);">${sign}₩${App.formatNumber(diff)} (${sign}${diffPercent}%)</span>
      </div>`;
    }

    html += `
      <div class="detail-actions">
        <button class="btn btn-ghost" onclick="Collection.openEditModal(${card.id})">✏️ 수정</button>
        <button class="btn btn-danger btn-sm" onclick="Collection.deleteCard(${card.id})">🗑️ 삭제</button>
      </div>
    `;

    content.innerHTML = html;
    document.getElementById('modal-card-detail').classList.remove('hidden');
  }

  function closeDetailModal() {
    document.getElementById('modal-card-detail').classList.add('hidden');
  }

  async function deleteCard(id) {
    const confirmed = await App.confirm('이 카드를 삭제하시겠습니까?');
    if (!confirmed) return;

    try {
      await DB.deleteCard(id);
      App.toast('카드가 삭제되었습니다');
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
    showDetail, closeDetailModal, deleteCard, removePhoto
  };
})();
