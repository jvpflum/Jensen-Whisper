import React, { useEffect, useRef } from 'react';

const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    // Initial resize
    resizeCanvas();
    
    // Listen for window resize events
    window.addEventListener('resize', resizeCanvas);

    // Generate initial triangle grid
    const triangleGrid = generateTriangleGrid();
    
    // Animation loop
    const animate = (timestamp: number) => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Fill background
      ctx.fillStyle = '#0A0A0A'; // Dark background similar to bg-nvidia-darker
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw triangles and lines
      const timeValue = timestamp * 0.0002; // Faster time factor for more noticeable animation
      drawTriangles(ctx, triangleGrid, canvas.width, canvas.height, timeValue);
      
      // Continue animation loop
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // Generate a grid of triangles in a geodesic pattern
  const generateTriangleGrid = () => {
    const rows = 14;  // More rows for fuller coverage
    const cols = 24;  // More columns for fuller coverage
    const triangles = [];
    
    // Create dense grid pattern
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Calculate base position with offset for alternating rows
        const offsetX = (row % 2) * 0.5;
        const x = (col + offsetX) / cols;
        const y = row / rows;
        
        // Set triangle properties
        const size = 1 / cols * 1.0; // Slightly larger triangles with more overlap
        const isPointingUp = (row % 2 === 0 && col % 2 === 0) || (row % 2 === 1 && col % 2 === 1);
        
        // Add different speed ranges for more variety in animation
        let speed;
        if (row % 3 === 0) {
          // Faster triangles in every third row
          speed = Math.random() * 0.5 + 0.2;
        } else if (col % 4 === 0) {
          // Some columns have medium speed triangles
          speed = Math.random() * 0.4 + 0.15;
        } else {
          // Default slower speed
          speed = Math.random() * 0.3 + 0.1;
        }
        
        // Create triangle with enhanced animation parameters
        triangles.push({
          x, 
          y,
          size,
          isPointingUp,
          id: row * cols + col,
          opacity: 0.05 + Math.random() * 0.15,
          speed: speed,
          // Add some variation to animation patterns
          phaseOffset: Math.random() * Math.PI * 2, // Random starting phase
          rotationDirection: Math.random() > 0.5 ? 1 : -1, // Random rotation direction
          pulseSpeed: Math.random() * 0.4 + 0.8 // Random pulse speed
        });
      }
    }
    
    return triangles;
  };
  
  // Draw all triangles and connecting lines
  const drawTriangles = (
    ctx: CanvasRenderingContext2D, 
    triangles: any[], 
    width: number, 
    height: number,
    time: number
  ) => {
    // NVIDIA green color
    const nvidiaGreen = '#76B900';
    
    // Draw each triangle and its edges
    triangles.forEach(triangle => {
      const { 
        x, y, size, isPointingUp, id, opacity, speed, 
        phaseOffset = 0, rotationDirection = 1, pulseSpeed = 1 
      } = triangle;
      
      // Calculate triangle points with enhanced animation
      const points = calculateTrianglePoints(
        x * width, 
        y * height, 
        size * width,
        isPointingUp,
        time,
        id,
        speed,
        phaseOffset,
        rotationDirection,
        pulseSpeed
      );
      
      // Animation: More dramatic pulsing opacity
      const pulsingOpacity = opacity + Math.sin(time * 3 + id * 0.2) * 0.15;
      
      // Apply glow effect to some triangles for extra animation
      const glowIntensity = Math.max(0, Math.sin(time * 2 + id * 0.3)) * 0.2;
      if (glowIntensity > 0.05) {
        // Draw glow effect
        ctx.shadowColor = nvidiaGreen;
        ctx.shadowBlur = glowIntensity * 15;
      } else {
        ctx.shadowBlur = 0;
      }
      
      // Draw triangle fill (semi-transparent)
      ctx.fillStyle = `${nvidiaGreen}${Math.floor(pulsingOpacity * 255).toString(16).padStart(2, '0')}`;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.closePath();
      ctx.fill();
      
      // Reset shadow for clean line drawing
      ctx.shadowBlur = 0;
      
      // Draw triangle edges (more visible than fill)
      const lineOpacity = 0.5 + Math.sin(time * 2 + id * 0.4) * 0.2; // Animated line opacity
      ctx.strokeStyle = `${nvidiaGreen}${Math.floor(lineOpacity * 255).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 0.8; // Slightly thicker lines for visibility
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.closePath();
      ctx.stroke();
      
      // Draw connecting lines between some triangles for network effect
      if (id % 5 === 0) { // Only draw some connections to avoid clutter
        const nextId = (id + 7) % triangles.length; // Connect to an offset triangle
        const nextTriangle = triangles[nextId];
        if (nextTriangle) {
          const centerX = (points[0].x + points[1].x + points[2].x) / 3;
          const centerY = (points[0].y + points[1].y + points[2].y) / 3;
          
          // Get the next triangle's animation properties or use defaults
          const { 
            phaseOffset: nextPhaseOffset = 0, 
            rotationDirection: nextRotationDirection = 1, 
            pulseSpeed: nextPulseSpeed = 1 
          } = nextTriangle;
          
          const nextPoints = calculateTrianglePoints(
            nextTriangle.x * width,
            nextTriangle.y * height,
            nextTriangle.size * width,
            nextTriangle.isPointingUp,
            time,
            nextId,
            nextTriangle.speed,
            nextPhaseOffset,
            nextRotationDirection,
            nextPulseSpeed
          );
          
          const nextCenterX = (nextPoints[0].x + nextPoints[1].x + nextPoints[2].x) / 3;
          const nextCenterY = (nextPoints[0].y + nextPoints[1].y + nextPoints[2].y) / 3;
          
          // Draw animated connection line
          const connectionOpacity = 0.1 + Math.sin(time * 3 + id * 0.2) * 0.05;
          ctx.strokeStyle = `${nvidiaGreen}${Math.floor(connectionOpacity * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 0.3;
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(nextCenterX, nextCenterY);
          ctx.stroke();
        }
      }
    });
  };
  
  // Calculate triangle points with animation
  const calculateTrianglePoints = (
    x: number, 
    y: number, 
    size: number, 
    isPointingUp: boolean,
    time: number,
    id: number,
    speed: number,
    phaseOffset: number = 0,
    rotationDirection: number = 1,
    pulseSpeed: number = 1
  ) => {
    // Center point for rotation animations
    const centerX = x + size/2;
    const centerY = isPointingUp 
      ? y - (size * 0.866)/3 
      : y - (size * 0.866) * 2/3;
    
    // Apply phase offset to create more variety in animation timing
    const adjustedTime = time + phaseOffset;
    
    // More pronounced wave motion with individual patterns
    // Different shapes can move in different patterns by varying the frequency
    const wavePattern = (id % 3 === 0) ? Math.sin : (id % 3 === 1) ? Math.cos : 
      (t: number) => Math.sin(t) * Math.cos(t * 0.5);
    
    // Create more complex motion paths
    const waveOffsetX = wavePattern(adjustedTime + id * 0.2) * speed * 8; // Even more amplitude
    const waveOffsetY = wavePattern(adjustedTime * 1.3 + id * 0.3) * speed * 5; // Different frequency
    
    // Add rotation animation with direction and varying speed
    const rotationSpeed = (id % 4 === 0) ? 0.8 : (id % 4 === 1) ? 0.5 : (id % 4 === 2) ? 0.3 : 0.2;
    const rotation = Math.sin(adjustedTime * rotationSpeed) * 0.08 * rotationDirection; // Increased rotation
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    // Size pulsing - more dramatic grow and shrink
    const sizePulse = 1 + Math.sin(adjustedTime * pulseSpeed + id * 0.4) * 0.12;
    const adjustedSize = size * sizePulse;
    
    // Calculate the height of an equilateral triangle
    const triangleHeight = adjustedSize * 0.866; // height = side * sqrt(3)/2
    
    // Create base triangle points
    let points;
    if (isPointingUp) {
      // Triangle pointing up
      points = [
        { x: x, y: y },
        { x: x + adjustedSize, y: y },
        { x: x + adjustedSize/2, y: y - triangleHeight }
      ];
    } else {
      // Triangle pointing down
      points = [
        { x: x, y: y - triangleHeight },
        { x: x + adjustedSize, y: y - triangleHeight },
        { x: x + adjustedSize/2, y: y }
      ];
    }
    
    // Apply rotation and wave offsets to all points
    return points.map(point => {
      // Translate to origin relative to center
      const relX = point.x - centerX;
      const relY = point.y - centerY;
      
      // Apply rotation with direction
      const rotX = relX * cos - relY * sin;
      const rotY = relX * sin + relY * cos;
      
      // Add some occasional "floating" effect to certain triangles
      const floatEffect = (id % 7 === 0) ? Math.sin(adjustedTime * 0.7) * speed * 3 : 0;
      
      // Translate back and add wave motion with more complex patterns
      return {
        x: centerX + rotX + waveOffsetX,
        y: centerY + rotY + waveOffsetY + floatEffect
      };
    });
  };

  return (
    <canvas 
      ref={canvasRef}
      className="fixed inset-0 z-0 bg-nvidia-darker"
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default ParticleBackground;
