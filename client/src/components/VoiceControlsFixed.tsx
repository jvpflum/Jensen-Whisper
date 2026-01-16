import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Square, Volume } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { stripMarkdown } from "@/lib/utils";
import axios from "axios";

interface VoiceControlsProps {
  onSpeechRecognized: (text: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  isSpeaking: boolean;
  setIsSpeaking: (isSpeaking: boolean) => void;
  lastAssistantMessage: string | null | undefined;
}

const VoiceControlsFixed = ({
  onSpeechRecognized,
  isListening,
  setIsListening,
  isSpeaking,
  setIsSpeaking,
  lastAssistantMessage
}: VoiceControlsProps) => {
  const [isVoiceSupported, setIsVoiceSupported] = useState(true);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true); // Always enable ElevenLabs TTS
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  // Add a local state that we control directly
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // When either changes, update both
  useEffect(() => {
    if (isSpeaking !== isLocalSpeaking) {
      console.log("VOICE DEBUG - Syncing external speaking state:", isSpeaking, "with local:", isLocalSpeaking);
      if (isSpeaking) {
        setIsLocalSpeaking(true);
      } else if (!audioRef.current || audioRef.current.paused) {
        setIsLocalSpeaking(false);
      }
    }
  }, [isSpeaking, isLocalSpeaking]);

  // Function to clean up audio resources - defined outside of useEffect to avoid TypeScript issues
  const cleanupAudio = () => {
    // Clean up audio playback
    if (audioRef.current) {
      // We'll set isSpeaking to false later after we're sure playback has stopped
      // Don't call setIsSpeaking(false) here
      
      // Remove all event listeners to prevent race conditions
      audioRef.current.onloadedmetadata = null;
      audioRef.current.oncanplaythrough = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      
      // Pause audio if it's playing
      if (!audioRef.current.paused) {
        try {
          audioRef.current.pause();
        } catch (e) {
          console.error("Error pausing audio during cleanup", e);
        }
      }
      
      // Reset time
      try {
        audioRef.current.currentTime = 0;
      } catch (e) {
        // Ignore errors setting currentTime
      }
      
      // Release object URL if it exists
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(audioRef.current.src);
        } catch (e) {
          console.error("Error revoking object URL", e);
        }
      }
      
