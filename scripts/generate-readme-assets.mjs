import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const expectedAssets = [
  {
    file: 'assets/pinflow-overview.png',
    role: 'README hero overview',
    context:
      'PinFlow verbindet Browser-Auswahl, Source/Props/State/DOM-Kontext und Coding-Agenten.',
  },
  {
    file: 'assets/workflow-loop.png',
    role: 'Daily workflow loop',
    context:
      'UI sehen, Kontext sichern, Agent arbeitet, Ergebnis im Browser pruefen.',
  },
  {
    file: 'assets/local-setup-flow.png',
    role: 'Local setup map',
    context:
      'IDE, Repo, Dev Server, Browser-App, lokaler Relay und Coding Agent arbeiten zusammen.',
  },
  {
    file: 'assets/ui-to-code.png',
    role: 'UI to Code workflow',
    context:
      'Ein markiertes UI-Element wird zu einer praezisen Agent-Aufgabe mit Source-Bezug.',
  },
  {
    file: 'assets/code-to-ui.png',
    role: 'Code to UI workflow',
    context:
      'Agenten fragen PinFlow per MCP nach Live-Browser-Kontext zu einer Code-Stelle.',
  },
  {
    file: 'assets/architecture.png',
    role: 'Architecture overview',
    context:
      'Build-Time IDs, Manifest, Runtime Capture, Overlay, Relay, Queue und MCP Agents.',
  },
];

const readme = await fs.readFile(path.join(root, 'README.md'), 'utf8');

function readPngSize(buffer, file) {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`${file} is not a PNG file`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

let ok = true;

for (const asset of expectedAssets) {
  const absolute = path.join(root, asset.file);

  try {
    const buffer = await fs.readFile(absolute);
    const { width, height } = readPngSize(buffer, asset.file);
    const referenced = readme.includes(`./${asset.file}`);

    if (!referenced) {
      ok = false;
      console.error(`missing README reference: ./${asset.file}`);
    }

    console.log(
      `${asset.file}: ${width}x${height} - ${asset.role} - ${asset.context}`,
    );
  } catch (error) {
    ok = false;
    console.error(`${asset.file}: ${error.message}`);
  }
}

if (!ok) {
  process.exitCode = 1;
}
