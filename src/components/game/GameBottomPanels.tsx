import { Chatbox } from '../Chatbox';
import { GameSidebar } from './GameSidebar';
import { RoomState } from '@/types';
import { cn } from '@/utils/cn';

interface GameBottomPanelsProps {
    messages: any[];
    guesses: any[];
    onSendChat: (msg: string) => void;
    onSendGuess: (msg: string) => void;
    isDrawer: boolean;
    mobilePanel: 'guesses' | 'chat' | 'leaderboard';
    setMobilePanel: (panel: 'guesses' | 'chat' | 'leaderboard') => void;
    gameState: RoomState;
    playerId: string;
}

export function GameBottomPanels({
    messages,
    guesses,
    onSendChat,
    onSendGuess,
    isDrawer,
    mobilePanel,
    setMobilePanel,
    gameState,
    playerId
}: GameBottomPanelsProps) {
    const isGuessingDisabled = isDrawer || gameState.status !== 'DRAWING' || gameState.players[playerId]?.hasGuessed;

    return (
        <>
            {/* Desktop: Guesses + Chat below canvas */}
            <div className="hidden lg:flex gap-4 mt-4 h-64 shrink-0 w-full mx-auto" style={{ maxWidth: '100%' }}>
                <div className="flex-1 min-h-0 overflow-hidden shadow-sm">
                    <Chatbox 
                        messages={guesses} 
                        onSendMessage={onSendGuess} 
                        isDrawer={isDrawer} 
                        title="Guesses" 
                        showInput={true}
                        placeholder={isDrawer ? "Drawing..." : gameState.status !== 'DRAWING' ? "Waiting for round..." : "Type guess..."}
                        disabled={isGuessingDisabled}
                    />
                </div>
                <div className="flex-1 min-h-0 overflow-hidden shadow-sm">
                    <Chatbox 
                        messages={messages} 
                        onSendMessage={onSendChat} 
                        isDrawer={false} /* Chat should never be completely disabled for being the drawer */
                        title="Chat" 
                        showInput={true}
                        placeholder="Type message..."
                    />
                </div>
            </div>

            {/* Mobile: Tabbed panel below canvas */}
            <div className="lg:hidden flex gap-2 md:gap-4 mt-3 h-[35vh] min-h-[160px] max-h-[250px] shrink-0 w-full mx-auto" style={{ maxWidth: '100%' }}>
                <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex gap-2 mb-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setMobilePanel('guesses')}
                            className={cn(
                                "flex-1 px-2 py-2 rounded-xl text-[10px] md:text-sm font-black uppercase tracking-widest transition-colors",
                                mobilePanel === 'guesses' ? "bg-pd-sky text-white" : "bg-pd-surface-alt text-pd-text-muted"
                            )}
                        >
                            Guesses
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobilePanel('chat')}
                            className={cn(
                                "flex-1 px-2 py-2 rounded-xl text-[10px] md:text-sm font-black uppercase tracking-widest transition-colors",
                                mobilePanel === 'chat' ? "bg-pd-sky text-white" : "bg-pd-surface-alt text-pd-text-muted"
                            )}
                        >
                            Chat
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobilePanel('leaderboard')}
                            className={cn(
                                "flex-1 px-2 py-2 rounded-xl text-[10px] md:text-sm font-black uppercase tracking-widest transition-colors",
                                mobilePanel === 'leaderboard' ? "bg-pd-sky text-white" : "bg-pd-surface-alt text-pd-text-muted"
                            )}
                        >
                            Scores
                        </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden shadow-sm">
                        {mobilePanel === 'leaderboard' ? (
                            <GameSidebar gameState={gameState} playerId={playerId} />
                        ) : mobilePanel === 'guesses' ? (
                            <Chatbox 
                                messages={guesses} 
                                onSendMessage={onSendGuess} 
                                isDrawer={isDrawer} 
                                title="Guesses" 
                                showInput={true}
                                placeholder={isDrawer ? "Drawing..." : gameState.status !== 'DRAWING' ? "Waiting for round..." : "Type guess..."}
                                disabled={isGuessingDisabled}
                            />
                        ) : (
                            <Chatbox 
                                messages={messages} 
                                onSendMessage={onSendChat} 
                                isDrawer={false} 
                                title="Chat" 
                                showInput={true}
                                placeholder="Type message..."
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
