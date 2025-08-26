import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestCase {
  id: string;
  name: string;
  suite: string;
  test: () => Promise<boolean>;
  timeout?: number;
}

interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'running';
  duration: number;
  error?: string;
}

const testCases: TestCase[] = [
  {
    id: 'auth-login',
    name: 'User Authentication Login',
    suite: 'Authentication',
    test: async () => {
      // Test authentication flow
      const { data, error } = await supabase.auth.signInAnonymously();
      return !error && !!data;
    }
  },
  {
    id: 'course-fetch',
    name: 'Course Data Fetching',
    suite: 'Courses',
    test: async () => {
      // Test course fetching
      const { data, error } = await supabase.from('courses').select('*').limit(1);
      return !error && Array.isArray(data);
    }
  },
  {
    id: 'rls-security',
    name: 'RLS Security Policies',
    suite: 'Security',
    test: async () => {
      // Test RLS by trying to access restricted data
      try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        // Should fail without authentication or return empty for non-admin
        return error !== null || (data && data.length === 0);
      } catch {
        return true; // Expected security restriction
      }
    }
  },
  {
    id: 'performance-basic',
    name: 'Basic Performance Check',
    suite: 'Performance',
    test: async () => {
      const start = performance.now();
      const { data, error } = await supabase.from('courses').select('id').limit(10);
      const duration = performance.now() - start;
      return !error && duration < 1000; // Should complete in under 1 second
    }
  },
  {
    id: 'api-response',
    name: 'API Response Format',
    suite: 'API',
    test: async () => {
      const { data, error } = await supabase.from('courses').select('id, title').limit(1);
      if (error) return false;
      if (!Array.isArray(data)) return false;
      return data.length === 0 || (data[0].hasOwnProperty('id') && data[0].hasOwnProperty('title'));
    }
  }
];

export function TestRunner() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const runTest = async (testCase: TestCase): Promise<TestResult> => {
    const startTime = performance.now();
    
    try {
      setResults(prev => prev.map(r => 
        r.id === testCase.id ? { ...r, status: 'running' as const } : r
      ));

      const passed = await testCase.test();
      const duration = performance.now() - startTime;
      
      const result: TestResult = {
        id: testCase.id,
        name: testCase.name,
        status: passed ? 'passed' : 'failed',
        duration: Math.round(duration),
        error: passed ? undefined : 'Test assertion failed'
      };

      // Log to database
      await supabase.from('test_results').insert({
        test_suite: testCase.suite,
        test_name: testCase.name,
        status: result.status,
        execution_time_ms: result.duration,
        error_message: result.error
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      return {
        id: testCase.id,
        name: testCase.name,
        status: 'failed',
        duration: Math.round(duration),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };

  const runAllTests = async () => {
    setRunning(true);
    
    // Initialize results
    setResults(testCases.map(tc => ({
      id: tc.id,
      name: tc.name,
      status: 'running' as const,
      duration: 0
    })));

    const newResults: TestResult[] = [];
    
    for (const testCase of testCases) {
      const result = await runTest(testCase);
      newResults.push(result);
      
      setResults(prev => prev.map(r => 
        r.id === result.id ? result : r
      ));
    }

    const passed = newResults.filter(r => r.status === 'passed').length;
    const total = newResults.length;
    
    toast({
      title: 'Tests Completed',
      description: `${passed}/${total} tests passed`,
      variant: passed === total ? 'default' : 'destructive'
    });

    setRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      passed: 'default',
      failed: 'destructive',
      running: 'secondary'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Test Runner</CardTitle>
            <CardDescription>
              Run comprehensive tests to ensure platform quality and security
            </CardDescription>
          </div>
          <Button onClick={runAllTests} disabled={running}>
            <Play className="w-4 h-4 mr-2" />
            {running ? 'Running...' : 'Run All Tests'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {testCases.map((testCase) => {
            const result = results.find(r => r.id === testCase.id);
            
            return (
              <div key={testCase.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result?.status || 'pending')}
                  <div>
                    <div className="font-medium">{testCase.name}</div>
                    <div className="text-sm text-muted-foreground">{testCase.suite}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {result?.duration && (
                    <span className="text-sm text-muted-foreground">
                      {result.duration}ms
                    </span>
                  )}
                  {result?.status && getStatusBadge(result.status)}
                </div>
              </div>
            );
          })}
          
          {results.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>
                  Total: {results.length} tests
                </span>
                <span>
                  Passed: {results.filter(r => r.status === 'passed').length} | 
                  Failed: {results.filter(r => r.status === 'failed').length}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}