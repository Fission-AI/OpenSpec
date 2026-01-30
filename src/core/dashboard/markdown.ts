/**
 * Lightweight markdown-to-HTML renderer for OpenSpec artifacts.
 * Handles the subset of markdown used in OpenSpec: headings, paragraphs,
 * bold, italic, code, lists, checkboxes, blockquotes, horizontal rules, links.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  let result = escapeHtml(text);

  // Inline code (must come before bold/italic to avoid conflicts)
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold + italic
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  return result;
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';
  let inBlockquote = false;
  let blockquoteLines: string[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      html.push(`<p>${renderInline(paragraphLines.join(' '))}</p>`);
      paragraphLines = [];
    }
  }

  function flushList() {
    if (inList) {
      html.push(`</${listType}>`);
      inList = false;
    }
  }

  function flushBlockquote() {
    if (inBlockquote) {
      html.push(`<blockquote>${renderMarkdown(blockquoteLines.join('\n'))}</blockquote>`);
      blockquoteLines = [];
      inBlockquote = false;
    }
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code blocks
    if (line.trimStart().startsWith('```')) {
      if (!inCodeBlock) {
        flushParagraph();
        flushList();
        flushBlockquote();
        inCodeBlock = true;
        codeLines = [];
        i++;
        continue;
      } else {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
        i++;
        continue;
      }
    }

    if (inCodeBlock) {
      codeLines.push(line);
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushParagraph();
      flushList();
      flushBlockquote();
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushBlockquote();
      html.push('<hr>');
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      flushBlockquote();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ') || line === '>') {
      flushParagraph();
      flushList();
      inBlockquote = true;
      blockquoteLines.push(line.replace(/^>\s?/, ''));
      i++;
      continue;
    }
    if (inBlockquote) {
      flushBlockquote();
    }

    // Checkbox list items
    const checkboxMatch = line.match(/^[-*]\s+\[([ x])\]\s+(.*)$/i);
    if (checkboxMatch) {
      flushParagraph();
      flushBlockquote();
      if (!inList || listType !== 'ul') {
        flushList();
        html.push('<ul class="checklist">');
        inList = true;
        listType = 'ul';
      }
      const checked = checkboxMatch[1].toLowerCase() === 'x';
      const checkedAttr = checked ? ' checked disabled' : ' disabled';
      html.push(
        `<li><input type="checkbox"${checkedAttr}> ${renderInline(checkboxMatch[2])}</li>`
      );
      i++;
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      flushBlockquote();
      if (!inList || listType !== 'ul') {
        flushList();
        html.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      html.push(`<li>${renderInline(ulMatch[1])}</li>`);
      i++;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      flushBlockquote();
      if (!inList || listType !== 'ol') {
        flushList();
        html.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      html.push(`<li>${renderInline(olMatch[1])}</li>`);
      i++;
      continue;
    }

    // Regular paragraph line
    flushList();
    flushBlockquote();
    paragraphLines.push(line);
    i++;
  }

  // Flush remaining state
  if (inCodeBlock) {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }
  flushParagraph();
  flushList();
  flushBlockquote();

  return html.join('\n');
}
