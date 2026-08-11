import { readFile, writeFile } from 'node:fs/promises';

const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_MODEL?.trim() || 'gpt-5.5';

if (!apiKey) {
  throw new Error('Falta el secret OPENAI_API_KEY en el repositorio.');
}

const filePath = new URL('../data/latest.json', import.meta.url);
const current = JSON.parse(await readFile(filePath, 'utf8'));
const savedRows = Array.isArray(current.rows) ? current.rows : [];
const base = { fecha: '27 Abr 2026', anio: '2026', sup: 138.75, reg: 127.37, die: 141.38 };
const latest = savedRows.length ? savedRows.at(-1) : base;

const prompt = `Busca en la web los precios semanales de combustibles en Honduras más recientes publicados por la Secretaría de Energía (SEN). Prioriza la fuente oficial y medios hondureños que reproduzcan el comunicado oficial.

La última semana registrada es "${latest.fecha}" con estos precios en Tegucigalpa, en lempiras por galón:
- Gasolina superior: ${latest.sup}
- Gasolina regular: ${latest.reg}
- Diésel: ${latest.die}

Devuelve solamente las semanas POSTERIORES a esa fecha. La salida debe ser exclusivamente una de estas dos opciones:
1. Un JSON array válido con este formato exacto, sin Markdown ni comentarios:
[{"fecha":"DD Abr YYYY","anio":"YYYY","sup":0.00,"reg":0.00,"die":0.00}]
2. Si no existe información posterior verificable, exactamente: NO_NEW_DATA

No inventes datos. Las fechas deben usar las abreviaturas españolas Ene, Feb, Mar, Abr, May, Jun, Jul, Ago, Sep, Oct, Nov o Dic.`;

const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model,
    tools: [{ type: 'web_search', external_web_access: true }],
    tool_choice: 'required',
    include: ['web_search_call.action.sources'],
    input: prompt,
    max_output_tokens: 1200,
    store: false
  })
});

const payload = await response.json();
if (!response.ok) {
  throw new Error(payload?.error?.message || `OpenAI respondió ${response.status}`);
}

const textParts = [];
const sourceMap = new Map();
for (const item of payload.output || []) {
  if (item.type === 'web_search_call') {
    for (const source of item.action?.sources || []) {
      if (source.url) {
        sourceMap.set(source.url, {
          url: source.url,
          title: source.title || 'Fuente consultada'
        });
      }
    }
    continue;
  }
  if (item.type !== 'message') continue;
  for (const content of item.content || []) {
    if (content.type !== 'output_text') continue;
    if (typeof content.text === 'string') textParts.push(content.text);
    for (const annotation of content.annotations || []) {
      if (annotation.type === 'url_citation' && annotation.url) {
        sourceMap.set(annotation.url, {
          url: annotation.url,
          title: annotation.title || 'Fuente consultada'
        });
      }
    }
  }
}

const rawText = textParts.join('').trim();
if (!rawText || rawText.includes('NO_NEW_DATA')) {
  console.log(`Sin datos posteriores a ${latest.fecha}.`);
  process.exit(0);
}

const cleaned = rawText.replace(/```json|```/g, '').replace(/^[^[{]*/, '').trim();
const candidates = JSON.parse(cleaned);
if (!Array.isArray(candidates)) {
  throw new Error('OpenAI no devolvió un arreglo JSON.');
}

const existingDates = new Set(savedRows.map(row => row.fecha));
existingDates.add(base.fecha);
const newRows = candidates.filter(row =>
  row && typeof row.fecha === 'string' && /^\d{2} [A-Za-zÁÉÍÓÚáéíóú]{3} \d{4}$/u.test(row.fecha) &&
  !existingDates.has(row.fecha) &&
  [row.sup, row.reg, row.die].every(value => Number.isFinite(value) && value > 0 && value <= 500)
).map(row => ({
  fecha: row.fecha,
  anio: String(row.anio || row.fecha.slice(-4)),
  sup: Number(row.sup),
  reg: Number(row.reg),
  die: Number(row.die)
}));

if (!newRows.length) {
  console.log('La respuesta no contenía semanas nuevas válidas.');
  process.exit(0);
}

const next = {
  rows: [...savedRows, ...newRows],
  sources: [...sourceMap.values()],
  updated_at: new Date().toISOString()
};

await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`Añadidas ${newRows.length} semana(s). Última: ${newRows.at(-1).fecha}.`);
