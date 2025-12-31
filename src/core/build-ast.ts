/**
 * AST 构建（Build AST）
 * - 说明: 根据区块级 Block 列表，构建最终的 Document AST
 * - 依赖: 行内解析 parseInline、节点工厂 node-factory
 */
import type { AstNode, DocumentNode } from './ast.js';
import { createBlockquote, createCodeBlock, createHeading, createHr, createList, createListItem, createParagraph, createTable, createTableCell, createTableRow } from './node-factory.js';
import { parseInline } from './inline.js';
import { tokenizeBlocks, type Block } from './blocks.js';

/**
 * 根据 Block 列表构建最终 Document AST
 * - 行内文本通过 parseInline 转为行内节点
 * - 列表、表格、引用等进行层级组装
 */
export function buildAst(blocks: Block[]): DocumentNode {
  const children: AstNode[] = [];
  for (const b of blocks) {
    if (b.kind === 'heading') {
      children.push(createHeading(b.depth, parseInline(b.content)));
    } else if (b.kind === 'paragraph') {
      children.push(createParagraph(parseInline(b.content)));
    } else if (b.kind === 'codeblock') {
      children.push(createCodeBlock(b.content, b.lang));
    } else if (b.kind === 'hr') {
      children.push(createHr());
    } else if (b.kind === 'blockquote') {
      // 引用内部可再次进行区块切分与 AST 构建
      const inner = tokenizeBlocks(b.lines, {});
      const nodeKids: AstNode[] = buildAst(inner).children;
      children.push(createBlockquote(nodeKids));
    } else if (b.kind === 'olist') {
      const items = b.items.map(lines => createListItem([createParagraph(parseInline(lines.join('\n')))]));
      children.push(createList(true, items, b.start));
    } else if (b.kind === 'ulist') {
      const items = b.items.map(lines => createListItem([createParagraph(parseInline(lines.join('\n')))]));
      children.push(createList(false, items));
    } else if (b.kind === 'table') {
      const headerCells = b.header.map((cell, idx) => createTableCell(true, b.aligns[idx] ?? 'none', parseInline(cell.trim())));
      const head = createTableRow(headerCells);
      const bodyRows = b.rows.map(row => createTableRow(row.map((cell, idx) => createTableCell(false, b.aligns[idx] ?? 'none', parseInline(cell.trim())))));
      children.push(createTable(b.aligns, head, bodyRows));
    }
  }
  return { type: 'Document', children };
}


