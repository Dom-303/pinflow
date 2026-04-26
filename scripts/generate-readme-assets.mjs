import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch {
    const mod =
      await import('../node_modules/.pnpm/node_modules/sharp/lib/index.js');
    return mod.default;
  }
}

const sharp = await loadSharp();

const W = 2200;
const H = 1238;
const c = {
  bg: '#f7fafc',
  ink: '#101828',
  text: '#27364a',
  muted: '#667085',
  line: '#d7e2ef',
  panel: '#ffffff',
  panel2: '#f1f6fb',
  dark: '#101828',
  dark2: '#17243a',
  blue: '#2563eb',
  blue2: '#dbeafe',
  cyan: '#06b6d4',
  red: '#f25f5c',
  red2: '#ffe4e1',
  green: '#20c997',
  green2: '#dffaf0',
  amber: '#f59e0b',
};

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function svg(parts) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="shadow" x="-15%" y="-15%" width="130%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#102033" flood-opacity="0.14"/>
    </filter>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbfdff"/>
      <stop offset="0.55" stop-color="#f2f7fc"/>
      <stop offset="1" stop-color="#e8f7fb"/>
    </linearGradient>
    <linearGradient id="dark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c.dark}"/>
      <stop offset="1" stop-color="${c.dark2}"/>
    </linearGradient>
    <marker id="arrowBlue" viewBox="0 0 16 16" refX="13" refY="8" markerWidth="13" markerHeight="13" orient="auto-start-reverse">
      <path d="M2 2 L14 8 L2 14 Z" fill="${c.blue}"/>
    </marker>
    <marker id="arrowRed" viewBox="0 0 16 16" refX="13" refY="8" markerWidth="13" markerHeight="13" orient="auto-start-reverse">
      <path d="M2 2 L14 8 L2 14 Z" fill="${c.red}"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="210" cy="1040" r="250" fill="#dbeafe" opacity="0.65"/>
  <circle cx="2000" cy="155" r="260" fill="#ccfbf1" opacity="0.65"/>
  ${parts.join('\n  ')}
</svg>`;
}

function text(
  x,
  y,
  value,
  size = 38,
  fill = c.text,
  weight = 500,
  anchor = 'start',
) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Inter, DejaVu Sans, Arial, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="0">${esc(value)}</text>`;
}

function lines(
  x,
  y,
  values,
  size = 30,
  fill = c.muted,
  weight = 450,
  gap = 1.38,
) {
  return values
    .map((value, i) => text(x, y + i * size * gap, value, size, fill, weight))
    .join('\n  ');
}

function card(x, y, w, h, fill = c.panel, stroke = c.line, r = 28) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3" filter="url(#shadow)"/>`;
}

function pill(x, y, value, fill, color = c.ink, w = 210) {
  return `<rect x="${x}" y="${y}" width="${w}" height="54" rx="27" fill="${fill}" stroke="${c.line}" stroke-width="2"/>
  ${text(x + w / 2, y + 36, value, 24, color, 750, 'middle')}`;
}

function arrow(x1, y1, x2, y2, color = c.blue, marker = 'arrowBlue') {
  return `<path d="M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" marker-end="url(#${marker})"/>`;
}

function title(p, heading, sub) {
  p.push(text(110, 118, heading, 70, c.ink, 850));
  p.push(text(112, 176, sub, 31, c.muted, 500));
}

function miniCode(x, y, rows) {
  return rows
    .map((row, i) => {
      const yy = y + i * 44;
      const color = i % 3 === 0 ? c.cyan : i % 3 === 1 ? c.blue : c.red;
      return `<rect x="${x}" y="${yy}" width="${row}" height="14" rx="7" fill="${color}" opacity="0.9"/>`;
    })
    .join('\n  ');
}

