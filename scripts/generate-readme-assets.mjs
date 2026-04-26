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

const W = 2400;
const H = 1350;
const colors = {
  ink: '#15110d',
  ink2: '#2a2118',
  text: '#2b241d',
  muted: '#796b5f',
  paper: '#f8f3eb',
  paper2: '#eee2d2',
  panel: '#211912',
  panel2: '#352719',
  gold: '#d89a3d',
  gold2: '#f0c46d',
  blue: '#7bb7ff',
  green: '#75d69c',
  red: '#ff7d7d',
  line: '#dac8af',
  white: '#fffaf3',
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
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="22" stdDeviation="24" flood-color="#1a120a" flood-opacity="0.18"/>
    </filter>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#1a120a" flood-opacity="0.12"/>
    </filter>
    <linearGradient id="paperGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffaf2"/>
      <stop offset="0.55" stop-color="#f5ecdf"/>
      <stop offset="1" stop-color="#eadbc7"/>
    </linearGradient>
    <linearGradient id="darkGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#15100c"/>
      <stop offset="1" stop-color="#302216"/>
    </linearGradient>
    <marker id="arrowGold" viewBox="0 0 14 14" refX="11" refY="7" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M 1 1 L 13 7 L 1 13 z" fill="${colors.gold}"/>
    </marker>
    <marker id="arrowDark" viewBox="0 0 14 14" refX="11" refY="7" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M 1 1 L 13 7 L 1 13 z" fill="${colors.ink}"/>
    </marker>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#paperGradient)"/>
  <circle cx="2180" cy="160" r="300" fill="#f2c061" opacity="0.13"/>
  <circle cx="170" cy="1190" r="260" fill="#1d140d" opacity="0.05"/>
  ${parts.join('\n  ')}
</svg>`;
}

function text(
  x,
  y,
  value,
  size = 42,
  fill = colors.text,
  weight = 500,
  anchor = 'start',
) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Inter, DejaVu Sans, Arial, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="0">${esc(value)}</text>`;
}

function multiline(
  x,
  y,
  lines,
  size = 34,
  fill = colors.muted,
  weight = 400,
  lineHeight = 1.45,
) {
  return lines
    .map((line, i) =>
      text(x, y + i * size * lineHeight, line, size, fill, weight),
    )
    .join('\n  ');
}

