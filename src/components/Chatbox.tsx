import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { SendHorizontal } from 'lucide-react';

interface ChatMessage {
    id: string;
    playerName: string;
    message?: string;
    isSystem?: boolean;
    scoreGained?: number;
}

interface ChatboxProps {
    messages: ChatMessage[];
    onSendMessage: (msg: string) => void;
    isDrawer: boolean; // Retained for backwards compatibility if needed
    title?: string;
    showInput?: boolean;
    placeholder?: string;
    disabled?: boolean;
}

export function Chatbox({ messages, onSendMessage, isDrawer, title, showInput = true, placeholder, disabled }: ChatboxProps) {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const isDisabled = disabled !== undefined ? disabled : isDrawer;
    const inputPlaceholder = placeholder || (isDisabled ? "Drawing..." : "Type here...");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!showInput) return;
        if (input.trim() && !isDisabled) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-pd-surface rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-pd-surface-alt p-2 md:p-3 shrink-0">
                <h3 className="text-pd-text font-black text-[10px] md:text-sm tracking-widest uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pd-sky animate-pulse" />
                    {title || 'Guesses & Chat'}
                </h3>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3 min-h-0">
                {messages.map((msg) => (
                    <div key={msg.id} className="text-xs md:text-sm">
                        {msg.isSystem ? (
                            <div className="bg-pd-green/15 text-pd-green rounded-lg p-2 text-center font-bold animate-in fade-in slide-in-from-bottom-1 border border-pd-green/20">
                                {msg.playerName} {msg.message || `guessed the word! (+${msg.scoreGained})`}
                            </div>
                        ) : (
                            <div className="flex gap-1.5 md:gap-2 break-words items-baseline bg-pd-surface-alt/30 p-2 rounded-lg">
                                <span className="font-black text-pd-sky shrink-0">{msg.playerName}:</span>
                                <span className="text-pd-text font-medium">{msg.message}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {showInput && (
                <form onSubmit={handleSubmit} className="p-2 md:p-3 bg-pd-surface-alt/50 border-t border-pd-surface-alt flex gap-2 shrink-0">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={inputPlaceholder}
                        disabled={isDisabled}
                        className="flex-1 bg-pd-surface rounded-xl px-3 py-1.5 md:py-2 text-xs md:text-sm text-pd-text placeholder:text-pd-text-muted/50 focus:outline-none focus:ring-2 focus:ring-pd-sky/30 disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
                        maxLength={50}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isDisabled}
                        className="rounded-xl h-8 w-8 md:h-10 md:w-10 shrink-0"
                    >
                        <SendHorizontal className="w-4 h-4 md:w-5 md:h-5" />
                    </Button>
                </form>
            )}
        </div>
    );
}
