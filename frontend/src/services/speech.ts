export interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
}

export interface SpeechSynthesisOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export class SpeechService {
  private static instance: SpeechService;
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private isSpeaking = false;

  static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
    }
  }

  isSpeechRecognitionSupported(): boolean {
    return this.recognition !== null;
  }

  isSpeechSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  async startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError?: (error: string) => void,
    options?: SpeechRecognitionOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        const error = 'Speech recognition not supported';
        if (onError) onError(error);
        reject(new Error(error));
        return;
      }

      if (this.isListening) {
        this.stopListening();
      }

      // Configure recognition
      this.recognition.continuous = options?.continuous ?? false;
      this.recognition.interimResults = options?.interimResults ?? true;
      this.recognition.lang = options?.language ?? 'en-US';
      this.recognition.maxAlternatives = options?.maxAlternatives ?? 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('Speech recognition started');
        resolve();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        let isFinal = false;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          transcript += result[0].transcript;
          
          if (result.isFinal) {
            isFinal = true;
          }
        }

        onResult(transcript.trim(), isFinal);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        
        let errorMessage = 'Speech recognition failed';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access denied';
            break;
          case 'network':
            errorMessage = 'Network error during speech recognition';
            break;
        }
        
        if (onError) onError(errorMessage);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        console.log('Speech recognition ended');
      };

      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        const errorMessage = 'Failed to start speech recognition';
        if (onError) onError(errorMessage);
        reject(new Error(errorMessage));
      }
    });
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  async speak(
    text: string,
    options?: SpeechSynthesisOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSpeechSynthesisSupported()) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Stop any ongoing speech
      this.stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      if (options?.voice) utterance.voice = options.voice;
      if (options?.rate) utterance.rate = options.rate;
      if (options?.pitch) utterance.pitch = options.pitch;
      if (options?.volume) utterance.volume = options.volume;
      if (options?.language) utterance.lang = options.language;

      utterance.onstart = () => {
        this.isSpeaking = true;
        console.log('Speech synthesis started');
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        console.log('Speech synthesis ended');
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        console.error('Speech synthesis error:', event.error);
        reject(new Error(`Speech synthesis failed: ${event.error}`));
      };

      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  getPreferredVoice(language?: string): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    
    if (language) {
      // Try to find a voice for the specified language
      const languageVoices = voices.filter(voice => 
        voice.lang.startsWith(language.split('-')[0])
      );
      
      if (languageVoices.length > 0) {
        // Prefer local voices
        const localVoice = languageVoices.find(voice => voice.localService);
        return localVoice || languageVoices[0];
      }
    }
    
    // Fallback to default voice
    return voices.find(voice => voice.default) || voices[0] || null;
  }

  // Utility method to wait for voices to be loaded
  async waitForVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const voices = this.synthesis.getVoices();
      
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      
      // Wait for voices to be loaded
      this.synthesis.onvoiceschanged = () => {
        resolve(this.synthesis.getVoices());
      };
    });
  }
}

export const speechService = SpeechService.getInstance(); 