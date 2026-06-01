import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function readStdin() {
  try {
    return readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

const cwd = process.cwd();
const dixiYamlPath = join(cwd, '.pscode-dixi.yaml');

// Gate: exit 0 silently when .pscode-dixi.yaml is absent (non-Dixi projects unaffected)
if (!existsSync(dixiYamlPath)) {
  process.exit(0);
}

let family = null;
try {
  const yaml = readFileSync(dixiYamlPath, 'utf-8');
  const m = yaml.match(/^family:\s*(\S+)/m);
  if (m) family = m[1].trim();
} catch {
  process.exit(0);
}

if (family !== 'java' && family !== 'react') {
  process.exit(0);
}

let input = {};
try {
  const raw = readStdin();
  if (raw.trim()) input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const toolInput = input.tool_input ?? {};
const rawFilePath = String(toolInput.file_path ?? '');
const newContent = String(toolInput.new_string ?? toolInput.content ?? '');
const filePath = rawFilePath.replace(/\\/g, '/');

if (family === 'java') {
  // Check files in src/**/infrastructure/**
  if (/\/infrastructure\//.test(filePath)) {
    const importLines = newContent.split('\n').filter(l => /^\s*import\s+/.test(l));
    // Violation: import from domain.* but NOT domain.port.*
    const hasDirectDomainImport = importLines.some(
      l => /\.domain\./.test(l) && !/\.domain\.port/.test(l)
    );
    if (hasDirectDomainImport) {
      process.stdout.write(
        `Violação hexagonal: ${rawFilePath} importa diretamente de domain sem porta. Consulte pastelsdd/context/architecture.md\n`
      );
      process.exit(2);
    }
  }
  process.exit(0);
}

if (family === 'react') {
  // Cross-feature import check for files in src/features/**
  const featureMatch = filePath.match(/\/features\/([^/]+)/);
  if (featureMatch) {
    const currentFeature = featureMatch[1];
    const importRegex = /from\s+['"]([^'"]+)['"]/g;
    let m;
    while ((m = importRegex.exec(newContent)) !== null) {
      const importPath = m[1];
      const featureInImport = importPath.match(/features\/([^/']+)/);
      if (featureInImport && featureInImport[1] !== currentFeature) {
        process.stdout.write(
          `Violação feature-sliced: importação cruzada entre features. Consulte pastelsdd/context/architecture.md\n`
        );
        process.exit(2);
      }
    }
  }

  // Warning: combined useState+useEffect with large body in src/app/** or src/pages/**
  if (/\/(app|pages)\//.test(filePath)) {
    const lines = newContent.split('\n');
    if (
      lines.length > 10 &&
      /useState/.test(newContent) &&
      /useEffect/.test(newContent)
    ) {
      process.stdout.write(
        `Aviso: lógica inline detectada em page/app. Considere extrair para um hook ou service.\n`
      );
      process.exit(1);
    }
  }

  process.exit(0);
}

process.exit(0);
