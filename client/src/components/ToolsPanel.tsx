import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Hammer, 
  Calculator, 
  CloudSun, 
  Search,
  ArrowRight,
  Loader2,
  Newspaper
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';

// Tool parameter type
interface ToolParameter {
  name: string;
  description: string;
  type: string;
  required: boolean;
  default?: any;
  enum?: string[];
}

// Tool definition type
interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: ToolParameter[];
  enabled: boolean;
}

// Tool execution result type
interface ToolResult {
  toolId: string;
  success: boolean;
  result: any;
  error?: string;
}

interface ToolsPanelProps {
  onToolResult?: (result: ToolResult) => void;
  onClose?: () => void;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({ onToolResult, onClose }) => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<ToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch available tools on component mount
  useEffect(() => {
    const fetchTools = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tools');
        if (!response.ok) {
          throw new Error('Failed to fetch tools');
        }
        const data = await response.json();
        setTools(data);
      } catch (err) {
        console.error('Error fetching tools:', err);
        setError('Failed to load tools. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTools();
  }, []);

  // Reset parameter values when active tool changes
  useEffect(() => {
    if (activeToolId) {
      const tool = tools.find(t => t.id === activeToolId);
      if (tool) {
        const initialValues: Record<string, any> = {};
        tool.parameters.forEach(param => {
          if (param.default !== undefined) {
            initialValues[param.name] = param.default;
          } else {
            initialValues[param.name] = '';
          }
        });
        setParamValues(initialValues);
      }
    } else {
      setParamValues({});
    }
    // Clear previous results
    setResult(null);
    setError(null);
  }, [activeToolId, tools]);

  const handleToolSelect = (toolId: string) => {
    setActiveToolId(toolId === activeToolId ? null : toolId);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setParamValues(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const executeTool = async () => {
    if (!activeToolId) return;

    // Validate required parameters
    const selectedTool = tools.find(t => t.id === activeToolId);
    if (!selectedTool) return;

    // Check for missing required parameters
    const missingParams = selectedTool.parameters
      .filter(p => p.required && (!paramValues[p.name] || paramValues[p.name] === ''))
      .map(p => p.name);

    if (missingParams.length > 0) {
      setError(`Please fill in required parameters: ${missingParams.join(', ')}`);
      return;
    }

    try {
      setExecuting(true);
      setError(null);

      console.log('Executing tool with params:', paramValues);

      const response = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          toolId: activeToolId,
          parameters: paramValues
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to execute tool');
      }

      const data = await response.json();
      setResult(data);
      
      // Notify parent component if callback is provided
      if (onToolResult) {
        onToolResult(data);
      }
    } catch (err) {
      console.error('Error executing tool:', err);
      if (err instanceof Error) {
        setError(err.message || 'An error occurred while executing the tool.');
      } else {
        setError('Failed to execute tool. Please try again.');
      }
    } finally {
      setExecuting(false);
    }
  };

  // Get icon for a tool category
  const getToolIcon = (toolId: string) => {
    switch (toolId) {
      case 'calculator':
        return <Calculator className="h-5 w-5" />;
      case 'weather':
        return <CloudSun className="h-5 w-5" />;
      case 'web-search':
        return <Search className="h-5 w-5" />;
      case 'news-headlines':
        return <Newspaper className="h-5 w-5" />;
      default:
        return <Hammer className="h-5 w-5" />;
    }
  };

  // Get color for a tool category
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'utility':
        return 'bg-blue-500';
      case 'web':
        return 'bg-green-500';
      case 'data':
        return 'bg-purple-500';
      case 'dev':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Render parameter input based on parameter type
  const renderParameterInput = (tool: Tool, param: ToolParameter) => {
    const id = `${tool.id}-${param.name}`;
    const value = paramValues[param.name] !== undefined ? paramValues[param.name] : '';

    // Check if this is an enum-type parameter
    if (param.enum && param.enum.length > 0) {
      return (
        <div className="space-y-2" key={id}>
          <Label htmlFor={id}>{param.name}{param.required ? ' *' : ''}</Label>
          <Select 
            value={value || ''} 
            onValueChange={(val) => handleParameterChange(param.name, val)}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder={`Select ${param.name}`} />
            </SelectTrigger>
            <SelectContent>
              {param.enum.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{param.description}</p>
        </div>
      );
    }

    // Default to text input for other types
    return (
      <div className="space-y-2" key={id}>
        <Label htmlFor={id}>{param.name}{param.required ? ' *' : ''}</Label>
        <Input
          id={id}
          type={param.type === 'number' ? 'number' : 'text'}
          placeholder={param.description}
          value={value}
          onChange={(e) => handleParameterChange(
            param.name, 
            param.type === 'number' ? parseFloat(e.target.value) : e.target.value
          )}
        />
        <p className="text-xs text-muted-foreground">{param.description}</p>
      </div>
    );
  };

  // Format tool result for display
  const formatToolResult = (result: any): string => {
    if (typeof result === 'object') {
      return JSON.stringify(result, null, 2);
    }
    return String(result);
  };

  if (loading) {
    return (
      <Card className="w-full h-full flex items-center justify-center">
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-nvidia-green" />
            <p>Loading tools...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>AI Tools</CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
        <CardDescription>
          Extend AI capabilities with specialized tools
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow overflow-auto">
        {error && (
          <div className="bg-destructive/20 text-destructive p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        {tools.length === 0 && !loading && !error ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No tools available</p>
          </div>
        ) : (
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            value={activeToolId || undefined}
            onValueChange={(value) => setActiveToolId(value || null)}
          >
            {tools.map((tool) => (
              <AccordionItem key={tool.id} value={tool.id}>
                <AccordionTrigger className="hover:bg-secondary/40 px-4 rounded-md">
                  <div className="flex items-center space-x-2">
                    {getToolIcon(tool.id)}
                    <span>{tool.name}</span>
                    <Badge variant="outline" className={`ml-2 ${getCategoryColor(tool.category)} text-white`}>
                      {tool.category}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    <p className="text-sm">{tool.description}</p>
                    
                    <div className="space-y-4">
                      {tool.parameters.map((param) => 
                        renderParameterInput(tool, param)
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => executeTool()} 
                      disabled={executing || !activeToolId || activeToolId !== tool.id}
                      className="w-full"
                    >
                      {executing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          Execute <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>

                    {result && result.toolId === tool.id && (
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Result:</h4>
                        <div className="bg-black/20 p-3 rounded-md overflow-x-auto">
                          {result.success ? (
                            <pre className="text-xs whitespace-pre-wrap">
                              {formatToolResult(result.result)}
                            </pre>
                          ) : (
                            <p className="text-destructive text-sm">
                              {result.error || 'An error occurred during execution.'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default ToolsPanel;