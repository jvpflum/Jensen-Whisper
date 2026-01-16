// Type definitions for Web Speech API
// Since TypeScript doesn't include these by default, we need to add them

interface Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
  mozSpeechRecognition: any;
  msSpeechRecognition: any;
  getTranscriptFromRecognition?: () => string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionError extends Event {
  error: string;
  message: string;
}

interface SpeechSynthesisEvent extends Event {
  utterance: SpeechSynthesisUtterance;
  charIndex: number;
  charLength: number;
  elapsedTime: number;
  name: string;
}