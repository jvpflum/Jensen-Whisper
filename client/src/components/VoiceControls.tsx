import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Square, Volume } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import axios from "axios";

interface VoiceControlsProps {
  onSpeechRecognized: (text: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  isSpeaking: boolean;
  setIsSpeaking: (isSpeaking: boolean) => void;
  lastAssistantMessage: string | null | undefined;
}

const VoiceControls = ({
  onSpeechRecognized,
  isListening,
  setIsListening,
  isSpeaking,
  setIsSpeaking,
  lastAssistantMessage
}: VoiceControlsProps) => {
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true); // Always enable ElevenLabs TTS
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  // Add a local state that we control directly
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
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

  // Check if browser supports speech recognition
  useEffect(() => {
    // Initialize audio element for ElevenLabs playback
    audioRef.current = new Audio();
    
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
    
    // Set up audio events with null check
    if (audioRef.current) {
      audioRef.current.onended = () => {
        console.log("VOICE DEBUG - Audio onended event fired");
        // Add a small delay before setting isSpeaking to false to avoid race conditions
        setTimeout(() => {
          console.log("VOICE DEBUG - Setting isSpeaking to false after playback ended");
          setIsSpeaking(false);
        }, 300);
      };
      
      audioRef.current.onerror = () => {
        console.error("Audio playback error");
        toast({
          title: "Audio Playback Error",
          description: "Failed to play the audio. Please try again.",
          variant: "destructive",
        });
        setIsSpeaking(false);
      };
    }
    
    // Check for SpeechRecognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsVoiceSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join("");
        
        if (event.results[0].isFinal) {
          onSpeechRecognized(transcript);
          // Automatically stop listening after getting a result
          setIsListening(false);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        toast({
          title: "Voice Recognition Error",
          description: `Error: ${event.error}. Please try again.`,
          variant: "destructive",
        });
        setIsListening(false);
      };
    }
    
    // Cleanup function
    return () => {
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
      
      // Clean up audio playback
      if (audioRef.current) {
        if (!audioRef.current.paused) {
          audioRef.current.pause();
        }
        
        // Release object URL if it exists
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        
        audioRef.current.src = '';
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      }
    };
  }, [isListening, isSpeaking, onSpeechRecognized, setIsListening, setIsSpeaking]);

  // Toggle speech recognition
  const toggleListening = () => {
    if (!isVoiceSupported) {
      toast({
        title: "Voice Recognition Not Supported",
        description: "Your browser doesn't support voice recognition. Try using Chrome, Edge, or Safari.",
        variant: "destructive",
      });
      return;
    }
    
    if (isListening) {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        setIsListening(false);
        toast({
          title: "Voice Input Stopped",
          description: "Voice recognition has been turned off.",
        });
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
        
        // Setup all event handlers
        recognitionRef.current.onresult = (event: any) => {
          console.log("Recognition result received", event);
          try {
            const transcript = Array.from(event.results)
              .map((result: any) => result[0])
              .map((result: any) => result.transcript)
              .join("");
            
            console.log("Transcript:", transcript);
            
            if (event.results[0].isFinal) {
              console.log("Final result, sending to handler");
              onSpeechRecognized(transcript);
              // Automatically stop listening after getting a result
              setIsListening(false);
              toast({
                title: "Understood!",
                description: `"${transcript.substring(0, 50)}${transcript.length > 50 ? '...' : ''}"`,
              });
            }
          } catch (err) {
            console.error("Error processing speech results:", err);
          }
        };
        
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
          console.log("Speech recognition ended");
          // Only set to false if we're not explicitly stopping (handled elsewhere)
          if (isListening) {
            setIsListening(false);
          }
        };
        
        // Start the recognition and handle any immediate errors
        console.log("Attempting to start recognition...");
        
        // Wrap in a try-catch to handle any immediate errors
        try {
          recognitionRef.current.start();
          console.log("Recognition started successfully");
          setIsListening(true);
          toast({
            title: "Listening...",
            description: "Speak now. I'm listening for your command.",
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
  
  // Multi-state text-to-speech: Play → Mute → Stop (in a single button)
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
      
      // Release object URL if it exists
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
        audioRef.current.src = '';
      }
      
      // Reset state
      setIsSpeaking(false);
      setIsMuted(false);
      
      toast({
        title: "Playback Stopped",
        description: "Audio playback has been stopped.",
        duration: 2000,
      });
      return;
    }
    
    // If not speaking, start speech generation and playback
    if (!isSpeaking && lastAssistantMessage && audioRef.current) {
      // Start speaking with text-to-speech service
      try {
        // If there's already an audio source, clean it up first
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
          audioRef.current.src = '';
        }
        
        // Set generating state to show loading indicator
        setIsGeneratingSpeech(true);
        
        // Show loading toast with longer duration
        toast({
          title: "Generating Speech",
          description: "Converting text to high-quality speech (this may take 10-15 seconds)...",
          duration: 20000, // 20 seconds to account for longer generation times
        });
        
        // Call our backend endpoint with the text
        const response = await axios({
          method: 'post',
          url: '/api/text-to-speech',
          data: { text: lastAssistantMessage },
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
        
        // Set the audio source
        audioRef.current.src = audioUrl;
        audioRef.current.muted = false; // Ensure it's not muted
        setIsMuted(false);
        
        // Set isSpeaking to true right before playing
        setIsSpeaking(true);
        
        // Play the audio
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log("Audio playback started successfully");
            })
            .catch(error => {
              console.error("Error playing audio:", error);
              toast({
                title: "Playback Error",
                description: "Could not play the audio. Please try again.",
                variant: "destructive",
              });
              setIsSpeaking(false);
            });
        }
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
    } else if (!lastAssistantMessage) {
      toast({
        title: "No Message to Speak",
        description: "There is no assistant message to read aloud.",
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className={`bg-[#2A2A2A] border-[#444] hover:bg-[#333] ${isListening ? 'text-nvidia-green' : ''}`}
        onClick={toggleListening}
        disabled={!isVoiceSupported}
        title={isListening ? "Stop listening" : "Start voice input"}
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

export default VoiceControls;