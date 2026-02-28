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
    const [playerId, setPlayerId] = useState<string>('');
    const [targetPokemon, setTargetPokemon] = useState<Pokemon | undefined>(undefined);
    const [timeRemaining, setTimeRemaining] = useState(60);
    const [pusher, setPusher] = useState<PusherClient | null>(null);
    const [revealedWord, setRevealedWord] = useState<string>('');
    const [revealedId, setRevealedId] = useState<number>(25);
    const [mobilePanel, setMobilePanel] = useState<'guesses' | 'chat'>('guesses');

    const currentPlayer = gameState.players[playerId];
    const isDrawer = currentPlayer?.isDrawer || false;

    // Pusher setup
    useEffect(() => {
        let finalName = playerName;
        if (typeof window !== 'undefined') {
            const savedName = localStorage.getItem('pokedraw_player_name');
            if (savedName) finalName = savedName;
        }

        if (!finalName) return;

        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            authEndpoint: `/api/pusher/auth?playerName=${encodeURIComponent(finalName)}`,
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

        channel.bind("word-guessed", (data: any) => {
            setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), isSystem: true, ...data }]);

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
        if (gameState.status === 'GAME_OVER' && timeRemaining <= 0) {
            window.location.href = '/';
        }
    }, [gameState.status, timeRemaining]);

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

    const handleSendMessage = async (msg: string) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), playerName, message: msg }]);

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
            console.error("Failed to send message", err);
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
        <div className="flex flex-col h-screen min-h-[575px] bg-pd-bg p-2 md:p-4 font-sans overflow-y-auto overflow-x-hidden">
            <GameHeader 
                roomId={roomId} 
                gameState={gameState} 
                timeRemaining={timeRemaining} 
                onStartGame={handleStartGame} 
            />

            <div className="flex flex-col lg:flex-row gap-2 md:gap-4 flex-1 min-h-0">
                <div className="flex-1 flex flex-col min-w-0 min-h-0 items-center w-full">
                    <div className={cn(
                        "flex-1 min-h-0 flex flex-col items-center justify-center w-full transition-all duration-300",
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
                    </div>

                    {/* Timer Bar */}
                    {gameState.status !== 'LOBBY' && gameState.status !== 'GAME_OVER' && (
                        <div className="w-full h-2 bg-pd-surface-alt rounded-full mt-2 md:mt-3 overflow-hidden shrink-0 animate-phase-in mx-auto" style={{ maxWidth: '100%', aspectRatio: '16/9', maxHeight: '8px' }}>
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

                    <div className={cn("w-full transition-all duration-300", isDrawer ? "hidden lg:block" : "block")}>
                        <GameBottomPanels 
                            messages={messages}
                            onSendMessage={handleSendMessage}
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
