import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { 
  PlusCircle, 
  Search, 
  Link as LinkIcon, 
  Tag, 
  Lightbulb, 
  HelpCircle, 
  Eye, 
  Sparkle, 
  Zap, 
  Network,
  MessageSquare,
  TrashIcon,
  ArrowRight
} from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { useMicroInteractions } from '../hooks/use-micro-interactions';

// Import types from schema
import { ThoughtType } from '@shared/schema';
import type { Thought } from '@shared/schema';

// Types for the Thought Extension Framework

interface RelatedThought {
  id: number;
  content: string;
  type: string;
  relationStrength?: number;
}

interface ThoughtExtensionWorkspaceProps {
  userId?: string;
  conversationId?: string;
  onThoughtSelect?: (thought: Thought) => void;
}

const ThoughtTypeIcons: Record<string, React.ReactNode> = {
  concept: <Sparkle size={18} />,
  question: <HelpCircle size={18} />,
  insight: <Lightbulb size={18} />,
  observation: <Eye size={18} />,
  hypothesis: <Zap size={18} />,
  connection: <Network size={18} />
};

const ThoughtTypeColors: Record<ThoughtType, string> = {
  concept: 'bg-blue-100 text-blue-800',
  question: 'bg-purple-100 text-purple-800',
  insight: 'bg-yellow-100 text-yellow-800',
  observation: 'bg-green-100 text-green-800',
  hypothesis: 'bg-red-100 text-red-800',
  connection: 'bg-indigo-100 text-indigo-800'
};

