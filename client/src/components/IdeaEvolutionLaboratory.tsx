import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Plus, 
  Search, 
  Tag, 
  Lightbulb, 
  Sparkles,
  Zap,
  History,
  ArrowUpRight,
  Clipboard,
  BarChart,
  FileText,
  Trash2,
  PenTool,
  Share2,
  Layers,
  MessageSquare
} from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { useMicroInteractions } from '../hooks/use-micro-interactions';
import { Progress } from './ui/progress';

// Types for the Idea Evolution Laboratory
interface Idea {
  id: number;
  userId: string;
  title: string;
  description: string;
  status: "draft" | "developing" | "refined" | "finalized" | "archived";
  tags: string[];
  version: number;
  parentIdeaId: number | null;
  rootIdeaId: number | null;
  createdAt: string;
  updatedAt: string;
  evolutionPath: any[];
  metrics: Record<string, any>;
  feedback: any[];
  metadata: Record<string, any>;
}

interface IdeaVersion {
  id: number;
  version: number;
  title: string;
  description: string;
  createdAt: string;
}

interface RelatedThought {
  id: number;
  content: string;
  type: string;
}

interface IdeaEvolutionLaboratoryProps {
  userId?: string;
  onIdeaSelect?: (idea: Idea) => void;
}

const StatusColors: Record<string, string> = {
  draft: 'bg-blue-100 text-blue-800 border-blue-200',
  developing: 'bg-amber-100 text-amber-800 border-amber-200',
  refined: 'bg-green-100 text-green-800 border-green-200',
  finalized: 'bg-purple-100 text-purple-800 border-purple-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200'
};

const StatusIcons: Record<string, React.ReactNode> = {
  draft: <PenTool size={16} />,
  developing: <Sparkles size={16} />,
  refined: <Zap size={16} />,
  finalized: <Clipboard size={16} />,
  archived: <History size={16} />
};

