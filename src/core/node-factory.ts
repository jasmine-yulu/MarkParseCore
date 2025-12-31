/**
 * 节点工厂（Node Factory）
 * - 说明: 提供构建 AST 各类节点的纯函数，集中管理节点创建逻辑
 * - 作用: 供解析流程（区块分词/行内解析/AST 构建）复用，保持职责单一
 */
import type {
  AstNode,
  ParagraphNode,
  TextNode,
  HeadingNode,
  CodeBlockNode,
  CodeSpanNode,
  ThematicBreakNode,
  BlockquoteNode,
  ListItemNode,
  ListNode,
  LinkNode,
  ImageNode,
  TableCellNode,
  TableRowNode,
  TableNode,
  TableAlign,
} from './ast.js';

/**
 * 文本节点
 */
export function createText(value: string): TextNode {
  return { type: 'Text', value };
}

/**
 * 段落节点
 */
export function createParagraph(children: AstNode[]): ParagraphNode {
  return { type: 'Paragraph', children };
}

/**
 * 标题节点（深度范围 1..6）
 */
export function createHeading(depth: number, children: AstNode[]): HeadingNode {
  const d = Math.min(6, Math.max(1, depth | 0)) as 1 | 2 | 3 | 4 | 5 | 6;
  return { type: 'Heading', depth: d, children };
}

/**
 * 代码块节点
 */
export function createCodeBlock(value: string, lang?: string): CodeBlockNode {
  return { type: 'CodeBlock', value, lang };
}

/**
 * 行内代码
 */
export function createCodeSpan(value: string): CodeSpanNode {
  return { type: 'CodeSpan', value };
}

/** 水平分隔线 */
export function createHr(): ThematicBreakNode { return { type: 'ThematicBreak' }; }

/** 引用块 */
export function createBlockquote(children: AstNode[]): BlockquoteNode { return { type: 'Blockquote', children }; }

/** 列表项 */
export function createListItem(children: AstNode[]): ListItemNode { return { type: 'ListItem', children }; }

/** 列表（ordered=true 表示有序列表） */
export function createList(ordered: boolean, items: ListItemNode[], start?: number): ListNode {
  return { type: 'List', ordered, items, start };
}

/** 超链接 */
export function createLink(url: string, children: AstNode[], title?: string): LinkNode {
  return { type: 'Link', url, title, children };
}

/** 图片 */
export function createImage(url: string, alt: string, title?: string): ImageNode {
  return { type: 'Image', url, alt, title };
}

/** 表格单元格（header=true 表示表头单元格） */
export function createTableCell(header: boolean, align: TableAlign, children: AstNode[]): TableCellNode {
  return { type: 'TableCell', header, align, children };
}

/** 表格行 */
export function createTableRow(cells: TableCellNode[]): TableRowNode {
  return { type: 'TableRow', cells };
}

/** 表格 */
export function createTable(aligns: TableAlign[], header: TableRowNode, rows: TableRowNode[]): TableNode {
  return { type: 'Table', aligns, header, rows };
}


