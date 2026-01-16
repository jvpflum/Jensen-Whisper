import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, StopCircle, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { stripMarkdown } from "@/lib/utils";

interface VoiceControlsProps {
  onSpeechRecognized: (text: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
  isSpeaking: boolean;
  setIsSpeaking: (isSpeaking: boolean) => void;
  lastAssistantMessage: string | null | undefined;
}

const WhisperVoiceControls = ({
  onSpeechRecognized,
  isListening,
  setIsListening,
  isSpeaking,
  setIsSpeaking,
  lastAssistantMessage
}: VoiceControlsProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  // Start recording audio
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
        
        // Stop all tracks on the stream to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setIsListening(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({
        title: "Microphone Error",
        description: "Could not access your microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsListening(false);
    }
  };

  // Process audio and send to server for transcription
  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert the blob to a base64 string
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          
          // Send the audio data to the server
          const response = await fetch("/api/speech-to-text", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ audioData: base64data })
          });
          
          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }
          
          const result = await response.json();
          
          if (result && result.text) {
            console.log("Transcription received:", result.text);
            
            // Call the callback with the transcribed text
            onSpeechRecognized(result.text);
            
            toast({
              title: "Speech Recognized",
              description: result.text.length > 60 
                ? result.text.substring(0, 60) + '...' 
                : result.text
            });
          } else {
            throw new Error("No transcription returned");
          }
        } catch (error) {
          console.error("Error processing audio:", error);
          toast({
            title: "Transcription Failed",
            description: "Could not convert your speech to text.",
            variant: "destructive"
          });
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error preparing audio:", error);
      setIsProcessing(false);
      toast({
        title: "Processing Error",
        description: "Could not process audio recording.",
        variant: "destructive"
      });
    }
  };

  // Play the assistant's response
  const playAssistantResponse = async () => {
    if (!lastAssistantMessage) {
      toast({
        title: "Nothing to Play",
        description: "There is no assistant message to play.",
        variant: "default"
      });
      return;
    }
    
    try {
      setIsSpeaking(true);
      
      // Clean the markdown for better speech
      const cleanText = stripMarkdown(lastAssistantMessage);
      
      // Request speech from the API
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: cleanText }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to convert text to speech: ${response.status}`);
      }
      
      // Get audio data and play it
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        toast({
          title: "Audio Playback Error",
          description: "Could not play the audio response.",
          variant: "destructive"
        });
      };
      
      await audio.play();
    } catch (error) {
      console.error("Error playing assistant response:", error);
      setIsSpeaking(false);
      toast({
        title: "Text-to-Speech Error",
        description: "Could not generate or play speech. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Stop the assistant's response
  const stopSpeaking = () => {
    // This simple approach stops all audio playback
    document.querySelectorAll("audio").forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setIsSpeaking(false);
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Microphone button */}
      {!isRecording ? (
        <Button
          onClick={startRecording}
          disabled={isProcessing}
          size="sm"
          variant="outline"
          className={`w-8 h-8 p-0 ${isProcessing ? 'opacity-50' : 'hover:bg-nvidia-dark hover:text-nvidia-green'}`}
          aria-label="Start recording"
        >
          <Mic className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={stopRecording}
          size="sm"
          variant="outline"
          className="w-8 h-8 p-0 bg-nvidia-dark text-nvidia-green"
          aria-label="Stop recording"
        >
          <StopCircle className="h-4 w-4 animate-pulse" />
        </Button>
      )}

      {/* Text-to-speech button */}
      {!isSpeaking ? (
        <Button
          onClick={playAssistantResponse}
          disabled={!lastAssistantMessage}
          size="sm"
          variant="outline"
          className={`w-8 h-8 p-0 ${!lastAssistantMessage ? 'opacity-50' : 'hover:bg-nvidia-dark hover:text-nvidia-green'}`}
          aria-label="Play response"
        >
          <Volume2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={stopSpeaking}
          size="sm"
          variant="outline"
          className="w-8 h-8 p-0 bg-nvidia-dark text-nvidia-green"
          aria-label="Stop playing"
        >
          <VolumeX className="h-4 w-4" />
        </Button>
      )}

      {/* Recording status indicator */}
      {isProcessing && (
        <span className="text-xs text-nvidia-green animate-pulse">Processing...</span>
      )}
    </div>
  );
};

export default WhisperVoiceControls;