export function IdeaEvolutionLaboratory({ 
  userId = 'default-user',
  onIdeaSelect 
}: IdeaEvolutionLaboratoryProps) {
  const [activeTab, setActiveTab] = useState('explore');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    status: 'draft' as const,
    tags: [] as string[],
    version: 1,
  });
  const [tagInput, setTagInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const queryClient = useQueryClient();
  const microInteractions = useMicroInteractions({ onRipple: true });

  // Get all ideas
  const { 
    data: ideas, 
    isLoading, 
    error 
  } = useQuery<Idea[]>({
    queryKey: ['/api/ideas', userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      const response = await apiRequest('GET', `/api/ideas?${params.toString()}`);
      return (response as unknown) as Idea[];
    }
  });

  // Get idea versions when an idea is selected
  const { 
    data: ideaVersions,
    isLoading: isLoadingVersions
  } = useQuery<Idea[]>({
    queryKey: ['/api/ideas/versions', selectedIdea?.id],
    queryFn: async () => {
      if (!selectedIdea?.rootIdeaId && !selectedIdea?.id) return [];
      const idToUse = selectedIdea.rootIdeaId || selectedIdea.id;
      const response = await apiRequest('GET', `/api/ideas/${idToUse}/versions`);
      return (response as unknown) as Idea[];
    },
    enabled: !!(selectedIdea?.rootIdeaId || selectedIdea?.id)
  });

  // Get thoughts related to an idea
  const { 
    data: relatedThoughts,
    isLoading: isLoadingRelatedThoughts
  } = useQuery<RelatedThought[]>({
    queryKey: ['/api/ideas/thoughts', selectedIdea?.id],
    queryFn: async () => {
      if (!selectedIdea) return [];
      const response = await apiRequest('GET', `/api/ideas/${selectedIdea.id}/thoughts`);
      return (response as unknown) as RelatedThought[];
    },
    enabled: !!selectedIdea
  });

  type NewIdeaData = {
    userId: string;
    title: string;
    description: string;
    status: string;
    tags: string[];
    version: number;
  };

  // Create a new idea
  const createIdeaMutation = useMutation<Idea, Error, NewIdeaData>({
    mutationFn: (ideaData: NewIdeaData) => {
      return apiRequest('POST', '/api/ideas', ideaData).then(response => (response as unknown) as Idea);
    },
    onSuccess: () => {
      // Reset form and refresh ideas list
      setNewIdea({
        title: '',
        description: '',
        status: 'draft',
        tags: [],
        version: 1,
      });
      toast({
        title: "Idea created",
        description: "Your idea has been successfully created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating idea",
        description: `There was a problem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  type EvolveIdeaData = {
    userId: string;
    title: string;
    description: string;
    status: string;
    tags: string[];
    version: number;
    parentIdeaId: number;
    rootIdeaId: number;
    evolutionPath: any[];
    metrics: Record<string, any>;
    feedback: any[];
  };

  // Create a new version of an idea
  const evolveIdeaMutation = useMutation<Idea, Error, EvolveIdeaData>({
    mutationFn: (ideaData: EvolveIdeaData) => {
      return apiRequest('POST', '/api/ideas', ideaData).then(response => (response as unknown) as Idea);
    },
    onSuccess: (data) => {
      toast({
        title: "Idea evolved",
        description: "A new version of the idea has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ideas/versions', selectedIdea?.id] });
      setSelectedIdea(data);
    },
    onError: (error) => {
      toast({
        title: "Error evolving idea",
        description: `There was a problem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  type UpdateStatusParams = {
    id: number;
    status: string;
  };

  // Update an idea's status 
  const updateIdeaStatusMutation = useMutation<Idea, Error, UpdateStatusParams>({
    mutationFn: ({ id, status }: UpdateStatusParams) => {
      return apiRequest('PATCH', `/api/ideas/${id}`, { status }).then(response => (response as unknown) as Idea);
    },
    onSuccess: (updatedIdea) => {
      toast({
        title: "Status updated",
        description: `Idea status has been updated to ${updatedIdea.status}.`,
      });
      setSelectedIdea(updatedIdea);
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating status",
        description: `There was a problem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  type AddFeedbackParams = {
    id: number;
    feedback: string;
  };

  // Add feedback to an idea
  const addFeedbackMutation = useMutation<Idea, Error, AddFeedbackParams>({
    mutationFn: ({ id, feedback }: AddFeedbackParams) => {
      const idea = ideas?.find(i => i.id === id);
      if (!idea) throw new Error("Idea not found");
      
      const updatedFeedback = [...(idea.feedback || []), {
        content: feedback,
        timestamp: new Date().toISOString(),
        userId
      }];
      
      return apiRequest('PATCH', `/api/ideas/${id}`, { feedback: updatedFeedback }).then(response => (response as unknown) as Idea);
    },
    onSuccess: (updatedIdea) => {
      toast({
        title: "Feedback added",
        description: "Your feedback has been added to the idea.",
      });
      setFeedbackInput('');
      setSelectedIdea(updatedIdea);
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
    },
    onError: (error) => {
      toast({
        title: "Error adding feedback",
        description: `There was a problem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  // Delete an idea
  const deleteIdeaMutation = useMutation<any, Error, number>({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/ideas/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Idea deleted",
        description: "The idea has been successfully deleted.",
      });
      setSelectedIdea(null);
      queryClient.invalidateQueries({ queryKey: ['/api/ideas'] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting idea",
        description: `There was a problem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  // Submit new idea
  const handleSubmitIdea = () => {
    if (!newIdea.title.trim() || !newIdea.description.trim()) {
      toast({
        title: "Incomplete idea",
        description: "Please provide both a title and description.",
        variant: "destructive",
      });
      return;
    }

    createIdeaMutation.mutate({
      ...newIdea,
      userId,
    });
  };

  // Add a tag to the new idea
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!newIdea.tags.includes(tagInput.trim())) {
      setNewIdea({
        ...newIdea,
        tags: [...newIdea.tags, tagInput.trim()]
      });
    }
    setTagInput('');
  };

  // Remove a tag from the new idea
  const handleRemoveTag = (tag: string) => {
    setNewIdea({
      ...newIdea,
      tags: newIdea.tags.filter(t => t !== tag)
    });
  };

  // Evolve an idea (create a new version)
  const handleEvolveIdea = () => {
    if (!selectedIdea) return;
    
    // Create a new version based on the current idea
    evolveIdeaMutation.mutate({
      userId,
      title: selectedIdea.title,
      description: selectedIdea.description,
      status: 'developing',
      tags: selectedIdea.tags,
      version: (selectedIdea.version || 1) + 1,
      parentIdeaId: selectedIdea.id,
      rootIdeaId: selectedIdea.rootIdeaId || selectedIdea.id,
      evolutionPath: selectedIdea.evolutionPath || [],
      metrics: selectedIdea.metrics || {},
      feedback: []
    });
  };

  // Update the status of an idea
  const handleStatusChange = (status: string) => {
    if (!selectedIdea) return;
    updateIdeaStatusMutation.mutate({
      id: selectedIdea.id,
      status
    });
  };

  // Add feedback to an idea
  const handleAddFeedback = () => {
    if (!selectedIdea || !feedbackInput.trim()) return;
    addFeedbackMutation.mutate({
      id: selectedIdea.id,
      feedback: feedbackInput
    });
  };

  // Select an idea for detailed view
  const handleSelectIdea = (idea: Idea) => {
    setSelectedIdea(idea);
    if (onIdeaSelect) {
      onIdeaSelect(idea);
    }
  };

  // Delete the selected idea
  const handleDeleteIdea = () => {
    if (!selectedIdea) return;
    
    if (window.confirm('Are you sure you want to delete this idea?')) {
      deleteIdeaMutation.mutate(selectedIdea.id);
    }
  };

  // Calculate evolution progress for visualization
  const calculateEvolutionProgress = (idea: Idea): number => {
    const statusWeights: Record<string, number> = {
      draft: 20,
      developing: 40,
      refined: 70,
      finalized: 100,
      archived: 90
    };
    
    return statusWeights[idea.status] || 0;
  };

  // Filter ideas based on search query
  const filteredIdeas = Array.isArray(ideas) ? ideas.filter(idea => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      idea.title.toLowerCase().includes(query) ||
      idea.description.toLowerCase().includes(query) ||
      idea.tags.some(tag => tag.toLowerCase().includes(query)) ||
      idea.status.toLowerCase().includes(query)
    );
  }) : [];

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="explore" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="explore" onClick={microInteractions.handleClick}>Explore Ideas</TabsTrigger>
          <TabsTrigger value="create" onClick={microInteractions.handleClick}>Create Idea</TabsTrigger>
          <TabsTrigger value="evolve" onClick={microInteractions.handleClick} disabled={!selectedIdea}>
            Evolve Idea
          </TabsTrigger>
        </TabsList>

        {/* Explore Ideas Tab */}
        <TabsContent value="explore" className="h-[calc(100vh-200px)]">
          <div className="flex items-center mb-4">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <Input 
              placeholder="Search ideas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-280px)]">
            {/* Ideas List */}
            <ScrollArea className="h-full">
              <div className="space-y-4 pr-3">
                {isLoading ? (
                  <p className="text-center text-gray-500">Loading ideas...</p>
                ) : error ? (
                  <p className="text-center text-red-500">Error loading ideas</p>
                ) : filteredIdeas?.length === 0 ? (
                  <p className="text-center text-gray-500">No ideas found. Try creating one!</p>
                ) : (
                  filteredIdeas?.map(idea => (
                    <Card 
                      key={idea.id} 
                      className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-md ${
                        selectedIdea?.id === idea.id ? 'border-primary border-2' : ''
                      }`}
                      onClick={() => handleSelectIdea(idea)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <Badge className={`${StatusColors[idea.status]} flex items-center gap-1`}>
                            {StatusIcons[idea.status]}
                            {idea.status}
                          </Badge>
                          {idea.version > 1 && (
                            <Badge variant="outline" className="ml-2">
                              v{idea.version}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(idea.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold mb-1">{idea.title}</h3>
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">{idea.description}</p>
                      
                      <Progress value={calculateEvolutionProgress(idea)} className="h-1 mb-3" />
                      
                      {idea.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {idea.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs bg-gray-50">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Idea Detail */}
            <Card className="p-4 h-full flex flex-col">
              {selectedIdea ? (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={`${StatusColors[selectedIdea.status]} flex items-center gap-1`}>
                        {StatusIcons[selectedIdea.status]}
                        {selectedIdea.status}
                      </Badge>
                      {selectedIdea.version > 1 && (
                        <Badge variant="outline">
                          v{selectedIdea.version}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleDeleteIdea}
                    >
                      <Trash2 className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-grow">
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-lg font-semibold">{selectedIdea.title}</h2>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                          {selectedIdea.description}
                        </p>
                      </div>
                      
                      {ideaVersions && ideaVersions.length > 1 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <History size={16} className="text-indigo-500" />
                            Evolution History
                          </h4>
                          <div className="space-y-2">
                            {ideaVersions
                              .sort((a, b) => b.version - a.version)
                              .map(version => (
                                <Card 
                                  key={version.id} 
                                  className={`p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                    version.id === selectedIdea.id ? 'border-primary' : ''
                                  }`}
                                  onClick={() => handleSelectIdea(version)}
                                >
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1">
                                      <Layers size={14} className="text-gray-500" />
                                      <span className="font-medium">Version {version.version}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {new Date(version.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </Card>
                              ))
                            }
                          </div>
                        </div>
                      )}
                      
                      {selectedIdea.feedback && selectedIdea.feedback.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <MessageSquare size={16} className="text-purple-500" />
                            Feedback
                          </h4>
                          <div className="space-y-3">
                            {selectedIdea.feedback
                              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                              .map((feedback, index) => (
                                <div key={index} className="pl-3 border-l-2 border-purple-300 py-1">
                                  <p className="text-sm">{feedback.content}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(feedback.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                      
                      {selectedIdea.tags.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Tag size={16} />
                            Tags
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedIdea.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs bg-gray-50">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {relatedThoughts && relatedThoughts.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Lightbulb size={16} className="text-yellow-500" />
                            Related Thoughts
                          </h4>
                          <div className="space-y-2">
                            {relatedThoughts.map(thought => (
                              <Card key={thought.id} className="p-2">
                                <p className="text-sm line-clamp-2">{thought.content}</p>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Add Feedback</h4>
                        <Textarea 
                          placeholder="Share your thoughts on this idea..."
                          value={feedbackInput}
                          onChange={(e) => setFeedbackInput(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <Button 
                          className="mt-2" 
                          variant="secondary"
                          size="sm"
                          onClick={handleAddFeedback}
                          disabled={!feedbackInput.trim()}
                        >
                          Add Feedback
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                  
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Update Status</label>
                      <Select
                        value={selectedIdea.status}
                        onValueChange={handleStatusChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="developing">Developing</SelectItem>
                          <SelectItem value="refined">Refined</SelectItem>
                          <SelectItem value="finalized">Finalized</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      className="mt-auto" 
                      onClick={() => setActiveTab('evolve')}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Evolve This Idea
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <Lightbulb className="h-12 w-12 mb-2 opacity-20" />
                  <p>Select an idea to view details</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Create Idea Tab */}
        <TabsContent value="create" className="space-y-4 h-[calc(100vh-200px)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Idea Title</label>
              <Input 
                placeholder="Enter a clear and concise title..."
                value={newIdea.title}
                onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Idea Description</label>
              <Textarea 
                placeholder="Describe your idea in detail..."
                className="min-h-[150px]"
                value={newIdea.description}
                onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <Select
                value={newIdea.status}
                onValueChange={(value: any) => setNewIdea({ ...newIdea, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="developing">Developing</SelectItem>
                  <SelectItem value="refined">Refined</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tags</label>
              <div className="flex gap-2 mb-2">
                <Input 
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1"
                />
                <Button 
                  type="button"
                  onClick={handleAddTag}
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {newIdea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newIdea.tags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      #{tag}
                      <button 
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-xs hover:text-red-500"
                      >
                        ✕
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-4">
              <Button 
                className="w-full" 
                onClick={handleSubmitIdea}
                disabled={!newIdea.title.trim() || !newIdea.description.trim() || createIdeaMutation.isPending}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                {createIdeaMutation.isPending ? 'Creating...' : 'Create Idea'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Evolve Idea Tab */}
        <TabsContent value="evolve" className="space-y-4 h-[calc(100vh-200px)]">
          {selectedIdea ? (
            <div className="space-y-4">
              <Card className="p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={StatusColors[selectedIdea.status]}>
                      {selectedIdea.status}
                    </Badge>
                    <Badge variant="outline">v{selectedIdea.version}</Badge>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(selectedIdea.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-semibold mb-1">{selectedIdea.title}</h3>
                <p className="text-sm text-gray-700">{selectedIdea.description}</p>
              </Card>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-primary" />
                  Evolve to Next Version
                </h3>
                <p className="text-sm text-gray-600">
                  Creating a new version will preserve the current version and allow you to iterate on your idea.
                  The new version will be set to "developing" status.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Current Version (v{selectedIdea.version})</h4>
                    <Card className="p-3 bg-gray-50 h-[200px] overflow-auto">
                      <p className="text-sm whitespace-pre-wrap">{selectedIdea.description}</p>
                    </Card>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">New Version (v{selectedIdea.version + 1})</h4>
                    <Card className="p-3 border-primary border-dashed h-[200px] flex items-center justify-center">
                      <div className="text-center">
                        <Sparkles className="h-8 w-8 text-primary mx-auto mb-2 opacity-70" />
                        <p className="text-sm text-gray-600">
                          The new version will start with the current content, which you can then modify.
                        </p>
                      </div>
                    </Card>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t">
                  <Button 
                    className="w-full" 
                    onClick={handleEvolveIdea}
                    disabled={evolveIdeaMutation.isPending}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {evolveIdeaMutation.isPending ? 'Creating New Version...' : 'Create Version ' + (selectedIdea.version + 1)}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <Lightbulb className="h-12 w-12 mb-2 opacity-20" />
              <p>Select an idea from the Explore tab first</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setActiveTab('explore')}
              >
                Go to Explore
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}