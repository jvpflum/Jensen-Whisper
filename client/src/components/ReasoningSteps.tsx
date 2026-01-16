import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Lightbulb, 
  Link, 
  Send 
} from 'lucide-react';
import { type ReasoningStep } from '@shared/schema';

interface ReasoningStepsProps {
  messageId: number;
  steps?: ReasoningStep[];
  enabled?: boolean;
}

interface MessageWithReasoningSteps {
  id: number;
  role: string;
  content: string;
  reasoningSteps: ReasoningStep[];
  hasReasoningSteps: boolean;
}

const ReasoningSteps: React.FC<ReasoningStepsProps> = ({ 
  messageId,
  steps: initialSteps,
  enabled = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [questionInputs, setQuestionInputs] = useState<Record<number, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch reasoning steps
  const { data: message } = useQuery<MessageWithReasoningSteps>({
    queryKey: ['/api/messages', messageId, 'reasoning-steps'],
    queryFn: async () => {
      const res = await fetch(`/api/messages/${messageId}`);
      if (!res.ok) throw new Error('Failed to fetch message with reasoning steps');
      return res.json();
    },
    enabled: enabled && messageId > 0,
    initialData: initialSteps ? { 
      id: messageId, 
      role: 'assistant', 
      content: '', 
      reasoningSteps: initialSteps,
      hasReasoningSteps: initialSteps.length > 0
    } : undefined
  });

  // Mutation to ask a "why" question about a specific reasoning step
  const { mutate: askQuestion, isPending } = useMutation({
    mutationFn: async ({ stepIndex, question }: { stepIndex: number, question: string }) => {
      return apiRequest('POST', `/api/messages/${messageId}/reasoning-steps/${stepIndex}/explain`, { question });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', messageId, 'reasoning-steps'] });
      toast({
        title: 'Question Asked',
        description: 'Your question has been processed successfully.',
        variant: 'default',
      });
      // Clear the question input
      setQuestionInputs(prev => ({
        ...prev,
        [message?.reasoningSteps?.[0]?.stepIndex || 0]: ''
      }));
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to ask question: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  if (!enabled || !message?.hasReasoningSteps) {
    return null;
  }

  const steps = message?.reasoningSteps || [];

  // Get the styling for different step types
  const getStepStyling = (type: string) => {
    switch (type) {
      case 'premise':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/30';
      case 'reasoning':
        return 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30';
      case 'evidence':
        return 'border-purple-500 bg-purple-50 dark:bg-purple-950/30';
      case 'conclusion':
        return 'border-green-500 bg-green-50 dark:bg-green-950/30';
      case 'alternative':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-950/30';
      default:
        return 'border-gray-300 bg-gray-50 dark:bg-gray-800/50';
    }
  };

  // Get icon based on step type
  const getStepIcon = (type: string) => {
    switch (type) {
      case 'premise':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'reasoning':
        return <Link className="w-4 h-4 text-indigo-500" />;
      case 'evidence':
        return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
      case 'conclusion':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'alternative':
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleQuestionSubmit = (stepIndex: number) => {
    const question = questionInputs[stepIndex] || '';
    if (question.trim()) {
      askQuestion({ stepIndex, question });
    } else {
      toast({
        title: 'Empty Question',
        description: 'Please enter a question to ask.',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (stepIndex: number, value: string) => {
    setQuestionInputs(prev => ({
      ...prev,
      [stepIndex]: value
    }));
  };

  return (
    <div className="mt-2 w-full">
      <Button
        variant="ghost"
        className="flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
        {expanded ? 'Hide reasoning steps' : 'Show reasoning steps'}
      </Button>

      {expanded && (
        <div className="mt-2 space-y-3 animate-in fade-in-50 duration-300">
          {steps.map((step, index) => (
            <Card 
              key={step.stepIndex} 
              className={`p-3 border-l-4 ${getStepStyling(step.type)}`}
            >
              <div className="flex items-start gap-2">
                <div className="mt-1">
                  {getStepIcon(step.type)}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold uppercase mb-1 text-gray-500">
                    {step.type}
                  </div>
                  <div className="text-sm">{step.content}</div>

                  {/* Explanations */}
                  {step.explanations && step.explanations.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {step.explanations.map((explanation, eIndex) => (
                        <div key={explanation.id || eIndex} className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-xs mt-1">
                          <p>{explanation.content}</p>
                          {explanation.createdAt && (
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(explanation.createdAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ask Why Form */}
                  <div className="mt-2">
                    <Separator className="my-2" />
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Ask 'why' about this step..."
                        className="h-8 text-xs"
                        value={questionInputs[step.stepIndex] || ''}
                        onChange={(e) => handleInputChange(step.stepIndex, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQuestionSubmit(step.stepIndex);
                          }
                        }}
                      />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 px-2"
                        onClick={() => handleQuestionSubmit(step.stepIndex)}
                        disabled={isPending}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReasoningSteps;