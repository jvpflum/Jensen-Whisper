import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface LearningModeToggleProps {
  conversationId: string | null;
  className?: string;
}

const LearningModeToggle: React.FC<LearningModeToggleProps> = ({ 
  conversationId,
  className
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to get the current conversation and check if learning mode is enabled
  const { data: conversation, isLoading } = useQuery({
    queryKey: ['/api/conversations', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!res.ok) throw new Error('Failed to fetch conversation');
      return res.json();
    },
    enabled: !!conversationId,
  });

  // Mutation to toggle learning mode
  const { mutate: toggleLearningMode, isPending } = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!conversationId) throw new Error('No conversation selected');
      return apiRequest('PATCH', `/api/conversations/${conversationId}/learning-mode`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', conversationId] });
      toast({
        title: 'Learning Mode Updated',
        description: `Learning mode has been ${conversation?.learningModeEnabled ? 'disabled' : 'enabled'}.`,
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to toggle learning mode: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (checked: boolean) => {
    toggleLearningMode(checked);
  };

  if (isLoading || !conversationId) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Switch
        id="learning-mode"
        checked={conversation?.learningModeEnabled || false}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
      <Label 
        htmlFor="learning-mode" 
        className="text-sm font-medium cursor-pointer"
      >
        Learning Mode
      </Label>
    </div>
  );
};

export default LearningModeToggle;