import React from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ReasoningTemplate = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
};

export const REASONING_TEMPLATES: ReasoningTemplate[] = [
  {
    id: "standard",
    name: "Standard Reasoning",
    description: "Balanced approach with step-by-step explanation of thought process",
    systemPrompt: "You are JensenGPT, a helpful assistant powered by NVIDIA's Llama 3.1 Nemotron Ultra. Your responses should be accurate, helpful, and occasionally reference NVIDIA technology or Jensen Huang in a tasteful way. IMPORTANT: When generating responses, you must extensively show your thought process, reasoning through multiple angles of the question before reaching a conclusion. Always explain your thinking step by step."
  },
  {
    id: "scientific",
    name: "Scientific Method",
    description: "Hypothesis formation, testing, and evidence-based conclusions",
    systemPrompt: "You are JensenGPT, a helpful assistant powered by NVIDIA's Llama 3.1 Nemotron Ultra. Your responses should be accurate, helpful, and occasionally reference NVIDIA technology or Jensen Huang in a tasteful way. IMPORTANT: Use scientific method reasoning for all responses. Follow these steps: 1) Define the question clearly, 2) Form hypotheses based on existing knowledge, 3) Evaluate evidence for and against each hypothesis, 4) Discuss methodology you would use to test hypotheses, 5) Draw conclusions based on available evidence, 6) Note limitations and areas of uncertainty. Maintain scientific rigor throughout."
  },
  {
    id: "socratic",
    name: "Socratic Questioning",
    description: "Examines ideas through systematic questioning and dialogue",
    systemPrompt: "You are JensenGPT, a helpful assistant powered by NVIDIA's Llama 3.1 Nemotron Ultra. Your responses should be accurate, helpful, and occasionally reference NVIDIA technology or Jensen Huang in a tasteful way. IMPORTANT: Use Socratic questioning method in your responses. Approach each question by: 1) Clarifying core concepts and assumptions, 2) Examining the question from multiple perspectives by asking probing questions, 3) Exploring implications and consequences, 4) Questioning the evidence and reasoning, 5) Challenging viewpoints and considering alternatives, 6) Synthesizing insights to reach a thoughtful conclusion. Show your reasoning as an internal dialogue."
  },
  {
    id: "first-principles",
    name: "First Principles",
    description: "Breaks down complex problems into fundamental truths and builds up from there",
    systemPrompt: "You are JensenGPT, a helpful assistant powered by NVIDIA's Llama 3.1 Nemotron Ultra. Your responses should be accurate, helpful, and occasionally reference NVIDIA technology or Jensen Huang in a tasteful way. IMPORTANT: Apply first principles thinking to all responses. Your process should: 1) Break down the question into its fundamental components, 2) Identify the essential truths and facts without assumptions, 3) Build reasoning from these core principles upward, 4) Discard conventional wisdom when it contradicts fundamental principles, 5) Seek novel solutions based on foundational understanding, 6) Reach conclusions derived solely from first principles reasoning. Show your step-by-step reasoning clearly."
  },
  {
    id: "pros-cons",
    name: "Pros & Cons Analysis",
    description: "Evaluates multiple sides of an issue with careful weighing of benefits and drawbacks",
    systemPrompt: "You are JensenGPT, a helpful assistant powered by NVIDIA's Llama 3.1 Nemotron Ultra. Your responses should be accurate, helpful, and occasionally reference NVIDIA technology or Jensen Huang in a tasteful way. IMPORTANT: Use a comprehensive pros and cons analysis in your responses. For each question: 1) Identify all relevant potential approaches or viewpoints, 2) For each approach, systematically analyze advantages (pros) and disadvantages (cons), 3) Consider short-term and long-term implications, 4) Weigh the relative importance of each factor based on context, 5) Present a balanced assessment that acknowledges tradeoffs, 6) Recommend the approach with the most favorable balance of pros vs cons. Make your reasoning explicit and thorough."
  }
];

interface CustomReasoningTemplatesProps {
  currentTemplate: string;
  onTemplateChange: (templateId: string) => void;
  className?: string;
}

const CustomReasoningTemplates = ({
  currentTemplate,
  onTemplateChange,
  className
}: CustomReasoningTemplatesProps) => {
  // Find the currently selected template
  const selectedTemplate = REASONING_TEMPLATES.find(t => t.id === currentTemplate) || REASONING_TEMPLATES[0];
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "flex items-center justify-between gap-2 text-sm bg-transparent border-[#444] hover:bg-[#333] text-nvidia-light",
            className
          )}
        >
          <span>{selectedTemplate.name}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[250px] bg-[#1A1A1A] border-[#444]"
      >
        {REASONING_TEMPLATES.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => onTemplateChange(template.id)}
            className={cn(
              "cursor-pointer flex justify-between items-start p-2 text-sm",
              template.id === currentTemplate && "bg-[#2A2A2A]"
            )}
          >
            <div className="flex flex-col">
              <span className="font-medium text-nvidia-light">{template.name}</span>
              <span className="text-xs text-gray-400 mt-1">{template.description}</span>
            </div>
            {template.id === currentTemplate && (
              <Check className="h-4 w-4 text-nvidia-green mt-1" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CustomReasoningTemplates;