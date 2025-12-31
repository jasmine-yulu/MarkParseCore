/**
 * Markdown -> AST 解析器（入口模块）
 * - 作用: 提供对外的 `parseToAst` 函数；内部依赖区块分词与 AST 构建模块
 * - 流程: 字符串输入 -> 行切分(scanLines) -> 区块分词(tokenizeBlocks) -> 构建 AST(buildAst)
 * - 性能: 通过 `withProfiling/timePhase` 记录总耗时与阶段耗时
 * - 返回: `{ ast: DocumentNode, metrics: { totalMs, phases, bytes } }`
 */
import { withProfiling, timePhase } from '../perf/profiling.js';
import type { DocumentNode } from './ast.js';
import { tokenizeBlocks } from './blocks.js';
import { buildAst } from './build-ast.js';

/**
 * 解析选项
 * - enableFencedCode: 是否开启围栏代码块解析（```/~~~）。默认开启
 */
export type ParseOptions = {
  enableFencedCode?: boolean;
};

/**
 * 将 Markdown 文本解析为 AST
 * - 输入: 原始 Markdown 字符串与解析选项
 * - 流程: 按行切分 -> 区块分词 -> 构建 AST
 * - 返回: AST 以及性能指标（总耗时、各阶段耗时、输入字节数）
 */
export function parseToAst(input: string, options: ParseOptions = {}): { ast: DocumentNode; metrics: { totalMs: number; phases: Record<string, number>; bytes: number } } {
  const bytes = input.length * 2;
  const { result, metrics } = withProfiling(bytes, (phases) => {
    // scanLines: 将整段文本按换行切分
    const lines = timePhase('scanLines', phases, () => input.split(/\r?\n/));
    // tokenizeBlocks: 将行序列切分为区块级令牌
    const blocks = timePhase('tokenizeBlocks', phases, () => tokenizeBlocks(lines, options));
    // buildAst: 把区块令牌转换为最终文档 AST
    const ast = timePhase('buildAst', phases, () => buildAst(blocks));
    return ast;
  });
  return { ast: result, metrics };
}

