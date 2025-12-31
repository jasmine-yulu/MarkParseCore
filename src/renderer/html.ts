/**
 * AST -> HTML 渲染器
 * - 入口函数: `renderHtml(doc)`
 * - 将 AST 中的段落、标题、代码块、文本渲染为 HTML 字符串
 * - 安全: 使用 `escapeHtml` 转义文本/代码，避免注入
 */
import type { AstNode, DocumentNode, ParagraphNode, TextNode, HeadingNode, CodeBlockNode, CodeSpanNode, ThematicBreakNode, BlockquoteNode, ListNode, ListItemNode, LinkNode, ImageNode, TableNode, TableRowNode, TableCellNode, EmphasisNode, StrongNode } from '../core/ast.js';

/**
 * 转义文本中的 HTML 特殊字符
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 将 Document AST 渲染为 HTML 字符串
 */
export function renderHtml(doc: DocumentNode): string {
  const out: string[] = [];
  for (const node of doc.children) {
    out.push(renderNode(node));
  }
  return out.join('');
}

/**
 * 渲染任意 AST 节点为 HTML 片段
 */
function renderNode(node: AstNode): string {
  switch (node.type) {
    case 'Paragraph':
      return `<p>${renderInlines((node as ParagraphNode).children)}</p>`;
    case 'Heading': {
      const n = node as HeadingNode;
      return `<h${n.depth}>${renderInlines(n.children)}</h${n.depth}>`;
    }
    case 'CodeBlock': {
      const n = node as CodeBlockNode;
      const cls = n.lang ? ` class="language-${escapeHtml(n.lang)}"` : '';
      return `<pre><code${cls}>${escapeHtml(n.value)}</code></pre>`;
    }
    case 'CodeSpan': {
      const n = node as CodeSpanNode;
      return `<code>${escapeHtml(n.value)}</code>`;
    }
    case 'ThematicBreak':
      return `<hr/>`;
    case 'Blockquote': {
      const n = node as BlockquoteNode;
      return `<blockquote>${n.children.map(renderNode).join('')}</blockquote>`;
    }
    case 'List': {
      const n = node as ListNode;
      const tag = n.ordered ? 'ol' : 'ul';
      const startAttr = n.ordered && n.start && n.start !== 1 ? ` start="${n.start}"` : '';
      const items = n.items.map(li => `<li>${li.children.map(renderNode).join('')}</li>`).join('');
      return `<${tag}${startAttr}>${items}</${tag}>`;
    }
    case 'Link': {
      const n = node as LinkNode;
      const title = n.title ? ` title="${escapeHtml(n.title)}"` : '';
      return `<a href="${escapeHtml(n.url)}"${title}>${renderInlines(n.children)}</a>`;
    }
    case 'Image': {
      const n = node as ImageNode;
      const title = n.title ? ` title="${escapeHtml(n.title)}"` : '';
      return `<img src="${escapeHtml(n.url)}" alt="${escapeHtml(n.alt)}"${title}/>`;
    }
    case 'Emphasis':
      return `<em>${renderInlines((node as EmphasisNode).children)}</em>`;
    case 'Strong':
      return `<strong>${renderInlines((node as StrongNode).children)}</strong>`;
    case 'Table': {
      const n = node as TableNode;
      const thead = `<thead>${renderRow(n.header)}</thead>`;
      const tbody = `<tbody>${n.rows.map(renderRow).join('')}</tbody>`;
      return `<table>${thead}${tbody}</table>`;
    }
    case 'Text':
      return escapeHtml((node as TextNode).value);
    default:
      return '';
  }
}

/**
 * 渲染行内节点序列
 */
function renderInlines(children: AstNode[]): string {
  return children.map(renderNode).join('');
}

/**
 * 渲染表格行
 */
function renderRow(row: TableRowNode): string {
  const cells = row.cells.map(c => renderCell(c)).join('');
  return `<tr>${cells}</tr>`;
}

/**
 * 渲染表格单元格
 */
function renderCell(cell: TableCellNode): string {
  const tag = cell.header ? 'th' : 'td';
  const align = cell.align && cell.align !== 'none' ? ` style="text-align:${cell.align};"` : '';
  return `<${tag}${align}>${renderInlines(cell.children)}</${tag}>`;
}









