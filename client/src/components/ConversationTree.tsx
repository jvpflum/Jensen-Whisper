import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bookmark, 
  GitBranch, 
  MessageSquare, 
  MessageSquarePlus, 
  Trash2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: number;
  role: string;
  content: string;
  conversationId: string;
  timestamp: Date;
  parentId: number | null;
  branchId: string | null;
}

interface Branch {
  id: string;
  name: string;
  conversationId: string;
  createdAt: Date;
  isActive: number; // Changed from boolean to number to match server
  rootMessageId: number | null;
}

interface Bookmark {
  id: string;
  name: string;
  conversationId: string;
  messageId: number;
  branchId: string | null;
  createdAt: Date;
}

interface MessageNode {
  message: Message;
  children: MessageNode[];
  depth: number;
  branchId: string | null;
}

interface ConversationTreeProps {
  conversationId: string;
  onMessageSelect: (messageId: number) => void;
  onBranchSelect: (branchId: string) => void;
  onBookmarkSelect: (messageId: number) => void;
  className?: string;
}

const ConversationTree = ({ 
  conversationId, 
  onMessageSelect, 
  onBranchSelect,
  onBookmarkSelect,
  className 
}: ConversationTreeProps) => {
  const [messageTree, setMessageTree] = useState<MessageNode[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [deleteBranchId, setDeleteBranchId] = useState<string | null>(null);
  const [deleteBookmarkId, setDeleteBookmarkId] = useState<string | null>(null);
  const [showDeleteBranchDialog, setShowDeleteBranchDialog] = useState(false);
  const [showDeleteBookmarkDialog, setShowDeleteBookmarkDialog] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch messages for the conversation
  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['/api/conversations', conversationId, 'messages'],
    // Use the default query function from queryClient to avoid duplicate fetch logic
    enabled: !!conversationId,
    staleTime: 30000, // 30 seconds before considering data stale
    refetchOnWindowFocus: false,
  });

  // Fetch branches for the conversation
  const { data: branches, isLoading: isLoadingBranches } = useQuery({
    queryKey: ['/api/conversations', conversationId, 'branches'],
    queryFn: async () => {
      if (!conversationId) return [] as Branch[];
      try {
        const response = await apiRequest('GET', `/api/conversations/${conversationId}/branches`);
        const branchesData = await response.json();
        console.log("Fetched branches:", branchesData);
        
        // Normalize branch data to ensure consistent structure
        if (Array.isArray(branchesData)) {
          const normalizedBranches = branchesData.map(branch => ({
            ...branch,
            id: String(branch.id), // Ensure id is string
            isActive: typeof branch.isActive === 'boolean' 
              ? (branch.isActive ? 1 : 0) 
              : branch.isActive || 0
          }));
          console.log("Normalized branches:", normalizedBranches);
          return normalizedBranches as Branch[];
        }
        
        return [] as Branch[];
      } catch (error) {
        console.error("Error fetching branches:", error);
        return [] as Branch[];
      }
    },
    enabled: !!conversationId,
  });

  // Fetch active branch
  const { data: activeBranchData } = useQuery({
    queryKey: ['/api/conversations', conversationId, 'branches', 'active'],
    queryFn: async () => {
      if (!conversationId) return null;
      const response = await apiRequest('GET', `/api/conversations/${conversationId}/branches/active`);
      console.log("Fetched active branch:", response);
      
      // Normalize active branch data if present
      if (response && response.ok) {
        const responseData = await response.json();
        const normalizedBranch = {
          ...responseData,
          id: String(responseData.id), // Ensure id is string
          isActive: typeof responseData.isActive === 'boolean' 
            ? (responseData.isActive ? 1 : 0) 
            : responseData.isActive || 0
        };
        console.log("Normalized active branch:", normalizedBranch);
        return normalizedBranch as Branch;
      }
      
      return null;
    },
    enabled: !!conversationId,
  });

  // Fetch bookmarks for the conversation
  const { data: bookmarksData, isLoading: isLoadingBookmarks } = useQuery({
    queryKey: ['/api/conversations', conversationId, 'bookmarks'],
    queryFn: async () => {
      if (!conversationId) return [] as Bookmark[];
      try {
        const response = await apiRequest('GET', `/api/conversations/${conversationId}/bookmarks`);
        const bookmarksJson = await response.json();
        return bookmarksJson as Bookmark[];
      } catch (error) {
        console.error("Error fetching bookmarks:", error);
        return [] as Bookmark[];
      }
    },
    enabled: !!conversationId,
  });
  
  // Delete branch mutation
  const deleteBranchMutation = useMutation({
    mutationFn: async (branchId: string) => {
      const response = await apiRequest('DELETE', `/api/branches/${branchId}`);
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch branches
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'branches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'branches', 'active'] });
      toast({
        title: "Branch deleted",
        description: "The branch has been removed successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error deleting branch:", error);
      toast({
        title: "Error",
        description: "Failed to delete the branch. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Delete bookmark mutation
  const deleteBookmarkMutation = useMutation({
    mutationFn: async (bookmarkId: string) => {
      const response = await apiRequest('DELETE', `/api/bookmarks/${bookmarkId}`);
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch bookmarks
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId, 'bookmarks'] });
      toast({
        title: "Bookmark deleted",
        description: "The bookmark has been removed successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error deleting bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to delete the bookmark. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update active branch when data is fetched
  useEffect(() => {
    if (activeBranchData) {
      // Make sure isActive is treated as a number
      const formattedActiveBranch = {
        ...activeBranchData,
        isActive: typeof activeBranchData.isActive === 'boolean' 
          ? (activeBranchData.isActive ? 1 : 0) 
          : activeBranchData.isActive
      };
      setActiveBranch(formattedActiveBranch);
      console.log("Active branch updated:", formattedActiveBranch);
    }
  }, [activeBranchData]);

  // Update bookmarks when data is fetched
  useEffect(() => {
    if (bookmarksData) {
      setBookmarks(bookmarksData);
    }
  }, [bookmarksData]);

  // Build message tree when messages data changes
  useEffect(() => {
    if (messages && branches) {
      // Create a map of message IDs to their branch IDs
      const messageBranchMap = new Map<number, string>();
      
      // Ensure branches is an array before using forEach
      if (Array.isArray(branches)) {
        console.log("Building tree with branches:", branches);
        branches.forEach((branch: Branch) => {
          if (branch.rootMessageId) {
            messageBranchMap.set(branch.rootMessageId, branch.id);
            console.log(`Mapping message ${branch.rootMessageId} to branch ${branch.id} (${branch.name})`);
          }
        });
      }

      // Create a map of parent message IDs to their children
      const parentToChildren = new Map<number | null, Message[]>();
      
      // Ensure messages is an array before using forEach
      if (Array.isArray(messages)) {
        messages.forEach((message: Message) => {
          const parentId = message.parentId;
          if (!parentToChildren.has(parentId)) {
            parentToChildren.set(parentId, []);
          }
          parentToChildren.get(parentId)?.push(message);
        });
      }

      // Build the tree recursively
      const buildTree = (parentId: number | null, depth: number, branchId: string | null): MessageNode[] => {
        const children = parentToChildren.get(parentId) || [];
        return children.map(message => {
          // Check if this message is the root of a branch
          const messageBranchId = messageBranchMap.get(message.id) || message.branchId || branchId;
          
          return {
            message,
            children: buildTree(message.id, depth + 1, messageBranchId),
            depth,
            branchId: messageBranchId
          };
        });
      };

      // Start building the tree from the root messages (parent is null)
      const tree = buildTree(null, 0, null);
      setMessageTree(tree);
    }
  }, [messages, branches]);

  // Render a message node
  const renderMessageNode = (node: MessageNode) => {
    const { message, children, depth, branchId } = node;
    const isBranchRoot = Array.isArray(branches) ? 
      branches.some((b: Branch) => b.rootMessageId === message.id) : false;
    const isBookmarked = Array.isArray(bookmarks) ? 
      bookmarks.some(bookmark => bookmark.messageId === message.id) : false;
    const isActiveMessage = branchId === activeBranch?.id;
    const indentClass = `pl-${Math.min(depth * 4, 12)}`;
    
    // Truncate message content for display
    const truncatedContent = message.content.length > 60 
      ? `${message.content.substring(0, 60)}...` 
      : message.content;

    return (
      <div key={message.id}>
        <div 
          className={cn(
            "p-2 rounded-md mb-1 cursor-pointer message-node flex items-start",
            indentClass,
            isActiveMessage && "active-branch",
            "hover:bg-[#2A2A2A]"
          )}
        >
          <div className="flex-shrink-0 mt-1 mr-2">
            {message.role === "user" ? (
              <div className="w-6 h-6 rounded-full bg-[#333] flex items-center justify-center">
                <span className="text-xs text-nvidia-light">U</span>
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-nvidia-green/20 flex items-center justify-center">
                <span className="text-xs text-nvidia-green">A</span>
              </div>
            )}
          </div>
          <div className="flex-grow min-w-0">
            <div 
              className="text-sm text-nvidia-light truncate" 
              onClick={() => onMessageSelect(message.id)}
            >
              {truncatedContent}
            </div>
            <div className="flex items-center mt-1 space-x-2">
              {isBranchRoot && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 py-0 text-xs border-[#444] text-nvidia-light branch-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const branch = branches?.find((b: Branch) => b.rootMessageId === message.id);
                    if (branch) {
                      onBranchSelect(branch.id);
                    }
                  }}
                  data-branch-tip="Switch to this branch"
                >
                  <GitBranch className="h-3 w-3 mr-1 text-nvidia-green" />
                  Switch
                </Button>
              )}
              
              {message.role === "assistant" && !isBranchRoot && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 py-0 text-xs border-[#444] text-nvidia-light branch-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessageSelect(message.id);
                  }}
                  data-branch-tip="Create a branch from this point"
                >
                  <GitBranch className="h-3 w-3 mr-1 text-nvidia-green" />
                  Branch
                </Button>
              )}
              
              {!isBookmarked && message.role === "assistant" && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 py-0 text-xs border-[#444] text-nvidia-light branch-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMessageSelect(message.id);
                  }}
                  data-branch-tip="Save this response as a bookmark"
                >
                  <Bookmark className="h-3 w-3 mr-1 text-nvidia-green" />
                  Save
                </Button>
              )}
              
              {isBookmarked && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 py-0 text-xs bg-[#2A2A2A] border-nvidia-green/50 text-nvidia-green hover:bg-[#333]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookmarkSelect(message.id);
                  }}
                  data-branch-tip="Jump to this bookmarked message"
                >
                  <Bookmark className="h-3 w-3 mr-1 text-nvidia-green fill-nvidia-green" />
                  Bookmarked
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {children.map(child => renderMessageNode(child))}
      </div>
    );
  };

  // Delete handlers
  const handleDeleteBranch = () => {
    if (deleteBranchId) {
      deleteBranchMutation.mutate(deleteBranchId);
      setShowDeleteBranchDialog(false);
      setDeleteBranchId(null);
    }
  };
  
  const handleDeleteBookmark = () => {
    if (deleteBookmarkId) {
      deleteBookmarkMutation.mutate(deleteBookmarkId);
      setShowDeleteBookmarkDialog(false);
      setDeleteBookmarkId(null);
    }
  };

  return (
    <div className="relative">
      {/* Delete Branch Confirmation Dialog */}
      <AlertDialog 
        open={showDeleteBranchDialog} 
        onOpenChange={setShowDeleteBranchDialog}
      >
        <AlertDialogContent className="bg-[#1A1A1A] border border-[#333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-nvidia-light">Delete Branch</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this branch? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#333] text-nvidia-light hover:bg-[#2A2A2A] hover:text-nvidia-light">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteBranch}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Bookmark Confirmation Dialog */}
      <AlertDialog 
        open={showDeleteBookmarkDialog} 
        onOpenChange={setShowDeleteBookmarkDialog}
      >
        <AlertDialogContent className="bg-[#1A1A1A] border border-[#333]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-nvidia-light">Delete Bookmark</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete this bookmark? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#333] text-nvidia-light hover:bg-[#2A2A2A] hover:text-nvidia-light">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteBookmark}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    
      <div className={cn("bg-[#1A1A1A] border border-[#333] rounded-md overflow-hidden shadow-lg", className)} style={{boxShadow: "0 0 20px rgba(118, 185, 0, 0.1)"}}>
        <div className="p-3 bg-[#232323] border-b border-[#333] flex items-center justify-between">
          <h3 className="text-sm font-medium text-nvidia-light flex items-center">
            <MessageSquare className="w-4 h-4 mr-2 text-nvidia-green" />
            Conversation Explorer
          </h3>
        </div>
      
        {/* Branches Section */}
        <div className="p-3 border-b border-[#333]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-400 flex items-center">
              <GitBranch className="w-3 h-3 mr-1 text-nvidia-green" />
              Branches
            </h4>
            
            {/* New Branch button */}
            {Array.isArray(messages) && messages.length > 0 && (
              <Button 
                variant="outline"
                size="sm"
                className="h-6 px-2 py-0 text-xs border-[#444] text-nvidia-light flex items-center branch-button new-branch-button"
                onClick={() => {
                  // Find the latest assistant message and select it for branching
                  const assistantMessages = messages
                    .filter((msg: Message) => msg.role === "assistant")
                    .sort((a: Message, b: Message) => {
                      if (!a.timestamp || !b.timestamp) return 0;
                      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                    });
                    
                  if (assistantMessages.length > 0) {
                    onMessageSelect(assistantMessages[0].id);
                  } else if (messages.length > 0) {
                    // If no assistant messages, use the latest message
                    onMessageSelect(messages[0].id);
                  }
                }}
                data-branch-tip="Create a new conversation branch"
              >
                <GitBranch className="h-3 w-3 mr-1 text-nvidia-green" />
                New Branch
              </Button>
            )}
          </div>
          
          {isLoadingBranches ? (
            <div className="text-xs text-gray-500 italic">Loading branches...</div>
          ) : Array.isArray(branches) && branches.length > 0 ? (
            <div className="space-y-1">
              {/* Log rendering information */}
              {(() => { console.log("Rendering branches:", branches); return null; })()}
              {Array.isArray(branches) && branches.length > 0 ? (
                branches.map((branch: Branch) => {
                  // Log branch information
                  (() => { console.log("Rendering branch:", branch); return null; })();
                  return (
                    <div 
                      key={branch.id}
                      className={cn(
                        "text-xs p-2 rounded cursor-pointer flex items-center justify-between group",
                        (branch.id === activeBranch?.id || branch.isActive === 1) ? 
                          "branch-item-active text-nvidia-green" : 
                          "text-nvidia-light hover:bg-[#2A2A2A]"
                      )}
                      data-branch-tip={`Select branch: ${branch.name}`}
                    >
                      <div className="flex-grow overflow-hidden" onClick={() => onBranchSelect(branch.id)}>
                        <span className="truncate">{branch.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {(branch.id === activeBranch?.id || branch.isActive === 1) && (
                          <span className="text-[10px] bg-nvidia-green/20 text-nvidia-green px-1 py-0.5 rounded">
                            Active
                          </span>
                        )}
                        
                        {/* Only show delete button if branch is not active */}
                        {!(branch.id === activeBranch?.id || branch.isActive === 1) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteBranchId(branch.id);
                              setShowDeleteBranchDialog(true);
                            }}
                            data-branch-tip="Delete branch"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-gray-500 italic">No branches found to display</div>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">No branches created yet</div>
          )}
        </div>
        
        {/* Bookmarks Section */}
        <div className="p-3 border-b border-[#333]">
          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center">
            <Bookmark className="w-3 h-3 mr-1 text-nvidia-green" />
            Bookmarks
          </h4>
          
          {isLoadingBookmarks ? (
            <div className="text-xs text-gray-500 italic">Loading bookmarks...</div>
          ) : Array.isArray(bookmarks) && bookmarks.length > 0 ? (
            <div className="space-y-1">
              {bookmarks.map((bookmark: Bookmark) => (
                <div 
                  key={bookmark.id}
                  className="text-xs p-2 rounded cursor-pointer text-nvidia-light hover:bg-[#2A2A2A] flex items-center justify-between group bookmark-item"
                  data-branch-tip="Jump to this bookmark"
                >
                  <div 
                    className="flex items-center flex-grow overflow-hidden"
                    onClick={() => onBookmarkSelect(bookmark.messageId)}
                  >
                    <Bookmark className="w-3 h-3 mr-2 text-nvidia-green fill-nvidia-green/20" />
                    <span className="truncate">{bookmark.name}</span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteBookmarkId(bookmark.id);
                      setShowDeleteBookmarkDialog(true);
                    }}
                    data-branch-tip="Delete bookmark"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">No bookmarks saved yet</div>
          )}
        </div>
        
        {/* Message Tree */}
        <div className="p-3">
          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center">
            <MessageSquarePlus className="w-3 h-3 mr-1 text-nvidia-green" />
            Messages
          </h4>
          
          <ScrollArea className="h-[300px] pr-2">
            {isLoadingMessages ? (
              <div className="text-xs text-gray-500 italic">Loading messages...</div>
            ) : messageTree.length > 0 ? (
              <div>
                {messageTree.map(node => renderMessageNode(node))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic">No messages in this conversation</div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default ConversationTree;