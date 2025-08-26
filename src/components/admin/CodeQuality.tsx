import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  GitBranch, 
  Code, 
  FileText,
  TrendingUp
} from 'lucide-react';

interface CodeMetric {
  metric: string;
  value: number;
  target: number;
  status: 'good' | 'warning' | 'error';
  description: string;
}

interface ReviewItem {
  id: string;
  title: string;
  type: 'code' | 'documentation' | 'test';
  status: 'pending' | 'approved' | 'rejected';
  author: string;
  reviewedBy?: string;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
}

const codeMetrics: CodeMetric[] = [
  {
    metric: 'Test Coverage',
    value: 85,
    target: 80,
    status: 'good',
    description: 'Percentage of code covered by automated tests'
  },
  {
    metric: 'Code Complexity',
    value: 6.2,
    target: 8.0,
    status: 'good',
    description: 'Cyclomatic complexity average'
  },
  {
    metric: 'TypeScript Coverage',
    value: 95,
    target: 90,
    status: 'good',
    description: 'Files with proper TypeScript typing'
  },
  {
    metric: 'ESLint Violations',
    value: 12,
    target: 0,
    status: 'warning',
    description: 'Active linting violations'
  },
  {
    metric: 'Bundle Size',
    value: 850,
    target: 1000,
    status: 'good',
    description: 'Main bundle size in KB'
  },
  {
    metric: 'Performance Score',
    value: 88,
    target: 85,
    status: 'good',
    description: 'Lighthouse performance score'
  }
];

const reviewItems: ReviewItem[] = [
  {
    id: '1',
    title: 'Authentication system refactor',
    type: 'code',
    status: 'pending',
    author: 'Developer',
    createdAt: '2024-01-15T10:00:00Z',
    priority: 'high'
  },
  {
    id: '2',
    title: 'API documentation update',
    type: 'documentation',
    status: 'approved',
    author: 'Developer',
    reviewedBy: 'Tech Lead',
    createdAt: '2024-01-14T14:30:00Z',
    priority: 'medium'
  },
  {
    id: '3',
    title: 'Integration test suite',
    type: 'test',
    status: 'pending',
    author: 'QA Engineer',
    createdAt: '2024-01-16T09:15:00Z',
    priority: 'high'
  }
];

export function CodeQuality() {
  const [selectedTab, setSelectedTab] = useState('metrics');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'secondary',
      medium: 'outline',
      high: 'destructive'
    } as const;
    
    return <Badge variant={variants[priority as keyof typeof variants]}>{priority}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'code': return <Code className="w-4 h-4" />;
      case 'documentation': return <FileText className="w-4 h-4" />;
      case 'test': return <CheckCircle className="w-4 h-4" />;
      default: return <GitBranch className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Code Quality & Reviews</h2>
        <p className="text-muted-foreground">
          Monitor code quality metrics and manage development reviews
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">
            <TrendingUp className="w-4 h-4 mr-2" />
            Quality Metrics
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <GitBranch className="w-4 h-4 mr-2" />
            Code Reviews
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {codeMetrics.map((metric) => (
              <Card key={metric.metric}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.metric}
                  </CardTitle>
                  {getStatusIcon(metric.status)}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typeof metric.value === 'number' && metric.value < 100 && metric.metric.includes('%') 
                      ? `${metric.value}%` 
                      : metric.value
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: {metric.target}
                    {metric.metric.includes('Coverage') || metric.metric.includes('Score') ? '%' : ''}
                  </p>
                  <div className="mt-2">
                    <Progress 
                      value={metric.metric.includes('Violations') 
                        ? Math.max(0, 100 - (metric.value / metric.target) * 100)
                        : (metric.value / metric.target) * 100
                      } 
                      className="h-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Pending Reviews</h3>
              <p className="text-sm text-muted-foreground">
                Items requiring review and approval
              </p>
            </div>
            <Button>
              <GitBranch className="w-4 h-4 mr-2" />
              New Review
            </Button>
          </div>

          <div className="space-y-4">
            {reviewItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      <CardTitle className="text-base">{item.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(item.priority)}
                      {getStatusIcon(item.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>Author: {item.author}</span>
                      {item.reviewedBy && <span>Reviewed by: {item.reviewedBy}</span>}
                    </div>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {item.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline">
                        <XCircle className="w-4 h-4 mr-2" />
                        Request Changes
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}