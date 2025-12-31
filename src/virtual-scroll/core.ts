/**
 * 虚拟滚动核心实现
 * - 管理虚拟滚动的状态和计算
 * - 提供高效的可见区域计算
 * - 支持动态高度调整
 */

import type { AstNode, DocumentNode } from '../core/ast.js';
import type { VirtualScrollConfig, VirtualScrollItem, VirtualScrollState, VirtualScrollManager } from './types.js';

export class VirtualScrollCore implements VirtualScrollManager {
  private document: DocumentNode | null = null;
  private config: VirtualScrollConfig;
  private items: VirtualScrollItem[] = [];
  private state: VirtualScrollState;
  private scrollThrottleTimer: number | null = null;

  /**
   * 构造函数
   * - config.bufferSize: 视窗上下的缓冲区项目数
   * - config.scrollThrottleMs: 滚动节流间隔（毫秒）
   * - config.containerHeight: 容器高度（用于可见范围计算）
   * - config.estimatedItemHeight: 估算的单项高度（用于初始计算）
   */
  constructor(config: VirtualScrollConfig) {
    this.config = {
      bufferSize: 5,
      scrollThrottleMs: 16, // ~60fps
      ...config
    };
    
    this.state = {
      scrollTop: 0,
      startIndex: 0,
      endIndex: 0,
      totalHeight: 0,
      visibleItems: []
    };
  }

  /**
   * 初始化虚拟滚动
   * - 传入 Document AST 与可选配置，构建内部 items 并进行首次可见范围计算
   */
  init(document: DocumentNode, config?: Partial<VirtualScrollConfig>): void {
    this.document = document;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.buildItems();
    this.updateScroll(0);
  }

  /**
   * 更新滚动位置（带节流）
   * - scrollTop: 容器滚动偏移
   * - 返回最新状态快照
   */
  updateScroll(scrollTop: number): VirtualScrollState {
    // 节流处理
    if (this.scrollThrottleTimer) {
      return this.state;
    }

    this.scrollThrottleTimer = setTimeout(() => {
      this.scrollThrottleTimer = null;
    }, this.config.scrollThrottleMs);

    this.state.scrollTop = scrollTop;
    this.calculateVisibleRange();
    this.updateVisibleItems();
    
    return this.state;
  }

  /** 获取当前状态（返回拷贝，避免外部修改内部状态） */
  getState(): VirtualScrollState {
    return { ...this.state };
  }

  /** 销毁并清理资源（计时器、引用等） */
  destroy(): void {
    if (this.scrollThrottleTimer) {
      clearTimeout(this.scrollThrottleTimer);
      this.scrollThrottleTimer = null;
    }
    this.document = null;
    this.items = [];
  }

  /**
   * 根据 Document AST 构建可滚动项列表
   * - 为每个顶层节点估算高度并累加 offsetTop
   */
  private buildItems(): void {
    if (!this.document) return;

    this.items = [];
    let currentOffset = 0;

    this.document.children.forEach((node, index) => {
      const height = this.estimateNodeHeight(node);
      
      const item = {
        node,
        index,
        height,
        offsetTop: currentOffset,
        visible: false
      };
      
      this.items.push(item);
      currentOffset += height;
    });

    this.state.totalHeight = currentOffset;
  }

  /**
   * 计算可见范围 [startIndex, endIndex]
   * - 基于 scrollTop 与 containerHeight，并加入 bufferSize 缓冲
   * - 线性扫描找到首个/最后一个可见项，并扩展缓冲
   */
  private calculateVisibleRange(): void {
    const { scrollTop } = this.state;
    const { containerHeight } = this.config;
    const bufferSize = this.config.bufferSize || 5;
    
    // 计算可见区域
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;
    
    // 添加缓冲区
    const bufferTop = Math.max(0, viewportTop - bufferSize * this.config.estimatedItemHeight);
    const bufferBottom = viewportBottom + bufferSize * this.config.estimatedItemHeight;

    // 找到可见范围
    let startIndex = 0;
    let endIndex = this.items.length - 1;

    // 确保有项目时才进行计算
    if (this.items.length > 0) {
      // 使用更精确的可见区域计算
      const viewportTop = scrollTop;
      const viewportBottom = scrollTop + containerHeight;
      const bufferSize = Math.max(this.config.bufferSize || 5, 10);
      
      // 找到第一个可见项目
      startIndex = 0;
      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        if (item.offsetTop + item.height > viewportTop) {
          startIndex = Math.max(0, i - bufferSize);
          break;
        }
      }
      
      // 找到最后一个可见项目
      endIndex = this.items.length - 1;
      for (let i = startIndex; i < this.items.length; i++) {
        const item = this.items[i];
        if (item.offsetTop > viewportBottom) {
          endIndex = Math.min(this.items.length - 1, i + bufferSize);
          break;
        }
      }
      
      // 确保至少显示一些内容
      if (startIndex >= endIndex) {
        startIndex = Math.max(0, endIndex - 5);
      }
    }

