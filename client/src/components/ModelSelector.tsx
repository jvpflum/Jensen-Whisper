import React, { useState } from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Calendar, ChevronDown, Cpu, Zap, Lightbulb, Code, Brain, FlashlightIcon, ShieldCheck } from 'lucide-react';
import { NVIDIA_MODELS, ModelDefinition, getModelById } from '@/lib/models';
import { Button } from '@/components/ui/button';

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({ selectedModelId, onModelChange }: ModelSelectorProps) {
  const [showComparison, setShowComparison] = useState(false);
  
  const currentModel = getModelById(selectedModelId) || NVIDIA_MODELS[0];
  
  return (
    <div className="w-full py-2 pb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-medium text-gray-100">Model Selection</h3>
          <p className="text-xs text-gray-400">Choose NVIDIA's AI model</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs"
          onClick={() => setShowComparison(!showComparison)}
        >
          {showComparison ? "Hide Comparison" : "Compare Models"}
        </Button>
      </div>
      
      <Select
        value={selectedModelId}
        onValueChange={(value) => {
          onModelChange(value);
        }}
      >
        <SelectTrigger className="w-full bg-[#111] border-[#333] mb-3">
          <SelectValue placeholder="Select Model" />
        </SelectTrigger>
        <SelectContent className="bg-[#111] border-[#333]">
          {NVIDIA_MODELS.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center justify-between w-full">
                <span>{model.name}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {model.parameterCount}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {/* Current Model Card */}
      <Card className="bg-[#1A1A1A] border-nvidia-green/20 shadow-[0_0_10px_rgba(118,185,0,0.1)]">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-md font-semibold flex items-center gap-2">
              <Cpu className="h-4 w-4 text-nvidia-green" />
              {currentModel.name}
            </CardTitle>
            <Badge variant="outline" className="bg-nvidia-green/10 text-nvidia-green border-nvidia-green/30 text-xs">
              {currentModel.parameterCount}
            </Badge>
          </div>
          <CardDescription className="text-xs text-gray-400 mt-1">
            {currentModel.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-300">Released: {currentModel.releaseDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-gray-300">Context: {currentModel.contextWindow}</span>
            </div>
          </div>
          
          <Separator className="my-3 bg-gray-800" />
          
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-nvidia-green" />
                <span className="text-xs">Reasoning</span>
              </div>
              <span className="text-xs text-gray-400">{currentModel.performance.reasoning}/10</span>
            </div>
            <Progress value={currentModel.performance.reasoning * 10} className="h-1.5 bg-gray-800" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Code className="h-3.5 w-3.5 text-nvidia-green" />
                <span className="text-xs">Coding</span>
              </div>
              <span className="text-xs text-gray-400">{currentModel.performance.coding}/10</span>
            </div>
            <Progress value={currentModel.performance.coding * 10} className="h-1.5 bg-gray-800" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-nvidia-green" />
                <span className="text-xs">Creativity</span>
              </div>
              <span className="text-xs text-gray-400">{currentModel.performance.creativity}/10</span>
            </div>
            <Progress value={currentModel.performance.creativity * 10} className="h-1.5 bg-gray-800" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-nvidia-green" />
                <span className="text-xs">Speed</span>
              </div>
              <span className="text-xs text-gray-400">{currentModel.performance.speed}/10</span>
            </div>
            <Progress value={currentModel.performance.speed * 10} className="h-1.5 bg-gray-800" />
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <div className="flex flex-wrap gap-1.5">
            {currentModel.specialties.map((specialty, index) => (
              <Badge key={index} variant="outline" className="bg-[#232323] text-xs">
                {specialty}
              </Badge>
            ))}
          </div>
        </CardFooter>
      </Card>
      
      {/* Model Comparison */}
      {showComparison && (
        <div className="mt-4 bg-[#1A1A1A] border border-[#333] rounded-md p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <ChevronDown className="h-4 w-4 mr-1 text-nvidia-green" />
            Model Comparison
          </h4>
          
          <div className="space-y-5">
            {/* Model Comparison Chart */}
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2 text-xs text-gray-400">
                <div className="col-span-1"></div>
                {NVIDIA_MODELS.map((model, idx) => (
                  <div key={idx} className="text-center">
                    <span className={model.id === selectedModelId ? "text-nvidia-green font-medium" : ""}>
                      {model.parameterCount}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Reasoning */}
              <div className="grid grid-cols-5 gap-2 items-center">
                <div className="col-span-1 text-xs flex items-center">
                  <Brain className="h-3.5 w-3.5 mr-1 text-nvidia-green" />
                  <span>Reasoning</span>
                </div>
                {NVIDIA_MODELS.map((model, idx) => (
                  <div key={idx} className="flex-1 h-8 flex items-center justify-center">
                    <div
                      className={`h-6 rounded-sm ${
                        model.id === selectedModelId
                          ? "bg-nvidia-green"
                          : "bg-nvidia-green/40"
                      }`}
                      style={{ width: `${model.performance.reasoning * 10}%` }}
                    >
                      <span className="text-xs text-black flex items-center justify-center h-full font-medium">
                        {model.performance.reasoning}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Coding */}
              <div className="grid grid-cols-5 gap-2 items-center">
                <div className="col-span-1 text-xs flex items-center">
                  <Code className="h-3.5 w-3.5 mr-1 text-nvidia-green" />
                  <span>Coding</span>
                </div>
                {NVIDIA_MODELS.map((model, idx) => (
                  <div key={idx} className="flex-1 h-8 flex items-center justify-center">
                    <div
                      className={`h-6 rounded-sm ${
                        model.id === selectedModelId
                          ? "bg-nvidia-green"
                          : "bg-nvidia-green/40"
                      }`}
                      style={{ width: `${model.performance.coding * 10}%` }}
                    >
                      <span className="text-xs text-black flex items-center justify-center h-full font-medium">
                        {model.performance.coding}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Speed */}
              <div className="grid grid-cols-5 gap-2 items-center">
                <div className="col-span-1 text-xs flex items-center">
                  <Zap className="h-3.5 w-3.5 mr-1 text-nvidia-green" />
                  <span>Speed</span>
                </div>
                {NVIDIA_MODELS.map((model, idx) => (
                  <div key={idx} className="flex-1 h-8 flex items-center justify-center">
                    <div
                      className={`h-6 rounded-sm ${
                        model.id === selectedModelId
                          ? "bg-nvidia-green"
                          : "bg-nvidia-green/40"
                      }`}
                      style={{ width: `${model.performance.speed * 10}%` }}
                    >
                      <span className="text-xs text-black flex items-center justify-center h-full font-medium">
                        {model.performance.speed}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Creativity */}
              <div className="grid grid-cols-5 gap-2 items-center">
                <div className="col-span-1 text-xs flex items-center">
                  <Lightbulb className="h-3.5 w-3.5 mr-1 text-nvidia-green" />
                  <span>Creativity</span>
                </div>
                {NVIDIA_MODELS.map((model, idx) => (
                  <div key={idx} className="flex-1 h-8 flex items-center justify-center">
                    <div
                      className={`h-6 rounded-sm ${
                        model.id === selectedModelId
                          ? "bg-nvidia-green"
                          : "bg-nvidia-green/40"
                      }`}
                      style={{ width: `${model.performance.creativity * 10}%` }}
                    >
                      <span className="text-xs text-black flex items-center justify-center h-full font-medium">
                        {model.performance.creativity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator className="my-3 bg-gray-800" />
            
            {/* Context Window Comparison */}
            <div className="space-y-1">
              <h5 className="text-xs font-medium mb-2">Context Window Size</h5>
              <div className="grid grid-cols-3 gap-3">
                {NVIDIA_MODELS.map((model, idx) => (
                  <div 
                    key={idx} 
                    className={`p-2 rounded border text-center ${
                      model.id === selectedModelId 
                        ? "border-nvidia-green bg-nvidia-green/10" 
                        : "border-[#333] bg-[#232323]"
                    }`}
                  >
                    <div className="text-sm font-medium">
                      {model.contextWindow}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {model.parameterCount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-xs text-gray-400 mt-2">
              <p className="flex items-center">
                <FlashlightIcon className="h-3.5 w-3.5 mr-1 text-nvidia-green opacity-70" />
                <span>Larger models excel at complex reasoning but may process responses more slowly.</span>
              </p>
              <p className="flex items-center mt-1">
                <ShieldCheck className="h-3.5 w-3.5 mr-1 text-nvidia-green opacity-70" />
                <span>Smaller models offer faster responses and use fewer computational resources.</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}