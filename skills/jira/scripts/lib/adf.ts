/**
 * Atlassian Document Format (ADF) utilities
 * ADF is required for Jira Cloud API description and comment fields
 */

export interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface AdfDocument {
  type: 'doc';
  version: 1;
  content: AdfNode[];
}

export function createAdfDocument(content: AdfNode[]): AdfDocument {
  return {
    type: 'doc',
    version: 1,
    content,
  };
}

export function createParagraph(text: string): AdfNode {
  return {
    type: 'paragraph',
    content: [{ type: 'text', text }],
  };
}

export function createHeading(text: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 2): AdfNode {
  return {
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  };
}

export function createBulletList(items: string[], parseLinks = false): AdfNode {
  return {
    type: 'bulletList',
    content: items.map(item => ({
      type: 'listItem',
      content: [
        parseLinks
          ? { type: 'paragraph', content: parseInlineLinks(item) }
          : createParagraph(item),
      ],
    })),
  };
}

export function createOrderedList(items: string[], parseLinks = false): AdfNode {
  return {
    type: 'orderedList',
    content: items.map(item => ({
      type: 'listItem',
      content: [
        parseLinks
          ? { type: 'paragraph', content: parseInlineLinks(item) }
          : createParagraph(item),
      ],
    })),
  };
}

export function createLink(text: string, url: string): AdfNode {
  return {
    type: 'text',
    text,
    marks: [
      {
        type: 'link',
        attrs: { href: url },
      },
    ],
  };
}

export function createParagraphWithLink(beforeText: string, linkText: string, url: string, afterText = ''): AdfNode {
  const content: AdfNode[] = [];
  
  if (beforeText) {
    content.push({ type: 'text', text: beforeText });
  }
  
  content.push(createLink(linkText, url));
  
  if (afterText) {
    content.push({ type: 'text', text: afterText });
  }
  
  return {
    type: 'paragraph',
    content,
  };
}

export function createCodeBlock(code: string, language = 'plaintext'): AdfNode {
  return {
    type: 'codeBlock',
    attrs: { language },
    content: [{ type: 'text', text: code }],
  };
}

export function createHorizontalRule(): AdfNode {
  return { type: 'rule' };
}

export function createTable(rows: string[][]): AdfNode {
  return {
    type: 'table',
    attrs: {
      isNumberColumnEnabled: false,
      layout: 'default',
    },
    content: rows.map((row, rowIndex) => ({
      type: 'tableRow',
      content: row.map(cell => ({
        type: rowIndex === 0 ? 'tableHeader' : 'tableCell',
        attrs: {},
        content: [
          {
            type: 'paragraph',
            content: parseInlineLinks(cell.trim()),
          },
        ],
      })),
    })),
  };
}

interface ParsedLine {
  type: 'heading' | 'bullet' | 'ordered' | 'paragraph' | 'link' | 'code' | 'rule' | 'table' | 'codeBlockStart' | 'codeBlockEnd';
  content: string;
  level?: number;
  url?: string;
  linkText?: string;
  language?: string;
  cells?: string[];
}

