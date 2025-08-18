import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentCount: number;
  memoryUsage: number;
  fps: number;
}

interface PerformanceHookResult {
  metrics: PerformanceMetrics;
  isLagging: boolean;
  startProfiling: () => void;
  stopProfiling: () => void;
}

export const usePerformanceMonitoring = (): PerformanceHookResult => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0,
    fps: 0
  });

  const [isLagging, setIsLagging] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafIdRef = useRef<number>();

  const measureFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastTimeRef.current;
    
    if (delta >= 1000) {
      const fps = (frameCountRef.current * 1000) / delta;
      setMetrics(prev => ({ ...prev, fps: Math.round(fps) }));
      setIsLagging(fps < 30);
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
    
    frameCountRef.current++;
    rafIdRef.current = requestAnimationFrame(measureFPS);
  }, []);

  const startProfiling = useCallback(() => {
    measureFPS();
  }, [measureFPS]);

  const stopProfiling = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return {
    metrics,
    isLagging,
    startProfiling,
    stopProfiling
  };
};

// Performance monitoring HOC
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function PerformanceMonitoredComponent(props: P) {
    return <Component {...props} />;
  };
}