function uiToCode() {
  const p = [];
  title(
    p,
    'Vom Browser zur Code-Aufgabe',
    'PinFlow macht aus einem Klick im UI eine präzise, agentenfähige Änderung.',
  );

  p.push(card(110, 270, 780, 650, c.panel, c.line, 36));
  p.push(
    `<rect x="110" y="270" width="780" height="76" rx="36" fill="${c.dark}"/>`,
  );
  p.push(
    `<circle cx="160" cy="309" r="13" fill="${c.red}"/><circle cx="204" cy="309" r="13" fill="${c.amber}"/><circle cx="248" cy="309" r="13" fill="${c.green}"/>`,
  );
  p.push(text(308, 320, 'laufende App', 26, '#dbeafe', 700));
  p.push(
    `<rect x="170" y="420" width="640" height="130" rx="24" fill="${c.panel2}" stroke="${c.line}" stroke-width="3"/>`,
  );
  p.push(text(215, 500, 'Pricing Card', 38, c.ink, 800));
  p.push(
    `<rect x="170" y="615" width="640" height="165" rx="26" fill="#ffffff" stroke="${c.red}" stroke-width="6"/>`,
  );
  p.push(text(215, 685, 'CTA Button', 40, c.ink, 850));
  p.push(
    lines(
      215,
      735,
      ['data-ds: stable', 'Quelle: PricingCard.tsx:118'],
      27,
      c.muted,
      560,
    ),
  );
  p.push(
    `<path d="M710 565 L650 615" stroke="${c.red}" stroke-width="9" stroke-linecap="round"/><path d="M710 565 L690 627" stroke="${c.red}" stroke-width="9" stroke-linecap="round"/>`,
  );

  p.push(arrow(890, 610, 1110, 610, c.red, 'arrowRed'));
  p.push(card(1035, 340, 450, 545, c.panel, c.line, 34));
  p.push(text(1090, 420, 'PinFlow Overlay', 42, c.ink, 850));
  p.push(pill(1090, 470, 'Element gewählt', c.red2, c.red, 245));
  p.push(
    lines(
      1090,
      570,
      ['Komponente', 'Props + State', 'DOM Snapshot', 'Anweisung'],
      31,
      c.text,
      650,
    ),
  );
  p.push(
    `<rect x="1090" y="770" width="315" height="64" rx="32" fill="${c.blue}"/>`,
  );
  p.push(text(1248, 812, 'an Codex senden', 27, '#ffffff', 800, 'middle'));

  p.push(arrow(1485, 610, 1710, 610));
  p.push(card(1640, 350, 455, 520, 'url(#dark)', '#273b5a', 34));
  p.push(text(1700, 435, 'Agent Task', 44, '#ffffff', 850));
  p.push(
    lines(
      1700,
      505,
      [
        'file: PricingCard.tsx',
        'line: 118',
        'context: live runtime',
        'status: queued',
      ],
      30,
      '#dbeafe',
      620,
    ),
  );
  p.push(miniCode(1700, 730, [260, 345, 210]));

  p.push(pill(210, 1035, '1 Klick', '#ffffff', c.ink, 160));
  p.push(pill(415, 1035, '2 Kontext', '#ffffff', c.ink, 190));
  p.push(pill(650, 1035, '3 Aufgabe', '#ffffff', c.ink, 190));
  p.push(pill(885, 1035, '4 Agent editiert', c.blue2, c.blue, 250));
  return svg(p);
}

