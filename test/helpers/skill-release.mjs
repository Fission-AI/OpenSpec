// Give the real installer a release tag before this checkout has been published.
import { execFileSync } from 'node:child_process';
import { cpSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const repo = process.argv[2];
const { version } = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { stdio: 'pipe' });

cpSync(path.join(root, 'skills'), path.join(repo, 'skills'), { recursive: true });
cpSync(path.join(root, '.gitattributes'), path.join(repo, '.gitattributes'));
git('init', '--quiet', '-b', 'main');
git('add', '.gitattributes', 'skills');
git('-c', 'user.name=OpenSpec', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Release skills');
git('tag', '--no-sign', `v${version}`);

// Vercel treats a configured GitHub host as a Git source, so its optional
// GitHub API calls stay out of offline tests as well.
git('config', '--file', path.join(repo, 'gitconfig'), `url.${pathToFileURL(repo).href}.insteadOf`, 'https://skills.example.invalid/Fission-AI/OpenSpec.git');
