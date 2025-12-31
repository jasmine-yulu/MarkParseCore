/**
 * 行内解析（Inline Parser）
 * - 说明: 将一行或多行文本解析为行内 AST 节点序列
 * - 能力: 代码片段、强调/加粗、链接、图片、自动链接(URL/Email) 等
 */
import type { AstNode } from './ast.js';
import { createCodeSpan, createImage, createLink, createText } from './node-factory.js';

/**
 * 解析行内 Markdown 语法
 * - 支持: `\`` 行内代码、强调/加粗、链接 [text](url "title")、图片 ![alt](url "title")
 * - 自动识别: 裸露 URL(http/https) 与 Email
 * - 转义: 使用 `\\` 转义紧随其后的单个字符
 */
export function parseInline(text: string): AstNode[] {
  const nodes: AstNode[] = [];
  let i = 0;
  const pushText = (s: string) => {
    if (s.length) nodes.push(createText(s));
  };
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && i + 1 < text.length) {
      pushText(text[i + 1]);
      i += 2;
      continue;
    }
    // 自动链接: URL（需在词首或空白后）
    if ((i === 0 || /\s/.test(text[i - 1] ?? ' ')) && (text.startsWith('http://', i) || text.startsWith('https://', i))) {
      const match = /^https?:\/\/[\w\-._~:/?#\[\]@!$&'()*+,;=%]+/.exec(text.slice(i));
      if (match) {
        const url = match[0];
        nodes.push(createLink(url, [createText(url)]));
        i += url.length;
        continue;
      }
    }
    // 自动链接: Email（需在词首或空白后）
    if (i === 0 || /\s/.test(text[i - 1] ?? ' ')) {
      const emailMatch = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.exec(text.slice(i));
      if (emailMatch) {
        const addr = emailMatch[0];
        nodes.push(createLink(`mailto:${addr}`, [createText(addr)]));
        i += addr.length;
        continue;
      }
    }
    // 图片: ![alt](url "title")
    if (ch === '!' && text[i + 1] === '[') {
      const close = text.indexOf(']', i + 2);
      const openParen = close >= 0 ? text.indexOf('(', close + 1) : -1;
      const closeParen = openParen >= 0 ? text.indexOf(')', openParen + 1) : -1;
      if (closeParen > openParen && openParen > close && close > i) {
        const alt = text.slice(i + 2, close);
        const inside = text.slice(openParen + 1, closeParen).trim();
        const [url, titlePart] = splitUrlTitle(inside);
        nodes.push(createImage(url, alt, titlePart));
        i = closeParen + 1;
        continue;
      }
    }
    // 链接: [label](url "title")
    if (ch === '[') {
      const close = text.indexOf(']', i + 1);
      const openParen = close >= 0 ? text.indexOf('(', close + 1) : -1;
      const closeParen = openParen >= 0 ? text.indexOf(')', openParen + 1) : -1;
      if (closeParen > openParen && openParen > close && close > i) {
        const label = text.slice(i + 1, close);
        const inside = text.slice(openParen + 1, closeParen).trim();
        const [url, titlePart] = splitUrlTitle(inside);
        nodes.push(createLink(url, [createText(label)], titlePart));
        i = closeParen + 1;
        continue;
      }
    }
    // 行内代码: `code`
    if (ch === '`') {
      const j = text.indexOf('`', i + 1);
      if (j > i) {
        const code = text.slice(i + 1, j);
        nodes.push(createCodeSpan(code));
        i = j + 1;
        continue;
      }
    }
    // 强调/加粗: *em* _em_ **strong** __strong__
    if (ch === '*' || ch === '_') {
      if (text[i + 1] === ch) {
        const j = findClosing(text, ch + ch, i + 2);
        if (j > i) {
          const inner = parseInline(text.slice(i + 2, j));
          nodes.push({ type: 'Strong', children: inner } as any);
          i = j + 2;
          continue;
        }
      } else {
        const j = findClosing(text, ch, i + 1);
        if (j > i) {
          const inner = parseInline(text.slice(i + 1, j));
          nodes.push({ type: 'Emphasis', children: inner } as any);
          i = j + 1;
          continue;
        }
      }
    }
    let j = i + 1;
    while (j < text.length) {
      const cj = text[j];
      if ('`*_['.indexOf(cj) !== -1 || cj === '!') break;
      const prev = text[j - 1] ?? ' ';
      if (/\s/.test(prev)) {
        if (text.startsWith('http://', j) || text.startsWith('https://', j)) break;
        const emailAhead = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.exec(text.slice(j));
        if (emailAhead) break;
      }
      j++;
    }
    pushText(text.slice(i, j));
    i = j;
  }
  return nodes;
}

/**
 * 拆分形如: `url "title"` 的参数串
 * - 返回: [url, title]；若无标题则 title 为 undefined
 */
export function splitUrlTitle(inside: string): [string, string | undefined] {
  const m = /^(\S+)(?:\s+"([^"]+)")?$/.exec(inside);
  if (m) return [m[1], m[2]];
  return [inside, undefined];
}

/**
 * 查找强调/加粗的闭合标记位置
 * - marker: `*`/`_` 或 `**`/`__`
 * - 处理反引号包裹的代码片段与反斜杠转义
 */
export function findClosing(text: string, marker: string, from: number): number {
  let i = from;
  while (i < text.length) {
    if (text[i] === '\\') { i += 2; continue; }
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end < 0) return -1;
      i = end + 1; continue;
    }
    if (marker.length === 2 && text[i] === marker[0] && text[i + 1] === marker[1]) return i;
    if (marker.length === 1 && text[i] === marker) return i;
    i++;
  }
  return -1;
}


