import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InteractiveButton } from "@/components/ui/interactive-button";
import { InteractiveCard } from "@/components/ui/interactive-card";
import {
  CpuIcon,
  MessageSquareIcon,
  InfoIcon,
  FlashlightIcon,
  LightbulbIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Braces,
  GitBranchIcon,
  BookmarkIcon,
  MicIcon,
  CircuitBoardIcon,
  PenIcon,
  ZapIcon
} from "lucide-react";
import { 
  startFloatingAnimation, 
  applyGlowHoverEffect,
  applyShimmerEffect,
  applyTextHoverEffect,
  createParticleBackground,
  animateTypingText,
  animateCounterValue
} from "@/lib/micro-interactions";

interface WelcomeSectionProps {
  onStartChat: () => void;
}

const WelcomeSection = ({ onStartChat }: WelcomeSectionProps) => {
  const titleRef = useRef<HTMLSpanElement>(null);
  const sparkleIconRef = useRef<HTMLDivElement>(null);
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const featureCardsRef = useRef<HTMLDivElement>(null);
  const modelMetricsRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [animationsLoaded, setAnimationsLoaded] = useState(false);

  // Function to handle scroll animations
  const handleScrollAnimations = useCallback(() => {
    const scrollElements = document.querySelectorAll('.scroll-fade-in, .scroll-fade-in-left, .scroll-fade-in-right');
    
    scrollElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        // Add active class when element is in viewport
        if (elementTop < windowHeight * 0.85) {
          element.classList.add('active');
        }
      }
    });
  }, []);
  
  // Start animations for the elements when component mounts
  useEffect(() => {
    // Create a list of cleanup functions
    const cleanupFunctions: (() => void)[] = [];
    
    // Floating animation for sparkle icon
    if (sparkleIconRef.current) {
      const stopFloating = startFloatingAnimation(sparkleIconRef.current, 8);
      cleanupFunctions.push(stopFloating);
    }
    
    // We're preserving the original background
    // No particle background will be added as per user request
    
    // Add metric-dot class to all dot elements for animation
    const allDots = document.querySelectorAll('.h-1\\.5.w-1\\.5.rounded-full');
    let dotIndex = 0;
    
    allDots.forEach((dot) => {
      if (dot instanceof HTMLElement) {
        // Add metric-dot class to all dots
        dot.classList.add('metric-dot');
        
        // Set a custom CSS variable for staggered animation delay
        dot.style.setProperty('--dot-index', `${dotIndex * 80}ms`);
        dotIndex++;
        
        // Add the active class with a delay to trigger animations when scrolled into view
        setTimeout(() => {
          dot.classList.add('metric-dot-active');
        }, 100 + dotIndex * 50);
      }
    });
    
    // Add hover effects to feature cards
    const featureIcons = document.querySelectorAll('.feature-icon');
    featureIcons.forEach(icon => {
      if (icon instanceof HTMLElement) {
        // Create a scale-up effect on hover
        icon.addEventListener('mouseenter', () => {
          icon.style.transform = 'scale(1.2)';
          icon.style.filter = 'drop-shadow(0 0 8px rgba(118, 185, 0, 0.8))';
        });
        
        icon.addEventListener('mouseleave', () => {
          icon.style.transform = 'scale(1)';
          icon.style.filter = 'none';
        });
      }
    });
    
    // Apply hover effect to all feature titles
    const featureTitles = document.querySelectorAll('.feature-title');
    featureTitles.forEach(title => {
      if (title instanceof HTMLElement) {
        const stopTextEffect = applyTextHoverEffect(title, '', 'rgb(118, 185, 0)');
        cleanupFunctions.push(stopTextEffect);
      }
    });
    
    // Add shimmer effect to the get started button
    const getStartedButton = document.querySelector('.get-started-button');
    if (getStartedButton instanceof HTMLElement) {
      const stopShimmer = applyShimmerEffect(getStartedButton, 'rgba(118, 185, 0, 0.4)');
      cleanupFunctions.push(stopShimmer);
    }
    
    // Add hover effects to model cards
    const modelCards = document.querySelectorAll('.model-card');
    modelCards.forEach(card => {
      if (card instanceof HTMLElement) {
        const stopGlow = applyGlowHoverEffect(card, 'rgba(118, 185, 0, 0.4)', 8);
        cleanupFunctions.push(stopGlow);
      }
    });
    
    // Animate the metrics dots when they come into view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const metrics = entry.target.querySelectorAll('.metric-dot');
          metrics.forEach((dot, index) => {
            if (dot instanceof HTMLElement) {
              setTimeout(() => {
                dot.classList.add('metric-dot-active');
              }, index * 120);
            }
          });
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.3
    });
    
    modelMetricsRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });
    
    // Initialize scroll animations
    handleScrollAnimations();
    
    // Add scroll event listener for animations
    window.addEventListener('scroll', handleScrollAnimations);
    
    // Mark animations as loaded to trigger text animations
    setAnimationsLoaded(true);
    
    // Clean up all animations when component unmounts
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
      observer.disconnect();
      window.removeEventListener('scroll', handleScrollAnimations);
    };
  }, [handleScrollAnimations]);
  
  // We're skipping the text typing animations to keep your preferred background look
  // This ensures the page loads with a clean, non-distracting appearance
  
  // Add subtle glow pulse to the NVIDIA title
  useEffect(() => {
    if (titleRef.current) {
      const pulseTitle = () => {
        const title = titleRef.current;
        if (!title) return;
        
        // Add glow effect
        title.style.textShadow = '0 0 15px rgba(118, 185, 0, 0.7)';
        
        // Revert back after a short duration
        setTimeout(() => {
          if (title) {
            title.style.textShadow = '0 0 5px rgba(118, 185, 0, 0.3)';
          }
        }, 1500);
      };
      
      // Initial pulse
      pulseTitle();
      
      // Set interval for pulsing effect
      const pulseInterval = setInterval(pulseTitle, 5000);
      
      // Clean up
      return () => {
        clearInterval(pulseInterval);
      };
    }
  }, []);

  return (
    <div className="container mx-auto px-4 max-w-4xl">
      <div className="text-center mb-12 relative">
        <div 
          ref={sparkleIconRef} 
          className="absolute -top-8 right-1/4 text-nvidia-green opacity-80"
        >
          <SparklesIcon className="h-10 w-10" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-6 welcome-title">
          Welcome to <span ref={titleRef} className="nvidia-gradient-text relative hover:scale-105 transition-transform duration-300 inline-block">
            Jensen
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-nvidia-green rounded-full animate-ping opacity-75"></span>
          </span>GPT
        </h1>
        <p ref={subtitleRef} className="text-xl mb-8 text-opacity-90 text-gray-300 welcome-subtitle">
          The future of AI conversation, powered by NVIDIA's Llama-3.1 Nemotron models
        </p>
        <p ref={descriptionRef} className="mb-8 max-w-2xl mx-auto welcome-description">
          Experience the cutting-edge of AI with our{" "}
          <span className="text-nvidia-green font-semibold">leather jacket-approved</span>{" "}
          conversational assistant. Choose between multiple NVIDIA model checkpoints for your specific needs.
        </p>

        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12 welcome-buttons">
          <InteractiveButton
            variant="nvidia"
            microInteractions={{
              onRipple: true,
              onHoverGlow: true,
              glowIntensity: 6,
              glowColor: 'rgba(118, 185, 0, 0.6)'
            }}
            className="px-6 py-3 rounded-md font-semibold flex items-center justify-center h-auto get-started-button hover:scale-105 transition-transform duration-300"
            onClick={onStartChat}
          >
            <MessageSquareIcon className="mr-2 h-5 w-5" /> Start Chatting
          </InteractiveButton>
          
          <a href="https://build.nvidia.com/explore/discover/nemotron" target="_blank" rel="noopener noreferrer">
            <InteractiveButton
              variant="outline"
              microInteractions={{
                onHoverGlow: true,
                glowColor: 'rgba(118, 185, 0, 0.3)',
                glowIntensity: 3
              }}
              className="border border-nvidia-green text-nvidia-green px-6 py-3 rounded-md font-semibold hover:bg-nvidia-green/10 hover:scale-105 transition-all duration-300 flex items-center justify-center h-auto"
            >
              <InfoIcon className="mr-2 h-5 w-5" /> Learn More
            </InteractiveButton>
          </a>
        </div>
      </div>

      <div ref={featureCardsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 scroll-fade-in">
        <InteractiveCard 
          variant="nvidia" 
          className="border border-opacity-20 border-nvidia-green p-6" 
          microInteractions={{
            onHoverGlow: true,
            glowColor: 'rgba(118, 185, 0, 0.3)',
            glowIntensity: 3
          }}
        >
          <div className="space-y-3">
            <div className="text-nvidia-green text-2xl mb-1 hover:animate-pulse transition-all duration-300">
              <FlashlightIcon className="h-6 w-6 transform transition-transform hover:scale-110" />
            </div>
            <h3 className="font-semibold text-lg">Multiple Nemotron Models</h3>
            <p className="text-gray-300">
              Choose between the flagship 253B parameter Ultra model for high-quality responses 
              or the efficient 49B model for faster interactions with excellent performance.
            </p>
          </div>
        </InteractiveCard>

        <InteractiveCard 
          variant="nvidia" 
          className="border border-opacity-20 border-nvidia-green p-6" 
          microInteractions={{
            onHoverGlow: true,
            glowColor: 'rgba(118, 185, 0, 0.3)',
            glowIntensity: 3
          }}
        >
          <div className="space-y-3">
            <div className="text-nvidia-green text-2xl mb-1 hover:animate-pulse transition-all duration-300">
              <LightbulbIcon className="h-6 w-6 transform transition-transform hover:scale-110" />
            </div>
            <h3 className="font-semibold text-lg">Advanced Reasoning</h3>
            <p className="text-gray-300">
              Multi-phase training with supervised fine-tuning for Math, Code, Reasoning, and Tool Calling,
              plus reinforcement learning for human-preferred responses.
            </p>
          </div>
        </InteractiveCard>

        <InteractiveCard 
          variant="nvidia" 
          className="border border-opacity-20 border-nvidia-green p-6" 
          microInteractions={{
            onHoverGlow: true,
            glowColor: 'rgba(118, 185, 0, 0.3)',
            glowIntensity: 3
          }}
        >
          <div className="space-y-3">
            <div className="text-nvidia-green text-2xl mb-1 hover:animate-pulse transition-all duration-300">
              <ShieldCheckIcon className="h-6 w-6 transform transition-transform hover:scale-110" />
            </div>
            <h3 className="font-semibold text-lg">Optimized Efficiency</h3>
            <p className="text-gray-300">
              Balancing accuracy and efficiency with reduced memory footprint, enabling larger workloads
              while fitting on a single H200 GPU for maximum performance.
            </p>
          </div>
        </InteractiveCard>
      </div>

      {/* Model details section */}
      <div className="bg-[#1a1a1a] border border-nvidia-green/20 rounded-lg p-6 mb-12 scroll-fade-in">
        <h2 className="text-2xl font-bold mb-3 text-white flex items-center">
          <CpuIcon className="h-6 w-6 mr-2 text-nvidia-green" />
          Available AI Models
        </h2>
        
        <p className="mb-4 text-gray-300">
          JensenGPT now features model selection, allowing you to choose between different NVIDIA Nemotron models
          based on your specific needs - from faster responses to more advanced reasoning capabilities.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Model 1 */}
          <InteractiveCard
            variant="raised"
            className="bg-[#121212] rounded-md p-4 border border-nvidia-green/20 relative overflow-hidden scroll-fade-in-left stagger-item"
            style={{ '--index': 0 } as React.CSSProperties}
            microInteractions={{
              onHoverGlow: true,
              glowColor: 'rgba(118, 185, 0, 0.3)',
              glowIntensity: 3
            }}
          >
            <div className="absolute top-0 right-0 bg-nvidia-green/10 px-2 py-1 text-xs text-nvidia-green font-semibold rounded-bl-md">
              253B Parameters
            </div>
            <h3 className="text-lg font-semibold mb-2 text-nvidia-green">Llama-3.1-Nemotron-Ultra-253B-v1</h3>
            <p className="text-sm text-gray-300 mb-3">
              The flagship model with maximum capabilities. Best for complex reasoning, detailed responses, 
              and advanced problem-solving where quality matters more than speed.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#1D1D1D] p-2 rounded-sm">
                <div className="font-medium text-nvidia-green mb-1">Reasoning</div>
                <div className="flex items-center gap-0.5" ref={el => modelMetricsRefs.current[0] = el}>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green metric-dot"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green metric-dot"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green metric-dot"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green metric-dot"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green metric-dot"></div>
                </div>
              </div>
              <div className="bg-[#1D1D1D] p-2 rounded-sm">
                <div className="font-medium text-nvidia-green mb-1">Code</div>
                <div className="flex items-center gap-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#333]"></div>
                </div>
              </div>
              <div className="bg-[#1D1D1D] p-2 rounded-sm">
                <div className="font-medium text-nvidia-green mb-1">Knowledge</div>
                <div className="flex items-center gap-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                </div>
              </div>
              <div className="bg-[#1D1D1D] p-2 rounded-sm">
                <div className="font-medium text-nvidia-green mb-1">Speed</div>
                <div className="flex items-center gap-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#333]"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#333]"></div>
                </div>
              </div>
            </div>
          </InteractiveCard>
          
          {/* Model 2 */}
          <InteractiveCard
            variant="raised"
            className="bg-[#121212] rounded-md p-4 border border-nvidia-green/20 relative overflow-hidden scroll-fade-in-right stagger-item"
            style={{ '--index': 1 } as React.CSSProperties}
            microInteractions={{
              onHoverGlow: true,
              glowColor: 'rgba(118, 185, 0, 0.3)',
              glowIntensity: 3
            }}
          >
            <div className="absolute top-0 right-0 bg-nvidia-green/10 px-2 py-1 text-xs text-nvidia-green font-semibold rounded-bl-md">
              49B Parameters
            </div>
            <h3 className="text-lg font-semibold mb-2 text-nvidia-green">Llama-3.1-Nemotron-49B</h3>
            <p className="text-sm text-gray-300 mb-3">
              A more compact model optimized for faster responses. Excellent for quick questions, basic tasks,
              and situations where you need rapid responses with good overall quality.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#1D1D1D] p-2 rounded-sm">
                <div className="font-medium text-nvidia-green mb-1">Reasoning</div>
                <div className="flex items-center gap-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#333]"></div>
                </div>
              </div>
              <div className="bg-[#1D1D1D] p-2 rounded-sm">
                <div className="font-medium text-nvidia-green mb-1">Code</div>
                <div className="flex items-center gap-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#333]"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#333]"></div>
                </div>
              </div>
              <div className="bg-[#1D1D1D] p-2 rounded-sm">
                <div className="font-medium text-nvidia-green mb-1">Knowledge</div>
                <div className="flex items-center gap-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#333]"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#333]"></div>
                </div>
              </div>
              <div className="bg-[#1D1D1D] p-2 rounded-sm">
                <div className="font-medium text-nvidia-green mb-1">Speed</div>
                <div className="flex items-center gap-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-nvidia-green"></div>
                </div>
              </div>
            </div>
          </InteractiveCard>
        </div>
        
        <InteractiveCard
          variant="ghost"
          className="bg-[#090909] rounded-md p-3 text-sm scroll-fade-in stagger-item"
          style={{ '--index': 2 } as React.CSSProperties}
          microInteractions={{
            onHoverShimmer: true,
            shimmerColor: 'rgba(118, 185, 0, 0.1)'
          }}
        >
          <p className="text-gray-400">
            <span className="text-nvidia-green font-medium">Tip:</span> You can switch between models at any time using the 
            <span className="bg-[#333] text-white px-1.5 py-0.5 rounded mx-1 text-xs">Models</span> 
            button in the chat interface. Choose the 253B model for complex tasks and the 49B model when you need 
            faster responses.
          </p>
        </InteractiveCard>
      </div>

      {/* Interface Features Section */}
      <InteractiveCard
        variant="ghost"
        className="bg-[#1a1a1a] border border-nvidia-green/20 rounded-lg p-6 mb-12 scroll-fade-in"
        microInteractions={{
          onHoverGlow: true,
          glowColor: 'rgba(118, 185, 0, 0.2)', 
          glowIntensity: 2
        }}
      >
        <h2 className="text-2xl font-bold mb-3 text-white flex items-center">
          <CircuitBoardIcon className="h-6 w-6 mr-2 text-nvidia-green" />
          Advanced Interface Features
        </h2>
        
        <p className="mb-4 text-gray-300">
          JensenGPT integrates powerful productivity and accessibility features to enhance your AI interaction experience,
          with a focus on both efficiency and creativity.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          {/* Column 1: Productivity Features */}
          <InteractiveCard
            variant="ghost"
            className="bg-[#151515] p-4 rounded-md scroll-fade-in-left stagger-item"
            style={{ '--index': 0 } as React.CSSProperties}
            microInteractions={{
              onHoverSlide: true,
              slideDirection: 'top',
              slideBgColor: 'rgba(118, 185, 0, 0.05)'
            }}
          >
            <h3 className="text-lg font-semibold mb-2 text-nvidia-green flex items-center">
              <BookmarkIcon className="h-4 w-4 mr-2" /> 
              Productivity Tools
            </h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li className="pb-1">
                <span className="font-medium text-nvidia-green/90">Prompt Library</span>
                <p className="text-sm ml-5 mt-1">Save, categorize and reuse your favorite prompts for quick access</p>
              </li>
              <li className="pb-1">
                <span className="font-medium text-nvidia-green/90">Note Taking</span>
                <p className="text-sm ml-5 mt-1">Integrated notes with tags for organizing research and insights</p>
              </li>
              <li className="pb-1">
                <span className="font-medium text-nvidia-green/90">Knowledge Sources</span>
                <p className="text-sm ml-5 mt-1">Access additional knowledge sources directly from the sidebar</p>
              </li>
            </ul>
          </InteractiveCard>
          
          {/* Column 2: Conversation Features */}
          <InteractiveCard
            variant="ghost"
            className="bg-[#151515] p-4 rounded-md scroll-fade-in stagger-item"
            style={{ '--index': 1 } as React.CSSProperties}
            microInteractions={{
              onHoverSlide: true,
              slideDirection: 'top',
              slideBgColor: 'rgba(118, 185, 0, 0.05)'
            }}
          >
            <h3 className="text-lg font-semibold mb-2 text-nvidia-green flex items-center">
              <GitBranchIcon className="h-4 w-4 mr-2" /> 
              Conversation Management
            </h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li className="pb-1">
                <span className="font-medium text-nvidia-green/90">Branching Conversations</span>
                <p className="text-sm ml-5 mt-1">Create alternative conversation paths to explore different directions</p>
              </li>
              <li className="pb-1">
                <span className="font-medium text-nvidia-green/90">Bookmarking</span>
                <p className="text-sm ml-5 mt-1">Save important messages for quick future reference</p>
              </li>
              <li className="pb-1">
                <span className="font-medium text-nvidia-green/90">Thought Trees</span>
                <p className="text-sm ml-5 mt-1">Visualize the AI's reasoning process in complex reasoning tasks</p>
              </li>
            </ul>
          </InteractiveCard>
          
          {/* Column 3: Interface Features */}
          <InteractiveCard
            variant="ghost"
            className="bg-[#151515] p-4 rounded-md scroll-fade-in-right stagger-item"
            style={{ '--index': 2 } as React.CSSProperties}
            microInteractions={{
              onHoverSlide: true,
              slideDirection: 'top',
              slideBgColor: 'rgba(118, 185, 0, 0.05)'
            }}
          >
            <h3 className="text-lg font-semibold mb-2 text-nvidia-green flex items-center">
              <MicIcon className="h-4 w-4 mr-2" /> 
              Enhanced Interaction
            </h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2">
              <li className="pb-1">
                <span className="font-medium text-nvidia-green/90">Model Selection <span className="bg-nvidia-green/20 text-nvidia-green text-xs px-1 py-0.5 rounded-sm ml-1">New!</span></span>
                <p className="text-sm ml-5 mt-1">Switch between 49B and 253B parameter models to balance speed and capability</p>
              </li>
              <li className="pb-1">
                <span className="font-medium text-nvidia-green/90">Voice Interaction</span>
                <p className="text-sm ml-5 mt-1">Speak to the AI with high-quality voice recognition and text-to-speech</p>
              </li>
              <li className="pb-1">
                <span className="font-medium text-nvidia-green/90">Tool Integration</span>
                <p className="text-sm ml-5 mt-1">Calculator, weather data, and web search tools for external information</p>
              </li>
            </ul>
          </InteractiveCard>
        </div>
      </InteractiveCard>
    </div>
  );
};

export default WelcomeSection;