function parseLine(line: string): ParsedLine | null {
  if (!line.trim()) return null;
  
  // Code block start/end
  const codeBlockMatch = line.match(/^```(\w*)$/);
  if (codeBlockMatch) {
    return { type: 'codeBlockStart', content: '', language: codeBlockMatch[1] || 'plaintext' };
  }
  
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    return { type: 'heading', content: headingMatch[2], level: headingMatch[1].length };
  }
  
  const bulletMatch = line.match(/^[-*]\s+(.+)$/);
  if (bulletMatch) {
    return { type: 'bullet', content: bulletMatch[1] };
  }
  
  const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
  if (orderedMatch) {
    return { type: 'ordered', content: orderedMatch[1] };
  }
  
  if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
    return { type: 'rule', content: '' };
  }
  
  // Table row (starts and ends with |)
  const tableMatch = line.match(/^\|(.+)\|$/);
  if (tableMatch) {
    const cells = tableMatch[1].split('|').map(c => c.trim());
    // Skip separator rows like |---|---|
    if (cells.every(c => /^[-:]+$/.test(c))) {
      return null;
    }
    return { type: 'table', content: line, cells };
  }
  
  return { type: 'paragraph', content: line };
}

function parseInlineLinks(text: string): AdfNode[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const nodes: AdfNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = linkRegex.exec(text);
  
  while (match !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    nodes.push(createLink(match[1], match[2]));
    lastIndex = match.index + match[0].length;
    match = linkRegex.exec(text);
  }
  
  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) });
  }
  
  return nodes.length > 0 ? nodes : [{ type: 'text', text }];
}

export function markdownToAdf(markdown: string): AdfDocument {
  const lines = markdown.split('\n');
  const content: AdfNode[] = [];
  let bulletItems: string[] = [];
  let orderedItems: string[] = [];
  let tableRows: string[][] = [];
  let inCodeBlock = false;
  let codeBlockLanguage = 'plaintext';
  let codeBlockLines: string[] = [];
  
  const flushBulletList = () => {
    if (bulletItems.length > 0) {
      content.push(createBulletList(bulletItems, true));
      bulletItems = [];
    }
  };
  
  const flushOrderedList = () => {
    if (orderedItems.length > 0) {
      content.push(createOrderedList(orderedItems, true));
      orderedItems = [];
    }
  };
  
  const flushTable = () => {
    if (tableRows.length > 0) {
      content.push(createTable(tableRows));
      tableRows = [];
    }
  };
  
  const flushCodeBlock = () => {
    if (codeBlockLines.length > 0) {
      content.push(createCodeBlock(codeBlockLines.join('\n'), codeBlockLanguage));
      codeBlockLines = [];
      codeBlockLanguage = 'plaintext';
    }
  };
  
  for (const line of lines) {
    if (inCodeBlock) {
      if (line.match(/^```$/)) {
        inCodeBlock = false;
        flushCodeBlock();
      } else {
        codeBlockLines.push(line);
      }
      continue;
    }
    
    const parsed = parseLine(line);
    
    if (!parsed) {
      flushBulletList();
      flushOrderedList();
      flushTable();
      continue;
    }
    
    switch (parsed.type) {
      case 'codeBlockStart':
        flushBulletList();
        flushOrderedList();
        flushTable();
        inCodeBlock = true;
        codeBlockLanguage = parsed.language || 'plaintext';
        break;
        
      case 'heading':
        flushBulletList();
        flushOrderedList();
        flushTable();
        content.push(createHeading(parsed.content, parsed.level as 1 | 2 | 3 | 4 | 5 | 6));
        break;
        
      case 'bullet':
        flushOrderedList();
        flushTable();
        bulletItems.push(parsed.content);
        break;
        
      case 'ordered':
        flushBulletList();
        flushTable();
        orderedItems.push(parsed.content);
        break;
        
      case 'table':
        flushBulletList();
        flushOrderedList();
        if (parsed.cells) {
          tableRows.push(parsed.cells);
        }
        break;
        
      case 'rule':
        flushBulletList();
        flushOrderedList();
        flushTable();
        content.push(createHorizontalRule());
        break;
        
      case 'paragraph': {
        flushBulletList();
        flushOrderedList();
        flushTable();
        const inlineContent = parseInlineLinks(parsed.content);
        content.push({
          type: 'paragraph',
          content: inlineContent,
        });
        break;
      }
    }
  }
  
  flushBulletList();
  flushOrderedList();
  flushTable();
  flushCodeBlock();
  
  return createAdfDocument(content);
}

export function adfToPlainText(adf: AdfDocument | unknown): string {
  if (!adf || typeof adf !== 'object') return '';
  
  const doc = adf as AdfDocument;
  if (doc.type !== 'doc' || !doc.content) return '';
  
  const extractText = (node: AdfNode): string => {
    if (node.text) return node.text;
    if (!node.content) return '';
    return node.content.map(extractText).join('');
  };
  
  return doc.content.map(node => {
    switch (node.type) {
      case 'heading':
        return `${'#'.repeat((node.attrs?.level as number) || 2)} ${extractText(node)}`;
      case 'paragraph':
        return extractText(node);
      case 'bulletList':
        return node.content?.map(li => `- ${extractText(li)}`).join('\n') || '';
      case 'orderedList':
        return node.content?.map((li, i) => `${i + 1}. ${extractText(li)}`).join('\n') || '';
      case 'codeBlock':
        return '```' + (node.attrs?.language || '') + '\n' + extractText(node) + '\n```';
      case 'table': {
        if (!node.content) return '';
        const rows = node.content.map(row => {
          const cells = row.content?.map(cell => extractText(cell)) || [];
          return '| ' + cells.join(' | ') + ' |';
        });
        if (rows.length > 0) {
          const headerSep = '| ' + (node.content[0]?.content?.map(() => '---').join(' | ') || '') + ' |';
          rows.splice(1, 0, headerSep);
        }
        return rows.join('\n');
      }
      case 'rule':
        return '---';
      default:
        return extractText(node);
    }
  }).filter(Boolean).join('\n\n');
}
