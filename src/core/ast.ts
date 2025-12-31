/**
 * AST 类型定义
 * - 定义文档(Document)、段落(Paragraph)、文本(Text)、标题(Heading)、代码块(CodeBlock)等节点
 * - 被解析器(parser.ts)构建并被渲染器(html.ts)消费
 */
/**
 * 源文本中的位置信息（可选）
 */
export type Position = {
  offset: number;
  line: number;
  column: number;
};

/** 文本范围（半闭区间语义） */
export type Range = { start: Position; end: Position };

export interface AstNodeBase {
  type: string;
  range?: Range;
}

/** 根文档节点 */
export interface DocumentNode extends AstNodeBase {
  type: 'Document';
  children: AstNode[];
}

/** 段落 */
export interface ParagraphNode extends AstNodeBase {
  type: 'Paragraph';
  children: AstNode[];
}

/** 纯文本 */
export interface TextNode extends AstNodeBase {
  type: 'Text';
  value: string;
}

/** 标题（1..6 级） */
export interface HeadingNode extends AstNodeBase {
  type: 'Heading';
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  children: AstNode[];
}

/** 代码块 */
export interface CodeBlockNode extends AstNodeBase {
  type: 'CodeBlock';
  lang?: string;
  value: string;
}

/** 行内代码 */
export interface CodeSpanNode extends AstNodeBase {
  type: 'CodeSpan';
  value: string;
}

/** 斜体/强调 */
export interface EmphasisNode extends AstNodeBase {
  type: 'Emphasis';
  children: AstNode[];
}

/** 粗体/加粗 */
export interface StrongNode extends AstNodeBase {
  type: 'Strong';
  children: AstNode[];
}

/** 水平分隔线 */
export interface ThematicBreakNode extends AstNodeBase {
  type: 'ThematicBreak';
}

/** 引用块 */
export interface BlockquoteNode extends AstNodeBase {
  type: 'Blockquote';
  children: AstNode[];
}

/** 列表项（通常包含一个段落） */
export interface ListItemNode extends AstNodeBase {
  type: 'ListItem';
  children: AstNode[]; // typically [Paragraph | ...]
}

/** 列表（ordered=true 表示有序列表） */
export interface ListNode extends AstNodeBase {
  type: 'List';
  ordered: boolean;
  start?: number; // for ordered lists
  items: ListItemNode[];
}

/** 超链接 */
export interface LinkNode extends AstNodeBase {
  type: 'Link';
  url: string;
  title?: string;
  children: AstNode[];
}

/** 图片 */
export interface ImageNode extends AstNodeBase {
  type: 'Image';
  url: string;
  alt: string;
  title?: string;
}

/** 表格列对齐方式 */
export type TableAlign = 'left' | 'center' | 'right' | 'none';

/** 表格单元格 */
export interface TableCellNode extends AstNodeBase {
  type: 'TableCell';
  header: boolean;
  align: TableAlign;
  children: AstNode[];
}

/** 表格行 */
export interface TableRowNode extends AstNodeBase {
  type: 'TableRow';
  cells: TableCellNode[];
}

/** 表格 */
export interface TableNode extends AstNodeBase {
  type: 'Table';
  aligns: TableAlign[];
  header: TableRowNode;
  rows: TableRowNode[];
}

export type AstNode =
  | DocumentNode
  | ParagraphNode
  | TextNode
  | HeadingNode
  | CodeBlockNode
  | CodeSpanNode
  | EmphasisNode
  | StrongNode
  | ThematicBreakNode
  | BlockquoteNode
  | ListNode
  | ListItemNode
  | LinkNode
  | ImageNode
  | TableNode
  | TableRowNode
  | TableCellNode;


