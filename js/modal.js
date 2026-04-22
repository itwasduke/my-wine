import { state } from './state.js?v=2.0.28';

export function openModal(id) {
  const w = state.inventory[id];
  if (!w) return;

  // A bottle is consumed if status is 'consumed'
  const isConsumed = (w.status === 'consumed');

  // For UI: default to 1 if quantity is missing and it's not consumed
  const displayQty = (w.quantity === undefined) ? (isConsumed ? 0 : 1) : parseInt(w.quantity);

  const showConsumeBtn = state.currentUser && !isConsumed;
  const showRating     = state.currentUser && isConsumed;
  const el = document.getElementById('modalContent');
  el.dataset.openId = id;
  el.innerHTML = `
    <div class="modal-year">${w.year}</div>
    <div class="modal-name">${w.name}</div>
    <div class="modal-region">${w.region}</div>
    <span class="modal-status status-${w.status}">${w.statusLabel}</span>
    <div class="modal-divider"></div>
    <div class="modal-meta">
      <div class="meta-item"><span class="meta-label">Variety</span><span class="meta-value">${w.grape}</span></div>
      <div class="meta-item"><span class="meta-label">ABV</span><span class="meta-value">${w.abv}</span></div>
      <div class="meta-item"><span class="meta-label">Serve</span><span class="meta-value">${w.temp}</span></div>
    </div>

    <div class="qty-row">
      ${!isConsumed ? `
        <div class="meta-item">
          <span class="meta-label">In Stock</span>
          <div class="qty-controls">
            ${state.currentUser ? `<button class="qty-btn" data-action="qty-dec" data-id="${id}">–</button>` : ''}
            <span class="qty-value">${displayQty}</span>
            ${state.currentUser ? `<button class="qty-btn" data-action="qty-inc" data-id="${id}">+</button>` : ''}
          </div>
        </div>
      ` : ''}
      ${state.currentUser ? `
        <div class="meta-item">
          <span class="meta-label">Lifetime Consumed</span>
          <input type="number" class="qty-input" id="edit-consumed-count" value="${w.consumedCount || 0}" min="0" data-id="${id}">
        </div>
      ` : ''}
    </div>

    <div class="modal-section-label">Tasting Notes</div>
    <div class="modal-text">${w.notes}</div>
    <div class="modal-section-label">Decanting</div>
    <div class="modal-text">${w.decant}</div>
    <div class="modal-section-label">Drinking Window</div>
    <div class="modal-text">${w.window}</div>

    ${w.proScores ? `
      <div class="modal-section-label">Professional Ratings</div>
      <div class="modal-text" style="color:var(--ready); font-weight:500;">${w.proScores.scores}</div>
      <div class="modal-text" style="font-size:0.85rem; font-style:italic;">${w.proScores.summary}</div>
      ${w.proScores.vintage ? `
        <div class="modal-section-label" style="margin-top:12px;">Regional Vintage Rating</div>
        <div class="modal-text" style="font-weight:500;">${w.proScores.vintage}</div>
      ` : ''}
    ` : (state.currentUser ? `
      <button class="consume-btn" style="border-color:var(--text-muted); color:var(--text-secondary); margin-top:16px;" data-action="lookup-scores" data-id="${id}">
        🔍 Lookup Pro Scores & Vintage
      </button>
    ` : '')}

    ${showConsumeBtn ? `<div class="modal-divider" style="margin-top:24px"></div>
      <button class="consume-btn" data-action="consume" data-id="${id}">Mark as Consumed</button>` : '<div class="modal-divider" style="margin-top:24px"></div>'}

    ${state.currentUser ? `
      <button class="buy-again-btn${w.buyAgain ? ' buy-again-active' : ''}" data-action="buy-again" data-id="${id}">
        <span>⭐</span> Buy Again
      </button>
    ` : ''}

    ${showRating ? `
      <div class="rating-row">
        <button class="rating-btn${w.liked === true ? ' liked-active' : ''}" data-action="rate" data-id="${id}" data-value="true">
          <span>👍</span> Liked
        </button>
        <button class="rating-btn${w.liked === false ? ' disliked-active' : ''}" data-action="rate" data-id="${id}" data-value="false">
          <span>👎</span> Didn't Like
        </button>
      </div>` : ''}
    ${state.currentUser ? `<button class="delete-btn" data-action="delete" data-id="${id}">Remove from Cellar</button>` : ''}
  `;
  document.getElementById('modalOverlay').classList.add('active');
}

export function closeModalDirect() {
  document.getElementById('modalOverlay').classList.remove('active');
}
