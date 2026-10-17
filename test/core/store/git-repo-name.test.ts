import { describe, expect, it } from 'vitest';

import { repoNameFromGitUrl } from '../../../src/core/store/git.js';
import { isKebabId, toKebabCase } from '../../../src/core/id.js';

describe('repoNameFromGitUrl', () => {
  it.each([
    ['git@github.com:user/my-repo.git', 'my-repo'],
    ['https://github.com/user/my-repo.git', 'my-repo'],
    ['ssh://git@github.com/user/my-repo.git', 'my-repo'],
    ['git@gitlab.example.com:group/subgroup/repo', 'repo'],
    ['https://host/user/MyRepo', 'MyRepo'],
    ['https://github.com/user/repo', 'repo'],
  ])('extracts the repo name from %s', (url, expected) => {
    expect(repoNameFromGitUrl(url)).toBe(expected);
  });

  it('returns null for an empty or unparseable URL', () => {
    expect(repoNameFromGitUrl('')).toBeNull();
    expect(repoNameFromGitUrl('not a url')).toBeNull();
    expect(repoNameFromGitUrl('https://github.com/')).toBeNull();
  });
});

describe('toKebabCase', () => {
  it.each([
    ['myRepo', 'my-repo'],
    ['MyRepo', 'my-repo'],
    ['my_repo', 'my-repo'],
    ['my.repo', 'my-repo'],
    ['MyRepoName', 'my-repo-name'],
    ['my-repo', 'my-repo'],
    ['HTTPServer', 'http-server'],
  ])('normalizes %s to %s', (input, expected) => {
    const result = toKebabCase(input);
    expect(result).toBe(expected);
    expect(isKebabId(result)).toBe(true);
  });
});
