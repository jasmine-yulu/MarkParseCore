/**
 * 虚拟滚动渲染器
 * - 基于现有的HTML渲染器实现虚拟滚动
 * - 只渲染可见区域的AST节点
 * - 提供高效的DOM更新机制
 */

import type { AstNode, DocumentNode } from '../core/ast.js';
import type { VirtualScrollConfig, VirtualScrollState, VirtualScrollRenderer } from './types.js';
import { VirtualScrollCore } from './core.js';
import { renderHtml } from '../renderer/html.js';

export class VirtualScrollHtmlRenderer implements VirtualScrollRenderer {
  private core: VirtualScrollCore;
  private config: VirtualScrollConfig;
  private container: HTMLElement | null = null;
  private scrollContainer: HTMLElement | null = null;
  private itemElements: Map<number, HTMLElement> = new Map();

  constructor(config: VirtualScrollConfig) {
    this.config = config;
    this.core = new VirtualScrollCore(config);
  }

  /** 初始化渲染器 */
  init(container: HTMLElement, document: DocumentNode): void {
    this.container = container;
    this.setupScrollContainer();
    this.core.init(document, this.config);
    
    // 初始渲染
    this.render();
  }

  /** 更新滚动位置 */
  updateScroll(scrollTop: number): void {
    const state = this.core.updateScroll(scrollTop);
    this.updateVisibleElements(state);
  }

  /** 渲染单个节点为HTML */
  renderNode(node: AstNode): string {
    // 使用现有的HTML渲染器，并包装在render-content类中
    const tempDoc = { type: 'Document', children: [node] } as DocumentNode;
    const html = renderHtml(tempDoc);
    return `<div class="render-content">${html}</div>`;
  }

  /** 计算节点高度 */
  calculateHeight(node: AstNode): number {
    // 创建临时元素来测量高度
    const tempElement = document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.visibility = 'hidden';
    tempElement.style.top = '-9999px';
    tempElement.innerHTML = this.renderNode(node);
    
    document.body.appendChild(tempElement);
    const height = tempElement.offsetHeight;
    document.body.removeChild(tempElement);
    
    return height;
  }

  /** 更新配置 */
  updateConfig(config: Partial<VirtualScrollConfig>): void {
    this.config = { ...this.config, ...config };
    this.core.updateConfig(config);
  }

  /** 渲染可见区域 */
  renderVisibleArea(state: VirtualScrollState): string {
    const visibleItems = state.visibleItems;
    const htmlParts: string[] = [];
    
    // 添加顶部占位符
    if (state.startIndex > 0 && visibleItems.length > 0) {
      const topOffset = visibleItems[0].offsetTop;
      if (topOffset > 0) {
        htmlParts.push(`<div style="height: ${topOffset}px; width: 100%; display: block;"></div>`);
      }
    }
    
    // 渲染可见项目，添加适当的间距
    visibleItems.forEach((item, index) => {
      const nodeHtml = this.renderNode(item.node);
      const marginBottom = index < visibleItems.length - 1 ? '16px' : '0px'; // 添加底部间距
      htmlParts.push(`<div data-index="${item.index}" style="height: ${item.height}px; width: 100%; display: block; position: absolute; top: ${item.offsetTop}px; left: 0; right: 0; margin-bottom: ${marginBottom};">${nodeHtml}</div>`);
    });
    
    // 添加底部占位符
    if (visibleItems.length > 0) {
      const lastItem = visibleItems[visibleItems.length - 1];
      const bottomOffset = state.totalHeight - (lastItem.offsetTop + lastItem.height);
      if (bottomOffset > 0) {
        htmlParts.push(`<div style="height: ${bottomOffset}px; width: 100%; display: block;"></div>`);
      }
    }
    
    return htmlParts.join('');
  }

