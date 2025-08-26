import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Bug, Search, RefreshCw, AlertCircle, Clock, User } from 'lucide-react';

interface ErrorLog {
  id: string;
  user_id: string | null;
  error_message: string;
  error_stack: string | null;
  page_path: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
}

export function ErrorLogs() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadErrorLogs();
  }, []);

  const loadErrorLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.ilike('error_message', `%${filterType}%`);
      }

      if (searchTerm) {
        query = query.or(`error_message.ilike.%${searchTerm}%,page_path.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to load error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getErrorType = (message: string) => {
    if (message.toLowerCase().includes('api')) return 'API Error';
    if (message.toLowerCase().includes('component')) return 'Component Error';
    if (message.toLowerCase().includes('network')) return 'Network Error';
    if (message.toLowerCase().includes('auth')) return 'Authentication Error';
    return 'General Error';
  };

  const getErrorSeverity = (message: string) => {
    if (message.toLowerCase().includes('critical') || message.toLowerCase().includes('fatal')) {
      return { level: 'critical', color: 'bg-red-100 text-red-800' };
    }
    if (message.toLowerCase().includes('error')) {
      return { level: 'error', color: 'bg-orange-100 text-orange-800' };
    }
    if (message.toLowerCase().includes('warning') || message.toLowerCase().includes('warn')) {
      return { level: 'warning', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { level: 'info', color: 'bg-blue-100 text-blue-800' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getErrorStats = () => {
    const last24h = logs.filter(log => {
      const logTime = new Date(log.created_at);
      const now = new Date();
      return (now.getTime() - logTime.getTime()) < 24 * 60 * 60 * 1000;
    });

    const errorTypes = logs.reduce((acc, log) => {
      const type = getErrorType(log.error_message);
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: logs.length,
      last24h: last24h.length,
      mostCommon: Object.entries(errorTypes).sort((a, b) => b[1] - a[1])[0]
    };
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.error_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.page_path && log.page_path.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || getErrorType(log.error_message).toLowerCase().includes(filterType.toLowerCase());
    
    return matchesSearch && matchesType;
  });

  const stats = getErrorStats();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Logs</CardTitle>
          <CardDescription>Loading error logs...</CardDescription>
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

  return (
    <div className="space-y-6">
      {/* Error Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 24h</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.last24h}</div>
            <p className="text-xs text-muted-foreground">Recent errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Common</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{stats.mostCommon?.[0] || 'None'}</div>
            <p className="text-xs text-muted-foreground">
              {stats.mostCommon?.[1] || 0} occurrences
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Error Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>
                Application error logs and debugging information
              </CardDescription>
            </div>
            <Button onClick={loadErrorLogs} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search errors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="api">API Errors</SelectItem>
                <SelectItem value="component">Component Errors</SelectItem>
                <SelectItem value="network">Network Errors</SelectItem>
                <SelectItem value="auth">Auth Errors</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.map((log) => {
              const severity = getErrorSeverity(log.error_message);
              const errorType = getErrorType(log.error_message);
              const isExpanded = expandedLog === log.id;
              
              return (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <div className="flex-1">
                        <div className="font-medium text-sm truncate max-w-96">
                          {log.error_message}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.page_path && `${log.page_path} • `}
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {errorType}
                      </Badge>
                      <Badge className={`text-xs ${severity.color}`}>
                        {severity.level}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                      >
                        {isExpanded ? 'Collapse' : 'Details'}
                      </Button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {log.error_stack && (
                        <div>
                          <div className="text-sm font-medium mb-1">Stack Trace:</div>
                          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                            {log.error_stack}
                          </pre>
                        </div>
                      )}
                      
                      {log.user_id && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="text-sm">User ID: {log.user_id}</span>
                        </div>
                      )}
                      
                      {log.user_agent && (
                        <div>
                          <div className="text-sm font-medium mb-1">User Agent:</div>
                          <div className="text-xs text-muted-foreground">
                            {log.user_agent}
                          </div>
                        </div>
                      )}
                      
                      {log.metadata && (
                        <div>
                          <div className="text-sm font-medium mb-1">Metadata:</div>
                          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            
            {filteredLogs.length === 0 && (
              <div className="text-center py-8">
                <Bug className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {searchTerm || filterType !== 'all' ? 'No errors match your filters' : 'No errors logged yet'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}