import { app } from './firebase.js';
import { state } from './state.js';
import { saveNewBottle } from './db.js';

export async function handleImageSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const preview    = document.getElementById('scanPreview');
  const status     = document.getElementById('scanStatus');
  const statusText = document.getElementById('scanStatusText');
  const spinner    = document.getElementById('scanSpinner');
  const form       = document.getElementById('addForm');
  const addBtn     = document.getElementById('addBtn');

  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
  status.className = 'scan-status';
  statusText.textContent = 'Reading label with Gemini…';
  spinner.style.display = '';
  form.classList.remove('visible');
  addBtn.disabled = true;
  document.getElementById('scanOverlay').classList.add('active');

  try {
    const { base64, mimeType } = await readFileAsBase64(file);
    let geminiModel;
    let sdkLoadError;

    try {
      const { getVertexAI, getGenerativeModel } =
        await import('https://www.gstatic.com/firebasejs/12.11.0/firebase-vertexai.js');
      geminiModel = getGenerativeModel(getVertexAI(app), { model: 'gemini-2.5-flash' });
    } catch (e1) {
      try {
        const { getAI, getGenerativeModel, GoogleAIBackend } =
          await import('https://www.gstatic.com/firebasejs/12.11.0/firebase-ai.js');
        geminiModel = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), { model: 'gemini-2.5-flash' });
      } catch (e2) {
        sdkLoadError = e2;
      }
    }

    if (!geminiModel) throw sdkLoadError || new Error('Could not load Firebase AI SDK');

    const data = await analyzeLabel(base64, mimeType, geminiModel);
    populateAddForm(data);
    spinner.style.display = 'none';
    statusText.textContent = 'Label read — review and edit before saving';
    status.classList.add('done');
    form.classList.add('visible');
    addBtn.disabled = false;
  } catch (e) {
    console.error('[Cellar] Gemini label read failed:', e);
    spinner.style.display = 'none';
    const detail = e?.message || String(e);
    statusText.textContent = `Error: ${detail}`;
    status.classList.add('error');
    form.classList.add('visible');
    addBtn.disabled = false;
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve({ base64: reader.result.split(',')[1], mimeType: file.type || 'image/jpeg' });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function analyzeLabel(base64, mimeType, geminiModel) {
  const prompt = `You are an expert sommelier analyzing a wine or spirits label photograph.
Extract information from the label and respond with ONLY a valid JSON object — no markdown, no code fences, no explanation, just the raw JSON:
{
  "name": "full producer and wine or spirit name as on the label",
  "year": "4-digit vintage year as a string, NV if non-vintage, or age statement for spirits (e.g. 12 Year)",
  "region": "appellation, region, and country (e.g. Napa Valley, California or Rioja, Spain)",
  "grape": "grape variety or blend for wine; mash bill or spirit type for spirits (e.g. Single Malt Scotch Whisky)",
  "abv": "alcohol by volume with % symbol (e.g. 13.5%), or — if not visible",
  "temp": "ideal serving temperature range in °F appropriate for this wine or spirit type",
  "notes": "2–3 sentences of expert tasting notes appropriate for this wine or spirit's style, region, and vintage",
  "decant": "specific decanting recommendation: duration and brief reason, or No decanting needed if not applicable",
  "window": "drinking window or aging recommendation",
  "type": "wine or spirit — classify this as exactly one of those two words"
}`;

  const result = await geminiModel.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64 } }
  ]);
  const text = result.response.text().trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  return JSON.parse(text);
}

function populateAddForm(data) {
  document.getElementById('f-name').value   = data.name   || '';
  document.getElementById('f-year').value   = data.year   || '';
  document.getElementById('f-region').value = data.region || '';
  document.getElementById('f-grape').value  = data.grape  || '';
  document.getElementById('f-abv').value    = data.abv    || '';
  document.getElementById('f-temp').value   = data.temp   || '';
  document.getElementById('f-notes').value  = data.notes  || '';
  document.getElementById('f-decant').value = data.decant || '';
  document.getElementById('f-window').value = data.window || '';
  document.getElementById('f-type').value   = data.type === 'spirit' ? 'spirit' : 'wine';
}

export function closeScanModal() {
  document.getElementById('scanOverlay').classList.remove('active');
  const preview = document.getElementById('scanPreview');
  URL.revokeObjectURL(preview.src);
  preview.src = '';
  preview.style.display = 'none';
}

window.openAddBottle = function() {
  if (!state.currentUser) return;
  document.getElementById('cameraInput').value = '';
  document.getElementById('cameraInput').click();
};

window.handleImageSelected = handleImageSelected;
window.closeScanModal = closeScanModal;
window.confirmAddBottle = async function() {
  if (!state.currentUser) return;
  const name = document.getElementById('f-name').value.trim();
  if (!name) { document.getElementById('f-name').focus(); return; }
  const isSpirit   = document.getElementById('f-type').value === 'spirit';
  const status      = isSpirit ? 'spirits' : 'ready';
  const statusLabel = isSpirit ? 'Spirits'  : 'Ready to Drink';
  const data = {
    name,
    year:        document.getElementById('f-year').value.trim()   || 'NV',
    region:      document.getElementById('f-region').value.trim() || '—',
    grape:       document.getElementById('f-grape').value.trim()  || '—',
    abv:         document.getElementById('f-abv').value.trim()    || '—',
    temp:        document.getElementById('f-temp').value.trim()   || '—',
    notes:       document.getElementById('f-notes').value.trim()  || '—',
    decant:      document.getElementById('f-decant').value.trim() || '—',
    window:      document.getElementById('f-window').value.trim() || '—',
    status,
    statusLabel,
  };
  const btn = document.getElementById('addBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  await saveNewBottle(data);
  btn.textContent = 'Add to Cellar';
};