export function ThoughtExtensionWorkspace({ 
  userId = 'default-user', 
  conversationId,
  onThoughtSelect
}: ThoughtExtensionWorkspaceProps) {
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  // Define interface for the new thought form
  interface NewThoughtForm {
    content: string;
    type: ThoughtType;
    tags: string[];
    source: string;
    conversationId?: string;
  }
  
  const [newThought, setNewThought] = useState<NewThoughtForm>({
    content: '',
    type: 'concept' as const,
    tags: [] as string[],
    source: 'manual'
  });
  const [tagInput, setTagInput] = useState('');
  const [extendedContent, setExtendedContent] = useState('');
  const queryClient = useQueryClient();
  const microInteractions = useMicroInteractions({ onRipple: true });

  // Get all thoughts
  const { 
    data: thoughts, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['/api/thoughts', userId, conversationId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      const endpoint = conversationId 
        ? `/api/conversations/${conversationId}/thoughts` 
        : `/api/thoughts?${params.toString()}`;
      
      const response = await apiRequest('GET', endpoint);
      return response.json();
    }
  });

  // Get related thoughts when a thought is selected
  const { 
    data: relatedThoughts,
    isLoading: isLoadingRelated
  } = useQuery({
    queryKey: ['/api/thoughts/related', selectedThought?.id],
    queryFn: async () => {
      if (!selectedThought) return null;
      const response = await apiRequest('GET', `/api/thoughts/${selectedThought.id}/related`);
      return response.json();
    },
    enabled: !!selectedThought
  });

  // Create a new thought
  const createThoughtMutation = useMutation({
    mutationFn: (thoughtData: any) => {
      return apiRequest('POST', '/api/thoughts', thoughtData);
    },
    onSuccess: () => {
      // Reset form and refresh thoughts list
      setNewThought({
        content: '',
        type: 'concept',
        tags: [],
        source: 'manual'
      });
      toast({
        title: "Thought captured",
        description: "Your thought has been successfully saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/thoughts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'thoughts'] });
    },
    onError: (error) => {
      toast({
        title: "Error saving thought",
        description: `There was a problem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  // Update a thought with extensions
  const extendThoughtMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number, updates: any }) => {
      return apiRequest('PATCH', `/api/thoughts/${id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Thought extended",
        description: "The thought has been successfully extended.",
      });
      setExtendedContent('');
      queryClient.invalidateQueries({ queryKey: ['/api/thoughts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/thoughts/related', selectedThought?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error extending thought",
        description: `There was a problem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  // Delete a thought
  const deleteThoughtMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest('DELETE', `/api/thoughts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Thought deleted",
        description: "The thought has been successfully deleted.",
      });
      setSelectedThought(null);
      queryClient.invalidateQueries({ queryKey: ['/api/thoughts'] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting thought",
        description: `There was a problem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  // Submit new thought
  const handleSubmitThought = () => {
    if (!newThought.content.trim()) {
      toast({
        title: "Empty thought",
        description: "Please enter some content for your thought.",
        variant: "destructive",
      });
      return;
    }

    const thoughtData: NewThoughtForm & { userId: string } = {
      ...newThought,
      userId,
    };
    
    // Only add conversationId if it exists
    if (conversationId) {
      thoughtData.conversationId = conversationId;
    }
    
    createThoughtMutation.mutate(thoughtData);
  };

  // Add a tag to the new thought
  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!newThought.tags.includes(tagInput.trim())) {
      setNewThought({
        ...newThought,
        tags: [...newThought.tags, tagInput.trim()]
      });
    }
    setTagInput('');
  };

  // Remove a tag from the new thought
  const handleRemoveTag = (tag: string) => {
    setNewThought({
      ...newThought,
      tags: newThought.tags.filter(t => t !== tag)
    });
  };

  // Extend a thought with new connections or insights
  const handleExtendThought = () => {
    if (!selectedThought || !extendedContent.trim()) return;

    const now = new Date().toISOString();
    // Cast extensions to the appropriate type since it's stored as JSON
    const currentExtensions = selectedThought.extensions as Record<string, any> || {};
    const extensions = {
      ...currentExtensions,
      [now]: {
        content: extendedContent,
        timestamp: now
      }
    };

    extendThoughtMutation.mutate({
      id: selectedThought.id,
      updates: {
        extensions
      }
    });
  };

  // Select a thought for detailed view
  const handleSelectThought = (thought: Thought) => {
    setSelectedThought(thought);
    if (onThoughtSelect) {
      onThoughtSelect(thought);
    }
  };

  // Delete the selected thought
  const handleDeleteThought = () => {
    if (!selectedThought) return;
    
    if (window.confirm('Are you sure you want to delete this thought?')) {
      deleteThoughtMutation.mutate(selectedThought.id);
    }
  };

  // Filter thoughts based on search query
  const filteredThoughts = thoughts?.filter((thought: Thought) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      thought.content.toLowerCase().includes(query) ||
      thought.tags.some((tag: string) => tag.toLowerCase().includes(query)) ||
      thought.type.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="browse" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="browse" onClick={microInteractions.handleClick}>Browse Thoughts</TabsTrigger>
          <TabsTrigger value="capture" onClick={microInteractions.handleClick}>Capture Thought</TabsTrigger>
          <TabsTrigger value="extend" onClick={microInteractions.handleClick} disabled={!selectedThought}>
            Extend Thought
          </TabsTrigger>
        </TabsList>

        {/* Browse Thoughts Tab */}
        <TabsContent value="browse" className="h-[calc(100vh-200px)]">
          <div className="flex items-center mb-4">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <Input 
              placeholder="Search thoughts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-280px)]">
            {/* Thoughts List */}
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-3">
                {isLoading ? (
                  <p className="text-center text-gray-500">Loading thoughts...</p>
                ) : error ? (
                  <p className="text-center text-red-500">Error loading thoughts</p>
                ) : filteredThoughts?.length === 0 ? (
                  <p className="text-center text-gray-500">No thoughts found. Try capturing one!</p>
                ) : (
                  filteredThoughts?.map((thought: Thought) => (
                    <Card 
                      key={thought.id} 
                      className={`p-3 cursor-pointer transition-all duration-300 hover:shadow-md ${
                        selectedThought?.id === thought.id ? 'border-primary border-2' : ''
                      }`}
                      onClick={() => handleSelectThought(thought)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <Badge className={`${ThoughtTypeColors[thought.type]} flex items-center gap-1`}>
                            {ThoughtTypeIcons[thought.type]}
                            {thought.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(thought.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium line-clamp-3">{thought.content}</p>
                      
                      {thought.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {thought.tags.map((tag: string) => (
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

            {/* Thought Detail */}
            <Card className="p-4 h-full flex flex-col">
              {selectedThought ? (
                <>
                  <div className="flex justify-between items-start mb-3">
                    <Badge className={`${ThoughtTypeColors[selectedThought.type]} flex items-center gap-1`}>
                      {ThoughtTypeIcons[selectedThought.type]}
                      {selectedThought.type}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleDeleteThought}
                    >
                      <TrashIcon className="h-4 w-4 text-gray-500" />
                    </Button>
                  </div>
                  
                  <ScrollArea className="flex-grow">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="whitespace-pre-wrap">{selectedThought.content}</p>
                      </div>
                      
                      {Object.keys(selectedThought.extensions || {}).length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Sparkle size={16} className="text-yellow-500" />
                            Extensions
                          </h4>
                          <div className="space-y-3">
                            {Object.entries(selectedThought.extensions || {})
                              .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                              .map(([timestamp, extension]: [string, any]) => (
                                <div key={timestamp} className="pl-3 border-l-2 border-yellow-300">
                                  <p className="text-sm whitespace-pre-wrap">{extension.content}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(timestamp).toLocaleString()}
                                  </p>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                      
                      {selectedThought.tags.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <Tag size={16} />
                            Tags
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedThought.tags.map((tag: string) => (
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
                            <Network size={16} className="text-indigo-500" />
                            Related Thoughts
                          </h4>
                          <div className="space-y-2">
                            {relatedThoughts.map((thought: RelatedThought) => (
                              <Card 
                                key={thought.id} 
                                className="p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                  const fullThought = thoughts?.find((t: Thought) => t.id === thought.id);
                                  if (fullThought) handleSelectThought(fullThought);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  {ThoughtTypeIcons[thought.type]}
                                  <p className="text-sm line-clamp-1">{thought.content}</p>
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  
                  <div className="mt-3 pt-3 border-t">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setActiveTab('extend')}
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Extend This Thought
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                  <p>Select a thought to view details</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Capture Thought Tab */}
        <TabsContent value="capture" className="space-y-4 h-[calc(100vh-200px)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Thought Type</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(ThoughtTypeIcons).map(([type, icon]) => (
                  <Button 
                    key={type}
                    type="button"
                    variant={newThought.type === type ? "default" : "outline"}
                    className="flex items-center justify-center gap-2"
                    onClick={(e) => {
                      microInteractions.handleClick(e);
                      setNewThought({ ...newThought, type: type as any });
                    }}
                  >
                    {icon}
                    <span className="capitalize">{type}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Thought Content</label>
              <Textarea 
                placeholder="Enter your thought here..."
                className="min-h-[150px]"
                value={newThought.content}
                onChange={(e) => setNewThought({ ...newThought, content: e.target.value })}
              />
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
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {newThought.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {newThought.tags.map((tag: string) => (
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
                onClick={handleSubmitThought}
                disabled={!newThought.content.trim() || createThoughtMutation.isPending}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                {createThoughtMutation.isPending ? 'Saving...' : 'Capture Thought'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Extend Thought Tab */}
        <TabsContent value="extend" className="space-y-4 h-[calc(100vh-200px)]">
          {selectedThought ? (
            <div className="space-y-4">
              <Card className="p-3 bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  {ThoughtTypeIcons[selectedThought.type]}
                  <Badge className={ThoughtTypeColors[selectedThought.type]}>
                    {selectedThought.type}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{selectedThought.content}</p>
              </Card>
              
              <div>
                <label className="block text-sm font-medium mb-1">Extend this thought</label>
                <Textarea 
                  placeholder="Add new insights, connections, or developments to this thought..."
                  className="min-h-[200px]"
                  value={extendedContent}
                  onChange={(e) => setExtendedContent(e.target.value)}
                />
              </div>
              
              <div className="pt-4">
                <Button 
                  className="w-full" 
                  onClick={handleExtendThought}
                  disabled={!extendedContent.trim() || extendThoughtMutation.isPending}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {extendThoughtMutation.isPending ? 'Extending...' : 'Extend Thought'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <Lightbulb className="h-12 w-12 mb-2 opacity-20" />
              <p>Select a thought from the Browse tab first</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setActiveTab('browse')}
              >
                Go to Browse
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}