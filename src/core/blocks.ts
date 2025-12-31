/**
 * 区块分词（Blocks Tokenizer）
 * - 说明: 将按行的 Markdown 文本切分成区块级 Block 令牌，供后续 AST 构建
 * - 产出: heading/paragraph/codeblock/hr/blockquote/list/table 等 Block 描述
 */
import type { TableAlign } from './ast.js';

/**
 * 区块令牌类型（供 AST 构建阶段消费）
 */
export type Block =
  | { kind: 'heading'; depth: number; content: string }
  | { kind: 'paragraph'; content: string }
  | { kind: 'codeblock'; lang?: string; content: string }
  | { kind: 'hr' }
  | { kind: 'blockquote'; lines: string[] }
  | { kind: 'olist'; start: number; items: string[][] }
  | { kind: 'ulist'; items: string[][] }
  | { kind: 'table'; aligns: TableAlign[]; header: string[]; rows: string[][] };

let listNextIndex = 0;

/**
 * 将按行文本切分为区块级 Block 列表
 * - 仅作语法切分，不含行内解析
 */
export function tokenizeBlocks(lines: string[], options: { enableFencedCode?: boolean }): Block[] {
  const out: Block[] = [];
  let i = 0;
  let inFence = false;
  let fenceLang: string | undefined;
  let fenceBuffer: string[] = [];
  let fenceMarker = '```';

  while (i < lines.length) {
    const line = lines[i];
    // 围栏代码块起始（``` 或 ~~~）
    if (!inFence && options.enableFencedCode !== false) {
      const m = /^(\s*)(`{3,}|~{3,})([^`]*)$/.exec(line);
      if (m) {
        inFence = true;
        fenceMarker = m[2];
        const lang = m[3].trim();
        fenceLang = lang.length ? lang : undefined;
        fenceBuffer.length = 0;
        i++;
        continue;
      }
    }

    // 围栏内：累积直至遇到关闭围栏
    if (inFence) {
      if (/^(\s*)(`{3,}|~{3,})\s*$/.test(line)) {
        out.push({ kind: 'codeblock', lang: fenceLang, content: fenceBuffer.join('\n') });
        inFence = false;
        fenceLang = undefined;
        fenceBuffer.length = 0;
        i++;
        continue;
      }
      fenceBuffer.push(line);
      i++;
      continue;
    }

    // 缩进代码块（开头为 tab 或 >=4 个空格）
    if (/^(\t| {4,})/.test(line)) {
      const buf: string[] = [];
      let j = i;
      while (j < lines.length) {
        const l = lines[j];
        if (l.length === 0) { buf.push(''); j++; continue; }
        if (/^(\t| {4,})/.test(l)) {
          buf.push(l.replace(/^(\t| {4})/, ''));
          j++;
          continue;
        }
        break;
      }
      out.push({ kind: 'codeblock', lang: undefined, content: buf.join('\n') });
      i = j;
      continue;
    }

    // 水平分隔线
    if (/^\s*(?:\*\s*){3,}$/.test(line) || /^\s*(?:-\s*){3,}$/.test(line) || /^\s*(?:_\s*){3,}$/.test(line)) {
      out.push({ kind: 'hr' });
      i++;
      continue;
    }

    // 表格：表头行 + 对齐分隔行
    if (line.includes('|') && i + 1 < lines.length) {
      const maybeHeader = splitTableRow(line);
      const maybeSep = splitTableSep(lines[i + 1]);
      if (maybeHeader && maybeSep) {
        const aligns = maybeSep;
        const header = maybeHeader;
        const rows: string[][] = [];
        i += 2;
        while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) {
          const r = splitTableRow(lines[i]);
          if (!r) break;
          rows.push(r);
          i++;
        }
        out.push({ kind: 'table', aligns, header, rows });
        continue;
      }
    }

    // 引用块
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push({ kind: 'blockquote', lines: buf });
      continue;
    }

    const olist = /^\s*(\d{1,9})\.\s+(.*)$/;
    const ulist = /^\s*([*+-])\s+(.*)$/;
    // 有序列表
    if (olist.test(line)) {
      const items: string[][] = [];
      let start = 1;
      while (i < lines.length) {
        const m = olist.exec(lines[i]);
        if (!m) break;
        if (items.length === 0) start = parseInt(m[1], 10) || 1;
        items.push(collectListItem(lines, () => olist.exec(lines[i + 1] ?? '') != null, m[2], i));
        i = listNextIndex;
      }
      out.push({ kind: 'olist', start, items });
      continue;
    }
    // 无序列表
    if (ulist.test(line)) {
      const items: string[][] = [];
      while (i < lines.length) {
        const m = ulist.exec(lines[i]);
        if (!m) break;
        items.push(collectListItem(lines, () => ulist.exec(lines[i + 1] ?? '') != null, m[2], i));
        i = listNextIndex;
      }
      out.push({ kind: 'ulist', items });
      continue;
    }

    // ATX 标题（# ...）
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
      out.push({ kind: 'heading', depth: headingMatch[1].length, content: headingMatch[2] });
      i++;
      continue;
    }

    if (line.trim().length === 0) {
      i++;
      continue;
    }

    // Setext 标题（下一行是 === 或 ---）
    if (i + 1 < lines.length) {
      const next = lines[i + 1];
      const mSetext = /^\s*(=+|-+)\s*$/.exec(next);
      if (mSetext && line.trim().length > 0) {
        const underline = mSetext[1][0];
        const depth = underline === '=' ? 1 : 2;
        out.push({ kind: 'heading', depth, content: line.trim() });
        i += 2;
        continue;
      }
    }

    // 段落聚合，直到遇到阻断项
    let buf = [line];
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim().length === 0) break;
      if (/^(#{1,6})\s+/.test(l)) break;
      if (/^(\s*)(`{3,}|~{3,})/.test(l)) break;
      if (/^\s*(?:\*\s*){3,}$/.test(l) || /^\s*(?:-\s*){3,}$/.test(l) || /^\s*(?:_\s*){3,}$/.test(l)) break;
      if (/^\s*>\s?/.test(l)) break;
      if (/^\s*(\d{1,9})\.\s+/.test(l)) break;
      if (/^\s*([*+-])\s+/.test(l)) break;
      if (/^(\t| {4,})/.test(l)) break;
      if (l.includes('|') && i + 1 < lines.length) {
        const maybeHeader = splitTableRow(l);
        const maybeSep = splitTableSep(lines[i + 1]);
        if (maybeHeader && maybeSep) break;
      }
      buf.push(l);
      i++;
    }
    out.push({ kind: 'paragraph', content: buf.join('\n') });
  }
  return out;
}

