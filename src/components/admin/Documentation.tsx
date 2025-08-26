import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  BookOpen, 
  Code, 
  Search, 
  Plus,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';

interface DocumentationItem {
  id: string;
  title: string;
  type: 'api' | 'component' | 'guide' | 'architecture';
  status: 'up-to-date' | 'outdated' | 'missing';
  lastUpdated: string;
  author: string;
  url?: string;
  description: string;
}

interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  description: string;
  documented: boolean;
  tested: boolean;
}

const documentationItems: DocumentationItem[] = [
  {
    id: '1',
    title: 'Authentication System',
    type: 'architecture',
    status: 'up-to-date',
    lastUpdated: '2024-01-15',
    author: 'Tech Lead',
    description: 'Complete authentication flow and security implementation'
  },
  {
    id: '2',
    title: 'Course Management API',
    type: 'api',
    status: 'outdated',
    lastUpdated: '2024-01-10',
    author: 'Backend Dev',
    description: 'REST API endpoints for course CRUD operations'
  },
  {
    id: '3',
    title: 'UI Component Library',
    type: 'component',
    status: 'up-to-date',
    lastUpdated: '2024-01-14',
    author: 'Frontend Dev',
    description: 'Reusable React components and design system'
  },
  {
    id: '4',
    title: 'Database Schema',
    type: 'architecture',
    status: 'missing',
    lastUpdated: '',
    author: '',
    description: 'Complete database structure and relationships'
  },
  {
    id: '5',
    title: 'Deployment Guide',
    type: 'guide',
    status: 'up-to-date',
    lastUpdated: '2024-01-12',
    author: 'DevOps',
    description: 'Step-by-step deployment and environment setup'
  }
];

const apiEndpoints: APIEndpoint[] = [
  {
    id: '1',
    method: 'GET',
    endpoint: '/api/courses',
    description: 'Retrieve all courses',
    documented: true,
    tested: true
  },
  {
    id: '2',
    method: 'POST',
    endpoint: '/api/courses',
    description: 'Create a new course',
    documented: true,
    tested: false
  },
  {
    id: '3',
    method: 'PUT',
    endpoint: '/api/courses/:id',
    description: 'Update course information',
    documented: false,
    tested: false
  },
  {
    id: '4',
    method: 'DELETE',
    endpoint: '/api/courses/:id',
    description: 'Delete a course',
    documented: false,
    tested: true
  },
  {
    id: '5',
    method: 'GET',
    endpoint: '/api/users/profile',
    description: 'Get user profile information',
    documented: true,
    tested: true
  }
];

export function Documentation() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up-to-date':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'outdated':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'missing':
        return <Clock className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'up-to-date': 'default',
      'outdated': 'secondary',
      'missing': 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api': return <Code className="w-4 h-4" />;
      case 'component': return <BookOpen className="w-4 h-4" />;
      case 'guide': return <FileText className="w-4 h-4" />;
      case 'architecture': return <ExternalLink className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'text-green-600';
      case 'POST': return 'text-blue-600';
      case 'PUT': return 'text-orange-600';
      case 'DELETE': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const filteredDocs = documentationItems.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const documentationStats = {
    total: documentationItems.length,
    upToDate: documentationItems.filter(d => d.status === 'up-to-date').length,
    outdated: documentationItems.filter(d => d.status === 'outdated').length,
    missing: documentationItems.filter(d => d.status === 'missing').length
  };

  const apiStats = {
    total: apiEndpoints.length,
    documented: apiEndpoints.filter(e => e.documented).length,
    tested: apiEndpoints.filter(e => e.tested).length,
    coverage: Math.round((apiEndpoints.filter(e => e.documented).length / apiEndpoints.length) * 100)
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Documentation Management</h2>
        <p className="text-muted-foreground">
          Maintain and monitor project documentation and API references
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Docs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentationStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Up to Date</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{documentationStats.upToDate}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Coverage</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiStats.coverage}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Update</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {documentationStats.outdated + documentationStats.missing}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <FileText className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="api">
            <Code className="w-4 h-4 mr-2" />
            API Docs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Doc
            </Button>
          </div>

          <div className="space-y-4">
            {filteredDocs.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(doc.type)}
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(doc.status)}
                      {getStatusIcon(doc.status)}
                    </div>
                  </div>
                  <CardDescription>{doc.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      {doc.author && <span>Author: {doc.author}</span>}
                      {doc.lastUpdated && (
                        <span>Updated: {new Date(doc.lastUpdated).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                Documentation and testing status for all API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiEndpoints.map((endpoint) => (
                  <div key={endpoint.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={getMethodColor(endpoint.method)}>
                        {endpoint.method}
                      </Badge>
                      <div>
                        <div className="font-mono text-sm">{endpoint.endpoint}</div>
                        <div className="text-sm text-muted-foreground">{endpoint.description}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={endpoint.documented ? 'default' : 'secondary'}>
                        {endpoint.documented ? 'Documented' : 'No Docs'}
                      </Badge>
                      <Badge variant={endpoint.tested ? 'default' : 'secondary'}>
                        {endpoint.tested ? 'Tested' : 'No Tests'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}