      // Clear source - do this last
      try {
        audioRef.current.src = '';
      } catch (e) {
        console.error("Error clearing audio source", e);
      }
    }
  };

  // Check if browser supports speech recognition and add user interaction listeners
  useEffect(() => {
    // Check if speech recognition is available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("SpeechRecognition not available in this browser");
      setIsVoiceSupported(false);
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition. Try using Chrome, Edge, or Safari.",
        variant: "destructive",
        duration: 8000,
      });
      return;
    }
    
    setIsVoiceSupported(true);
    console.log("Speech recognition is supported by this browser");
    
    // Log all available media devices to help debug
    console.log("Checking available media devices...");
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        console.log(`Found ${audioInputs.length} audio input devices:`, audioInputs);
        
        // Display a toast notification about available devices
        if (audioInputs.length === 0) {
          toast({
            title: "No Microphones Detected",
            description: "Your browser doesn't detect any microphones. Please connect a microphone and reload the page.",
            variant: "destructive",
            duration: 10000,
          });
        } else {
          console.log(`Available microphones: ${audioInputs.map(d => d.label || 'Unnamed device').join(', ')}`);
          // Try to get microphone permission status
          try {
            navigator.permissions.query({ name: 'microphone' as PermissionName })
              .then(permissionStatus => {
                console.log("Microphone permission status:", permissionStatus.state);
                if (permissionStatus.state === 'denied') {
                  toast({
                    title: "Microphone Access Denied",
                    description: "You need to allow microphone access in your browser settings to use voice input.",
                    variant: "destructive",
                    duration: 8000,
                  });
                  setHasMicPermission(false);
                } else if (permissionStatus.state === 'granted') {
                  setHasMicPermission(true);
                }
              });
          } catch (err) {
            console.error("Error checking microphone permission:", err);
          }
        }
      })
      .catch(err => {
        console.error("Error enumerating media devices:", err);
        toast({
          title: "Microphone Detection Error",
          description: "Could not check microphone availability. Try enabling permissions in your browser settings.",
          variant: "destructive",
        });
      });
    
    // Initialize audio element for ElevenLabs playback
    audioRef.current = new Audio();
    
    // Set up audio events
    audioRef.current.onended = () => {
      console.log("VOICE DEBUG - Audio onended event fired");
      // Add a small delay before setting isSpeaking to false to avoid race conditions
      setTimeout(() => {
        console.log("VOICE DEBUG - Setting isSpeaking to false after playback ended");
        setIsSpeaking(false);
      }, 300);
    };
    
    audioRef.current.onerror = (e) => {
      console.error("Audio playback error", e);
      toast({
        title: "Audio Playback Error",
        description: "Failed to play the audio. Please try again.",
        variant: "destructive",
      });
      setIsSpeaking(false);
    };
    
    // Create an interval to regularly check if audio is playing
    // This helps keep the isSpeaking state in sync with the actual audio
    const audioCheckInterval = setInterval(() => {
      if (audioRef.current) {
        const isAudioPlaying = !audioRef.current.paused;
        
        // If the state doesn't match reality, update it
        if (isAudioPlaying !== isSpeaking) {
          console.log("VOICE DEBUG - Sync fix: Audio playing:", isAudioPlaying, "but isSpeaking:", isSpeaking);
          setIsSpeaking(isAudioPlaying);
        }
      }
    }, 500); // Check every 500ms
    
    // Create a function to enable audio playback on user interaction
    // This helps with browsers that have autoplay restrictions
    const enableAudio = () => {
      // Try to play a silent audio to unlock audio playback
      try {
        const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
        silentAudio.play().catch(e => console.log('Silent audio play attempt:', e));
        
        // Remove the listeners after first interaction
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('touchstart', enableAudio);
        document.removeEventListener('keydown', enableAudio);
        
        console.log("Audio playback enabled via user interaction");
      } catch (e) {
        console.error("Error enabling audio:", e);
      }
    };
    
    // Add event listeners to enable audio on user interaction
    document.addEventListener('click', enableAudio);
    document.addEventListener('touchstart', enableAudio);
    document.addEventListener('keydown', enableAudio);
    
    // Clean up listeners on component unmount
    return () => {
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      
      // Clear the interval to prevent memory leaks
      clearInterval(audioCheckInterval);
      
      // Clean up speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        
        if (isListening) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            console.log("Recognition was not started");
          }
        }
      }
      
      // Use the cleanupAudio function to clean up audio resources
      cleanupAudio();
    };
  }, [isListening, onSpeechRecognized, setIsListening, setIsSpeaking]);

  // Toggle mute without stopping playback
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
      
      toast({
        title: audioRef.current.muted ? "Sound Muted" : "Sound Unmuted",
        description: audioRef.current.muted 
          ? "Audio playback is now muted. Click the button again to unmute." 
          : "Audio playback resumed.",
        duration: 2000,
      });
    }
  };
  
  // Request microphone permission
  const requestMicrophonePermission = async () => {
    const permission = await requestMicPermission();
    if (permission) {
      setHasMicPermission(true);
      toast({
        title: "Microphone Access Granted",
        description: "You can now use voice features.",
      });
    } else {
      setHasMicPermission(false);
      toast({
        title: "Microphone Access Denied",
        description: "Please enable microphone access in your browser settings to use voice features.",
        variant: "destructive",
      });
    }
  };
  
  // Check and request microphone permissions explicitly
  const requestMicPermission = async (): Promise<boolean> => {
    try {
      // Try to get user media to force permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // If we get here, permission was granted
      console.log("Microphone permission granted");
      
      // Clean up the stream
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (err) {
      console.error("Microphone permission error:", err);
      return false;
    }
  };
  
  // Toggle speech recognition
  const toggleListening = async () => {
    if (!isVoiceSupported) {
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition. Try using Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return;
    }
    
    // If starting, check permission first
    if (!isListening) {
      // Explicitly check microphone permission
      const hasMicrophonePermission = await requestMicPermission();
      
      if (!hasMicrophonePermission) {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access in your browser to use voice input. Click the microphone icon in your address bar or check your browser settings.",
          variant: "destructive",
          duration: 8000,
        });
        return;
      }
    }
    
    if (isListening) {
      try {
        console.log("Stopping speech recognition and processing results...");
        
        // Stop the recognition first
        if (recognitionRef.current) {
          // Get the transcript before stopping if available
          const transcript = getTranscriptFromRecognition();
          
          // Stop recognition
          recognitionRef.current.stop();
          
          // If we got a transcript, process it
          if (transcript && transcript.trim().length > 0) {
            console.log("Processing final transcript:", transcript);
            onSpeechRecognized(transcript);
            toast({
              title: "Processed Voice Input",
              description: `"${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}"`,
            });
          } else {
            toast({
              title: "Voice Input Stopped",
              description: "No speech detected. Try speaking louder or check your microphone.",
            });
          }
        }
        
        // Update state
        setIsListening(false);
      } catch (e) {
        console.error("Failed to stop speech recognition", e);
        // Force the state to be correct even if the stop fails
        setIsListening(false);
      }
    } else {
      try {
        console.log("Starting speech recognition...");
        // Force create a new recognition instance every time
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
          console.error("SpeechRecognition not available");
          toast({
            title: "Voice Recognition Error",
            description: "Your browser doesn't support voice recognition. Try using Chrome, Edge, or Safari.",
            variant: "destructive",
          });
          setIsVoiceSupported(false);
          return;
        }
        
        // Clean up old instance if exists
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
            recognitionRef.current.stop();
            // Remove all event listeners
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
            recognitionRef.current = null;
          } catch (err) {
            console.log("Error cleaning up old recognition instance:", err);
            // Continue anyway
          }
        }
        
        // Create fresh instance
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US'; // Set language explicitly
        
        console.log("Recognition instance created:", !!recognitionRef.current);
        
        // We don't need this anymore as we're using currentTranscript below
        
        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          toast({
            title: "Voice Recognition Error",
            description: `Error: ${event.error}. Please try again.`,
            variant: "destructive",
          });
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended without manual stop");
          // Only set to false if we didn't manually stop it
          if (isListening) {
            setIsListening(false);
            toast({
              title: "Voice Recognition Timed Out",
              description: "Voice recognition has automatically turned off. Click the button to try again.",
            });
          }
        };
        
        // Store current transcript in a variable
        let currentTranscript = "";
        
        // Setup result handler to capture speech
        recognitionRef.current.onresult = (event: any) => {
          try {
            // Get the transcript from all results
            currentTranscript = "";
            for (let i = 0; i < event.results.length; i++) {
              currentTranscript += event.results[i][0].transcript;
            }
            
            console.log("Current transcript:", currentTranscript);
          } catch (err) {
            console.error("Error processing speech results:", err);
          }
        };
        
        // Helper function to get the transcript from recognition results
        const getLatestTranscript = function() {
          return currentTranscript;
        };
        
        // Assign the function to access in this component
        getTranscriptFromRecognition = getLatestTranscript;
        
        // Start the recognition and handle any immediate errors
        console.log("Attempting to start recognition...");
        
        // Wrap in a try-catch to handle any immediate errors
        try {
          recognitionRef.current.start();
          console.log("Recognition started successfully");
          setIsListening(true);
          toast({
            title: "🎤 Listening - Click Again When Done",
            description: "I'm listening! Speak now, then click the microphone button again when you finish to send your message.",
            duration: 8000, // Longer duration to make sure users see the instructions
          });
        } catch (startError) {
          console.error("Error starting recognition:", startError);
          toast({
            title: "Voice Recognition Failed",
            description: "Could not start listening. Please try again or reload the page.",
            variant: "destructive",
          });
          setIsListening(false);
        }
      } catch (e) {
        console.error("Failed to initialize speech recognition", e);
        toast({
          title: "Voice Recognition Error",
          description: "Failed to initialize voice recognition. Please try again or use a different browser.",
          variant: "destructive",
        });
        setIsListening(false);
      }
    }
  };
  
  // Helper function to extract transcript from recognition object
  let getTranscriptFromRecognition = () => "";

  // Multi-state text-to-speech: Play → Mute → Stop
  const toggleSpeaking = async () => {
    if (!isSpeechSupported) {
      toast({
        title: "Text-to-Speech Not Supported",
        description: "The text-to-speech service is not available.",
        variant: "destructive",
      });
      return;
    }
    
    console.log("VOICE DEBUG - toggleSpeaking called, current state:", isSpeaking, "muted:", isMuted);
    
    // If speaking and not muted, toggle to muted
    if (isSpeaking && !isMuted && audioRef.current) {
      audioRef.current.muted = true;
      setIsMuted(true);
      
      toast({
        title: "Sound Muted",
        description: "Audio playback is now muted. Click again to unmute or click a third time to stop.",
        duration: 2000,
      });
      return;
    }
    
    // If currently speaking and muted, toggle to unmuted or stop
    if (isSpeaking && isMuted && audioRef.current) {
      // Stop audio
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Reset state
      setIsSpeaking(false);
      setIsMuted(false);
      
      // Release object URL if it exists
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current.src = '';
      }
      
      toast({
        title: "Playback Stopped",
        description: "Audio playback has been stopped.",
        duration: 2000,
      });
      return;
    }
    
    // If not speaking, start playback
    if (!isSpeaking && audioRef.current) {
      // Start speaking with ElevenLabs
      if (!lastAssistantMessage) {
        toast({
          title: "No Message to Speak",
          description: "There is no assistant message to read aloud yet.",
        });
        return;
      }
      try {
        // Ensure any previous audio is fully stopped before proceeding
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        audioRef.current.currentTime = 0;
        
        // Clear previous audio source after a small delay
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current.src = '';
          
          // Small delay to ensure proper cleanup
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Set generating state to show loading indicator
        setIsGeneratingSpeech(true);
        
        // Show loading toast with longer duration
        toast({
          title: "Generating Speech",
          description: "Converting text to high-quality speech (this may take 10-15 seconds)...",
          duration: 20000, // 20 seconds to account for longer generation times
        });
        
        // Convert Markdown to plain text for better speech readability
        const plainText = stripMarkdown(lastAssistantMessage || '');
        console.log("Converting markdown to plain text for speech");
        
        // Call our backend endpoint with the plain text
        const response = await axios({
          method: 'post',
          url: '/api/text-to-speech',
          data: { text: plainText },
          responseType: 'blob'
        });
        
        // Create object URL for the audio blob
        const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Generation is complete
        setIsGeneratingSpeech(false);
        
        // Show success toast
        toast({
          title: "Speech Ready",
          description: "High-quality speech generated successfully!",
          duration: 3000,
        });
        
        // Debug log
        console.log("Setting up audio playback for URL:", audioUrl);
        
        // We're using only the Audio object approach now
        // No need for DOM audio element to avoid echo issues
        
        // Create a new Audio element each time to avoid stale state issues
        const newAudio = new Audio();
        audioRef.current = newAudio;
        
        // Add all event listeners
        newAudio.onended = () => {
          console.log("Audio playback ended");
          setIsSpeaking(false);
        };
        
        newAudio.onerror = (e) => {
          console.error("Audio playback error:", e);
          toast({
            title: "Audio Playback Error",
            description: "Failed to play the audio. Please try again.",
            variant: "destructive",
          });
          setIsSpeaking(false);
        };
        
        // Define the main audio setup function outside of the try block 
        // to avoid TypeScript strict mode issues
        const setupMainAudio = () => {
          // Set speaking state right before attempting to play
          setIsSpeaking(true);
          
          // Set up the audio source
          newAudio.src = audioUrl;
          
          // Use a callback to ensure the audio is loaded before playing
          newAudio.oncanplaythrough = () => {
            console.log("Audio can play through, attempting playback");
            
            // Try to play and handle errors
            try {
              const playPromise = newAudio.play();
              
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    console.log("Audio playback started successfully");
                    // Ensure speaking state is set to true
                    setIsSpeaking(true);
                    // Toast to confirm audio is playing
                    toast({
                      title: "Playing Audio",
                      description: "Audio playback started",
                    });
                  })
                  .catch(error => {
                    console.error("Error playing audio:", error);
                    toast({
                      title: "Playback Error",
                      description: "Could not play the audio. Please try again or check your browser settings.",
                      variant: "destructive",
                    });
                    setIsSpeaking(false);
                  });
              }
            } catch (err) {
              console.error("Exception during audio play attempt:", err);
              setIsSpeaking(false);
            }
          };
          
          // Trigger load of audio
          newAudio.load();
        };
        
        // Test browser audio playback capability with a very short silent sound
        try {
          const testAudio = new Audio();
          testAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
          
          // Try to play a silent sound to check if audio is working at all
          const testPromise = testAudio.play();
          if (testPromise !== undefined) {
            testPromise
              .then(() => {
                // Audio playback is allowed, proceed with real audio
                console.log("Browser audio test passed, proceeding with real audio");
                testAudio.pause();
                setupMainAudio();
              })
              .catch(err => {
                // Audio playback not allowed or other issue
                console.error("Browser audio test failed:", err);
                toast({
                  title: "Audio Permission Issue",
                  description: "Your browser is blocking audio playback. Please enable autoplay for this site.",
                  variant: "destructive",
                  duration: 5000,
                });
                setIsSpeaking(false);
                setIsGeneratingSpeech(false);
              });
          } else {
            // Just proceed if the browser doesn't return a promise
            setupMainAudio();
          }
        } catch (e) {
          console.error("Error during audio test:", e);
          // Proceed anyway
          setupMainAudio();
        }
        
        // Handle loading errors
        audioRef.current.onerror = () => {
          console.error("Error loading audio");
          toast({
            title: "Audio Loading Error",
            description: "Failed to load the audio. Please try again.",
            variant: "destructive",
          });
          setIsSpeaking(false);
          setIsGeneratingSpeech(false);
        };
      } catch (e) {
        console.error("Error with text-to-speech service:", e);
        toast({
          title: "Text-to-Speech Error",
          description: "Could not generate speech. Please check API key and try again.",
          variant: "destructive",
        });
        setIsGeneratingSpeech(false);
        setIsSpeaking(false);
      }
    } else {
      toast({
        title: "No Message to Speak",
        description: "There is no assistant message to read aloud.",
      });
    }
  };

  // Function to check microphone permission status without user prompt
  const checkMicrophonePermission = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      if (audioInputs.length === 0) {
        console.log("No audio input devices found");
        return false;
      }
      
      // This doesn't check permission, just presence of devices
      console.log(`Found ${audioInputs.length} audio input devices`);
      
      // Try the permission check (might not prompt user in some browsers)
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log("Microphone permission status:", permissionStatus.state);
      
      return permissionStatus.state === 'granted';
    } catch (err) {
      // Permissions API might not be supported
      console.error("Error checking microphone permission status:", err);
      return null; // unknown status
    }
  };
  
  // Check permission status on component mount
  useEffect(() => {
    // Use the checkMicrophonePermission function we defined
    checkMicrophonePermission().then((result) => {
      setHasMicPermission(result);
    });
  }, []);
  
  // Using the requestMicrophonePermission function defined earlier

  return (
    <div className="flex items-center gap-2">
      {/* Request Permission Button - visible when mic permission is unknown or denied */}
      {hasMicPermission === false && (
        <Button
          variant="outline"
          size="icon"
          className="bg-amber-900 border-amber-700 hover:bg-amber-800 text-white"
          onClick={requestMicrophonePermission}
          title="Grant microphone access"
        >
          <Mic className="h-5 w-5" />
        </Button>
      )}
      
      {/* Main mic button - listening toggle */}
      <Button
        variant="outline"
        size="icon"
        className={`bg-[#2A2A2A] border-[#444] hover:bg-[#333] ${isListening ? 'text-nvidia-green' : ''}`}
        onClick={toggleListening}
        disabled={!isVoiceSupported || hasMicPermission === false}
        title={isListening ? "Click again to stop and process your speech" : "Start voice input - click once to start, speak, then click again to process"}
      >
        {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </Button>
      
      {/* Multi-state speech button: Play → Mute → Stop */}
      <Button
        variant={!isLocalSpeaking ? "outline" : isMuted ? "default" : isLocalSpeaking ? "default" : "outline"}
        size="icon"
        className={`
          ${!isLocalSpeaking 
            ? `bg-[#2A2A2A] border-[#444] hover:bg-[#333] ${isGeneratingSpeech ? 'animate-pulse border-nvidia-green' : ''}` 
            : isMuted 
              ? 'bg-blue-600 hover:bg-blue-700 text-white border-0' 
              : 'bg-yellow-600 hover:bg-yellow-700 text-white border-0'
          }
        `}
        onClick={toggleSpeaking}
        disabled={!isSpeechSupported || (!isLocalSpeaking && !lastAssistantMessage) || isGeneratingSpeech}
        title={
          isGeneratingSpeech 
            ? "Generating speech..." 
            : !isLocalSpeaking
              ? "Read response aloud"
              : isMuted 
                ? "Unmute audio (click again to stop)"
                : "Mute audio (click again to stop)"
        }
      >
        {isGeneratingSpeech ? (
          <div className="h-5 w-5 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full border-2 border-nvidia-green border-t-transparent animate-spin" />
          </div>
        ) : !isLocalSpeaking ? (
          <Volume2 className="h-5 w-5" />
        ) : isMuted ? (
          <VolumeX className="h-5 w-5" />
        ) : (
          <Volume className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
};

export default VoiceControlsFixed;