/**
 * 收集一个列表项的后续文本，直到遇到下一标记或阻断
 */
export function collectListItem(lines: string[], isNextMarker: () => boolean, first: string, index: number): string[] {
  const buf: string[] = [first];
  let i = index + 1;
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim().length === 0) { i++; break; }
    if (isNextMarker()) break;
    if (/^(\s*)(`{3,}|~{3,})/.test(l)) break;
    if (/^\s*(?:\*\s*){3,}$/.test(l) || /^\s*(?:-\s*){3,}$/.test(l) || /^\s*(?:_\s*){3,}$/.test(l)) break;
    if (/^(#{1,6})\s+/.test(l)) break;
    if (/^\s*>\s?/.test(l)) break;
    if (/^\s*(\d{1,9})\.\s+/.test(l)) break;
    if (/^\s*([*+-])\s+/.test(l)) break;
    buf.push(l);
    i++;
  }
  listNextIndex = i;
  return buf;
}

/**
 * 拆分表格行（去掉首尾竖线，并按竖线分割单元格）
 */
export function splitTableRow(line: string): string[] | null {
  const raw = line.trim();
  if (!raw.includes('|')) return null;
  const trimmed = raw.replace(/^\|/, '').replace(/\|$/, '');
  const cells = trimmed.split('|').map(c => c.trim());
  return cells.length ? cells : null;
}

/**
 * 解析表头分隔行，转换为列对齐信息
 * - :--- 左对齐，:---: 居中，---: 右对齐，--- 无对齐
 */
export function splitTableSep(line: string): TableAlign[] | null {
  const raw = line.trim();
  if (!raw.includes('|')) return null;
  const trimmed = raw.replace(/^\|/, '').replace(/\|$/, '');
  const parts = trimmed.split('|').map(c => c.trim());
  const aligns: TableAlign[] = [];
  for (const p of parts) {
    if (!/^:?-{3,}:?$/.test(p)) return null;
    const left = p.startsWith(':');
    const right = p.endsWith(':');
    aligns.push(left && right ? 'center' : left ? 'left' : right ? 'right' : 'none');
  }
  return aligns;
}


