import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Star, 
  TrendingUp, 
  Users, 
  Plus,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface FeedbackItem {
  id: string;
  type: 'feature' | 'bug' | 'improvement' | 'general';
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'closed' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  author: string;
  authorInitials: string;
  rating?: number;
  createdAt: string;
  responses?: number;
  votes: number;
}

interface UserFeedback {
  id: string;
  userName: string;
  userInitials: string;
  rating: number;
  comment: string;
  feature: string;
  createdAt: string;
  helpful: number;
}

const feedbackItems: FeedbackItem[] = [
  {
    id: '1',
    type: 'feature',
    title: 'Dark mode support needed',
    description: 'Would love to have a dark theme option for better user experience during night study sessions.',
    status: 'in-progress',
    priority: 'medium',
    author: 'João Silva',
    authorInitials: 'JS',
    rating: 5,
    createdAt: '2024-01-15T10:00:00Z',
    responses: 3,
    votes: 12
  },
  {
    id: '2',
    type: 'bug',
    title: 'Video player crashes on mobile',
    description: 'The video player becomes unresponsive on Android devices when switching between portrait and landscape modes.',
    status: 'open',
    priority: 'high',
    author: 'Maria Santos',
    authorInitials: 'MS',
    rating: 2,
    createdAt: '2024-01-16T14:30:00Z',
    responses: 1,
    votes: 8
  },
  {
    id: '3',
    type: 'improvement',
    title: 'Better search functionality',
    description: 'Search should include course content, not just titles. Also need filters by category and difficulty.',
    status: 'open',
    priority: 'medium',
    author: 'Carlos Oliveira',
    authorInitials: 'CO',
    rating: 4,
    createdAt: '2024-01-14T09:15:00Z',
    responses: 5,
    votes: 15
  },
  {
    id: '4',
    type: 'feature',
    title: 'Offline course downloads',
    description: 'Ability to download courses for offline viewing would be amazing for people with limited internet.',
    status: 'closed',
    priority: 'low',
    author: 'Ana Costa',
    authorInitials: 'AC',
    rating: 5,
    createdAt: '2024-01-12T16:45:00Z',
    responses: 2,
    votes: 20
  }
];

const userFeedbacks: UserFeedback[] = [
  {
    id: '1',
    userName: 'Pedro Alves',
    userInitials: 'PA',
    rating: 5,
    comment: 'Excellent platform! The course quality is outstanding and the interface is very intuitive.',
    feature: 'Overall Experience',
    createdAt: '2024-01-15T11:30:00Z',
    helpful: 8
  },
  {
    id: '2',
    userName: 'Lucia Ferreira',
    userInitials: 'LF',
    rating: 4,
    comment: 'Great content, but the video loading can be slow sometimes. Otherwise, very satisfied!',
    feature: 'Video Performance',
    createdAt: '2024-01-16T09:20:00Z',
    helpful: 5
  },
  {
    id: '3',
    userName: 'Roberto Lima',
    userInitials: 'RL',
    rating: 5,
    comment: 'The certificate system is very professional. Helped me advance in my career.',
    feature: 'Certification',
    createdAt: '2024-01-14T15:10:00Z',
    helpful: 12
  }
];

export function FeedbackSystem() {
  const [selectedTab, setSelectedTab] = useState('feedback');
  const [newFeedback, setNewFeedback] = useState({
    title: '',
    description: '',
    type: 'general' as const
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'open':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'open': 'secondary',
      'in-progress': 'default',
      'closed': 'outline',
      'resolved': 'default'
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

  const getTypeBadge = (type: string) => {
    const variants = {
      'feature': 'default',
      'bug': 'destructive',
      'improvement': 'secondary',
      'general': 'outline'
    } as const;
    
    return <Badge variant={variants[type as keyof typeof variants]}>{type}</Badge>;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const feedbackStats = {
    total: feedbackItems.length,
    open: feedbackItems.filter(f => f.status === 'open').length,
    inProgress: feedbackItems.filter(f => f.status === 'in-progress').length,
    avgRating: userFeedbacks.reduce((acc, f) => acc + f.rating, 0) / userFeedbacks.length
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Feedback & Communication</h2>
        <p className="text-muted-foreground">
          Collect and manage user feedback, feature requests, and bug reports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.open}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.inProgress}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackStats.avgRating.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="feedback">
            <MessageSquare className="w-4 h-4 mr-2" />
            Feature Requests
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Star className="w-4 h-4 mr-2" />
            User Reviews
          </TabsTrigger>
          <TabsTrigger value="new">
            <Plus className="w-4 h-4 mr-2" />
            New Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="space-y-4">
          <div className="flex gap-4">
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline">
              <TrendingUp className="w-4 h-4 mr-2" />
              Sort by Votes
            </Button>
          </div>

          <div className="space-y-4">
            {feedbackItems.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>{item.authorInitials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          <div className="flex gap-1">
                            {getTypeBadge(item.type)}
                            {getPriorityBadge(item.priority)}
                            {getStatusBadge(item.status)}
                          </div>
                        </div>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                    </div>
                    {getStatusIcon(item.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>By {item.author}</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.rating && (
                        <div className="flex items-center gap-1">
                          {renderStars(item.rating)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span>{item.votes} votes</span>
                      <span>{item.responses || 0} responses</span>
                      <Button size="sm" variant="outline">View Details</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <div className="space-y-4">
            {userFeedbacks.map((review) => (
              <Card key={review.id}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>{review.userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">{review.userName}</CardTitle>
                        <div className="flex items-center gap-1">
                          {renderStars(review.rating)}
                        </div>
                        <Badge variant="outline">{review.feature}</Badge>
                      </div>
                      <CardDescription>{review.comment}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    <span>{review.helpful} people found this helpful</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submit New Feedback</CardTitle>
              <CardDescription>
                Share your thoughts, report bugs, or request new features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Brief description of your feedback"
                  value={newFeedback.title}
                  onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Type</label>
                <select 
                  className="w-full mt-1 p-2 border rounded-md"
                  value={newFeedback.type}
                  onChange={(e) => setNewFeedback({ ...newFeedback, type: e.target.value as any })}
                >
                  <option value="general">General Feedback</option>
                  <option value="feature">Feature Request</option>
                  <option value="bug">Bug Report</option>
                  <option value="improvement">Improvement Suggestion</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Provide detailed information about your feedback"
                  value={newFeedback.description}
                  onChange={(e) => setNewFeedback({ ...newFeedback, description: e.target.value })}
                  rows={4}
                />
              </div>
              
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Submit Feedback
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}