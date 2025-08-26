import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestRunner } from '@/components/testing/TestRunner';
import { PerformanceMonitor } from '@/components/admin/PerformanceMonitor';
import { SecurityAudit } from '@/components/admin/SecurityAudit';
import { ErrorLogs } from '@/components/admin/ErrorLogs';
import { Shield, Activity, Bug, TestTube } from 'lucide-react';

export function AdminTesting() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Testing & Quality Assurance</h2>
        <p className="text-muted-foreground">
          Comprehensive testing, monitoring, and quality assurance tools
        </p>
      </div>

      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tests">
            <TestTube className="w-4 h-4 mr-2" />
            Automated Tests
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Activity className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="errors">
            <Bug className="w-4 h-4 mr-2" />
            Error Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          <TestRunner />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceMonitor />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecurityAudit />
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <ErrorLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}