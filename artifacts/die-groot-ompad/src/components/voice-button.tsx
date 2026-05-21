import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoice } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: "sm" | "default" | "icon";
}

export function VoiceInputButton({ onTranscript, className, size = "icon" }: VoiceInputButtonProps) {
  const { listen, stopListening, isListening, isSupported } = useVoice();

  if (!isSupported) return null;

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      listen(onTranscript);
    }
  };

  return (
    <Button
      type="button"
      variant={isListening ? "default" : "outline"}
      size={size}
      onClick={handleClick}
      className={cn(
        "shrink-0 transition-all",
        isListening && "bg-red-500 hover:bg-red-600 border-red-500 animate-pulse",
        className
      )}
      title={isListening ? "Stop listening" : "Speak to fill this field"}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}

interface VoiceSpeakButtonProps {
  text: string;
  className?: string;
}

export function VoiceSpeakButton({ text, className }: VoiceSpeakButtonProps) {
  const { speak, stopSpeaking, isSpeaking } = useVoice();

  if (!("speechSynthesis" in window)) return null;

  const handleClick = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn(
        "shrink-0 text-muted-foreground hover:text-foreground",
        isSpeaking && "text-primary animate-pulse",
        className
      )}
      title={isSpeaking ? "Stop speaking" : "Read aloud"}
    >
      {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );
}

interface VoiceFieldProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  speakable?: boolean;
  appendMode?: boolean;
}

export function VoiceField({ value, onChange, children, speakable = false, appendMode = false }: VoiceFieldProps) {
  const { listen, stopListening, isListening, isSupported } = useVoice();
  const { speak, stopSpeaking, isSpeaking } = useVoice();

  const handleTranscript = (text: string) => {
    onChange(appendMode && value ? `${value} ${text}` : text);
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1">{children}</div>
      {isSupported && (
        <Button
          type="button"
          variant={isListening ? "default" : "outline"}
          size="icon"
          onClick={() => isListening ? stopListening() : listen(handleTranscript)}
          className={cn(
            "shrink-0 h-9 w-9 transition-all",
            isListening && "bg-red-500 hover:bg-red-600 border-red-500 animate-pulse"
          )}
          title={isListening ? "Stop listening" : "Speak to fill"}
        >
          {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </Button>
      )}
      {speakable && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => isSpeaking ? stopSpeaking() : speak(value)}
          className={cn(
            "shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground",
            isSpeaking && "text-primary animate-pulse"
          )}
          title={isSpeaking ? "Stop" : "Read aloud"}
        >
          {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );
}

