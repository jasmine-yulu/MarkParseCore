/**
 * 虚拟滚动渲染器类型定义
 * - 定义虚拟滚动相关的接口和类型
 * - 支持大文档的高性能渲染
 */

import type { AstNode, DocumentNode } from '../core/ast.js';

export interface VirtualScrollConfig {
  /** 容器高度 */
  containerHeight: number;
  /** 每项预估高度 */
  estimatedItemHeight: number;
  /** 缓冲区大小（渲染区域外的额外项目数） */
  bufferSize?: number;
  /** 滚动节流延迟（ms） */
  scrollThrottleMs?: number;
  /** 是否启用调试模式 */
  debug?: boolean;
}

export interface VirtualScrollItem {
  /** AST节点 */
  node: AstNode;
  /** 在文档中的索引 */
  index: number;
  /** 计算出的高度 */
  height: number;
  /** 累计偏移位置 */
  offsetTop: number;
  /** 是否可见 */
  visible: boolean;
}

export interface VirtualScrollState {
  /** 滚动位置 */
  scrollTop: number;
  /** 可见区域开始索引 */
  startIndex: number;
  /** 可见区域结束索引 */
  endIndex: number;
  /** 总高度 */
  totalHeight: number;
  /** 可见项目列表 */
  visibleItems: VirtualScrollItem[];
}

export interface VirtualScrollRenderer {
  /** 渲染单个节点为HTML */
  renderNode(node: AstNode): string;
  /** 计算节点高度 */
  calculateHeight(node: AstNode): number;
  /** 更新配置 */
  updateConfig(config: Partial<VirtualScrollConfig>): void;
  /** 渲染可见区域 */
  renderVisibleArea(state: VirtualScrollState): string;
}


export interface VirtualScrollManager {
  /** 初始化虚拟滚动 */
  init(document: DocumentNode, config: VirtualScrollConfig): void;
  /** 更新滚动位置 */
  updateScroll(scrollTop: number): VirtualScrollState;
  /** 获取当前状态 */
  getState(): VirtualScrollState;
  /** 销毁管理器 */
  destroy(): void;
}