function codeToUi() {
  const p = [];
  title(
    p,
    'Vom Code zurück ins Live-UI',
    'Der Agent fragt PinFlow, was eine konkrete Codezeile gerade im Browser bedeutet.',
  );

  p.push(card(110, 315, 560, 560, 'url(#dark)', '#273b5a', 34));
  p.push(text(170, 400, 'Codex / Claude', 44, '#ffffff', 850));
  p.push(text(170, 462, 'MCP Tool Call', 29, '#dbeafe', 700));
  p.push(
    `<rect x="170" y="515" width="440" height="210" rx="24" fill="#0b1220" stroke="#334155" stroke-width="3"/>`,
  );
  p.push(
    lines(
      205,
      575,
      ['pinflow.query.bySource', 'file: PricingCard.tsx', 'line: 118'],
      31,
      '#e0f2fe',
      650,
    ),
  );

  p.push(arrow(670, 610, 960, 610));
  p.push(card(895, 360, 430, 470, c.panel, c.line, 34));
  p.push(text(955, 445, 'Relay', 44, c.ink, 850));
  p.push(
    lines(
      955,
      510,
      ['REST', 'WebSocket', 'MCP stdio', 'Manifest Lookup'],
      32,
      c.text,
      650,
    ),
  );
  p.push(pill(955, 725, 'Quelle auflösen', c.blue2, c.blue, 255));

  p.push(arrow(1325, 610, 1630, 610));
  p.push(card(1545, 300, 545, 610, c.panel, c.line, 34));
  p.push(
    `<rect x="1545" y="300" width="545" height="74" rx="34" fill="${c.dark}"/>`,
  );
  p.push(text(1605, 350, 'Browser Runtime', 27, '#dbeafe', 700));
  p.push(
    `<rect x="1605" y="445" width="420" height="120" rx="24" fill="${c.panel2}" stroke="${c.line}" stroke-width="3"/>`,
  );
  p.push(text(1645, 518, 'CTA Button', 38, c.ink, 850));
  p.push(
    `<rect x="1605" y="635" width="420" height="190" rx="24" fill="#ffffff" stroke="${c.line}" stroke-width="3"/>`,
  );
  p.push(
    lines(
      1645,
      700,
      [
        'component: PricingCTA',
        'props: tone=primary',
        'state: idle',
        'DOM: button.cta',
      ],
      28,
      c.text,
      650,
    ),
  );

  p.push(pill(220, 1035, '1 Agent fragt', '#ffffff', c.ink, 225));
  p.push(pill(495, 1035, '2 Relay findet', '#ffffff', c.ink, 225));
  p.push(pill(770, 1035, '3 Browser antwortet', '#ffffff', c.ink, 270));
  p.push(pill(1090, 1035, '4 Edit mit Beleg', c.blue2, c.blue, 270));
  return svg(p);
}

function architecture() {
  const p = [];
  title(
    p,
    'Architektur in einem Bild',
    'Build-Time IDs, Runtime Capture und MCP greifen in einem lokalen Entwicklungsfluss ineinander.',
  );

  const top = [
    [110, 'App Source', ['React / Vue', 'Next / Nuxt']],
    [510, 'Bundler', ['Vite / Webpack', 'Turbopack']],
    [910, 'Manifest', ['JSONL', 'source map']],
    [1310, 'Runtime', ['props', 'state', 'DOM']],
    [1710, 'Overlay', ['Picker', 'Composer']],
  ];
  for (const [x, label, body] of top) {
    p.push(card(x, 330, 305, 235, c.panel, c.line, 28));
    p.push(text(x + 36, 410, label, 36, c.ink, 850));
    p.push(lines(x + 36, 468, body, 28, c.muted, 560));
  }
  for (let i = 0; i < top.length - 1; i += 1) {
    p.push(arrow(top[i][0] + 315, 450, top[i + 1][0] - 15, 450));
  }

  p.push(card(255, 770, 500, 280, 'url(#dark)', '#273b5a', 32));
  p.push(text(315, 855, 'PinFlow Relay', 42, '#ffffff', 850));
  p.push(
    lines(
      315,
      918,
      ['localhost daemon', 'REST + WS + MCP'],
      30,
      '#dbeafe',
      560,
    ),
  );

  p.push(card(920, 770, 420, 280, c.panel, c.line, 32));
  p.push(text(980, 855, 'Repo Queue', 42, c.ink, 850));
  p.push(
    lines(
      980,
      918,
      ['.pinflow/annotations', 'queued -> processed'],
      30,
      c.muted,
      560,
    ),
  );

  p.push(card(1510, 770, 420, 280, c.panel, c.line, 32));
  p.push(text(1570, 855, 'Agents', 42, c.ink, 850));
  p.push(
    lines(1570, 918, ['Codex / Claude', 'any MCP client'], 30, c.muted, 560),
  );

  p.push(arrow(1780, 565, 505, 770, c.red, 'arrowRed'));
  p.push(arrow(755, 910, 920, 910));
  p.push(arrow(1340, 910, 1510, 910));
  p.push(arrow(1710, 770, 1110, 565));

  p.push(
    `<rect x="260" y="1110" width="1680" height="62" rx="31" fill="#ffffff" stroke="${c.line}" stroke-width="3"/>`,
  );
  p.push(text(320, 1152, 'Goldener Pfad:', 26, c.ink, 850));
  p.push(
    text(
      545,
      1152,
      'UI anklicken -> Kontext sichern -> Agent editiert -> Browser verifizieren',
      26,
      c.muted,
      620,
    ),
  );
  return svg(p);
}

