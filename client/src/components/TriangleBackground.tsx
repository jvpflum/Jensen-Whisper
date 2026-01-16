import { useEffect, useRef } from 'react';

const TriangleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full window size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Initial size
    resizeCanvas();

    // Listen for window resize
    window.addEventListener('resize', resizeCanvas);

    // Create a grid of triangles
    const generateTriangles = () => {
      const spacing = 120; // Space between triangle centers
      const rows = Math.ceil(canvas.height / spacing) + 1;
      const cols = Math.ceil(canvas.width / spacing) + 1;
      const triangles = [];
      
      // Create a staggered grid of triangles
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Add horizontal offset to every other row for a more natural pattern
          const xOffset = y % 2 === 0 ? 0 : spacing / 2;
          
          // Base position
          const posX = x * spacing + xOffset;
          const posY = y * spacing;
          
          // Randomize size slightly (60-80px)
          const size = 40 + Math.random() * 10;
          
          // Randomize phase for animation
          const phase = Math.random() * Math.PI * 2;
          
          triangles.push({
            x: posX,
            y: posY,
            size: size,
            phase: phase,
            opacity: 0.1 + Math.random() * 0.1, // Very subtle background opacity
          });
        }
      }
      
      return triangles;
    };

    const triangles = generateTriangles();

    // Main animation loop
    const draw = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Subtle background color
      ctx.fillStyle = '#050505'; // Almost black
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Convert timestamp to seconds
      const time = timestamp * 0.001;
      
      // Draw each triangle
      triangles.forEach(triangle => {
        const { x, y, size, phase, opacity } = triangle;
        
        // Skip triangles outside the viewport with some padding
        if (
          x < -size || 
          x > canvas.width + size || 
          y < -size || 
          y > canvas.height + size
        ) {
          return;
        }
        
        // Calculate animated size with subtle pulsing
        const pulseAmount = 1 + Math.sin(time + phase) * 0.05; // 5% pulsing
        const currentSize = size * pulseAmount;
        
        // Draw triangle
        drawTriangle(ctx, x, y, currentSize, opacity, time + phase);
      });
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Draw a single equilateral triangle
    const drawTriangle = (
      ctx: CanvasRenderingContext2D, 
      x: number, 
      y: number, 
      size: number, 
      opacity: number, 
      phase: number
    ) => {
      // Calculate triangle points
      const height = size * Math.sqrt(3) / 2;
      
      const points = [
        { x: x, y: y - height / 1.5 }, // Top
        { x: x - size / 2, y: y + height / 3 }, // Bottom left
        { x: x + size / 2, y: y + height / 3 }, // Bottom right
      ];
      
      // Draw subtle triangle fill (very translucent)
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(points[1].x, points[1].y);
      ctx.lineTo(points[2].x, points[2].y);
      ctx.closePath();
      
      // Very subtle fill
      ctx.fillStyle = `rgba(76, 185, 0, ${opacity * 0.1})`; // NVIDIA green with low opacity
      ctx.fill();
      
      // Draw animated outline
      drawAnimatedOutline(ctx, points, phase, opacity);
    };

    // Draw the animated outline of a triangle
    const drawAnimatedOutline = (
      ctx: CanvasRenderingContext2D,
      points: { x: number; y: number }[],
      phase: number,
      opacity: number
    ) => {
      // Calculate the base opacity for the line
      const baseOpacity = opacity * 4; // Make outlines more visible than fills
      
      // Animate each edge of the triangle
      for (let i = 0; i < 3; i++) {
        const startPoint = points[i];
        const endPoint = points[(i + 1) % 3];
        
        // Create a gradient for each line
        const gradient = ctx.createLinearGradient(
          startPoint.x, startPoint.y,
          endPoint.x, endPoint.y
        );
        
        // Calculate pulse position (0-1) that moves along the line
        const pulsePos = (phase + i / 3) % 1;
        
        // Create a glowing effect that moves along the edge
        gradient.addColorStop(Math.max(0, pulsePos - 0.2), `rgba(76, 185, 0, 0)`);
        gradient.addColorStop(pulsePos, `rgba(76, 185, 0, ${baseOpacity})`);
        gradient.addColorStop(Math.min(1, pulsePos + 0.2), `rgba(76, 185, 0, 0)`);
        
        // Draw the line with the gradient
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    // Start the animation
    animationFrameRef.current = requestAnimationFrame(draw);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 bg-black" 
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default TriangleBackground;