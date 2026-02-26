"use client";

import { useEffect, useState, useRef } from 'react';
import PusherClient from 'pusher-js';
import { PresenceChannel } from 'pusher-js';
import { RoomState, Player, Pokemon } from '@/types';
import { Canvas } from './Canvas';
import { Chatbox } from './Chatbox';
import { ReferenceTool } from './ReferenceTool';
import confetti from 'canvas-confetti';
import { Loader2, Users, Timer, Trophy } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/utils/cn';
import Link from 'next/link';

interface GameClientProps {
    roomId: string;
    initialState: RoomState;
    playerName: string;
}

export function GameClient({ roomId, initialState, playerName }: GameClientProps) {
    const [gameState, setGameState] = useState<RoomState>(initialState);
    const [messages, setMessages] = useState<any[]>([]);
    const [playerId, setPlayerId] = useState<string>('');
    const [targetPokemon, setTargetPokemon] = useState<Pokemon | undefined>(undefined);
    const [timeRemaining, setTimeRemaining] = useState(60);
    const [pusher, setPusher] = useState<PusherClient | null>(null);
    const [revealedWord, setRevealedWord] = useState<string>('');
    const [revealedId, setRevealedId] = useState<number>(25);

    const currentPlayer = gameState.players[playerId];
    const isDrawer = currentPlayer?.isDrawer || false;

    // Pusher setup
    useEffect(() => {
        // Hydrate playerName from localStorage if available
        let finalName = playerName;
        if (typeof window !== 'undefined') {
            const savedName = localStorage.getItem('pokedraw_player_name');
            if (savedName) finalName = savedName;
        }

        if (!finalName) return;

        // Create a new Pusher instance for this client session to handle dynamic auth params correctly
        // This ensures the authEndpoint always has the correct playerName from localStorage
        const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
            authEndpoint: `/api/pusher/auth?playerName=${encodeURIComponent(finalName)}`,
        });

        setPusher(pusher);

        const channel = pusher.subscribe(`presence-room-${roomId}`) as PresenceChannel;

        console.log("Attempting to connect to Pusher channel:", `presence-room-${roomId}`);

        channel.bind("pusher:subscription_succeeded", async () => {
            console.log("Pusher subscription succeeded!");
            const myID = channel.members.myID;
            setPlayerId(myID);

            // Sync with Redis
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
            setTargetPokemon(undefined); // Reset target for next round selection
            setRevealedWord(data.revealedWord);
            setRevealedId(data.revealedId);
            setTimeRemaining(10); // 10 seconds of reveal

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

            // Sync scores from server
            if (data.players) {
                setGameState(prev => ({ ...prev, players: data.players }));
            }

            // Local user guessed correctly
            if (channel.members.myID === data.playerId) {
                triggerConfetti();
            }
        });

        // Timer sync from server — corrects any client drift
        channel.bind("timer-sync", (data: any) => {
            if (typeof data.timeRemaining === 'number') {
                setTimeRemaining(data.timeRemaining);
            }
        });

        channel.bind("pusher:subscription_error", (error: any) => {
            console.error("Pusher subscription error:", error);
        });

        return () => {
            pusher.unsubscribe(`presence-room-${roomId}`);
            pusher.disconnect();
        };
    }, [roomId, playerName]);

    // Timer logic
    useEffect(() => {
        if (gameState.status === 'LOBBY') {
            return;
        }

        const timer = setInterval(() => {
            setTimeRemaining((prev) => {
                // If round ended, just countdown to 0
                if (gameState.status === 'ROUND_END') {
                    if (prev <= 1 && isDrawer) {
                        // Automatically start next round after reveal
                        fetch('/api/room/start-round', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ roomId })
                        });
                    }
                    return Math.max(0, prev - 1);
                }

                // Selection timeout — skip turn if drawer didn't pick
                if (prev <= 1 && gameState.status === 'SELECTING') {
                    fetch('/api/room/skip-selection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roomId })
                    });
                }

                if (prev <= 1 && gameState.status === 'DRAWING' && isDrawer) {
                    // Call end-round when time is up
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

    // Handle auto-redirect when game over timer hits 0
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
        setMessages(prev => [...prev, { id: Date.now().toString(), playerName, message: msg }]); // Optimistic UI

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
        <div className="flex flex-col h-screen bg-pd-bg p-2 md:p-4 font-sans overflow-hidden">
            {/* Header Bar */}
            <header className="flex flex-wrap justify-between items-center gap-2 bg-pd-surface rounded-xl p-2 md:p-4 mb-2 md:mb-4 shadow-sm shrink-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <Link href="/">
                        <h1 className="text-base md:text-2xl font-black text-pd-text">
                            Poké<span className="text-pd-red">Draw</span>
                        </h1>
                    </Link>
                    <div className="bg-pd-surface-alt px-1.5 md:px-3 py-1 rounded-lg text-pd-text-muted font-mono text-[10px] md:text-sm flex items-center gap-1 md:gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-pd-green animate-pulse" />
                        Room: {roomId}
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-6">
                    {gameState.status === 'LOBBY' && (
                        <Button onClick={handleStartGame} className="font-bold px-3 md:px-8 py-1 md:py-2 text-[10px] md:text-base h-8 md:h-11">
                            START GAME
                        </Button>
                    )}
                    <div className="flex items-center gap-1 md:gap-2 text-pd-sky font-bold text-sm md:text-xl bg-pd-sky/10 px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl h-8 md:h-11">
                        <Timer className="w-3 h-3 md:w-6 md:h-6" />
                        {timeRemaining}s
                    </div>
                </div>
            </header>

            {/* Main Game Area */}
            <div className="flex flex-col lg:flex-row gap-2 md:gap-4 flex-1 min-h-0">

                <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
                    <div className="flex-1 relative w-full overflow-hidden min-h-0">
                        {gameState.status === 'LOBBY' ? (
                            <div className="absolute inset-0 pd-card flex flex-col items-center justify-center text-center p-8 animate-phase-in">
                                <Users className="w-24 h-24 text-pd-sky mb-6 opacity-20" />
                                <h2 className="text-3xl font-black text-pd-text mb-2 tracking-tight">Waiting for Players...</h2>
                                <p className="text-pd-text-muted max-w-md text-lg">
                                    Objective: Draw the Pokémon as fast as you can! Guess correctly to earn points and climb the leaderboard.
                                </p>
                            </div>
                        ) : gameState.status === 'SELECTING' ? (
                            <div className="absolute inset-0 pd-card flex flex-col items-center justify-center text-center p-8 overflow-hidden animate-phase-in">
                                <div className="absolute inset-0 bg-pd-sky/5 animate-pulse pointer-events-none" />
                                <div className="z-10 mb-2 px-4 py-1 bg-pd-sky/15 rounded-full text-pd-sky text-xs font-black tracking-widest uppercase">PHASE: SELECTION</div>
                                <h2 className="text-3xl md:text-4xl font-black text-pd-text mb-8 z-10 tracking-tight">
                                    {isDrawer ? "CHOOSE YOUR POKÉMON" : "THE DRAWER IS BROWSING..."}
                                </h2>

                                {isDrawer ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl z-20">
                                        {gameState.wordOptions?.map((pokemon) => (
                                            <button
                                                key={pokemon.id}
                                                onClick={() => handleSelectPokemon(pokemon.name)}
                                                className="group flex flex-col items-center p-6 bg-pd-surface-alt rounded-2xl transition-all hover:bg-pd-surface-alt/70 hover:scale-105 active:scale-95 shadow-sm"
                                            >
                                                {gameState.config.showReference !== false && (
                                                    <div className="w-32 h-32 md:w-40 md:h-40 mb-4 relative group-hover:rotate-3 transition-transform">
                                                        <img
                                                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedex_id}.png`}
                                                            alt={pokemon.name}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                )}
                                                <span className="text-2xl md:text-3xl font-black text-pd-text uppercase tracking-tight group-hover:text-pd-sky transition-colors">
                                                    {pokemon.name}
                                                </span>
                                                <div className="mt-2 px-3 py-1 bg-pd-sky/10 rounded-full text-pd-sky text-sm font-bold font-mono">
                                                    GENERATION {pokemon.generation}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-phase-in">
                                        <div className="w-24 h-24 bg-pd-sky/15 rounded-full mx-auto flex items-center justify-center">
                                            <Loader2 className="w-12 h-12 text-pd-sky animate-spin" />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-2xl font-black text-pd-text tracking-tight">GET READY TO GUESS!</p>
                                            <p className="text-pd-text-muted font-bold font-mono text-lg uppercase tracking-wider">Choosing ends in {timeRemaining}s</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : gameState.status === 'ROUND_END' ? (
                            <div className="absolute inset-0 pd-card flex flex-col items-center justify-center text-center p-8 overflow-hidden animate-phase-in">
                                <div className="absolute inset-0 bg-pd-honey/5 animate-pulse pointer-events-none" />
                                <div className="z-10 mb-2 px-4 py-1 bg-pd-red/15 rounded-full text-pd-red text-xs font-black tracking-widest uppercase">ROUND COMPLETE</div>
                                <h2 className="text-4xl md:text-5xl font-black text-pd-text mb-2 z-10 tracking-tight">TIME&apos;S UP!</h2>
                                <p className="text-pd-text-muted mb-10 font-bold text-xl uppercase tracking-widest">The Pokémon was...</p>

                                <div className="relative z-10 animate-in zoom-in duration-700">
                                    <div className="absolute inset-0 bg-pd-sky/20 blur-[80px] rounded-full scale-150 animate-pulse" />
                                    <div className="pd-panel p-10 md:p-12 rounded-3xl shadow-md relative group">
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pd-sky text-white px-5 py-1 rounded-full text-sm font-black tracking-widest uppercase">REVEALED</span>
                                        <h3 className="text-5xl md:text-6xl font-black text-pd-text uppercase tracking-tight mb-6 relative">{revealedWord || "???"}</h3>
                                        <div className="w-40 h-40 md:w-48 md:h-48 mx-auto relative transform hover:scale-110 transition-transform duration-500">
                                            <img
                                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${revealedId}.png`}
                                                alt={revealedWord}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 flex flex-col items-center gap-2 animate-phase-in">
                                    <p className="text-pd-sky font-black text-2xl uppercase tracking-tight">Preparing next round...</p>
                                    <p className="text-pd-text-muted font-bold font-mono tracking-widest">{timeRemaining}s REMAINING</p>
                                </div>
                            </div>
                        ) : gameState.status === 'GAME_OVER' ? (
                            <div className="absolute inset-0 pd-card flex flex-col items-center justify-center text-center p-8 overflow-hidden animate-phase-in">
                                <div className="absolute inset-0 bg-pd-honey/10 pointer-events-none" />

                                <Trophy className="w-20 h-20 text-pd-honey mb-4 animate-bounce" />
                                <div className="z-10 mb-2 px-4 py-1 bg-pd-honey/15 rounded-full text-pd-honey text-xs font-black tracking-widest uppercase">FINALE</div>
                                <h2 className="text-5xl md:text-6xl font-black text-pd-text mb-2 tracking-tight">GAME OVER</h2>
                                <p className="text-pd-text-muted mb-10 font-bold text-xl uppercase tracking-widest">The Results are in!</p>

                                <div className="w-full max-w-lg pd-panel p-8 md:p-10 shadow-md z-10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <Trophy className="w-32 h-32 rotate-12" />
                                    </div>
                                    {Object.values(gameState.players)
                                        .sort((a, b) => b.score - a.score)
                                        .slice(0, 1)
                                        .map((winner) => (
                                            <div key={winner.id} className="flex flex-col items-center">
                                                <div className="w-24 h-24 md:w-28 md:h-28 bg-gradient-to-tr from-pd-honey to-pd-honey-soft rounded-full flex items-center justify-center mb-6 shadow-md relative animate-in zoom-in duration-1000">
                                                    <Trophy className="w-12 h-12 md:w-14 md:h-14 text-white" />
                                                </div>
                                                <span className="text-lg text-pd-honey font-black uppercase tracking-widest mb-2">POKÉMASTER</span>
                                                <h3 className="text-4xl md:text-5xl font-black text-pd-text mb-2 tracking-tight">{winner.name}</h3>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-[2px] w-8 bg-pd-honey/30" />
                                                    <span className="text-3xl md:text-4xl font-black text-pd-sky tabular-nums">{winner.score} <span className="text-xl text-pd-text-muted">PTS</span></span>
                                                    <div className="h-[2px] w-8 bg-pd-honey/30" />
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>

                                <Button
                                    onClick={() => window.location.href = '/'}
                                    className="mt-10 font-black px-12 md:px-16 py-6 md:py-8 text-xl md:text-2xl rounded-2xl transition-all hover:scale-105 active:scale-95"
                                >
                                    Returning Home in {timeRemaining}s...
                                </Button>
                            </div>
                        ) : (
                            <div className="absolute inset-0 animate-phase-in h-full flex flex-col">
                                {isDrawer && targetPokemon && gameState.config.showReference !== false && <ReferenceTool pokemon={targetPokemon} />}
                                <Canvas roomId={roomId} isDrawer={isDrawer} pusher={pusher} />
                            </div>
                        )}
                    </div>

                    {/* Timer Bar */}
                    {gameState.status !== 'LOBBY' && gameState.status !== 'GAME_OVER' && (
                        <div className="w-full h-2 bg-pd-surface-alt rounded-full mt-3 md:mt-4 overflow-hidden shrink-0 animate-phase-in">
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

                {/* Right / Bottom: Sidebar */}
                <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-2 md:gap-4 shrink-0 h-[320px] lg:h-full animate-phase-in">

                    {/* Leaderboard */}
                    <div className="pd-card p-3 md:p-5 shadow-sm flex flex-col min-h-0 h-2/5 lg:h-1/3">
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                            <h3 className="text-pd-text font-black text-[10px] md:text-xs tracking-widest flex items-center gap-2 md:gap-3 uppercase">
                                <Users className="w-3 h-3 md:w-4 md:h-4 text-pd-red" />
                                Leaderboard
                            </h3>
                            <div className="px-1.5 py-0.5 bg-pd-green/15 rounded-full text-[8px] md:text-[10px] font-black text-pd-green uppercase">Live</div>
                        </div>
                        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
                            {Object.values(gameState.players).sort((a, b) => b.score - a.score).map((p, idx) => (
                                <div
                                    key={p.id}
                                    className={cn(
                                        "flex justify-between items-center p-2 md:p-3 rounded-lg md:rounded-xl transition-all duration-300",
                                        p.id === playerId ? "bg-pd-sky/10" : "bg-pd-surface-alt/50 hover:bg-pd-surface-alt"
                                    )}
                                >
                                    <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
                                        <div className={cn(
                                            "w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center text-[9px] md:text-[10px] font-black shrink-0",
                                            idx === 0 ? "bg-pd-honey text-white" : "bg-pd-surface-alt text-pd-text-muted"
                                        )}>
                                            {idx + 1}
                                        </div>
                                        <span className="text-pd-text font-bold truncate text-xs md:text-sm flex items-center gap-1.5 md:gap-2">
                                            {p.isDrawer && <span className="text-pd-sky text-[10px] md:text-xs">✏️</span>}
                                            <span className={cn(p.id === playerId && "text-pd-sky")}>{p.name}</span>
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 ml-2">
                                        <span className="text-pd-honey font-black font-mono text-xs md:text-sm leading-none">{p.score}</span>
                                        <span className="text-[7px] md:text-[8px] text-pd-text-muted font-black uppercase tracking-widest leading-none mt-0.5">PTS</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Chatbox */}
                    <div className="flex-1 min-h-0 overflow-hidden shadow-sm">
                        <Chatbox messages={messages} onSendMessage={handleSendMessage} isDrawer={isDrawer} />
                    </div>
                </div>
            </div>
        </div>
    );
}
