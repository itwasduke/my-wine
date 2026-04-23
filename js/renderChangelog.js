import { CHANGELOG } from './changelog.js?v=2.0.48';

export function renderChangelog(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const html = CHANGELOG.map(entry => `
    <div class="changelog-entry" style="margin-bottom:28px; border-left:2px solid var(--accent); padding-left:16px;">
      <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">
        <span style="font-family:'Cinzel', serif; font-size:1.1rem; color:var(--accent);">v${entry.version}</span>
        <span style="font-size:0.75rem; color:var(--text-muted); letter-spacing:0.05em;">${entry.date}</span>
      </div>
      <ul style="margin:0; padding:0; list-style:none;">
        ${entry.changes.map(change => `
          <li style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:6px; line-height:1.4; display:flex; gap:8px;">
            <span style="color:var(--accent); opacity:0.6;">•</span>
            <span>${change}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="max-height: 70vh; overflow-y: auto; padding-right: 8px;">
      ${html}
    </div>
  `;
}
