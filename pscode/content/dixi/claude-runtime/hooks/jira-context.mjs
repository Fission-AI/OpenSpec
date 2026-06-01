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

let input = {};
try {
  const raw = readStdin();
  if (raw.trim()) input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const prompt = String(input.prompt ?? '');
const ticketMatch = prompt.match(/[A-Z]+-\d+/);
if (!ticketMatch) {
  process.exit(0);
}

const jiraYamlPath = join(cwd, 'pastelsdd', 'jira.yaml');
if (!existsSync(jiraYamlPath)) {
  process.exit(0);
}

let jiraContent = '';
try {
  jiraContent = readFileSync(jiraYamlPath, 'utf-8');
} catch {
  process.exit(0);
}

const projectKeyMatch = jiraContent.match(/^project_key:\s*(\S+)/m);
if (!projectKeyMatch) {
  process.exit(0);
}

const ticket = ticketMatch[0];
const projectKey = projectKeyMatch[1];
const boardUrlMatch = jiraContent.match(/^board_url:\s*(.+)/m);
const boardUrl = boardUrlMatch ? boardUrlMatch[1].trim() : null;

const lines = [
  `[Contexto JIRA]`,
  `Ticket detectado: ${ticket}`,
  `Projeto: ${projectKey}`,
];
if (boardUrl) {
  lines.push(`Board: ${boardUrl}`);
}

process.stdout.write(lines.join('\n') + '\n');
process.exit(0);
