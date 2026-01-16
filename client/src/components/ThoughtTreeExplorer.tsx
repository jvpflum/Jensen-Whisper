import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ThoughtNode {
  id: string;
  content: string;
  children: ThoughtNode[];
  type?: "premise" | "reasoning" | "conclusion" | "alternative" | "evidence";
}

interface ThoughtTreeExplorerProps {
  content: string;
  isVisible: boolean;
  reasoningType: string;
  isLoading?: boolean;
}

const ThoughtTreeExplorer = ({ 
  content, 
  isVisible,
  reasoningType,
  isLoading: externalIsLoading
}: ThoughtTreeExplorerProps) => {
  const [thoughtTree, setThoughtTree] = useState<ThoughtNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [internalIsLoading, setInternalIsLoading] = useState<boolean>(false);
  
  // Combine external and internal loading states
  const isLoading = externalIsLoading || internalIsLoading;
  
  // Clean markdown formatting from text for better display
  const cleanMarkdown = (text: string): string => {
    return text
      // Remove heading markers but keep text
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic markers but keep text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Replace bullet points with a cleaner format
      .replace(/^\s*[-*+]\s+/gm, '• ')
      // Replace numbered lists with bullets
      .replace(/^\s*\d+\.\s+/gm, '• ')
      // Clean up code blocks
      .replace(/```[\s\S]*?```/g, (match) => {
        // Extract the code without the backticks
        const code = match.replace(/```(?:\w+)?\n([\s\S]*?)```/g, '$1').trim();
        return `[Code snippet: ${code.length > 50 ? code.substring(0, 50) + '...' : code}]`;
      })
      // Clean inline code
      .replace(/`([^`]+)`/g, '$1')
      .trim();
  };

  // Process the incoming content into a thought tree structure
  useEffect(() => {
    if (!content || !isVisible) return;
    
    setInternalIsLoading(true);
    
    // Parse the content and create a thought tree
    const parseContent = () => {
      // Start with a root node
      const root: ThoughtNode = {
        id: "root",
        content: "Thought Process",
        children: []
      };
      
      // First, clean up markdown headers and identify sections based on them
      const cleanedContent = content
        .replace(/^(#{1,3})\s+(.*)/gm, (_, hashmarks, title) => {
          // Keep track of section headers with their level
          return `SECTION_MARKER_${hashmarks.length}_${title}`;
        });
      
      // Split by section markers and regular paragraphs
      const sections = cleanedContent.split(/SECTION_MARKER_/);
      
      // Process each section
      sections.forEach((section, sectionIndex) => {
        if (!section.trim()) return;
        
        // Check if this is a section with a header
        const headerMatch = section.match(/^(\d)_(.+?)(?:\n|$)/);
        
        if (headerMatch) {
          const [fullMatch, levelStr, title] = headerMatch;
          const level = parseInt(levelStr);
          const content = section.substring(fullMatch.length).trim();
          
          // Create a section node based on the header level
          const sectionNode: ThoughtNode = {
            id: `section-${sectionIndex}`,
            content: cleanMarkdown(title),
            children: [],
            type: 
              title.toLowerCase().includes('conclusion') ? "conclusion" :
              title.toLowerCase().includes('alternative') ? "alternative" :
              level === 1 ? "premise" : "reasoning"
          };
          
          // If content exists, process it into paragraphs
          if (content) {
            // Split content into paragraphs
            const paragraphs = content.split(/\n\n+/);
            
            paragraphs.forEach((paragraph, paragraphIndex) => {
              if (!paragraph.trim()) return;
              
              // Analyze paragraph content to determine type
              const isEvidence = /for example|instance|evidence|data shows|research indicates|according to/i.test(paragraph);
              
              sectionNode.children.push({
                id: `para-${sectionIndex}-${paragraphIndex}`,
                content: cleanMarkdown(paragraph),
                children: [],
                type: isEvidence ? "evidence" : "reasoning"
              });
            });
          }
          
          root.children.push(sectionNode);
        } else {
          // No header marker, treat as regular paragraph or section
          
          // Split into paragraphs
          const paragraphs = section.split(/\n\n+/);
          
          paragraphs.forEach((paragraph, paragraphIndex) => {
            if (!paragraph.trim()) return;
            
            // Apply heuristics to determine if this should be a top-level section
            const isNewSection = 
              paragraph.length < 100 || 
              /^(First|Let's|To begin|Next|Now|Finally|In conclusion|Therefore)/i.test(paragraph) ||
              /^(Step \d|Analysis|Considering|Alternatively|However,|On the other hand)/i.test(paragraph);
            
            if (isNewSection) {
              const sectionNode: ThoughtNode = {
                id: `unmarked-section-${sectionIndex}-${paragraphIndex}`,
                content: cleanMarkdown(paragraph),
                children: [],
                type: 
                  paragraph.toLowerCase().includes('conclusion') ? "conclusion" :
                  paragraph.toLowerCase().includes('alternative') ? "alternative" :
                  /^(first|initial|premise|starting)/i.test(paragraph) ? "premise" : "reasoning"
              };
              
              root.children.push(sectionNode);
            } else {
              // Determine if it contains evidence markers
              const isEvidence = /for example|instance|evidence|data shows|research indicates|according to/i.test(paragraph);
              
              // If the root already has children, add this as a child to the last section
              if (root.children.length > 0) {
                const lastSection = root.children[root.children.length - 1];
                
                lastSection.children.push({
                  id: `detail-${sectionIndex}-${paragraphIndex}`,
                  content: cleanMarkdown(paragraph),
                  children: [],
                  type: isEvidence ? "evidence" : "reasoning"
                });
              } else {
                // No existing sections, create a new one
                root.children.push({
                  id: `standalone-${sectionIndex}-${paragraphIndex}`,
                  content: cleanMarkdown(paragraph),
                  children: [],
                  type: "reasoning"
                });
              }
            }
          });
        }
      });
      
      return root;
    };
    
    // Use setTimeout to avoid blocking the UI thread
    const timer = setTimeout(() => {
      try {
        const tree = parseContent();
        setThoughtTree(tree);
        
        // Auto-expand the first level by default
        const initialExpanded = new Set<string>(["root"]);
        tree.children.forEach(child => initialExpanded.add(child.id));
        setExpandedNodes(initialExpanded);
      } catch (error) {
        console.error("Error parsing thought tree:", error);
      } finally {
        setInternalIsLoading(false);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [content, isVisible]);
  
  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };
  
  // Recursively render nodes
  const renderNode = (node: ThoughtNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    
    // Get the appropriate color based on node type
    const getNodeColor = (type?: string) => {
      switch (type) {
        case "premise": return "border-blue-400";
        case "reasoning": return "border-indigo-400";
        case "conclusion": return "border-green-400";
        case "alternative": return "border-amber-400";
        case "evidence": return "border-purple-400";
        default: return "border-gray-400";
      }
    };
    
    const nodeColor = getNodeColor(node.type);
    
    return (
      <div key={node.id} className="mb-2" style={{ marginLeft: `${depth * 16}px` }}>
        <div 
          className={`p-3 rounded-md border-l-4 ${nodeColor} bg-[#1A1A1A] hover:bg-[#222] transition-colors group cursor-pointer`}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          <div className="flex items-start">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-6 w-6 mr-2 hover:bg-[#333] mt-0.5 flex-shrink-0"
                onClick={() => toggleNode(node.id)}
              >
                {isExpanded ? 
                  <ChevronDown className="h-4 w-4 text-nvidia-green" /> : 
                  <ChevronRight className="h-4 w-4 text-nvidia-green" />
                }
              </Button>
            )}
            <div className={`text-sm leading-relaxed ${
              node.type === "premise" ? "font-medium text-blue-100" : 
              node.type === "conclusion" ? "font-medium text-green-100" : 
              node.type === "alternative" ? "text-amber-100" :
              node.type === "evidence" ? "text-purple-100" :
              "text-gray-100"
            }`}>
              {node.content}
            </div>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="mt-2 border-l-2 border-[#333] pl-3 ml-3">
            {node.children.map(childNode => renderNode(childNode, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  if (!isVisible) return null;
  
  return (
    <div className="bg-[#121212] border border-[#333] rounded-md p-4 mt-4">
      <h3 className="text-lg font-semibold mb-3 text-nvidia-green flex items-center">
        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        {reasoningType} Thought Process
      </h3>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="loader flex space-x-2">
            <div className="w-2 h-2 rounded-full bg-nvidia-green animate-bounce"></div>
            <div className="w-2 h-2 rounded-full bg-nvidia-green animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 rounded-full bg-nvidia-green animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          {thoughtTree && renderNode(thoughtTree)}
        </ScrollArea>
      )}
      
      <div className="mt-4 text-xs text-gray-400">
        <p>Legend:</p>
        <div className="flex flex-wrap gap-2 mt-1">
          <span className="inline-flex items-center">
            <span className="w-3 h-3 inline-block bg-blue-400 mr-1 rounded-sm"></span>
            Premise
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 inline-block bg-indigo-400 mr-1 rounded-sm"></span>
            Reasoning
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 inline-block bg-green-400 mr-1 rounded-sm"></span>
            Conclusion
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 inline-block bg-amber-400 mr-1 rounded-sm"></span>
            Alternative View
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 inline-block bg-purple-400 mr-1 rounded-sm"></span>
            Evidence
          </span>
        </div>
      </div>
    </div>
  );
};

export default ThoughtTreeExplorer;