  /** 渲染到容器 */
  private render(): void {
    if (!this.container) return;
    
    const state = this.core.getState();
    const html = this.renderVisibleArea(state);
    
    if (this.scrollContainer) {
      // 创建内容包装器，设置正确的高度
      const contentWrapper = document.createElement('div');
      contentWrapper.style.height = `${state.totalHeight}px`;
      contentWrapper.style.position = 'relative';
      contentWrapper.style.width = '100%';
      contentWrapper.innerHTML = html;
      
      this.scrollContainer.innerHTML = '';
      this.scrollContainer.appendChild(contentWrapper);
      
      // 更新元素映射
      this.itemElements.clear();
      state.visibleItems.forEach(item => {
        const element = this.scrollContainer!.querySelector(`[data-index="${item.index}"]`) as HTMLElement;
        if (element) {
          this.itemElements.set(item.index, element);
        }
      });
      
      // 动态调整高度（在下一帧执行，确保DOM已渲染）
      requestAnimationFrame(() => {
        this.adjustHeights(state);
      });
      
      // 调试信息（开发环境）
      if (this.config.debug) {
        console.log('Virtual Scroll Debug:', {
          totalItems: this.core.getAllItems().length,
          visibleItems: state.visibleItems.length,
          startIndex: state.startIndex,
          endIndex: state.endIndex,
          scrollTop: state.scrollTop,
          totalHeight: state.totalHeight
        });
      }
    }
  }

  /** 更新可见元素 */
  private updateVisibleElements(state: VirtualScrollState): void {
    if (!this.scrollContainer) return;
    
    // 直接重新渲染
    this.render();
  }

  /** 动态调整高度 */
  private adjustHeights(state: VirtualScrollState): void {
    if (!this.scrollContainer) return;
    
    let hasChanges = false;
    const allItems = this.core.getAllItems();
    
    // 检查每个可见项目的高度
    state.visibleItems.forEach(item => {
      const element = this.scrollContainer!.querySelector(`[data-index="${item.index}"]`) as HTMLElement;
      if (element) {
        const actualHeight = element.offsetHeight;
        const estimatedHeight = item.height;
        
        // 如果实际高度与估算高度差异较大，更新高度
        if (Math.abs(actualHeight - estimatedHeight) > 5) {
          this.core.updateItemHeight(item.index, actualHeight);
          hasChanges = true;
          
          if (this.config.debug) {
            console.log(`Height adjusted for item ${item.index}: ${estimatedHeight}px -> ${actualHeight}px`);
          }
        }
      }
    });
    
    // 如果有高度变化，重新渲染
    if (hasChanges) {
      this.render();
    }
  }

  /** 创建元素 */
  private createElement(item: any): HTMLElement {
    const element = document.createElement('div');
    element.setAttribute('data-index', item.index.toString());
    element.style.height = `${item.height}px`;
    element.style.width = '100%';
    element.style.position = 'relative';
    element.innerHTML = this.renderNode(item.node);
    return element;
  }

  /** 设置滚动容器 */
  private setupScrollContainer(): void {
    if (!this.container) return;
    
    // 清空容器
    this.container.innerHTML = '';
    
    // 创建滚动容器
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.height = `${this.config.containerHeight}px`;
    this.scrollContainer.style.overflow = 'auto';
    this.scrollContainer.style.position = 'relative';
    this.scrollContainer.style.width = '100%';
    this.scrollContainer.style.border = 'none';
    
    // 添加滚动事件监听
    this.scrollContainer.addEventListener('scroll', (e) => {
      const target = e.target as HTMLElement;
      this.updateScroll(target.scrollTop);
    });
    
    this.container.appendChild(this.scrollContainer);
  }

  /** 销毁渲染器 */
  destroy(): void {
    this.core.destroy();
    this.itemElements.clear();
    
    if (this.scrollContainer && this.scrollContainer.parentNode) {
      this.scrollContainer.parentNode.removeChild(this.scrollContainer);
    }
    
    this.container = null;
    this.scrollContainer = null;
  }

  /** 获取当前状态 */
  getState(): VirtualScrollState {
    return this.core.getState();
  }

  /** 滚动到指定位置 */
  scrollTo(index: number): void {
    if (!this.scrollContainer) return;
    
    const state = this.core.getState();
    const item = state.visibleItems.find(item => item.index === index);
    
    if (item) {
      this.scrollContainer.scrollTop = item.offsetTop;
    }
  }

  /** 滚动到顶部 */
  scrollToTop(): void {
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = 0;
    }
  }

  /** 滚动到底部 */
  scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.scrollTop = this.scrollContainer.scrollHeight;
    }
  }
}
