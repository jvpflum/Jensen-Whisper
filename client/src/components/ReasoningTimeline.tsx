import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ChevronDown, ChevronUp, Brain, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TimelinePoint {
  id: string;
  label: string;
  description: string;
  type: "premise" | "reasoning" | "evidence" | "conclusion" | "alternative";
  // New fields for enhanced visualization
  strength?: number; // 0-100 scale representing confidence or strength of the point
  connections?: string[]; // IDs of connected points
  position?: { x: number; y: number; z: number }; // For 3D visualization
}

interface ReasoningTimelineProps {
  content: string;
  isVisible: boolean;
  reasoningType: string;
  isLoading?: boolean;
}

const ReasoningTimeline: React.FC<ReasoningTimelineProps> = ({
  content,
  isVisible,
  reasoningType,
  isLoading: externalIsLoading
}) => {
  const [timelinePoints, setTimelinePoints] = useState<TimelinePoint[]>([]);
  const [internalIsLoading, setInternalIsLoading] = useState<boolean>(false);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  
  // Combine external and internal loading states
  const isLoading = externalIsLoading || internalIsLoading;
  
  // Default to expanded points
  const [expandedPoint, setExpandedPoint] = useState<string | null>('all');
  
  // Animation for loading effects
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Visualization mode state
  const [visualizationMode, setVisualizationMode] = useState<'timeline' | 'network' | '3d'>('timeline');
  
  // 3D visualization controls
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  
  // For connection strength visualization
  const [showConnectionStrength, setShowConnectionStrength] = useState(true);
  
  // Parse content into timeline points
  useEffect(() => {
    if (!content || !isVisible) return;
    
    setInternalIsLoading(true);
    setExpandedPoint('all'); // Always keep expanded
    setSelectedPointId(null);
    setAnimationComplete(false);
    
    const parseContent = () => {
      // Initialize timeline points array
      const points: TimelinePoint[] = [];
      
      // Split content by paragraphs
      const paragraphs = content.split(/\n\n+/);
      
      // Process each paragraph to extract key points
      paragraphs.forEach((paragraph, index) => {
        // Skip empty paragraphs
        if (!paragraph.trim()) return;
        
        // Determine point type based on content
        let type: TimelinePoint["type"] = "reasoning";
        
        if (index === 0) {
          type = "premise";
        } else if (index === paragraphs.length - 1 || paragraph.toLowerCase().includes("conclusion")) {
          type = "conclusion";
        } else if (paragraph.toLowerCase().includes("evidence") || 
                  paragraph.toLowerCase().includes("data shows") || 
                  paragraph.toLowerCase().includes("according to")) {
          type = "evidence";
        } else if (paragraph.toLowerCase().includes("alternative") || 
                  paragraph.toLowerCase().includes("on the other hand")) {
          type = "alternative";
        }
        
        // Create a cleaner label based on the first sentence or first 40 characters
        const firstSentenceMatch = paragraph.match(/^[^.!?]+[.!?]/);
        let label = firstSentenceMatch 
          ? firstSentenceMatch[0].trim() 
          : paragraph.slice(0, 40) + "...";
        
        // Clean up markdown formatting in the label for better display
        label = label
          .replace(/^#{1,6}\s+/g, '') // Remove heading markers
          .replace(/^\s*[-*+]\s+/g, '') // Remove bullet points
          .replace(/^\s*\d+\.\s+/g, '') // Remove numbered lists
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
          .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
          .replace(/`([^`]+)`/g, '$1') // Remove code markers
          .trim();
        
        // Truncate long labels
        if (label.length > 70) {
          label = label.substring(0, 67) + '...';
        }
        
        // Calculate strength based on various factors (confidence indicators)
        let strength = 70; // Base strength
        
        // Adjust strength based on language patterns that indicate confidence
        const confidenceTerms = [
          'certainly', 'definitely', 'clearly', 'undoubtedly', 'absolutely', 
          'strongly', 'robust', 'solid', 'proven', 'established'
        ];
        
        const uncertaintyTerms = [
          'perhaps', 'maybe', 'might', 'could', 'possibly', 'seemingly',
          'appears to', 'suggests', 'indicates', 'uncertain', 'unclear'
        ];
        
        // Check for confidence terms (increase strength)
        for (const term of confidenceTerms) {
          if (paragraph.toLowerCase().includes(term)) {
            strength += 5;
            break;
          }
        }
        
        // Check for uncertainty terms (decrease strength)
        for (const term of uncertaintyTerms) {
          if (paragraph.toLowerCase().includes(term)) {
            strength -= 5;
            break;
          }
        }
        
        // Adjust based on point type
        if (type === "evidence") strength += 10;
        if (type === "alternative") strength -= 5;
        
        // Ensure strength stays within 0-100 range
        strength = Math.max(0, Math.min(100, strength));
        
        // Determine connections to other points
        const connections: string[] = [];
        
        // Connect to previous point (except for first point)
        if (index > 0) {
          connections.push(`point-${index - 1}`);
        }
        
        // Connect to next point (except for last point)
        if (index < paragraphs.length - 1) {
          connections.push(`point-${index + 1}`);
        }
        
        // Generate a pseudo-3D position for visualization
        const position = {
          x: index * 100, // Space points horizontally
          y: (index % 2) * 50, // Alternate slightly up and down
          z: 0 // Base z-position
        };
        
        // Add point to timeline
        points.push({
          id: `point-${index}`,
          label,
          description: paragraph,
          type,
          strength,
          connections,
          position
        });
      });
      
      return points;
    };

    // Use setTimeout to avoid blocking the UI
    const timer = setTimeout(() => {
      try {
        const points = parseContent();
        setTimelinePoints(points);
        if (points.length > 0) {
          setSelectedPointId(points[0].id);
        }
        
        // Set animation complete after a short delay
        setTimeout(() => {
          setAnimationComplete(true);
        }, 500);
        
      } catch (error) {
        console.error("Error parsing timeline:", error);
      } finally {
        setInternalIsLoading(false);
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [content, isVisible]);

  const togglePointExpansion = (id: string) => {
    // If we're in 'all' mode and toggle a point, we switch to individual mode
    // If we're in individual mode, toggle that specific point on/off
    if (expandedPoint === 'all') {
      setExpandedPoint(id);
    } else {
      setExpandedPoint(prev => {
        if (prev === id) {
          return 'all'; // Return to 'all' mode if toggling the current expanded point
        } else {
          return id; // Otherwise, switch to the new point
        }
      });
    }
  };

  // Get timeline point type color
  const getPointColor = (type: TimelinePoint["type"]) => {
    switch (type) {
      case "premise": return "bg-blue-500";
      case "reasoning": return "bg-indigo-500";
      case "evidence": return "bg-purple-500";
      case "conclusion": return "bg-green-500";
      case "alternative": return "bg-amber-500";
      default: return "bg-gray-500";
    }
  };
  
  // Get border color that matches the point color
  const getBorderColor = (type: TimelinePoint["type"]) => {
    switch (type) {
      case "premise": return "border-blue-500";
      case "reasoning": return "border-indigo-500";
      case "evidence": return "border-purple-500";
      case "conclusion": return "border-green-500";
      case "alternative": return "border-amber-500";
      default: return "border-gray-500";
    }
  };
  
  // Get raw color values for SVG elements
  const getPointTypeColorValue = (type: TimelinePoint["type"]) => {
    switch (type) {
      case "premise": return "#3b82f6"; // blue-500
      case "reasoning": return "#6366f1"; // indigo-500
      case "evidence": return "#a855f7"; // purple-500
      case "conclusion": return "#22c55e"; // green-500
      case "alternative": return "#f59e0b"; // amber-500
      default: return "#6b7280"; // gray-500
    }
  };
  
  // Get the currently selected point
  const selectedPoint = selectedPointId 
    ? timelinePoints.find(p => p.id === selectedPointId) 
    : timelinePoints[0];

  if (!isVisible) return null;

  return (
    <div className="bg-[#121212] border border-[#333] rounded-md p-4 mt-4 relative">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-nvidia-green flex items-center">
          <Brain className="mr-2 h-5 w-5" />
          Reasoning Timeline: {reasoningType}
        </h3>
        
        {/* Step counter */}
        <span className="text-xs text-gray-400 font-mono bg-[#1A1A1A] py-1 px-2 rounded border border-[#333]">
          {timelinePoints.length} Steps
        </span>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col justify-center items-center p-8">
          {/* NVIDIA-themed loading animation */}
          <div className="relative h-32 w-32">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="80" height="80" viewBox="0 0 100 100">
                <circle 
                  cx="50" cy="50" r="40" 
                  stroke="#76B900" 
                  strokeWidth="4" 
                  fill="none" 
                  className="opacity-20"
                />
                <circle 
                  cx="50" cy="50" r="40" 
                  stroke="#76B900" 
                  strokeWidth="4" 
                  fill="none" 
                  strokeDasharray="251.2" 
                  strokeDashoffset="125.6" 
                  className="animate-spin-slow"
                  style={{ transformOrigin: 'center', animationDuration: '1.5s' }}
                />
              </svg>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-nvidia-green text-xs font-mono animate-pulse">
                PROCESSING
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <p className="mt-4 text-sm text-gray-400">Analyzing reasoning patterns...</p>
            <span className="text-xs text-gray-400 font-mono bg-[#1A1A1A] py-1 px-2 rounded border border-[#333] mt-2 animate-pulse">
              Creating Timeline
            </span>
          </div>
        </div>
      ) : (
        <div>
          {/* Visualization tabs */}
          <Tabs 
            defaultValue="timeline" 
            value={visualizationMode}
            onValueChange={(value) => setVisualizationMode(value as 'timeline' | 'network' | '3d')}
            className="mb-4"
          >
            <div className="flex justify-between items-center mb-2">
              <TabsList className="bg-[#1A1A1A] p-1">
                <TabsTrigger 
                  value="timeline"
                  className="data-[state=active]:bg-[#333] data-[state=active]:text-nvidia-green"
                >
                  Timeline
                </TabsTrigger>
                <TabsTrigger 
                  value="network"
                  className="data-[state=active]:bg-[#333] data-[state=active]:text-nvidia-green"
                >
                  Network
                </TabsTrigger>
                <TabsTrigger 
                  value="3d"
                  className="data-[state=active]:bg-[#333] data-[state=active]:text-nvidia-green"
                >
                  3D View
                </TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2">
                {visualizationMode === '3d' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 bg-[#1A1A1A]"
                      onClick={() => setRotation(prev => (prev + 15) % 360)}
                      title="Rotate view"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 bg-[#1A1A1A]"
                      onClick={() => setZoom(prev => Math.min(prev + 0.1, 2))}
                      title="Zoom in"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 bg-[#1A1A1A]"
                      onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
                      title="Zoom out"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {(visualizationMode === 'network' || visualizationMode === '3d') && (
                  <Button
                    variant={showConnectionStrength ? "default" : "outline"}
                    size="sm"
                    className={`text-xs ${showConnectionStrength ? 'bg-nvidia-green hover:bg-nvidia-green/90' : 'bg-[#1A1A1A]'}`}
                    onClick={() => setShowConnectionStrength(prev => !prev)}
                  >
                    Show Strengths
                  </Button>
                )}
              </div>
            </div>
            
            <TabsContent value="timeline" className="mt-0">
              {/* Timeline Visualization */}
              <div className="relative mb-6">
                {/* Background line */}
                <div className="absolute top-5 left-4 right-4 h-1 bg-[#333] z-0"></div>
                
                {/* Timeline points */}
                <div className="flex justify-between relative z-10 mb-2">
                  {timelinePoints.map((point, index) => (
                    <div 
                      key={point.id} 
                      className="flex items-center"
                    >
                      <motion.div 
                        className={`w-6 h-6 rounded-full border-2 border-[#444] ${
                          animationComplete ? getPointColor(point.type) : "bg-[#222]"
                        } cursor-pointer hover:scale-125 transition-all shadow-md shadow-black/40`}
                        initial={{ scale: 0.8, opacity: 0.5 }}
                        animate={{ 
                          scale: selectedPointId === point.id ? 1.3 : 1,
                          opacity: animationComplete ? 1 : 0.5
                        }}
                        transition={{ 
                          duration: 0.3,
                          delay: animationComplete ? 0 : index * 0.05 // Staggered appearance
                        }}
                        onClick={() => setSelectedPointId(point.id)}
                      >
                        {/* Strength indicator dot */}
                        {point.strength && point.strength > 70 && (
                          <motion.div 
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 }}
                          />
                        )}
                        {point.strength && point.strength < 50 && (
                          <motion.div 
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 }}
                          />
                        )}
                      </motion.div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="network" className="mt-0">
              {/* Network Visualization */}
              <motion.div 
                className="relative h-[300px] bg-[#0A0A0A] rounded-lg p-2 overflow-hidden mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Force-directed network graph */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg width="100%" height="100%" viewBox="0 0 800 300">
                    {/* Connection lines between nodes */}
                    {timelinePoints.map((point) => 
                      point.connections?.map((connectionId, i) => {
                        const connectedPoint = timelinePoints.find(p => p.id === connectionId);
                        if (!connectedPoint) return null;
                        
                        // Calculate source and target node positions
                        const sourceIdx = timelinePoints.findIndex(p => p.id === point.id);
                        const targetIdx = timelinePoints.findIndex(p => p.id === connectionId);
                        
                        // Generate coordinates for a force-directed layout approximation
                        const sourceX = 100 + (sourceIdx * 600 / Math.max(1, timelinePoints.length - 1));
                        const sourceY = 150 + (sourceIdx % 2 === 0 ? -30 : 30);
                        const targetX = 100 + (targetIdx * 600 / Math.max(1, timelinePoints.length - 1));
                        const targetY = 150 + (targetIdx % 2 === 0 ? -30 : 30);
                        
                        // Calculate connection strength for visualization
                        const connectionStrength = ((point.strength || 70) + (connectedPoint.strength || 70)) / 2;
                        const lineOpacity = showConnectionStrength ? (connectionStrength / 100) * 0.8 + 0.2 : 0.5;
                        const lineWidth = showConnectionStrength ? (connectionStrength / 100) * 3 + 1 : 1.5;
                        
                        return (
                          <motion.line
                            key={`${point.id}-${connectionId}-${i}`}
                            x1={sourceX}
                            y1={sourceY}
                            x2={targetX}
                            y2={targetY}
                            stroke={point.type === connectedPoint.type ? 
                              `rgba(118, 185, 0, ${lineOpacity})` : 
                              `rgba(180, 180, 180, ${lineOpacity})`
                            }
                            strokeWidth={lineWidth}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, delay: 0.1 }}
                          />
                        );
                      })
                    )}
                    
                    {/* Nodes for each point */}
                    {timelinePoints.map((point, index) => {
                      // Generate coordinates for a force-directed layout approximation
                      const x = 100 + (index * 600 / Math.max(1, timelinePoints.length - 1));
                      const y = 150 + (index % 2 === 0 ? -30 : 30);
                      
                      // Determine node size based on strength
                      const nodeSize = (point.strength || 70) / 12 + 10;
                      
                      return (
                        <motion.g 
                          key={point.id}
                          transform={`translate(${x}, ${y})`}
                          whileHover={{ scale: 1.2 }}
                          onClick={() => setSelectedPointId(point.id)}
                          style={{ cursor: 'pointer' }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          {/* Node circle */}
                          <circle
                            r={nodeSize}
                            fill={getPointTypeColorValue(point.type)}
                            strokeWidth={selectedPointId === point.id ? 2 : 0}
                            stroke="white"
                            className="shadow-lg"
                            style={{ filter: `brightness(${(point.strength || 70) / 70})` }}
                          />
                          
                          {/* Type indicator */}
                          <text
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="8"
                            style={{ pointerEvents: 'none' }}
                          >
                            {point.type.charAt(0).toUpperCase()}
                          </text>
                          
                          {/* Label below */}
                          <text
                            textAnchor="middle"
                            y={nodeSize + 15}
                            fill="white"
                            fontSize="10"
                            className="font-medium"
                            style={{ pointerEvents: 'none' }}
                          >
                            {point.label.length > 20 ? 
                              point.label.substring(0, 20) + '...' : 
                              point.label
                            }
                          </text>
                        </motion.g>
                      );
                    })}
                  </svg>
                </div>
              </motion.div>
            </TabsContent>
            
            <TabsContent value="3d" className="mt-0">
              {/* Pseudo-3D Visualization */}
              <motion.div 
                className="relative h-[300px] bg-[#0A0A0A] rounded-lg p-4 overflow-hidden mb-4 perspective-800"
                style={{ perspective: '800px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  className="absolute inset-0 w-full h-full"
                  animate={{ 
                    rotateY: rotation,
                    scale: zoom 
                  }}
                  style={{ 
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'center center'
                  }}
                  transition={{ type: 'spring', stiffness: 100 }}
                >
                  {/* 3D connections */}
                  <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                    {timelinePoints.map((point) => 
                      point.connections?.map((connectionId, idx) => {
                        const connectedPoint = timelinePoints.find(p => p.id === connectionId);
                        if (!connectedPoint || !point.position || !connectedPoint.position) return null;
                        
                        // Calculate source and target positions in 3D space
                        const sourcePos = point.position;
                        const targetPos = connectedPoint.position;
                        
                        // Calculate z-depth factor for perspective effect
                        const zDepthSource = (sourcePos.z + 200) / 400;
                        const zDepthTarget = (targetPos.z + 200) / 400;
                        
                        // Project 3D coords to 2D screen space (simple perspective projection)
                        const sourceX = 400 + (sourcePos.x - 400) * zDepthSource;
                        const sourceY = 150 + (sourcePos.y - 75) * zDepthSource;
                        const targetX = 400 + (targetPos.x - 400) * zDepthTarget;
                        const targetY = 150 + (targetPos.y - 75) * zDepthTarget;
                        
                        // Calculate connection strength for visualization
                        const connectionStrength = ((point.strength || 70) + (connectedPoint.strength || 70)) / 2;
                        const lineOpacity = showConnectionStrength ? 
                          (connectionStrength / 100) * 0.8 + 0.2 : 0.5;
                        const lineWidth = showConnectionStrength ? 
                          (connectionStrength / 100) * 3 + 1 : 1.5;
                        
                        // Depth-based styling (closer appears brighter)
                        const depthFactor = Math.min(zDepthSource, zDepthTarget);
                        
                        return (
                          <motion.line
                            key={`${point.id}-${connectionId}-${idx}`}
                            x1={sourceX}
                            y1={sourceY}
                            x2={targetX}
                            y2={targetY}
                            stroke={point.type === connectedPoint.type ? 
                              `rgba(118, 185, 0, ${lineOpacity * depthFactor})` : 
                              `rgba(180, 180, 180, ${lineOpacity * depthFactor})`
                            }
                            strokeWidth={lineWidth * depthFactor}
                            strokeDasharray={point.type !== connectedPoint.type ? "4 2" : ""}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: depthFactor }}
                            transition={{ duration: 1, delay: 0.1 }}
                          />
                        );
                      })
                    )}
                  </svg>
                  
                  {/* 3D nodes */}
                  {timelinePoints.map((point, index) => {
                    if (!point.position) return null;
                    
                    // Calculate z-depth factor for perspective effect
                    const zDepth = (point.position.z + 200) / 400;
                    
                    // Project 3D coords to 2D screen space
                    const x = 400 + (point.position.x - 400) * zDepth;
                    const y = 150 + (point.position.y - 75) * zDepth;
                    
                    // Scale node based on depth and strength
                    const nodeBaseSize = 20;
                    const nodeSize = nodeBaseSize * zDepth * ((point.strength || 70) / 70);
                    
                    return (
                      <motion.div
                        key={point.id}
                        className="absolute rounded-full flex items-center justify-center cursor-pointer"
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          width: `${nodeSize}px`,
                          height: `${nodeSize}px`,
                          transform: `translate(-50%, -50%) translateZ(${point.position.z}px)`,
                          background: getPointTypeColorValue(point.type),
                          opacity: zDepth,
                          boxShadow: `0 0 ${nodeSize/2}px rgba(255,255,255,0.2)`
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        onClick={() => setSelectedPointId(point.id)}
                        whileHover={{ scale: 1.2 }}
                      >
                        <span 
                          className="text-white font-bold select-none" 
                          style={{ 
                            fontSize: `${Math.max(8, nodeSize/2.5)}px`,
                            textShadow: '0 0 3px rgba(0,0,0,0.8)'
                          }}
                        >
                          {point.type.charAt(0).toUpperCase()}
                        </span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </motion.div>
            </TabsContent>
          </Tabs>
          
          {/* Selected Point Content */}
          <ScrollArea className="h-[300px] pr-4">
            <AnimatePresence mode="wait">
              {selectedPoint && (
                <motion.div
                  key={selectedPoint.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-md bg-[#1A1A1A] border-l-4 ${getBorderColor(selectedPoint.type)}`}
                >
                  <div 
                    className="font-medium text-base mb-2 flex justify-between items-center cursor-pointer group"
                    onClick={() => togglePointExpansion(selectedPoint.id)}
                  >
                    <span className="text-white group-hover:text-nvidia-green transition-colors">
                      {selectedPoint.label}
                    </span>
                    
                    <div className="flex gap-2 items-center">
                      {/* Strength indicator */}
                      {selectedPoint.strength !== undefined && (
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-16 bg-[#333] rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full rounded-full ${
                                selectedPoint.strength > 70 ? 'bg-green-500' :
                                selectedPoint.strength > 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${selectedPoint.strength}%` }}
                              transition={{ duration: 0.7, ease: "easeOut" }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 font-mono">{selectedPoint.strength}%</span>
                        </div>
                      )}
                      
                      <Button variant="ghost" size="sm" className="p-0 h-6 w-6 text-gray-400 group-hover:text-nvidia-green">
                        {expandedPoint === selectedPoint.id || expandedPoint === 'all' ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                        }
                      </Button>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {(expandedPoint === selectedPoint.id || expandedPoint === 'all') && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="text-sm leading-relaxed mt-3 space-y-3 bg-[#161616] p-3 rounded-md border border-[#252525]">
                          {selectedPoint.description.split('\n\n').map((paragraph, i) => {
                            // Check if paragraph is a list item
                            const isList = /^\s*[-*+]\s+/.test(paragraph) || /^\s*\d+\.\s+/.test(paragraph);
                            
                            return (
                              <p key={i} className={`text-[15px] text-gray-100 ${isList ? 'pl-4' : ''}`}>
                                {paragraph
                                  .replace(/^#{1,6}\s+/gm, '')      // Remove heading markers
                                  .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove bold markers but keep text
                                  .replace(/\*(.*?)\*/g, '$1')      // Remove italic markers but keep text
                                  .replace(/`([^`]+)`/g, '$1')      // Remove code markers but keep text
                                  .split('\n').map((line, j) => (
                                    <span key={j} className="inline">
                                      {line.trim() === '' ? '\u00A0' : line}
                                      {j < paragraph.split('\n').length - 1 && <br />}
                                    </span>
                                  ))}
                              </p>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-4 text-xs text-gray-400">
        <p>Legend:</p>
        <div className="flex flex-wrap gap-2 mt-1">
          <span className="inline-flex items-center">
            <span className="w-3 h-3 inline-block bg-blue-500 mr-1 rounded-full shadow-sm"></span>
            Premise
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 inline-block bg-indigo-500 mr-1 rounded-full shadow-sm"></span>
            Reasoning
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 inline-block bg-purple-500 mr-1 rounded-full shadow-sm"></span>
            Evidence
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 inline-block bg-green-500 mr-1 rounded-full shadow-sm"></span>
            Conclusion
          </span>
          <span className="inline-flex items-center">
            <span className="w-3 h-3 inline-block bg-amber-500 mr-1 rounded-full shadow-sm"></span>
            Alternative
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReasoningTimeline;