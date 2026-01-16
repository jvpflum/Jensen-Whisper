import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LightbulbIcon, 
  GitBranchIcon, 
  CheckCircle2, 
  XCircle, 
  CircleAlert, 
  Microscope,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Atom,
  Brain,
  ZoomIn,
  ZoomOut,
  RotateCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TimelinePoint {
  id: string;
  label: string;
  description: string;
  type: "premise" | "reasoning" | "evidence" | "conclusion" | "alternative";
  // Enhanced visualization properties
  strength?: number; // 0-100 scale representing confidence or strength of the point
  connections?: string[]; // IDs of connected points
  position?: { x: number; y: number; z: number }; // For 3D visualization
}

interface EnhancedReasoningTimelineProps {
  content: string;
  isVisible: boolean;
  reasoningType: string;
  isLoading?: boolean;
}

const EnhancedReasoningTimeline = ({
  content,
  isVisible,
  reasoningType,
  isLoading = false
}: EnhancedReasoningTimelineProps) => {
  // State for expanded timeline points
  const [expandedPoints, setExpandedPoints] = useState<Record<string, boolean>>({});
  
  // State for visualization settings
  const [visualizationMode, setVisualizationMode] = useState<"timeline" | "3d">("timeline");
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [showStrengthIndicators, setShowStrengthIndicators] = useState<boolean>(true);
  const [showConnections, setShowConnections] = useState<boolean>(true);
  
  // Toggle the expanded state of a timeline point
  const togglePoint = useCallback((id: string) => {
    setExpandedPoints(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);
  
  // Handle zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);
  
  // Handle rotation (for 3D mode)
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 45) % 360);
  }, []);

  // Parse the content to extract timeline points
  const timelinePoints = useMemo(() => {
    if (!content) return [];
    
    const points: TimelinePoint[] = [];
    
    // First attempt: Try to find markdown headings with typical reasoning sections
    const headingRegex = /(?:^|\n)(#+)\s+(.*?)(?:\n|$)/g;
    let match;
    let headingsFound = false;
    
    // Look for markdown headings first
    const headings: {index: number, level: number, text: string, position: number}[] = [];
    while ((match = headingRegex.exec(content)) !== null) {
      headingsFound = true;
      const level = match[1].length;
      const text = match[2].trim();
      headings.push({
        index: headings.length,
        level,
        text,
        position: match.index
      });
    }
    
    if (headingsFound) {
      // Process each heading and extract the content between headings
      headings.forEach((heading, index) => {
        const nextHeading = headings[index + 1];
        const sectionContent = nextHeading 
          ? content.substring(heading.position + heading.text.length + heading.level + 2, nextHeading.position).trim()
          : content.substring(heading.position + heading.text.length + heading.level + 2).trim();
        
        // Determine the type based on heading text
        let type: TimelinePoint["type"] = "reasoning";
        const headingLower = heading.text.toLowerCase();
        
        if (headingLower.includes("premise") || 
            headingLower.includes("initial") || 
            headingLower.includes("hypothesis") ||
            index === 0) {
          type = "premise";
        } else if (headingLower.includes("evidence") || 
                  headingLower.includes("data") || 
                  headingLower.includes("observation")) {
          type = "evidence";
        } else if (headingLower.includes("conclusion") || 
                  headingLower.includes("final") ||
                  index === headings.length - 1) {
          type = "conclusion";
        } else if (headingLower.includes("alternative") || 
                  headingLower.includes("other perspective")) {
          type = "alternative";
        }
        
        // Calculate strength based on content length and confidence keywords
        let strength = 70; // Default strength
        
        // Longer content generally indicates more detailed reasoning
        strength += Math.min(30, Math.floor(sectionContent.length / 100));
        
        // Adjust strength based on confidence-related keywords
        const confidenceKeywords = [
          { word: "certainly", value: 5 },
          { word: "definitely", value: 5 },
          { word: "clearly", value: 3 },
          { word: "evidence", value: 4 },
          { word: "proven", value: 5 },
          { word: "suggests", value: -2 },
          { word: "might", value: -3 },
          { word: "perhaps", value: -3 },
          { word: "possibly", value: -4 },
          { word: "uncertain", value: -5 }
        ];
        
        confidenceKeywords.forEach(keyword => {
          if (sectionContent.toLowerCase().includes(keyword.word)) {
            strength += keyword.value;
          }
        });
        
        // Keep strength within 0-100 range
        strength = Math.max(0, Math.min(100, strength));
        
        points.push({
          id: `point-${index}`,
          label: heading.text,
          description: sectionContent,
          type,
          strength,
          connections: index > 0 ? [`point-${index-1}`] : [],
          position: {
            x: Math.cos(index / headings.length * Math.PI * 2) * 150,
            y: Math.sin(index / headings.length * Math.PI * 2) * 150,
            z: 0
          }
        });
      });
      
      // Add additional connections for more complex relationship visualization
      // Connect conclusion to premises and key evidence
      const conclusionIndex = points.findIndex(p => p.type === "conclusion");
      const premiseIndices = points
        .map((p, i) => p.type === "premise" ? i : -1)
        .filter(i => i !== -1);
      const evidenceIndices = points
        .map((p, i) => p.type === "evidence" ? i : -1)
        .filter(i => i !== -1);
      
      if (conclusionIndex !== -1) {
        premiseIndices.forEach(i => {
          if (!points[conclusionIndex].connections?.includes(`point-${i}`)) {
            points[conclusionIndex].connections?.push(`point-${i}`);
          }
        });
        
        evidenceIndices.forEach(i => {
          if (!points[conclusionIndex].connections?.includes(`point-${i}`)) {
            points[conclusionIndex].connections?.push(`point-${i}`);
          }
        });
      }
      
    } else {
      // Fallback: If no headings found, try to break down by paragraphs
      // Split content by paragraphs
      const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
      
      if (paragraphs.length > 0) {
        // Create timeline points from paragraphs
        paragraphs.forEach((paragraph, index) => {
          let type: TimelinePoint["type"] = "reasoning";
          const paragraphLower = paragraph.toLowerCase();
          
          // First paragraph is premise, last is conclusion
          if (index === 0) {
            type = "premise";
          } else if (index === paragraphs.length - 1) {
            type = "conclusion";
          } else if (paragraphLower.includes("evidence") || 
                    paragraphLower.includes("data shows") || 
                    paragraphLower.includes("according to")) {
            type = "evidence";
          } else if (paragraphLower.includes("alternative") || 
                    paragraphLower.includes("on the other hand") ||
                    paragraphLower.includes("different perspective")) {
            type = "alternative";
          }
          
          // Create a label from first sentence or first few words
          const firstSentenceMatch = paragraph.match(/^[^.!?]+[.!?]/);
          let label = firstSentenceMatch 
            ? firstSentenceMatch[0].trim() 
            : paragraph.slice(0, 40) + "...";
          
          // Clean up label
          label = label
            .replace(/^#{1,6}\s+/g, '') // Remove heading markers
            .replace(/^\s*[-*+]\s+/g, '') // Remove bullet points
            .replace(/^\s*\d+\.\s+/g, '') // Remove numbered lists
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
            .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
            .trim();
          
          // Truncate long labels
          if (label.length > 70) {
            label = label.substring(0, 67) + '...';
          }
          
          // Calculate strength based on content and position
          let strength = 60 + Math.random() * 30; // Base randomized strength between 60-90
          
          // Conclusions and premises tend to be stronger
          if (type === "conclusion") strength = Math.min(100, strength + 15);
          if (type === "premise") strength = Math.min(100, strength + 10);
          if (type === "alternative") strength = Math.max(40, strength - 20);
          
          points.push({
            id: `point-${index}`,
            label,
            description: paragraph,
            type,
            strength: Math.round(strength),
            connections: index > 0 ? [`point-${index-1}`] : [],
            position: {
              x: Math.cos(index / paragraphs.length * Math.PI * 2) * 150,
              y: Math.sin(index / paragraphs.length * Math.PI * 2) * 150,
              z: 0
            }
          });
        });
        
        // Add more complex connections
        if (points.length > 2) {
          // Connect conclusion to premises
          const lastIndex = points.length - 1;
          if (points[lastIndex].type === "conclusion" && points[0].type === "premise") {
            points[lastIndex].connections?.push("point-0");
          }
          
          // Connect related points based on keywords or references
          for (let i = 0; i < points.length; i++) {
            for (let j = 0; j < points.length; j++) {
              if (i !== j && !points[i].connections?.includes(`point-${j}`)) {
                // Look for references to other points
                const pointIKeywords = points[i].label.toLowerCase().split(" ");
                const pointJKeywords = points[j].label.toLowerCase().split(" ");
                
                const hasCommonKeywords = pointIKeywords.some(word => 
                  word.length > 4 && pointJKeywords.includes(word)
                );
                
                if (hasCommonKeywords) {
                  points[i].connections?.push(`point-${j}`);
                }
              }
            }
          }
        }
      } else {
        // If no paragraphs found, use the entire content as a single point
        points.push({
          id: "point-0",
          label: "Response",
          description: content,
          type: "reasoning",
          strength: 75,
          connections: [],
          position: { x: 0, y: 0, z: 0 }
        });
      }
    }
    
    return points;
  }, [content, reasoningType]);

  // Get icon for each reasoning type
  const getIconForType = (type: TimelinePoint["type"]) => {
    switch (type) {
      case "premise":
        return <LightbulbIcon className={`w-5 h-5 ${getColorClassForType(type)}`} />;
      case "reasoning":
        return <Microscope className={`w-5 h-5 ${getColorClassForType(type)}`} />;
      case "evidence":
        return <CircleAlert className={`w-5 h-5 ${getColorClassForType(type)}`} />;
      case "conclusion":
        return <CheckCircle2 className={`w-5 h-5 ${getColorClassForType(type)}`} />;
      case "alternative":
        return <GitBranchIcon className={`w-5 h-5 ${getColorClassForType(type)}`} />;
      default:
        return <Atom className="w-5 h-5 text-gray-400" />;
    }
  };

  // Get color class based on point type
  const getColorClassForType = (type: TimelinePoint["type"]): string => {
    switch (type) {
      case "premise":
        return "text-blue-400"; // Blue for premises
      case "reasoning":
        return "text-indigo-400"; // Indigo for reasoning
      case "evidence":
        return "text-purple-400"; // Purple for evidence
      case "conclusion":
        return "text-green-400"; // Green for conclusions
      case "alternative":
        return "text-amber-400"; // Amber for alternatives
      default:
        return "text-gray-400";
    }
  };
  
  // Get CSS background color based on point type (for 3D visualization)
  const getBgColorForType = (type: TimelinePoint["type"]): string => {
    switch (type) {
      case "premise":
        return "#3B82F6"; // Blue for premises
      case "reasoning":
        return "#6366F1"; // Indigo for reasoning
      case "evidence":
        return "#A855F7"; // Purple for evidence
      case "conclusion":
        return "#22C55E"; // Green for conclusions
      case "alternative":
        return "#F59E0B"; // Amber for alternatives
      default:
        return "#9CA3AF";
    }
  };

  // Render the 3D Visualization (simplified 3D effect using 2D)
  const render3DView = () => {
    return (
      <div className="relative h-96 w-full p-4 mt-4 bg-[#1A1A1A] rounded-md perspective-800">
        <div 
          className="w-full h-full" 
          style={{ 
            transform: `rotateX(25deg) rotateY(${rotation}deg) scale(${zoom})`,
            transformStyle: "preserve-3d",
            transition: "transform 0.5s ease"
          }}
        >
          <svg 
            width="100%" 
            height="100%" 
            viewBox="-200 -200 400 400"
          >
            {/* Draw 3D connections */}
            {showConnections && timelinePoints.map(point => {
              if (!point.connections?.length) return null;
              
              return point.connections.map(targetId => {
                const targetPoint = timelinePoints.find(p => p.id === targetId);
                if (!targetPoint?.position) return null;
                
                // Calculate midpoint with a slight arc for 3D effect
                const midX = (point.position?.x || 0 + targetPoint.position.x) / 2;
                const midY = (point.position?.y || 0 + targetPoint.position.y) / 2 - 10;
                
                return (
                  <path 
                    key={`${point.id}-${targetId}`}
                    d={`M ${point.position?.x || 0} ${point.position?.y || 0} Q ${midX} ${midY} ${targetPoint.position.x} ${targetPoint.position.y}`}
                    stroke={getBgColorForType(point.type)}
                    strokeWidth="2"
                    strokeOpacity="0.6"
                    fill="none"
                    strokeDasharray={point.type === "alternative" ? "5,5" : undefined}
                  />
                );
              });
            })}
            
            {/* Draw 3D points */}
            {timelinePoints.map(point => {
              const baseSize = showStrengthIndicators ? 10 + (point.strength || 50) / 7 : 15;
              
              // Add 3D effect with gradient and shadow
              return (
                <g key={point.id}>
                  {/* Shadow */}
                  <ellipse
                    cx={point.position?.x || 0}
                    cy={(point.position?.y || 0) + baseSize/2}
                    rx={baseSize}
                    ry={baseSize/3}
                    fill="rgba(0,0,0,0.3)"
                  />
                  
                  {/* Main circle with 3D effect */}
                  <circle
                    cx={point.position?.x || 0}
                    cy={point.position?.y || 0}
                    r={baseSize}
                    fill={`url(#gradient-${point.id})`}
                    stroke="#444"
                    strokeWidth="1"
                  >
                    <title>{point.label}</title>
                  </circle>
                  
                  {/* Label */}
                  <text
                    x={point.position?.x || 0}
                    y={(point.position?.y || 0) + baseSize + 15}
                    textAnchor="middle"
                    fill="#DDD"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {point.label.length > 20 ? point.label.substring(0, 17) + '...' : point.label}
                  </text>
                  
                  {/* Define gradient for 3D effect */}
                  <defs>
                    <radialGradient id={`gradient-${point.id}`}>
                      <stop offset="0%" stopColor="#FFF" stopOpacity="0.3" />
                      <stop offset="70%" stopColor={getBgColorForType(point.type)} />
                      <stop offset="100%" stopColor={getBgColorForType(point.type)} stopOpacity="0.8" />
                    </radialGradient>
                  </defs>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };
  
  // Render the timeline view (original visualization, but updated with color coding and strength indicators)
  const renderTimelineView = () => {
    return (
      <div className="relative border-l-2 border-[#333] pl-6 ml-3 space-y-4">
        {timelinePoints.map((point, index) => {
          // Calculate strength indicator style
          const strengthIndicatorStyle = showStrengthIndicators ? {
            width: `${(point.strength || 50) / 2}%`,
            backgroundColor: getBgColorForType(point.type),
            height: '4px',
            borderRadius: '2px',
            marginTop: '3px',
            opacity: 0.7
          } : {};
          
          return (
            <motion.div
              key={point.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div
                className={`absolute -left-10 top-0 w-7 h-7 rounded-full bg-[#2A2A2A] flex items-center justify-center border ${point.type === "premise" ? "border-blue-400" : point.type === "reasoning" ? "border-indigo-400" : point.type === "evidence" ? "border-purple-400" : point.type === "conclusion" ? "border-green-400" : point.type === "alternative" ? "border-amber-400" : "border-gray-400"}`}
              >
                {getIconForType(point.type)}
              </div>
              
              <div
                onClick={() => togglePoint(point.id)} 
                className={`flex flex-col cursor-pointer mb-1 hover:bg-[#2A2A2A] rounded-md p-2 transition-colors border-l-4 ${point.type === "premise" ? "border-blue-400" : point.type === "reasoning" ? "border-indigo-400" : point.type === "evidence" ? "border-purple-400" : point.type === "conclusion" ? "border-green-400" : point.type === "alternative" ? "border-amber-400" : "border-gray-400"}`}
              >
                <div className="flex items-center">
                  {expandedPoints[point.id] ? 
                    <ChevronDown className={`h-4 w-4 ${getColorClassForType(point.type)} mr-2`} /> : 
                    <ChevronRight className={`h-4 w-4 ${getColorClassForType(point.type)} mr-2`} />
                  }
                  <h4 className="font-semibold">{point.label}</h4>
                </div>
                
                {/* Strength indicator bar */}
                {showStrengthIndicators && (
                  <div className="w-full h-1 mt-1 bg-[#333] rounded">
                    <div style={strengthIndicatorStyle}></div>
                  </div>
                )}
              </div>
              
              <AnimatePresence>
                {expandedPoints[point.id] && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-gray-300 ml-6 bg-[#222] p-3 rounded-md border border-[#333]"
                  >
                    {point.description.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-2">{paragraph}</p>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl mx-auto my-4"
    >
      <Card className="bg-[#1A1A1A] border-[#333] shadow-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-nvidia-green font-bold flex items-center">
            <Atom className="mr-2 h-5 w-5" />
            {reasoningType === "standard" && "Step-by-Step Reasoning"}
            {reasoningType === "scientific" && "Scientific Analysis"}
            {reasoningType === "pros-cons" && "Pros & Cons Analysis"}
          </h3>
          
          {/* Visualization controls */}
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              title="Zoom in"
              onClick={handleZoomIn}
              className="h-8 w-8"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Zoom out"
              onClick={handleZoomOut}
              className="h-8 w-8"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Rotate view"
              onClick={handleRotate}
              className="h-8 w-8"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Visualization mode selector */}
        <Tabs 
          defaultValue="timeline" 
          value={visualizationMode} 
          onValueChange={(value) => setVisualizationMode(value as "timeline" | "3d")}
          className="mt-2"
        >
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="timeline">Timeline View</TabsTrigger>
            <TabsTrigger value="3d">3D View</TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nvidia-green"></div>
            </div>
          ) : timelinePoints.length > 0 ? (
            <TabsContent value="timeline" className="mt-0">
              <ScrollArea className="h-[600px] pr-4">
                {renderTimelineView()}
              </ScrollArea>
            </TabsContent>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No reasoning steps found in the response
            </div>
          )}
          
          {timelinePoints.length > 0 && (
            <TabsContent value="3d" className="mt-0">
              {render3DView()}
            </TabsContent>
          )}
        </Tabs>
        
        {/* Visualization options */}
        {timelinePoints.length > 0 && visualizationMode === "3d" && (
          <div className="flex items-center space-x-4 mt-4 text-sm">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showStrengthIndicators}
                onChange={() => setShowStrengthIndicators(prev => !prev)}
                className="rounded border-gray-600 text-nvidia-green"
              />
              <span>Show Strength</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showConnections}
                onChange={() => setShowConnections(prev => !prev)}
                className="rounded border-gray-600 text-nvidia-green"
              />
              <span>Show Connections</span>
            </label>
          </div>
        )}
        
        {/* Visualization legend */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-4 pt-3 border-t border-[#333] text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
            <span>Premise</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-indigo-400 mr-2"></div>
            <span>Reasoning</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-purple-400 mr-2"></div>
            <span>Evidence</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-400 mr-2"></div>
            <span>Conclusion</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-amber-400 mr-2"></div>
            <span>Alternative</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default EnhancedReasoningTimeline;