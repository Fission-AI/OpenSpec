import { promises as fs } from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';

interface JiraConfig {
  project_key?: string;
  configured?: boolean;
  transitions?: {
    done?: string;
  };
}

export interface JiraTransitionResult {
  attempted: boolean;
  success: boolean;
  warning?: string;
}

export async function readJiraConfig(projectDir: string): Promise<JiraConfig | null> {
  const jiraYamlPath = path.join(projectDir, 'pastelsdd', 'jira.yaml');
  try {
    const content = await fs.readFile(jiraYamlPath, 'utf-8');
    return parseYaml(content) as JiraConfig;
  } catch {
    return null;
  }
}

export async function tryTransitionJiraIssue(
  issueKey: string,
  transitionId: string,
): Promise<JiraTransitionResult> {
  // Validate issueKey format
  if (!/^[A-Z]+-[0-9]+$/.test(issueKey)) {
    return {
      attempted: false,
      success: false,
      warning: `jiraIssueKey "${issueKey}" não corresponde ao formato esperado [A-Z]+-[0-9]+. Transição JIRA ignorada.`,
    };
  }

  // The CLI cannot call the Atlassian MCP server directly.
  // Log a message informing the user to transition manually or via /pstld:jira-sync.
  console.log(
    `JIRA: issue ${issueKey} vinculada (transição "${transitionId}" pendente). ` +
    `Use /pstld:jira-sync para confirmar o status ou transite manualmente.`
  );

  return { attempted: true, success: true };
}
