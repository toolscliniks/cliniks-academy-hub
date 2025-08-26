import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  GitBranch, 
  Users, 
  TrendingUp,
  AlertCircle,
  Target,
  Zap,
  BarChart3
} from 'lucide-react';

interface Sprint {
  id: string;
  name: string;
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  startDate: string;
  endDate: string;
  progress: number;
  tasksTotal: number;
  tasksCompleted: number;
  teamMembers: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: string;
  assigneeInitials: string;
  sprint: string;
  estimatedHours: number;
  actualHours?: number;
  createdAt: string;
  dueDate: string;
}

interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  tasksAssigned: number;
  tasksCompleted: number;
  availability: 'available' | 'busy' | 'away';
}

const sprints: Sprint[] = [
  {
    id: '1',
    name: 'Sprint 11 - Quality Testing',
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2024-01-29',
    progress: 65,
    tasksTotal: 12,
    tasksCompleted: 8,
    teamMembers: ['TL', 'FD', 'BD', 'QA']
  },
  {
    id: '2',
    name: 'Sprint 12 - Optimization & Deploy',
    status: 'planning',
    startDate: '2024-01-30',
    endDate: '2024-02-12',
    progress: 0,
    tasksTotal: 15,
    tasksCompleted: 0,
    teamMembers: ['TL', 'FD', 'BD', 'DO']
  },
  {
    id: '3',
    name: 'Sprint 10 - Feature Development',
    status: 'completed',
    startDate: '2024-01-01',
    endDate: '2024-01-14',
    progress: 100,
    tasksTotal: 18,
    tasksCompleted: 18,
    teamMembers: ['TL', 'FD', 'BD', 'UX']
  }
];

const tasks: Task[] = [
  {
    id: '1',
    title: 'Implement automated testing suite',
    description: 'Set up comprehensive unit and integration tests',
    status: 'in-progress',
    priority: 'high',
    assignee: 'QA Engineer',
    assigneeInitials: 'QA',
    sprint: 'Sprint 11',
    estimatedHours: 16,
    actualHours: 12,
    createdAt: '2024-01-15',
    dueDate: '2024-01-25'
  },
  {
    id: '2',
    title: 'Security vulnerability assessment',
    description: 'Conduct thorough security audit and fix issues',
    status: 'review',
    priority: 'critical',
    assignee: 'Backend Dev',
    assigneeInitials: 'BD',
    sprint: 'Sprint 11',
    estimatedHours: 12,
    actualHours: 14,
    createdAt: '2024-01-16',
    dueDate: '2024-01-24'
  },
  {
    id: '3',
    title: 'Performance optimization',
    description: 'Optimize database queries and frontend rendering',
    status: 'todo',
    priority: 'medium',
    assignee: 'Frontend Dev',
    assigneeInitials: 'FD',
    sprint: 'Sprint 12',
    estimatedHours: 20,
    createdAt: '2024-01-17',
    dueDate: '2024-02-05'
  },
  {
    id: '4',
    title: 'Production deployment setup',
    description: 'Configure production environment and CI/CD pipeline',
    status: 'todo',
    priority: 'high',
    assignee: 'DevOps',
    assigneeInitials: 'DO',
    sprint: 'Sprint 12',
    estimatedHours: 24,
    createdAt: '2024-01-18',
    dueDate: '2024-02-10'
  }
];

const teamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Tech Lead',
    initials: 'TL',
    role: 'Technical Leader',
    tasksAssigned: 8,
    tasksCompleted: 6,
    availability: 'available'
  },
  {
    id: '2',
    name: 'Frontend Dev',
    initials: 'FD',
    role: 'Frontend Developer',
    tasksAssigned: 12,
    tasksCompleted: 9,
    availability: 'busy'
  },
  {
    id: '3',
    name: 'Backend Dev',
    initials: 'BD',
    role: 'Backend Developer',
    tasksAssigned: 10,
    tasksCompleted: 8,
    availability: 'available'
  },
  {
    id: '4',
    name: 'QA Engineer',
    initials: 'QA',
    role: 'Quality Assurance',
    tasksAssigned: 6,
    tasksCompleted: 4,
    availability: 'busy'
  }
];

export function ProjectManagement() {
  const [selectedTab, setSelectedTab] = useState('sprints');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'active':
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'review':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'planning':
      case 'todo':
        return <Target className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'planning': 'outline',
      'active': 'default',
      'completed': 'default',
      'on-hold': 'secondary',
      'todo': 'outline',
      'in-progress': 'default',
      'review': 'secondary',
      'done': 'default'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      'low': 'outline',
      'medium': 'secondary',
      'high': 'default',
      'critical': 'destructive'
    } as const;
    
    return <Badge variant={variants[priority as keyof typeof variants]}>{priority}</Badge>;
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available': return 'text-green-500';
      case 'busy': return 'text-yellow-500';
      case 'away': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const projectStats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'done').length,
    activeSprints: sprints.filter(s => s.status === 'active').length,
    teamMembers: teamMembers.length
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Project Management</h2>
        <p className="text-muted-foreground">
          Track sprints, tasks, and team progress following agile methodology
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.totalTasks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{projectStats.completedTasks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.activeSprints}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.teamMembers}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="sprints">
            <Calendar className="w-4 h-4 mr-2" />
            Sprints
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <CheckCircle className="w-4 h-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sprints" className="space-y-4">
          <div className="space-y-4">
            {sprints.map((sprint) => (
              <Card key={sprint.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(sprint.status)}
                      <CardTitle className="text-lg">{sprint.name}</CardTitle>
                      {getStatusBadge(sprint.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{sprint.progress}%</span>
                      </div>
                      <Progress value={sprint.progress} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm">
                          {sprint.tasksCompleted}/{sprint.tasksTotal} tasks completed
                        </span>
                        <div className="flex -space-x-2">
                          {sprint.teamMembers.map((member, index) => (
                            <Avatar key={index} className="w-6 h-6 border-2 border-background">
                              <AvatarFallback className="text-xs">{member}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="space-y-4">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>{task.assigneeInitials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{task.title}</CardTitle>
                          <div className="flex gap-1">
                            {getStatusBadge(task.status)}
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>
                        <CardDescription>{task.description}</CardDescription>
                      </div>
                    </div>
                    {getStatusIcon(task.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>Assigned to {task.assignee}</span>
                      <span>{task.sprint}</span>
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>{task.estimatedHours}h estimated</span>
                      {task.actualHours && <span>{task.actualHours}h actual</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {teamMembers.map((member) => (
              <Card key={member.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{member.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-base">{member.name}</CardTitle>
                      <CardDescription>{member.role}</CardDescription>
                    </div>
                    <div className={`text-sm font-medium ${getAvailabilityColor(member.availability)}`}>
                      {member.availability}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tasks Assigned</span>
                      <span>{member.tasksAssigned}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tasks Completed</span>
                      <span className="text-green-600">{member.tasksCompleted}</span>
                    </div>
                    <div className="mt-2">
                      <Progress 
                        value={(member.tasksCompleted / member.tasksAssigned) * 100} 
                        className="h-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}