function loop() {
  const p = [];
  title(
    p,
    'Der tägliche PinFlow-Loop',
    'Ein kleiner Arbeitskreislauf statt langer Erklärungen im Chat.',
  );

  const steps = [
    [
      160,
      420,
      '1',
      'UI sehen',
      ['Problem direkt', 'im Browser markieren'],
      c.red2,
      c.red,
    ],
    [
      650,
      300,
      '2',
      'Kontext sichern',
      ['Quelle, Props, State', 'und DOM erfassen'],
      c.blue2,
      c.blue,
    ],
    [
      1160,
      420,
      '3',
      'Agent',
      ['Codex oder Claude', 'arbeitet mit Kontext'],
      c.green2,
      c.green,
    ],
    [
      650,
      700,
      '4',
      'Prüfen',
      ['Antwort und Status', 'im Overlay sehen'],
      '#fff7ed',
      c.amber,
    ],
  ];
  for (const [x, y, n, label, body, fill, accent] of steps) {
    p.push(card(x, y, 390, 235, c.panel, c.line, 30));
    p.push(
      `<circle cx="${x + 64}" cy="${y + 70}" r="34" fill="${fill}" stroke="${accent}" stroke-width="4"/>`,
    );
    p.push(text(x + 64, y + 82, n, 28, accent, 850, 'middle'));
    p.push(text(x + 120, y + 78, label, 38, c.ink, 850));
    p.push(lines(x + 52, y + 145, body, 29, c.muted, 560));
  }
  p.push(arrow(550, 500, 650, 410));
  p.push(arrow(1040, 410, 1160, 500));
  p.push(arrow(1160, 650, 1040, 780));
  p.push(arrow(650, 780, 550, 650));

  p.push(card(1570, 300, 450, 635, 'url(#dark)', '#273b5a', 34));
  p.push(text(1630, 390, 'Warum das hilft', 42, '#ffffff', 850));
  p.push(
    lines(
      1630,
      470,
      [
        'weniger Rätselraten',
        'falsche Dateien',
        'besserer Review',
        'lokaler Flow',
      ],
      29,
      '#dbeafe',
      600,
    ),
  );
  p.push(pill(1630, 820, 'Pin it. Flow it. Ship it.', c.blue, '#ffffff', 330));
  return svg(p);
}

const outputs = [
  ['ui-to-code.png', uiToCode()],
  ['code-to-ui.png', codeToUi()],
  ['architecture.png', architecture()],
  ['workflow-loop.png', loop()],
];

await fs.mkdir(assetsDir, { recursive: true });

for (const [name, source] of outputs) {
  const out = path.join(assetsDir, name);
  await sharp(Buffer.from(source))
    .png({ compressionLevel: 9, quality: 95 })
    .toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`${name}: ${meta.width}x${meta.height}`);
}
