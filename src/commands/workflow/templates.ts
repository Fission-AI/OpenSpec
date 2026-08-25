/**
 * Templates 命令
 *
 * 显示 schema 中所有制品已解析的模板路径。
 */

import ora from 'ora';
import path from 'path';
import {
  resolveSchema,
  getSchemaDir,
  ArtifactGraph,
} from '../../core/artifact-graph/index.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { validateSchemaExists, DEFAULT_SCHEMA } from './shared.js';

// -----------------------------------------------------------------------------
// 类型
// -----------------------------------------------------------------------------

export interface TemplatesOptions {
  schema?: string;
  json?: boolean;
}

export interface TemplateInfo {
  artifactId: string;
  templatePath: string;
  source: 'project' | 'user' | 'package';
}

// -----------------------------------------------------------------------------
// 命令实现
// -----------------------------------------------------------------------------

export async function templatesCommand(options: TemplatesOptions): Promise<void> {
  const spinner = options.json ? undefined : ora('正在加载模板...').start();

  try {
    const projectRoot = process.cwd();
    const schemaName = validateSchemaExists(options.schema ?? DEFAULT_SCHEMA, projectRoot);
    const schema = resolveSchema(schemaName, projectRoot);
    const graph = ArtifactGraph.fromSchema(schema);
    const schemaDir = getSchemaDir(schemaName, projectRoot)!;

    // 确定来源（project、user 或 package）
    const {
      getUserSchemasDir,
      getProjectSchemasDir,
    } = await import('../../core/artifact-graph/resolver.js');
    const projectSchemasDir = getProjectSchemasDir(projectRoot);
    const userSchemasDir = getUserSchemasDir();

    // 通过检查 schemaDir 是否在每个基础目录内来确定来源
    // 使用 path.relative 比 startsWith 更健壮的路径比较
    const isInsideDir = (child: string, parent: string): boolean => {
      const relative = path.relative(parent, child);
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    };

    let source: 'project' | 'user' | 'package';
    if (isInsideDir(schemaDir, projectSchemasDir)) {
      source = 'project';
    } else if (isInsideDir(schemaDir, userSchemasDir)) {
      source = 'user';
    } else {
      source = 'package';
    }

    const templatesDir = path.join(schemaDir, 'templates');
    const templates: TemplateInfo[] = graph.getAllArtifacts().map((artifact) => {
      const templatePath = path.join(templatesDir, artifact.template);
      try {
        FileSystemUtils.assertPathWithin(templatesDir, templatePath);
        return {
          artifactId: artifact.id,
          templatePath: FileSystemUtils.canonicalizeExistingPath(templatePath),
          source,
        };
      } catch {
        throw new Error(
          `制品 '${artifact.id}' 的模板 '${artifact.template}' 指向了 schema 模板目录之外的位置`
        );
      }
    });

    spinner?.stop();

    if (options.json) {
      const output: Record<string, { path: string; source: string }> = {};
      for (const t of templates) {
        output[t.artifactId] = { path: t.templatePath, source: t.source };
      }
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    console.log(`Schema：${schemaName}`);
    console.log(`来源：${source}`);
    console.log();

    for (const t of templates) {
      console.log(`${t.artifactId}：`);
      console.log(`  ${t.templatePath}`);
    }
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}