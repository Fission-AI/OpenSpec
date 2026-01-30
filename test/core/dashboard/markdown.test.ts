import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../../src/core/dashboard/markdown.js';

describe('renderMarkdown', () => {
  it('renders headings h1-h6', () => {
    expect(renderMarkdown('# Title')).toContain('<h1>Title</h1>');
    expect(renderMarkdown('## Subtitle')).toContain('<h2>Subtitle</h2>');
    expect(renderMarkdown('### H3')).toContain('<h3>H3</h3>');
    expect(renderMarkdown('###### H6')).toContain('<h6>H6</h6>');
  });

  it('renders paragraphs', () => {
    expect(renderMarkdown('Hello world')).toContain('<p>Hello world</p>');
  });

  it('renders bold text', () => {
    const html = renderMarkdown('This is **bold** text');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('renders italic text', () => {
    const html = renderMarkdown('This is *italic* text');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders bold+italic text', () => {
    const html = renderMarkdown('This is ***both*** styled');
    expect(html).toContain('<strong><em>both</em></strong>');
  });

  it('renders inline code', () => {
    const html = renderMarkdown('Use `npm install` to install');
    expect(html).toContain('<code>npm install</code>');
  });

  it('renders fenced code blocks', () => {
    const md = '```\nconst x = 1;\nconst y = 2;\n```';
    const html = renderMarkdown(md);
    expect(html).toContain('<pre><code>');
    expect(html).toContain('const x = 1;');
    expect(html).toContain('const y = 2;');
  });

  it('renders unordered lists', () => {
    const md = '- Item 1\n- Item 2\n- Item 3';
    const html = renderMarkdown(md);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Item 1</li>');
    expect(html).toContain('<li>Item 2</li>');
    expect(html).toContain('<li>Item 3</li>');
    expect(html).toContain('</ul>');
  });

  it('renders ordered lists', () => {
    const md = '1. First\n2. Second\n3. Third';
    const html = renderMarkdown(md);
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>First</li>');
    expect(html).toContain('</ol>');
  });

  it('renders checkboxes', () => {
    const md = '- [x] Done task\n- [ ] Pending task';
    const html = renderMarkdown(md);
    expect(html).toContain('class="checklist"');
    expect(html).toContain('checked disabled');
    expect(html).toContain('Done task');
    expect(html).toContain('Pending task');
  });

  it('renders blockquotes', () => {
    const md = '> This is a quote';
    const html = renderMarkdown(md);
    expect(html).toContain('<blockquote>');
    expect(html).toContain('This is a quote');
  });

  it('renders horizontal rules', () => {
    expect(renderMarkdown('---')).toContain('<hr>');
    expect(renderMarkdown('***')).toContain('<hr>');
    expect(renderMarkdown('___')).toContain('<hr>');
  });

  it('renders links', () => {
    const md = 'Visit [OpenSpec](https://example.com) for more';
    const html = renderMarkdown(md);
    expect(html).toContain('<a href="https://example.com"');
    expect(html).toContain('>OpenSpec</a>');
  });

  it('escapes HTML entities', () => {
    const md = 'Use <div> and &amp; in text';
    const html = renderMarkdown(md);
    expect(html).toContain('&lt;div&gt;');
    expect(html).toContain('&amp;amp;');
  });

  it('handles mixed content', () => {
    const md = [
      '# Title',
      '',
      'A paragraph with **bold** and *italic*.',
      '',
      '- List item 1',
      '- List item 2',
      '',
      '```',
      'code block',
      '```',
    ].join('\n');

    const html = renderMarkdown(md);
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<pre><code>');
  });

  it('handles empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
