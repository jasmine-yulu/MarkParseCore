/**
 * MarkParse Core 入口聚合模块
 * - 作用: 作为库的对外入口，聚合导出 AST 类型、解析器、HTML 渲染器、虚拟滚动与性能工具。
 * - 使用场景: 外部通过 `import { parseToAst, renderHtml, createVirtualScrollRenderer } from 'mark-parse-core'` 直接使用。
 */
export * from './core/ast.js';
export * from './core/parser.js';
export * from './renderer/html.js';
export * from './perf/profiling.js';
export * from './virtual-scroll/index.js';


