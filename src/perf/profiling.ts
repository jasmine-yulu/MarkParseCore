/**
 * 性能度量工具
 * - `now`: 获取高精度时间
 * - `timePhase`: 记录某阶段耗时并累加
 * - `withProfiling`: 包裹执行，返回结果与 { totalMs, phases, bytes }
 * - 被解析器用来衡量各阶段性能
 */
export type PerfMetrics = {
  totalMs: number;
  phases: Record<string, number>;
  bytes: number;
};

/**
 * 获取高精度当前时间戳（毫秒）
 * - 优先使用 performance.now；回退到 Date.now
 */
export function now(): number {
  // Use performance.now when available for better precision.
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * 记录某个阶段的耗时
 * - label: 阶段名称
 * - phases: 分阶段耗时聚合对象
 * - fn: 被计时的函数
 */
export function timePhase<T>(label: string, phases: Record<string, number>, fn: () => T): T {
  const t0 = now();
  const out = fn();
  const t1 = now();
  phases[label] = (phases[label] ?? 0) + (t1 - t0);
  return out;
}

/**
 * 包裹执行以统计总耗时与阶段耗时
 * - bytes: 输入规模（字节数），便于计算吞吐
 * - run: 执行主体，内部可多次调用 timePhase
 * - 返回: { result, metrics }
 */
export function withProfiling<T>(bytes: number, run: (phases: Record<string, number>) => T): { result: T; metrics: PerfMetrics } {
  const phases: Record<string, number> = {};
  const t0 = now();
  const result = run(phases);
  const t1 = now();
  const metrics: PerfMetrics = {
    totalMs: t1 - t0,
    phases,
    bytes,
  };
  return { result, metrics };
}


