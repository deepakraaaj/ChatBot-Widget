export type VoiceError = "not-allowed" | "no-speech" | "network" | "unknown";

interface UseVoiceInputReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  error: VoiceError | null;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
}

const noop = () => undefined;

function useVoiceInput(): UseVoiceInputReturn {
  return {
    isSupported: false,
    isListening: false,
    transcript: "",
    error: null,
    startListening: noop,
    stopListening: noop,
    clearTranscript: noop,
  };
}

export { useVoiceInput };
