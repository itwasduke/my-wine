import { app } from './firebase.js?v=2.0.49';
import { state } from './state.js?v=2.0.49';
import { saveNewBottle } from './db.js?v=2.0.49';

let cachedGeminiModel = null;

async function getGeminiModel() {
  if (cachedGeminiModel) return cachedGeminiModel;

  try {
    const { getVertexAI, getGenerativeModel } =
      await import('https://www.gstatic.com/firebasejs/12.11.0/firebase-vertexai.js');
    cachedGeminiModel = getGenerativeModel(getVertexAI(app), { model: 'gemini-2.5-flash' });
  } catch (e1) {
    try {
      const { getAI, getGenerativeModel, GoogleAIBackend } =
        await import('https://www.gstatic.com/firebasejs/12.11.0/firebase-ai.js');
      cachedGeminiModel = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), { model: 'gemini-2.5-flash' });
    } catch (e2) {
      console.error('Failed to load Gemini SDK:', e2);
      throw e2;
    }
  }
  return cachedGeminiModel;
}

export async function handleImageSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const preview    = document.getElementById('scanPreview');
  const status     = document.getElementById('scanStatus');
  const statusText = document.getElementById('scanStatusText');
  const spinner    = document.getElementById('scanSpinner');
  const form       = document.getElementById('addForm');
  const addBtn     = document.getElementById('addBtn');

  // Show original preview immediately
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
  status.className = 'scan-status';
  statusText.textContent = 'Optimizing image…';
  spinner.style.display = '';
  form.classList.remove('visible');
  addBtn.disabled = true;
  document.getElementById('scanOverlay').classList.add('active');

  try {
    // Resize to max 1024px to speed up Gemini processing and save data
    const { base64, mimeType } = await resizeImage(file, 1024);
    
    statusText.textContent = 'Reading label with Gemini…';
    
    const geminiModel = await getGeminiModel();

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

/**
 * Resizes an image file to a maximum dimension while maintaining aspect ratio.
 * Returns a promise that resolves with { base64, mimeType }.
 */
function resizeImage(file, maxDim) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Compress slightly
        resolve({
          base64: dataUrl.split(',')[1],
          mimeType: 'image/jpeg'
        });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
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
  "type": "wine or spirit — classify this as exactly one of those two words",
  "colorStyle": "For wine: exactly one of [Red, White, Rose, Sparkling, Fortified]. For spirits: leave as empty string"
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
  document.getElementById('f-color').value  = data.colorStyle || '';
  document.getElementById('f-abv').value    = data.abv    || '';
  document.getElementById('f-temp').value   = data.temp   || '';
  document.getElementById('f-notes').value  = data.notes  || '';
  document.getElementById('f-decant').value = data.decant || '';
  document.getElementById('f-window').value = data.window || '';
  document.getElementById('f-type').value   = data.type === 'spirit' ? 'spirit' : 'wine';
}

export async function guessWineColor(bottle) {
  const geminiModel = await getGeminiModel();

  const prompt = `Identify the color/style of this wine based on its name and grape:
  Name: ${bottle.name}
  Grape: ${bottle.grape}
  Region: ${bottle.region}

  Respond with ONLY one word from this list: [Red, White, Rose, Sparkling, Fortified]`;

  const result = await geminiModel.generateContent(prompt);
  const color = result.response.text().trim();
  const valid = ['Red', 'White', 'Rose', 'Sparkling', 'Fortified'];
  return valid.includes(color) ? color : 'Red'; // Default to Red if unsure
}

export function closeScanModal() {
  document.getElementById('scanOverlay').classList.remove('active');
  const preview = document.getElementById('scanPreview');
  URL.revokeObjectURL(preview.src);
  preview.src = '';
  preview.style.display = 'none';
}

export async function confirmAddBottle() {
  if (!state.currentUser) return;
  const name = document.getElementById('f-name').value.trim();
  if (!name) { document.getElementById('f-name').focus(); return; }
  const qty  = parseInt(document.getElementById('f-qty').value) || 1;
  const isSpirit   = document.getElementById('f-type').value === 'spirit';
  const status      = isSpirit ? 'spirits' : 'ready';
  const statusLabel = isSpirit ? 'Spirits'  : 'Ready to Drink';
  const data = {
    name,
    quantity:    qty,
    consumedCount: 0,
    year:        document.getElementById('f-year').value.trim()   || 'NV',
    region:      document.getElementById('f-region').value.trim() || '—',
    grape:       document.getElementById('f-grape').value.trim()  || '—',
    abv:         document.getElementById('f-abv').value.trim()    || '—',
    temp:        document.getElementById('f-temp').value.trim()   || '—',
    notes:       document.getElementById('f-notes').value.trim()  || '—',
    decant:      document.getElementById('f-decant').value.trim() || '—',
    window:      document.getElementById('f-window').value.trim() || '—',
    colorStyle:  document.getElementById('f-color').value,
    status,
    statusLabel,
  };
  const btn = document.getElementById('addBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  await saveNewBottle(data);
  btn.textContent = 'Add to Cellar';
}

export async function lookupProScores(bottle) {
  const geminiModel = await getGeminiModel();

  const prompt = `You are an expert wine critic. Find professional scores and ratings for this bottle:
  Name: ${bottle.name}
  Vintage/Year: ${bottle.year}
  Region: ${bottle.region}

  Search for ratings from major critics like Robert Parker (RP), Wine Spectator (WS), Decanter, James Suckling (JS), and Vivino.
  
  Also, provide a "Vintage Chart" rating (0-100 or descriptive) for this region and year (e.g., how the 2018 vintage was overall in Bordeaux).

  Provide a concise summary (max 2 sentences) of the consensus and a JSON object with specific scores if available.
  Respond with ONLY a valid JSON object:
  {
    "summary": "Consensus summary here...",
    "scores": "RP: 92, WS: 90, Vivino: 4.2",
    "vintage": "94/100 (Exceptional year for Bordeaux)"
  }`;

  const result = await geminiModel.generateContent(prompt);
  const text = result.response.text().trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  return JSON.parse(text);
}

export function initAIListeners() {
  document.getElementById('fab').addEventListener('click', () => {
    if (!state.currentUser) return;
    document.getElementById('cameraInput').value = '';
    document.getElementById('cameraInput').click();
  });

  document.getElementById('cameraInput').addEventListener('change', handleImageSelected);
  document.getElementById('closeScanBtn').addEventListener('click', closeScanModal);
  document.getElementById('cancelScanBtn').addEventListener('click', closeScanModal);
  document.getElementById('addBtn').addEventListener('click', confirmAddBottle);
}