    this.state.startIndex = Math.max(0, startIndex);
    this.state.endIndex = Math.min(this.items.length - 1, endIndex);
  }

  /**
   * 二分查找指定偏移所在的项目索引
   * - targetOffset: 目标顶部偏移
   */
  private findItemIndex(targetOffset: number): number {
    let left = 0;
    let right = this.items.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const item = this.items[mid];
      
      if (item.offsetTop <= targetOffset && targetOffset < item.offsetTop + item.height) {
        return mid;
      } else if (item.offsetTop < targetOffset) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return Math.min(left, this.items.length - 1);
  }

  /**
   * 根据计算的范围更新可见项列表与可见标记
   */
  private updateVisibleItems(): void {
    // 重置所有项目的可见性
    this.items.forEach(item => {
      item.visible = false;
    });

    // 设置可见项目
    this.state.visibleItems = [];
    for (let i = this.state.startIndex; i <= this.state.endIndex; i++) {
      const item = this.items[i];
      item.visible = true;
      this.state.visibleItems.push(item);
    }
  }

  /**
   * 估算节点高度（按类型粗略估算）
   * - 用于未测量前的虚拟滚动布局，尽量保守以减少抖动
   */
  private estimateNodeHeight(node: AstNode): number {
    // 基于节点类型估算高度，使用更保守的估算
    switch (node.type) {
      case 'Heading': {
        const depth = (node as any).depth || 1;
        const textLength = this.getTextLength(node);
        const baseHeight = depth === 1 ? 60 : depth === 2 ? 50 : 45;
        const estimatedHeight = Math.max(baseHeight, Math.ceil(textLength / 50) * 25);
        return estimatedHeight + 16; // 添加额外间距
      }
      case 'Paragraph': {
        const textLength = this.getTextLength(node);
        // 更保守的段落高度估算
        const lines = Math.ceil(textLength / 50); // 假设每行50字符
        const estimatedHeight = Math.max(30, lines * 28 + 20); // 28px行高 + 20px边距
        return estimatedHeight + 16; // 添加额外间距
      }
      case 'CodeBlock': {
        const codeLines = (node as any).value.split('\n').length;
        // 代码块高度估算更保守
        const estimatedHeight = Math.max(60, codeLines * 24 + 40); // 24px行高 + 40px边距
        return estimatedHeight + 16; // 添加额外间距
      }
      case 'Table': {
        const tableRows = (node as any).rows.length + 1; // +1 for header
        const estimatedHeight = Math.max(60, tableRows * 36 + 30);
        return estimatedHeight + 16; // 添加额外间距
      }
      case 'List': {
        const listItems = (node as any).items.length;
        const estimatedHeight = Math.max(40, listItems * 32 + 20);
        return estimatedHeight + 16; // 添加额外间距
      }
      case 'Blockquote': {
        const textLength = this.getTextLength(node);
        const lines = Math.ceil(textLength / 50);
        const estimatedHeight = Math.max(50, lines * 28 + 30);
        return estimatedHeight + 16; // 添加额外间距
      }
      case 'ThematicBreak':
        return 30 + 16; // 添加额外间距
      default:
        return Math.max(this.config.estimatedItemHeight, 50) + 16; // 最小50px + 间距
    }
  }

  /** 递归计算节点文本内容长度（用于高度估算） */
  private getTextLength(node: AstNode): number {
    if (node.type === 'Text') {
      return (node as any).value.length;
    }
    
    if ('children' in node && Array.isArray(node.children)) {
      return node.children.reduce((sum, child) => sum + this.getTextLength(child), 0);
    }
    
    return 0;
  }

  /** 更新节点高度（用于动态调整） */
  updateItemHeight(index: number, height: number): void {
    if (index >= 0 && index < this.items.length) {
      const oldHeight = this.items[index].height;
      this.items[index].height = height;
      
      // 更新后续项目的偏移位置
      const heightDiff = height - oldHeight;
      for (let i = index + 1; i < this.items.length; i++) {
        this.items[i].offsetTop += heightDiff;
      }
      
      // 更新总高度
      this.state.totalHeight += heightDiff;
    }
  }

  /** 更新配置 */
  updateConfig(config: Partial<VirtualScrollConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果文档已初始化，重新构建项目
    if (this.document) {
      this.buildItems();
      this.updateScroll(this.state.scrollTop);
    }
  }

  /** 获取所有项目（用于调试） */
  getAllItems(): VirtualScrollItem[] {
    return [...this.items];
  }
}
