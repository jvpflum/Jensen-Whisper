import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Neuron {
  position: THREE.Vector3;
  connections: number[];
  velocity: THREE.Vector3;
  size: number;
  color: THREE.Color;
  pulsePhase: number;
  pulseSpeed: number;
  active: boolean;
  activationTime: number;
  lastActivated: number;
}

interface Connection {
  source: number;
  target: number;
  strength: number;
  active: boolean;
  activationTime: number;
  pulsePosition: number;
  pulseSpeed: number;
  color: THREE.Color;
}

const NeuralNetworkBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const neuronsRef = useRef<Neuron[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const timeRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // NVIDIA brand green for the primary color, but toned down
  const NVIDIA_GREEN = new THREE.Color(0x76B900).multiplyScalar(0.6); // 40% dimmer
  const NVIDIA_GREEN_DARK = new THREE.Color(0x5A8A00).multiplyScalar(0.5); // 50% dimmer
  const NVIDIA_GREEN_BRIGHT = new THREE.Color(0x8ADF00).multiplyScalar(0.65); // 35% dimmer

  useEffect(() => {
    if (!containerRef.current) return;

    // Setup basic Three.js environment
    const initThree = () => {
      const container = containerRef.current!;
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050505); // Very dark background (almost black)
      sceneRef.current = scene;

      // Create camera with good depth
      const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 2000);
      camera.position.z = 800;
      cameraRef.current = camera;

      // Create renderer with better quality
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Add ambient light for base illumination (reduced brightness)
      const ambientLight = new THREE.AmbientLight(0x404040, 0.8); // Reduced from 1.5 to 0.8
      scene.add(ambientLight);

      // Add directional light for depth shadows (reduced brightness)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Reduced from 0.8 to 0.5
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);

      // Add a subtle point light at camera for highlighting (reduced brightness)
      const pointLight = new THREE.PointLight(NVIDIA_GREEN, 0.6, 1000); // Reduced from 1.0 to 0.6
      pointLight.position.set(0, 0, 700);
      scene.add(pointLight);

      // Track mouse movement for interactive effects
      window.addEventListener('mousemove', handleMouseMove);

      // Create neural network structure
      initializeNeuralNetwork(width, height);

      // Start animation loop
      animate(0);
    };

    // Track mouse movement
    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      // Convert to normalized coordinates (-1 to 1)
      mousePosRef.current = {
        x: ((event.clientX - rect.left) / containerRef.current.clientWidth) * 2 - 1,
        y: -((event.clientY - rect.top) / containerRef.current.clientHeight) * 2 + 1
      };
    };

    // Create neural network nodes and connections
    const initializeNeuralNetwork = (width: number, height: number) => {
      const neurons: Neuron[] = [];
      const connections: Connection[] = [];
      
      // Layer configuration for classic neural network structure (reduced neurons)
      const layers = [6, 10, 14, 10, 6]; // Reduced number of neurons per layer
      const layerDepth = 400; // Z-distance between layers
      const startZ = -(layerDepth * (layers.length - 1)) / 2;
      
      // Create neurons organized in layers
      let neuronIndex = 0;
      
      for (let l = 0; l < layers.length; l++) {
        const layerSize = layers[l];
        const zPos = startZ + l * layerDepth;
        
        for (let i = 0; i < layerSize; i++) {
          // Position nodes in a circular pattern within each layer
          const angle = (i / layerSize) * Math.PI * 2;
          const radius = 150 + Math.random() * 50;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          // Add some randomness to positions for natural look
          const offsetX = (Math.random() - 0.5) * 60;
          const offsetY = (Math.random() - 0.5) * 60;
          
          neurons.push({
            position: new THREE.Vector3(x + offsetX, y + offsetY, zPos),
            connections: [],
            velocity: new THREE.Vector3(
              (Math.random() - 0.5) * 0.15, // Reduced speed by 50%
              (Math.random() - 0.5) * 0.15, // Reduced speed by 50%
              (Math.random() - 0.5) * 0.05  // Reduced speed by 50%
            ),
            size: 3 + Math.random() * 4,
            color: new THREE.Color().copy(NVIDIA_GREEN).multiplyScalar(0.6 + Math.random() * 0.4),
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.03 + Math.random() * 0.05,
            active: false,
            activationTime: 0,
            lastActivated: -1000 + Math.random() * -5000 // Random delay before first activation
          });
          
          neuronIndex++;
        }
      }
      
      // Connect neurons between adjacent layers
      let connectionIndex = 0;
      let currentNeuronIndex = 0;
      
      // Connect between layers
      for (let l = 0; l < layers.length - 1; l++) {
        const currentLayerSize = layers[l];
        const nextLayerSize = layers[l + 1];
        const nextLayerStartIndex = currentNeuronIndex + currentLayerSize;
        
        // Each neuron in current layer connects to some neurons in next layer
        for (let i = 0; i < currentLayerSize; i++) {
          const sourceIndex = currentNeuronIndex + i;
          
          // Create connections to next layer with varying density
          const connectionCount = 2 + Math.floor(Math.random() * (nextLayerSize / 2));
          const possibleTargets = [];
          for (let j = 0; j < nextLayerSize; j++) {
            possibleTargets.push(nextLayerStartIndex + j);
          }
          
          // Shuffle and pick random targets
          for (let c = 0; c < connectionCount; c++) {
            if (possibleTargets.length === 0) break;
            
            const randomIdx = Math.floor(Math.random() * possibleTargets.length);
            const targetIndex = possibleTargets.splice(randomIdx, 1)[0];
            
            neurons[sourceIndex].connections.push(connectionIndex);
            
            connections.push({
              source: sourceIndex,
              target: targetIndex,
              strength: 0.3 + Math.random() * 0.7,
              active: false,
              activationTime: 0,
              pulsePosition: 0,
              pulseSpeed: 0.02 + Math.random() * 0.05,
              color: new THREE.Color().copy(NVIDIA_GREEN)
            });
            
            connectionIndex++;
          }
        }
        
        currentNeuronIndex += currentLayerSize;
      }
      
      // Add some cross-layer connections for more complex network appearance
      const randomConnectionCount = Math.floor(neurons.length * 0.3);
      for (let i = 0; i < randomConnectionCount; i++) {
        const sourceIndex = Math.floor(Math.random() * neurons.length);
        let targetIndex = Math.floor(Math.random() * neurons.length);
        
        // Avoid self-connections
        while (targetIndex === sourceIndex) {
          targetIndex = Math.floor(Math.random() * neurons.length);
        }
        
        neurons[sourceIndex].connections.push(connectionIndex);
        
        connections.push({
          source: sourceIndex,
          target: targetIndex,
          strength: 0.2 + Math.random() * 0.3, // Weaker connections
          active: false,
          activationTime: 0,
          pulsePosition: 0,
          pulseSpeed: 0.01 + Math.random() * 0.03,
          color: new THREE.Color().copy(NVIDIA_GREEN_DARK)
        });
        
        connectionIndex++;
      }
      
      neuronsRef.current = neurons;
      connectionsRef.current = connections;
      
      // Create the visual elements in the scene
      createVisualElements();
    };
    
    // Create the visual representation of the neural network
    const createVisualElements = () => {
      if (!sceneRef.current) return;
      
      const scene = sceneRef.current;
      const neurons = neuronsRef.current;
      const connections = connectionsRef.current;
      
      // Create neuron geometry
      const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);
      
      // Create neurons (nodes)
      neurons.forEach((neuron, index) => {
        // Use MeshPhongMaterial for better lighting effects
        const material = new THREE.MeshPhongMaterial({
          color: neuron.color,
          emissive: neuron.color.clone().multiplyScalar(0.2),
          shininess: 50,
          transparent: true,
          opacity: 0.85
        });
        
        const nodeMesh = new THREE.Mesh(nodeGeometry, material);
        nodeMesh.scale.setScalar(neuron.size);
        nodeMesh.position.copy(neuron.position);
        nodeMesh.userData = { type: 'neuron', index };
        scene.add(nodeMesh);
      });
      
      // Create connections
      connections.forEach((connection, index) => {
        const sourcePos = neurons[connection.source].position;
        const targetPos = neurons[connection.target].position;
        
        // Create a line for each connection
        const points = [sourcePos, targetPos];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Use custom shader material for the connections
        const material = new THREE.LineBasicMaterial({
          color: connection.color,
          transparent: true,
          opacity: connection.strength * 0.5,
          linewidth: 1
        });
        
        const line = new THREE.Line(geometry, material);
        line.userData = { type: 'connection', index };
        scene.add(line);
      });
    };
    
    // Animation loop
    const animate = (timestamp: number) => {
      const delta = timestamp - (timeRef.current || timestamp);
      timeRef.current = timestamp;
      
      updateNeuralNetwork(delta);
      renderScene();
      
      frameIdRef.current = requestAnimationFrame(animate);
    };
    
    // Update neural network state
    const updateNeuralNetwork = (delta: number) => {
      if (!sceneRef.current) return;
      
      const scene = sceneRef.current;
      const neurons = neuronsRef.current;
      const connections = connectionsRef.current;
      const time = timeRef.current * 0.001; // Convert to seconds
      
      // Random activation of neurons (reduced frequency)
      if (Math.random() < 0.01) { // Reduced from 0.03 to 0.01 (3x less frequent)
        const neuronIndex = Math.floor(Math.random() * neurons.length);
        activateNeuron(neuronIndex);
      }
      
      // Interactive activation near mouse (reduced frequency)
      if (Math.random() < 0.05) { // Reduced from 0.1 to 0.05 (2x less frequent)
        // Convert normalized mouse position to world coordinates
        const mouseX = mousePosRef.current.x * 400;
        const mouseY = mousePosRef.current.y * 300;
        
        // Find closest neuron to mouse
        let closestDistance = Infinity;
        let closestNeuron = -1;
        
        neurons.forEach((neuron, index) => {
          // We're just checking x and y distance, ignoring z
          const dx = neuron.position.x - mouseX;
          const dy = neuron.position.y - mouseY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestNeuron = index;
          }
        });
        
        // If mouse is close enough to a neuron, activate it
        if (closestDistance < 150) {
          activateNeuron(closestNeuron);
        }
      }
      
      // Update node visual properties
      scene.children.forEach((child: THREE.Object3D) => {
        if (child.userData && child.userData.type === 'neuron') {
          const neuronIndex = child.userData.index;
          const neuron = neurons[neuronIndex];
          
          // Update position with subtle movement
          neuron.position.add(neuron.velocity);
          
          // Bounce within boundaries
          // Handle x-axis
          if (Math.abs(neuron.position.x) > 300) {
            const velocityX = neuron.velocity.x;
            neuron.velocity.setX(-velocityX);
            neuron.position.setX((neuron.position.x > 0 ? 0.99 : -0.99) * 300);
          }
          // Handle y-axis
          if (Math.abs(neuron.position.y) > 300) {
            const velocityY = neuron.velocity.y;
            neuron.velocity.setY(-velocityY);
            neuron.position.setY((neuron.position.y > 0 ? 0.99 : -0.99) * 300);
          }
          // Handle z-axis
          if (Math.abs(neuron.position.z) > 600) {
            const velocityZ = neuron.velocity.z;
            neuron.velocity.setZ(-velocityZ);
            neuron.position.setZ((neuron.position.z > 0 ? 0.99 : -0.99) * 600);
          }
          
          // Slightly randomize velocity for organic movement
          neuron.velocity.setX(neuron.velocity.x + (Math.random() - 0.5) * 0.01);
          neuron.velocity.setY(neuron.velocity.y + (Math.random() - 0.5) * 0.01);
          neuron.velocity.setZ(neuron.velocity.z + (Math.random() - 0.5) * 0.01);
          
          // Dampen velocity to prevent chaos
          neuron.velocity.multiplyScalar(0.99);
          
          child.position.copy(neuron.position);
          
          // Pulse effect for regular neurons
          const pulseScale = 1 + 0.2 * Math.sin(time * neuron.pulseSpeed * 2 + neuron.pulsePhase);
          child.scale.setScalar(neuron.size * pulseScale);
          
          // Get material and update appearance
          const material = (child as THREE.Mesh).material as THREE.MeshPhongMaterial;
          
          // Activation effects
          if (neuron.active) {
            const timeSinceActivation = time - neuron.activationTime;
            
            if (timeSinceActivation < 1.0) {
              // Bright flash that fades
              const flashIntensity = 1 - timeSinceActivation;
              material.emissive.copy(NVIDIA_GREEN_BRIGHT).multiplyScalar(flashIntensity);
              material.opacity = Math.min(1, 0.85 + flashIntensity * 0.15);
              
              // Size surge during activation
              const activationScale = 1 + 0.5 * (1 - timeSinceActivation);
              child.scale.setScalar(neuron.size * pulseScale * activationScale);
            } else {
              // Return to normal after activation
              neuron.active = false;
            }
          } else {
            // Normal state - subtle pulse
            material.emissive.copy(neuron.color).multiplyScalar(0.2 + 0.1 * Math.sin(time + neuronIndex));
            material.opacity = 0.85;
          }
        }
        // Update connection positions and visuals
        else if (child.userData && child.userData.type === 'connection') {
          const connectionIndex = child.userData.index;
          const connection = connections[connectionIndex];
          const sourcePos = neurons[connection.source].position;
          const targetPos = neurons[connection.target].position;
          
          // Update line positions to follow neurons
          const line = child as THREE.Line;
          const positions = (line.geometry as THREE.BufferGeometry).getAttribute('position');
          positions.setXYZ(0, sourcePos.x, sourcePos.y, sourcePos.z);
          positions.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
          positions.needsUpdate = true;
          
          // Get material
          const material = line.material as THREE.LineBasicMaterial;
          
          // Update data pulse animation on active connection
          if (connection.active) {
            const timeSinceActivation = time - connection.activationTime;
            
            // Propagation effect - pulse moves along the connection
            connection.pulsePosition += connection.pulseSpeed * delta * 0.03;
            
            if (connection.pulsePosition > 1) {
              // Reset when pulse reaches end and activate the target neuron
              connection.active = false;
              connection.pulsePosition = 0;
              
              // Activate target neuron with a delay
              if (timeSinceActivation > 0.1) {
                activateNeuron(connection.target);
              }
            }
            
            // Visual effect for active connection
            material.color.copy(NVIDIA_GREEN_BRIGHT);
            material.opacity = Math.min(1, connection.strength + 0.5);
          } else {
            // Revert to normal appearance
            material.color.copy(connection.color);
            material.opacity = connection.strength * 0.5;
          }
        }
      });
    };
    
    // Activate a neuron and its connections
    const activateNeuron = (index: number) => {
      const neurons = neuronsRef.current;
      const connections = connectionsRef.current;
      const time = timeRef.current * 0.001;
      
      const neuron = neurons[index];
      
      // Don't reactivate too quickly
      if (time - neuron.lastActivated < 1.0) return;
      
      // Set neuron as active
      neuron.active = true;
      neuron.activationTime = time;
      neuron.lastActivated = time;
      
      // Activate outgoing connections from this neuron
      neuron.connections.forEach(connectionIndex => {
        const connection = connections[connectionIndex];
        connection.active = true;
        connection.activationTime = time;
        connection.pulsePosition = 0;
      });
    };
    
    // Render the scene
    const renderScene = () => {
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      
      // Very subtle camera movement (even more reduced)
      const time = timeRef.current * 0.001;
      camera.position.x = Math.sin(time * 0.05) * 50; // 50% slower, 50% less range
      camera.position.y = Math.cos(time * 0.05) * 25; // 50% slower, 50% less range
      camera.lookAt(0, 0, 0);
      
      renderer.render(scene, camera);
    };
    
    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const container = containerRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    };
    
    // Initialize and set up event listeners
    initThree();
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      if (rendererRef.current && containerRef.current) {
        const rendererDom = rendererRef.current.domElement;
        if (rendererDom.parentNode) {
          rendererDom.parentNode.removeChild(rendererDom);
        }
      }
      
      // Clean up THREE.js objects
      if (sceneRef.current) {
        sceneRef.current.children.forEach((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            (child.geometry as THREE.BufferGeometry).dispose();
            (child.material as THREE.Material).dispose();
          } else if (child instanceof THREE.Line) {
            (child.geometry as THREE.BufferGeometry).dispose();
            (child.material as THREE.Material).dispose();
          }
        });
      }
    };
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0 bg-black" 
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default NeuralNetworkBackground;