function card(
  x,
  y,
  w,
  h,
  fill = colors.white,
  stroke = colors.line,
  radius = 34,
) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="3" filter="url(#softShadow)"/>`;
}

function pill(x, y, value, fill, textColor = colors.ink, w = 220) {
  return `<rect x="${x}" y="${y}" width="${w}" height="58" rx="29" fill="${fill}"/>
  ${text(x + w / 2, y + 39, value, 25, textColor, 700, 'middle')}`;
}

function arrow(
  x1,
  y1,
  x2,
  y2,
  color = colors.gold,
  width = 8,
  marker = 'arrowGold',
) {
  return `<path d="M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" marker-end="url(#${marker})"/>`;
}

function uiToCode() {
  const p = [];
  p.push(text(120, 125, 'UI -> Code', 74, colors.ink, 800));
  p.push(
    text(
      120,
      184,
      'Point at the running interface. PinFlow turns it into a source-exact agent task.',
      34,
      colors.muted,
      500,
    ),
  );

  p.push(card(120, 270, 1290, 850, '#fff8ef', colors.line, 36));
  p.push(
    `<rect x="120" y="270" width="1290" height="82" rx="36" fill="${colors.panel}"/>`,
  );
  p.push(
    `<circle cx="174" cy="312" r="15" fill="${colors.red}"/><circle cx="224" cy="312" r="15" fill="${colors.gold2}"/><circle cx="274" cy="312" r="15" fill="${colors.green}"/>`,
  );
  p.push(text(345, 324, 'localhost:5173 / checkout', 28, '#d8c8b7', 600));
  p.push(
    `<rect x="190" y="430" width="700" height="118" rx="24" fill="#efe2d1" stroke="#d8c4ab" stroke-width="3"/>`,
  );
  p.push(text(230, 505, 'Plan summary', 38, colors.ink, 750));
  p.push(
    `<rect x="190" y="610" width="960" height="210" rx="26" fill="#ffffff" stroke="#dac8af" stroke-width="3"/>`,
  );
  p.push(text(230, 675, 'Pro workspace', 40, colors.ink, 800));
  p.push(
    multiline(
      230,
      728,
      ['Visual review, live context, agent-ready tasks.'],
      29,
      colors.muted,
    ),
  );
  p.push(
    `<rect x="945" y="707" width="165" height="60" rx="30" fill="${colors.ink}"/>`,
  );
  p.push(text(1028, 747, 'Upgrade', 28, colors.white, 750, 'middle'));
  p.push(
    `<rect x="920" y="678" width="230" height="118" rx="36" fill="none" stroke="${colors.gold}" stroke-width="8"/>`,
  );
  p.push(
    `<path d="M 1015 590 L 1050 680" stroke="${colors.gold}" stroke-width="9" stroke-linecap="round"/><path d="M 1050 680 L 1008 650" stroke="${colors.gold}" stroke-width="9" stroke-linecap="round"/><path d="M 1050 680 L 1060 628" stroke="${colors.gold}" stroke-width="9" stroke-linecap="round"/>`,
  );

  p.push(card(1240, 370, 430, 610, 'url(#darkGradient)', '#4b3825', 42));
  p.push(text(1290, 445, 'PinFlow', 44, colors.gold2, 800));
  p.push(text(1290, 500, 'Picked element', 30, '#d8c8b7', 700));
  p.push(
    multiline(
      1290,
      553,
      ['Button', 'CheckoutPage.tsx:118', 'component: PricingCTA'],
      27,
      '#bba895',
      500,
    ),
  );
  p.push(
    `<rect x="1290" y="710" width="330" height="135" rx="22" fill="#fff7ed"/>`,
  );
  p.push(
    multiline(
      1320,
      760,
      ['Make this CTA calmer', 'and less salesy.'],
      29,
      colors.ink,
      700,
    ),
  );
  p.push(pill(1290, 880, 'Send to Codex', colors.gold2, colors.ink, 250));

  p.push(arrow(1515, 700, 1855, 700));
  p.push(card(1790, 420, 490, 430, '#fffaf3', colors.line, 36));
  p.push(text(1840, 505, 'Agent task', 46, colors.ink, 800));
  p.push(
    multiline(
      1840,
      575,
      [
        'source: CheckoutPage.tsx:118',
        'element: button[data-ds]',
        'runtime: props + state + DOM',
        'instruction: user text',
      ],
      30,
      colors.text,
      600,
    ),
  );
  p.push(
    `<rect x="1840" y="760" width="250" height="58" rx="29" fill="${colors.ink}"/>`,
  );
  p.push(text(1965, 799, 'ready to edit', 25, colors.white, 700, 'middle'));

  p.push(pill(180, 1185, '1 Pick', '#ffffff', colors.ink, 160));
  p.push(pill(375, 1185, '2 Describe', '#ffffff', colors.ink, 205));
  p.push(pill(620, 1185, '3 Queue', '#ffffff', colors.ink, 170));
  p.push(pill(825, 1185, '4 Agent edits', colors.gold2, colors.ink, 230));
  return svg(p);
}

function codeToUi() {
  const p = [];
  p.push(text(120, 125, 'Code -> UI', 74, colors.ink, 800));
  p.push(
    text(
      120,
      184,
      'The agent asks what a source location looks like in the live browser before editing.',
      34,
      colors.muted,
      500,
    ),
  );

  p.push(card(120, 300, 610, 690, 'url(#darkGradient)', '#4b3825', 42));
  p.push(text(180, 385, 'Codex / Claude', 48, colors.gold2, 800));
  p.push(text(180, 450, 'MCP call', 30, '#ccb9a5', 700));
  p.push(
    `<rect x="180" y="500" width="490" height="190" rx="24" fill="#120d09" stroke="#59412b" stroke-width="3"/>`,
  );
  p.push(
    multiline(
      215,
      560,
      [
        'pinflow.query.bySource({',
        '  file: "CheckoutPage.tsx",',
        '  line: 118',
        '})',
      ],
      31,
      '#f6e9d8',
      650,
    ),
  );
  p.push(
    multiline(
      180,
      775,
      [
        'Goal: inspect real props, state,',
        'DOM attributes and rendered copy',
        'before touching the file.',
      ],
      29,
      '#cbb9a8',
      500,
    ),
  );

  p.push(arrow(730, 650, 1045, 650));
  p.push(card(965, 410, 470, 470, '#fffaf3', colors.line, 36));
  p.push(text(1020, 495, 'PinFlow Relay', 44, colors.ink, 800));
  p.push(
    multiline(
      1020,
      560,
      [
        'REST + WebSocket + MCP',
        'matches source location',
        'to active browser runtime',
      ],
      31,
      colors.muted,
      500,
    ),
  );
  p.push(
    `<rect x="1020" y="735" width="330" height="64" rx="32" fill="${colors.gold2}"/>`,
  );
  p.push(
    text(1185, 777, 'source exact context', 27, colors.ink, 800, 'middle'),
  );
  p.push(arrow(1435, 650, 1710, 650));

  p.push(card(1600, 285, 680, 740, '#fff8ef', colors.line, 36));
  p.push(
    `<rect x="1600" y="285" width="680" height="78" rx="36" fill="${colors.panel}"/>`,
  );
  p.push(text(1660, 337, 'Running browser', 29, '#d8c8b7', 700));
  p.push(
    `<rect x="1665" y="440" width="530" height="130" rx="24" fill="#ffffff" stroke="#dac8af" stroke-width="3"/>`,
  );
  p.push(text(1705, 515, 'Upgrade', 38, colors.ink, 800));
  p.push(
    `<rect x="1930" y="480" width="160" height="56" rx="28" fill="${colors.ink}"/>`,
  );
  p.push(text(2010, 518, 'Pro', 27, colors.white, 750, 'middle'));
  p.push(
    `<rect x="1645" y="640" width="590" height="300" rx="28" fill="#ffffff" stroke="#dac8af" stroke-width="3"/>`,
  );
  p.push(text(1690, 710, 'Runtime response', 38, colors.ink, 800));
  p.push(
    multiline(
      1690,
      770,
      [
        'component: PricingCTA',
        'props: { tone: "primary" }',
        'state: open=false',
        'DOM: button.cta.primary',
      ],
      29,
      colors.text,
      600,
    ),
  );

  p.push(pill(180, 1135, '1 Agent asks', '#ffffff', colors.ink, 240));
  p.push(pill(470, 1135, '2 Relay resolves', '#ffffff', colors.ink, 260));
  p.push(pill(780, 1135, '3 Browser answers', '#ffffff', colors.ink, 285));
  p.push(
    pill(1125, 1135, '4 Edit with evidence', colors.gold2, colors.ink, 320),
  );
  return svg(p);
}

function architecture() {
  const p = [];
  p.push(text(120, 125, 'PinFlow Architecture', 74, colors.ink, 800));
  p.push(
    text(
      120,
      184,
      'Build-time source identity, live runtime capture, and an MCP workflow for coding agents.',
      34,
      colors.muted,
      500,
    ),
  );

  const boxes = [
    [
      130,
      345,
      385,
      250,
      'Source app',
      ['React, Vue, Next, Nuxt', 'components + routes'],
    ],
    [
      600,
      345,
      385,
      250,
      'Bundler plugin',
      ['Vite, Webpack, Turbopack', 'stable data-ds IDs'],
    ],
    [
      1070,
      345,
      385,
      250,
      'Manifest',
      ['append-only JSONL', 'source -> element map'],
    ],
    [
      1540,
      345,
      385,
      250,
      'Runtime',
      ['props, state, DOM', 'framework adapters'],
    ],
    [2010, 345, 270, 250, 'Overlay', ['picker', 'composer']],
  ];
  for (const [x, y, w, h, title, lines] of boxes) {
    p.push(card(x, y, w, h, '#fffaf3', colors.line, 30));
    p.push(text(x + 34, y + 78, title, 37, colors.ink, 800));
    p.push(multiline(x + 34, y + 132, lines, 27, colors.muted, 500));
  }
  for (let i = 0; i < boxes.length - 1; i++) {
    p.push(
      arrow(
        boxes[i][0] + boxes[i][2] + 14,
        470,
        boxes[i + 1][0] - 20,
        470,
        colors.gold,
        7,
      ),
    );
  }

  p.push(card(420, 775, 620, 330, 'url(#darkGradient)', '#4b3825', 38));
  p.push(text(480, 858, 'Relay daemon', 44, colors.gold2, 800));
  p.push(
    multiline(
      480,
      925,
      [
        'localhost Fastify server',
        'REST API, WebSocket stream',
        'MCP stdio bridge',
      ],
      30,
      '#d9c6b3',
      500,
    ),
  );

  p.push(card(1225, 775, 460, 330, '#fffaf3', colors.line, 38));
  p.push(text(1280, 858, 'Repo queue', 44, colors.ink, 800));
  p.push(
    multiline(
      1280,
      925,
      [
        '.pinflow/annotations',
        'queued, claimed, done',
        'undo and failure states',
      ],
      30,
      colors.muted,
      500,
    ),
  );

  p.push(card(1865, 775, 415, 330, '#fffaf3', colors.line, 38));
  p.push(text(1920, 858, 'Agents', 44, colors.ink, 800));
  p.push(
    multiline(
      1920,
      925,
      ['Codex, Claude, MCP clients', 'query by source', 'process annotations'],
      30,
      colors.muted,
      500,
    ),
  );

  p.push(arrow(2075, 595, 745, 775, colors.gold, 7));
  p.push(arrow(1040, 940, 1225, 940, colors.gold, 7));
  p.push(arrow(1685, 940, 1865, 940, colors.gold, 7));
  p.push(arrow(1920, 775, 1260, 595, colors.ink, 5, 'arrowDark'));

  p.push(
    `<rect x="130" y="1180" width="2150" height="72" rx="36" fill="#fffaf3" stroke="${colors.line}" stroke-width="3"/>`,
  );
  p.push(text(185, 1228, 'Golden path:', 29, colors.ink, 800));
  p.push(
    text(
      430,
      1228,
      'click UI -> source exact task -> agent edit -> runtime verification',
      29,
      colors.muted,
      600,
    ),
  );
  return svg(p);
}

const outputs = [
  ['ui-to-code.png', uiToCode()],
  ['code-to-ui.png', codeToUi()],
  ['architecture.png', architecture()],
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
