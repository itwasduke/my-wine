import { state } from './state.js?v=2.0.56';

const OWNER_UID = 'ZJgo9XDaDyT4Xwrvpsrlp1M7rk33';
const isOwner = () => state.currentUser && state.currentUser.uid === OWNER_UID;

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function openModal(id) {
  const w = state.inventory[id];
  if (!w) return;

  const overlay = document.getElementById('modalOverlay');
  const el = document.getElementById('modalContent');
  
  const qty = parseInt(w.quantity) || 0;
  const isConsumed = (w.status === 'consumed' || qty === 0);
  const showBuyAgain = !!state.currentUser;

  el.dataset.openId = id;

  const proScoresHtml = w.proScores ? `
    <div class="modal-divider"></div>
    <div class="modal-section-label">Critic Consensus</div>
    <div class="modal-text" style="font-size:0.85rem; font-style:italic; margin-bottom:12px;">${esc(w.proScores.summary)}</div>
    <div class="modal-meta" style="margin-bottom:12px;">
      <div class="meta-item">
        <span class="meta-label">Critic Scores</span>
        <span class="meta-value" style="color:var(--accent); font-weight:600;">${esc(w.proScores.scores)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Regional Vintage Rating</span>
        <span class="meta-value">${esc(w.proScores.vintage)}</span>
      </div>
    </div>
  ` : (w.status !== 'spirits' && isOwner() ? `
    <div class="modal-divider"></div>
    <button class="consume-btn" data-action="lookup-scores" data-id="${esc(id)}" style="margin-bottom:20px; border-color:var(--text-muted); color:var(--text-secondary);">
      🔍 Look up Professional Scores
    </button>
  ` : '');

  const ratingHtml = isConsumed && isOwner() ? `
    <div class="modal-divider"></div>
    <div class="modal-section-label">Your Rating</div>
    <div class="rating-row">
      <button class="rating-btn ${w.liked === true ? 'liked-active' : ''}" data-action="rate" data-id="${esc(id)}" data-value="true">
        <span>👍</span> Liked
      </button>
      <button class="rating-btn ${w.liked === false ? 'disliked-active' : ''}" data-action="rate" data-id="${esc(id)}" data-value="false">
        <span>👎</span> Disliked
      </button>
    </div>
  ` : '';

  const buyAgainHtml = showBuyAgain && isOwner() ? `
    <button class="buy-again-btn ${w.buyAgain ? 'buy-again-active' : ''}" data-action="buy-again" data-id="${esc(id)}">
      <span>${w.buyAgain ? '⭐' : '☆'}</span> ${w.buyAgain ? 'Marked for Repurchase' : 'Buy Again?'}
    </button>
  ` : '';

  const quantityRow = !isConsumed ? `
    <div class="qty-row">
      <div class="meta-item">
        <span class="meta-label">In Stock</span>
        <div class="qty-controls">
          <button class="qty-btn" data-action="qty-dec" data-id="${esc(id)}" ${!isOwner() ? 'disabled' : ''}>–</button>
          <span class="qty-value">${qty}</span>
          <button class="qty-btn" data-action="qty-inc" data-id="${esc(id)}" ${!isOwner() ? 'disabled' : ''}>+</button>
        </div>
      </div>
      <div class="meta-item">
        <span class="meta-label">Lifetime Consumed</span>
        <span class="qty-value" style="margin-top:6px; display:inline-block; opacity:0.6;">${parseInt(w.consumedCount) || 0}</span>
      </div>
    </div>
  ` : (isOwner() ? `
    <div class="qty-row" style="background:transparent; border:none; padding:0; margin-bottom:20px;">
      <div class="meta-item">
        <span class="meta-label">Lifetime Consumed</span>
        <input type="number" id="edit-consumed-count" class="qty-input" value="${parseInt(w.consumedCount) || 0}" data-id="${esc(id)}">
      </div>
    </div>
  ` : '');

  el.innerHTML = `
    <div class="modal-year">${esc(w.year)}</div>
    <div class="modal-name">${esc(w.name)}</div>
    <div class="modal-region">${esc(w.region)}</div>
    <span class="modal-status status-${esc(w.status)}">${esc(w.statusLabel)}</span>
    <div class="modal-divider"></div>
    <div class="modal-meta">
      <div class="meta-item">
        <span class="meta-label">Grape / Style</span>
        <span class="meta-value">${esc(w.grape)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">ABV</span>
        <span class="meta-value">${esc(w.abv)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Serve Temp</span>
        <span class="meta-value">${esc(w.temp)}</span>
      </div>
    </div>

    ${quantityRow}
    ${proScoresHtml}

    <div class="modal-section-label">Tasting Notes</div>
    <div class="modal-text">${esc(w.notes)}</div>
    <div class="modal-section-label">Decanting</div>
    <div class="modal-text">${esc(w.decant)}</div>
    <div class="modal-section-label">Drinking Window</div>
    <div class="modal-text">${esc(w.window)}</div>

    ${ratingHtml}
    ${buyAgainHtml}

    ${(!isConsumed && isOwner()) ? `<button class="consume-btn" data-action="consume" data-id="${esc(id)}">Mark as Consumed</button>` : ''}
    ${isOwner() ? `<button class="delete-btn" data-action="delete" data-id="${esc(id)}">Remove from Cellar</button>` : ''}
  `;

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

export function closeModalDirect() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}
