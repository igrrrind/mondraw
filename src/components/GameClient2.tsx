"use client";

import { useEffect, useState } from 'react';
import PusherClient from 'pusher-js';
import { PresenceChannel } from 'pusher-js';
import { RoomState, Pokemon } from '@/types';
import confetti from 'canvas-confetti';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

import { GameHeader } from './game/GameHeader';
import { GameSidebar } from './game/GameSidebar';
import { GameArea } from './game/GameArea';
import { GameBottomPanels } from './game/GameBottomPanels';

interface GameClient2Props {
    roomId: string;
    initialState: RoomState;
    playerName: string;
}

export function GameClient2({ roomId, initialState, playerName }: GameClient2Props) {
    const [gameState, setGameState] = useState<RoomState>(initialState);
    const [messages, setMessages] = useState<any[]>([]);
    const [guesses, setGuesses] = useState<any[]>([]);
    const [playerId, setPlayerId] = useState<string>('');
    const [targetPokemon, setTargetPokemon] = useState<Pokemon | undefined>(undefined);
    const [timeRemaining, setTimeRemaining] = useState(() => {
        if (initialState.status === 'LOBBY' || !initialState.roundStartTime) return 60;
        
        const totalTime = initialState.status === 'SELECTING' ? 15 : 
                         initialState.status === 'ROUND_END' ? 10 : 60;
        
        const elapsed = Math.floor((Date.now() - initialState.roundStartTime) / 1000);
        return Math.max(0, totalTime - elapsed);
    });
    const [pusher, setPusher] = useState<PusherClient | null>(null);
    const [revealedWord, setRevealedWord] = useState<string>('');
    const [revealedId, setRevealedId] = useState<number>(25);
    const [mobilePanel, setMobilePanel] = useState<'guesses' | 'chat' | 'leaderboard'>('guesses');
    const [lastInteraction, setLastInteraction] = useState<number>(Date.now());

    // Expose interaction handler for children components
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).handleInteraction = () => setLastInteraction(Date.now());
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete (window as any).handleInteraction;
            }
        };
    }, []);

    const currentPlayer = gameState.players[playerId];
    const isDrawer = currentPlayer?.isDrawer || false;

    // Handle inactivity
    useEffect(() => {
        const checkInactivity = setInterval(() => {
            const now = Date.now();
            if (now - lastInteraction > 60000) { // 60 seconds
                handleLeaveRoom();
            }
        }, 5000); // Check every 5s

        return () => clearInterval(checkInactivity);
    }, [lastInteraction]);

    const handleInteraction = () => {
        setLastInteraction(Date.now());
    };

    const handleLeaveRoom = async () => {
        try {
            await fetch('/api/room/leave', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId })
            });
            window.location.href = '/?error=inactivity';
        } catch (err) {
            console.error("Failed to leave room", err);
            window.location.href = '/';
        }
    };

    // Load initial target pokemon if drawing
    useEffect(() => {
        if (initialState.status === 'DRAWING' && initialState.currentWord && !targetPokemon) {
            // Reconstruct minimal pokemon object for UI from ID/Name
            setTargetPokemon({
                id: initialState.currentPokemonId || 0,
                pokedex_id: initialState.currentPokemonId || 0,
                name: initialState.currentWord,
                generation: 1, // Placeholder
                rarity: 1
            });
        }
    }, [initialState]);

    // Pusher setup
    useEffect(() => {
        let finalName = playerName;
        if (typeof window !== 'undefined') {
            const savedName = localStorage.getItem('pokedraw_player_name');
            if (savedName) finalName = savedName;
        }

        if (!finalName) return;

        let stableUserId = sessionStorage.getItem('pokedraw_user_id');
        if (!stableUserId) {
            stableUserId = Math.random().toString(36).substring(2, 10);
            sessionStorage.setItem('pokedraw_user_id', stableUserId);
        }

        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            authEndpoint: `/api/pusher/auth?playerName=${encodeURIComponent(finalName)}&userId=${stableUserId}`,
        });

        setPusher(pusher);

        const channel = pusher.subscribe(`presence-room-${roomId}`) as PresenceChannel;

        channel.bind("pusher:subscription_succeeded", async () => {
            const myID = channel.members.myID;
            setPlayerId(myID);

            await fetch('/api/room/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId: myID, playerName: finalName })
            });
        });

        channel.bind("word-selection-started", (data: any) => {
            setGameState(prev => ({
                ...prev,
                status: data.status,
                currentRound: data.currentRound,
                players: data.players,
                wordOptions: data.wordOptions
            }));
            setTimeRemaining(15);
        });

        channel.bind("round-ended", (data: any) => {
            setGameState(prev => ({
                ...prev,
                status: data.status,
                players: data.players,
                currentRound: data.currentRound
            }));
            setTargetPokemon(undefined);
            setRevealedWord(data.revealedWord);
            setRevealedId(data.revealedId);
            setTimeRemaining(10);

            if (data.status === 'GAME_OVER') {
                triggerConfetti();
                setTimeRemaining(15);
            }
        });

        channel.bind("round-started", (data: any) => {
            setGameState(prev => ({
                ...prev,
                status: data.status,
                currentRound: data.currentRound,
                players: data.players
            }));
            setTargetPokemon(data.targetPokemon);
            setTimeRemaining(60);
        });

        channel.bind("chat-message", (data: any) => {
            setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), ...data }]);
        });

        channel.bind("guess-attempt", (data: any) => {
            setGuesses(prev => [...prev, { id: Date.now().toString() + Math.random(), ...data }]);
        });

        channel.bind("word-guessed", (data: any) => {
            const sysMsg = { id: Date.now().toString() + Math.random(), isSystem: true, ...data };
            setGuesses(prev => [...prev, sysMsg]);
            setMessages(prev => [...prev, sysMsg]);

            if (data.players) {
                setGameState(prev => ({ ...prev, players: data.players }));
            }

            if (channel.members.myID === data.playerId) {
                triggerConfetti();
            }
        });

        channel.bind("timer-sync", (data: any) => {
            if (typeof data.timeRemaining === 'number') {
                setTimeRemaining(data.timeRemaining);
            }
        });

        return () => {
            pusher.unsubscribe(`presence-room-${roomId}`);
            pusher.disconnect();
        };
    }, [roomId, playerName]);

    // Handle visibility change to resync game state
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                try {
                    const response = await fetch('/api/room/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roomId })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        setGameState(prev => ({
                            ...prev,
                            status: data.status,
                            players: data.players,
                            currentRound: data.currentRound,
                            currentWord: data.currentWord,
                            currentPokemonId: data.currentPokemonId,
                            wordOptions: data.wordOptions
                        }));
                        setTimeRemaining(data.timeRemaining);

                        // If we are drawing and word just synced, update target pokemon
                        if (data.status === 'DRAWING' && data.currentWord) {
                            setTargetPokemon({
                                id: data.currentPokemonId || 0,
                                pokedex_id: data.currentPokemonId || 0,
                                name: data.currentWord,
                                generation: 1,
                                rarity: 1
                            });
                        }
                    }
                } catch (err) {
                    console.error("Failed to sync room state", err);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [roomId]);

    // Timer logic
    useEffect(() => {
        if (gameState.status === 'LOBBY') return;

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                if (gameState.status === 'ROUND_END') {
                    if (prev <= 1 && isDrawer) {
                        fetch('/api/room/start-round', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ roomId })
                        });
                    }
                    return Math.max(0, prev - 1);
                }

                if (prev <= 1 && gameState.status === 'SELECTING') {
                    fetch('/api/room/skip-selection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roomId })
                    });
                }

                if (prev <= 1 && gameState.status === 'DRAWING' && isDrawer) {
                    fetch('/api/room/end-round', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roomId })
                    });
                }

                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState.status, isDrawer, roomId, gameState.currentRound]);

    useEffect(() => {
        if (gameState.status === 'GAME_OVER') {
            const timer = setInterval(() => {
                setTimeRemaining((prev) => {
                    if (prev <= 1 && isDrawer) {
                        fetch('/api/room/start-round', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ roomId })
                        });
                    }
                    return Math.max(0, prev - 1);
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [gameState.status, isDrawer, roomId]);

    const handleStartGame = async () => {
        try {
            await fetch('/api/room/start-round', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId })
            });
        } catch (err) {
            console.error("Failed to start game", err);
        }
    };

    const handleSelectPokemon = async (pokemonName: string) => {
        try {
            await fetch('/api/room/select-pokemon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId, playerId, pokemonName })
            });
        } catch (err) {
            console.error("Failed to select pokemon", err);
        }
    };

    const triggerConfetti = () => {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#ff3c3c', '#3b82f6', '#f97316', '#10B981']
        });
    };

    const handleSendGuess = async (msg: string) => {
        handleInteraction();
        // Prevent guessing if already guessed correctly this round
        if (currentPlayer?.hasGuessed) return;
        
        try {
            await fetch('/api/game/guess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    playerId,
                    guess: msg,
                    timeRemaining,
                    totalRoundTime: 60
                })
            });
        } catch (err) {
            console.error("Failed to send guess", err);
        }
    };

    const handleSendChat = async (msg: string) => {
        handleInteraction();
        try {
            await fetch('/api/game/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    playerId,
                    playerName,
                    message: msg
                })
            });
        } catch (err) {
            console.error("Failed to send chat", err);
        }
    };

    if (!playerId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-pd-bg text-pd-text font-sans">
                <Loader2 className="w-12 h-12 text-pd-sky animate-spin mb-4" />
                <h2 className="text-xl font-bold animate-pulse">Connecting to Lobby {roomId}...</h2>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex flex-col h-screen min-h-[575px] bg-pd-bg p-2 md:p-4 font-sans overflow-y-auto overflow-x-hidden transition-colors duration-300",
            isDrawer && "max-md:p-0"
        )}>
                <GameHeader 
                    roomId={roomId} 
                    gameState={gameState} 
                    timeRemaining={timeRemaining} 
                    onStartGame={handleStartGame} 
                />
     

            <div className={cn(
                "flex flex-col lg:flex-row gap-2 md:gap-4 flex-1 min-h-0",
                isDrawer && "max-md:gap-0"
            )}>
                <div className="flex-1 flex flex-col min-w-0 min-h-0 items-center w-full">
                    <div className={cn(
                        "flex-1 shrink min-h-0 flex flex-col items-center justify-center w-full transition-all duration-300 relative",
                        isDrawer ? "h-full" : ""
                    )}>
                        <GameArea 
                            gameState={gameState}
                            isDrawer={isDrawer}
                            targetPokemon={targetPokemon}
                            revealedWord={revealedWord}
                            revealedId={revealedId}
                            timeRemaining={timeRemaining}
                            roomId={roomId}
                            pusher={pusher}
                            onSelectPokemon={handleSelectPokemon}
                        />

                        {/* Timer Bar - Positioned absolutely under GameArea */}
                        {!isDrawer && gameState.status !== 'LOBBY' && gameState.status !== 'GAME_OVER' && (
                            <div className="absolute bottom-[-8px] left-0 w-full h-1.5 bg-pd-surface-alt rounded-full overflow-hidden shrink-0 animate-phase-in z-10">
                                <div
                                    className={cn(
                                        "h-full transition-all duration-1000 ease-linear rounded-full",
                                        timeRemaining < 10 ? "bg-pd-red" : "bg-pd-sky"
                                    )}
                                    style={{
                                        width: `${(timeRemaining / (
                                            gameState.status === 'SELECTING' ? 15 :
                                                gameState.status === 'ROUND_END' ? 10 : 60
                                        )) * 100}%`
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className={cn("w-full transition-all duration-300 shrink-0", isDrawer ? "hidden lg:block" : "block")}>
                        <GameBottomPanels 
                            messages={messages}
                            guesses={guesses}
                            onSendChat={handleSendChat}
                            onSendGuess={handleSendGuess}
                            isDrawer={isDrawer}
                            mobilePanel={mobilePanel}
                            setMobilePanel={setMobilePanel}
                            gameState={gameState}
                            playerId={playerId}
                        />
                    </div>
                </div>

                {/* Desktop: Leaderboard sidebar */}
                <div className={cn(
                    "hidden lg:flex lg:w-80 xl:w-76 flex-col shrink-0 h-full animate-phase-in transition-all duration-300",
                    isDrawer ? "lg:flex" : "lg:flex" 
                )}>
                    <GameSidebar gameState={gameState} playerId={playerId} />
                </div>
            </div>
        </div>
    );
}
