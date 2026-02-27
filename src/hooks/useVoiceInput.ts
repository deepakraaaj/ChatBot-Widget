import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  TypeScript shim — SpeechRecognition is not in lib.dom by default  */
/* ------------------------------------------------------------------ */
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
    if (typeof window === "undefined") return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    return (
        w.SpeechRecognition ||
        w.webkitSpeechRecognition ||
        w.mozSpeechRecognition ||
        w.msSpeechRecognition ||
        null
    );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                              */
/* ------------------------------------------------------------------ */
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

export function useVoiceInput(): UseVoiceInputReturn {
    const Ctor = getSpeechRecognitionCtor();
    const isSupported = Ctor !== null;

    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [error, setError] = useState<VoiceError | null>(null);

    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    /* ---- cleanup on unmount ---- */
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {
                    // ignore
                }
                recognitionRef.current = null;
            }
        };
    }, []);

    /* ---- startListening ---- */
    const startListening = useCallback(() => {
        if (!Ctor) return;

        setError(null);
        setTranscript("");

        // Tear down any previous instance
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch {
                // ignore
            }
        }

        const recognition = new Ctor();
        // NON-continuous: stops after a natural pause — perfect for chat input
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            // In non-continuous mode the API provides a single result entry
            // whose transcript is progressively refined. Just read the latest.
            const latest = event.results[event.results.length - 1];
            setTranscript(latest[0].transcript.trim());
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            const map: Record<string, VoiceError> = {
                "not-allowed": "not-allowed",
                "service-not-allowed": "not-allowed",
                "no-speech": "no-speech",
                network: "network",
            };
            setError(map[event.error] || "unknown");
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch {
            setError("unknown");
        }
    }, [Ctor]);

    /* ---- stopListening ---- */
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // ignore
            }
        }
        setIsListening(false);
    }, []);

    /* ---- clearTranscript ---- */
    const clearTranscript = useCallback(() => {
        setTranscript("");
    }, []);

    return {
        isSupported,
        isListening,
        transcript,
        error,
        startListening,
        stopListening,
        clearTranscript,
    };
}
