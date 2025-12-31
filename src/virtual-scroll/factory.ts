/**
 * 虚拟滚动工厂函数
 * - 提供便捷的虚拟滚动渲染器创建方法
 * - 支持多种配置选项
 * - 简化使用流程
 */

import type { DocumentNode } from '../core/ast.js';
import type { VirtualScrollConfig } from './types.js';
import { VirtualScrollHtmlRenderer } from './renderer.js';

export interface VirtualScrollOptions extends VirtualScrollConfig {
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 自定义CSS类名 */
  className?: string;
  /** 是否显示滚动条 */
  showScrollbar?: boolean;
}

/**
 * 创建虚拟滚动渲染器
 */
export function createVirtualScrollRenderer(options: VirtualScrollOptions): VirtualScrollHtmlRenderer {
  const { debug, className, showScrollbar, ...configOptions } = options;
  const config: VirtualScrollConfig = {
    ...configOptions,
    bufferSize: configOptions.bufferSize ?? 5,
    scrollThrottleMs: configOptions.scrollThrottleMs ?? 16,
    containerHeight: configOptions.containerHeight ?? 600,
    estimatedItemHeight: configOptions.estimatedItemHeight ?? 50
  };

  return new VirtualScrollHtmlRenderer(config);
}

/**
 * 快速创建并初始化虚拟滚动渲染器
 */
export function createAndInitVirtualScroll(
  container: HTMLElement,
  document: DocumentNode,
  options: VirtualScrollOptions = { containerHeight: 600, estimatedItemHeight: 50 }
): VirtualScrollHtmlRenderer {
  const renderer = createVirtualScrollRenderer(options);
  
  // 应用自定义样式
  if (options.className) {
    container.classList.add(options.className);
  }
  
  if (options.showScrollbar === false) {
    container.style.scrollbarWidth = 'none';
    (container.style as any).msOverflowStyle = 'none';
  }
  
  // 初始化渲染器
  renderer.init(container, document);
  
  return renderer;
}

/**
 * 预设配置
 */
export const VirtualScrollPresets = {
  /** 编辑器模式 - 适合代码编辑器 */
  editor: {
    containerHeight: 400,
    estimatedItemHeight: 20,
    bufferSize: 10,
    scrollThrottleMs: 8,
    showScrollbar: true
  },
  
  /** 文档模式 - 适合文档阅读 */
  document: {
    containerHeight: 600,
    estimatedItemHeight: 50,
    bufferSize: 5,
    scrollThrottleMs: 16,
    showScrollbar: true
  },
  
  /** 移动端模式 - 适合移动设备 */
  mobile: {
    containerHeight: 300,
    estimatedItemHeight: 40,
    bufferSize: 3,
    scrollThrottleMs: 32,
    showScrollbar: false
  },
  
  /** 高性能模式 - 适合超大文档 */
  performance: {
    containerHeight: 800,
    estimatedItemHeight: 30,
    bufferSize: 2,
    scrollThrottleMs: 8,
    showScrollbar: true
  }
} as const;

/**
 * 使用预设创建虚拟滚动渲染器
 */
export function createVirtualScrollWithPreset(
  preset: keyof typeof VirtualScrollPresets,
  customOptions: Partial<VirtualScrollOptions> = {}
): VirtualScrollHtmlRenderer {
  const presetConfig = VirtualScrollPresets[preset];
  const options = { ...presetConfig, ...customOptions };
  return createVirtualScrollRenderer(options);
}
