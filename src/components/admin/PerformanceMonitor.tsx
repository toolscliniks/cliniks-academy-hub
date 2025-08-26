import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Clock, Zap, TrendingUp, AlertCircle } from 'lucide-react';

interface PerformanceMetric {
  id: string;
  page_path: string;
  load_time_ms: number;
  performance_data: any;
  created_at: string;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMetrics, setCurrentMetrics] = useState({
    memory: 0,
    timing: 0,
    resources: 0
  });

  useEffect(() => {
    loadPerformanceData();
    measureCurrentPerformance();
  }, []);

  const loadPerformanceData = async () => {
    try {
      const { data, error } = await supabase
        .from('performance_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const measureCurrentPerformance = () => {
    // Memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      setCurrentMetrics(prev => ({
        ...prev,
        memory: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      }));
    }

    // Timing performance
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      setCurrentMetrics(prev => ({
        ...prev,
        timing: Math.min(100, Math.round(loadTime / 30)) // Scale to 100 (3s = 100%)
      }));
    }

    // Resource performance
    const resources = performance.getEntriesByType('resource');
    const avgResourceTime = resources.length > 0 
      ? resources.reduce((sum, resource) => sum + resource.duration, 0) / resources.length
      : 0;
    
    setCurrentMetrics(prev => ({
      ...prev,
      resources: Math.min(100, Math.round(avgResourceTime / 10)) // Scale to 100
    }));
  };

  const getPerformanceGrade = (loadTime: number) => {
    if (loadTime < 1000) return { grade: 'A', color: 'text-green-500', bg: 'bg-green-100' };
    if (loadTime < 2000) return { grade: 'B', color: 'text-yellow-500', bg: 'bg-yellow-100' };
    if (loadTime < 3000) return { grade: 'C', color: 'text-orange-500', bg: 'bg-orange-100' };
    return { grade: 'D', color: 'text-red-500', bg: 'bg-red-100' };
  };

  const getAverageLoadTime = () => {
    if (metrics.length === 0) return 0;
    const total = metrics.reduce((sum, metric) => sum + metric.load_time_ms, 0);
    return Math.round(total / metrics.length);
  };

  const getPageMetrics = () => {
    const pageGroups = metrics.reduce((acc, metric) => {
      const path = metric.page_path;
      if (!acc[path]) acc[path] = [];
      acc[path].push(metric.load_time_ms);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(pageGroups).map(([path, times]) => ({
      path,
      avgTime: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length),
      count: times.length
    })).sort((a, b) => b.avgTime - a.avgTime);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Monitor</CardTitle>
          <CardDescription>Loading performance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pageMetrics = getPageMetrics();
  const avgLoadTime = getAverageLoadTime();
  const performanceGrade = getPerformanceGrade(avgLoadTime);

  return (
    <div className="space-y-6">
      {/* Current Performance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{currentMetrics.memory}%</div>
              <Progress value={currentMetrics.memory} />
              <p className="text-xs text-muted-foreground">
                JavaScript heap usage
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Load Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{avgLoadTime}ms</div>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${performanceGrade.bg} ${performanceGrade.color}`}>
                Grade {performanceGrade.grade}
              </div>
              <p className="text-xs text-muted-foreground">
                Average page load time
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{metrics.length}</div>
              <Badge variant="secondary">Last 24h</Badge>
              <p className="text-xs text-muted-foreground">
                Performance measurements
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Page Performance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Page Performance Breakdown</CardTitle>
          <CardDescription>
            Average load times by page route
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pageMetrics.slice(0, 10).map((page) => {
              const grade = getPerformanceGrade(page.avgTime);
              return (
                <div key={page.path} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{page.path || '/'}</div>
                      <div className="text-sm text-muted-foreground">
                        {page.count} measurements
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{page.avgTime}ms</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${grade.bg} ${grade.color}`}>
                      {grade.grade}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {pageMetrics.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No performance data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}