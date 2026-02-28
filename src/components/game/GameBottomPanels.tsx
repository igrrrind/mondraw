import { Chatbox } from '../Chatbox';
import { GameSidebar } from './GameSidebar';
import { RoomState } from '@/types';
import { cn } from '@/utils/cn';

interface GameBottomPanelsProps {
    messages: any[];
    onSendMessage: (msg: string) => void;
    isDrawer: boolean;
    mobilePanel: 'guesses' | 'chat';
    setMobilePanel: (panel: 'guesses' | 'chat') => void;
    gameState: RoomState;
    playerId: string;
}

export function GameBottomPanels({
    messages,
    onSendMessage,
    isDrawer,
    mobilePanel,
    setMobilePanel,
    gameState,
    playerId
}: GameBottomPanelsProps) {
    return (
        <>
            {/* Desktop: Guesses + Chat below canvas */}
            <div className="hidden lg:flex gap-2 md:gap-4 mt-2 md:mt-3 h-1/3 min-h-[120px] max-h-[280px] shrink-0 w-full mx-auto" style={{ maxWidth: '100%' }}>
                <div className="flex-1 min-h-0 overflow-hidden shadow-sm">
                    <Chatbox messages={messages} onSendMessage={onSendMessage} isDrawer={isDrawer} title="Guesses" showInput={false} />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden shadow-sm">
                    <Chatbox messages={messages} onSendMessage={onSendMessage} isDrawer={isDrawer} title="Chat" />
                </div>
            </div>

            {/* Mobile: Leaderboard + tabbed panel below canvas */}
            <div className="lg:hidden flex gap-2 md:gap-4 mt-2 md:mt-3 h-2/5 min-h-[140px] max-h-[320px] shrink-0 w-full mx-auto" style={{ maxWidth: '100%' }}>
                <div className="w-1/2 min-h-0 overflow-hidden shadow-sm">
                    <GameSidebar gameState={gameState} playerId={playerId} />
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex gap-2 mb-2">
                        <button
                            type="button"
                            onClick={() => setMobilePanel('guesses')}
                            className={cn(
                                "flex-1 px-3 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors",
                                mobilePanel === 'guesses' ? "bg-pd-sky text-white" : "bg-pd-surface-alt text-pd-text-muted"
                            )}
                        >
                            Guesses
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobilePanel('chat')}
                            className={cn(
                                "flex-1 px-3 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors",
                                mobilePanel === 'chat' ? "bg-pd-sky text-white" : "bg-pd-surface-alt text-pd-text-muted"
                            )}
                        >
                            Chat
                        </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden shadow-sm">
                        {mobilePanel === 'guesses' ? (
                            <Chatbox messages={messages} onSendMessage={onSendMessage} isDrawer={isDrawer} title="Guesses" showInput={false} />
                        ) : (
                            <Chatbox messages={messages} onSendMessage={onSendMessage} isDrawer={isDrawer} title="Chat" />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
