import { Users, Loader2, Trophy } from 'lucide-react';
import { Button } from '../ui/button';
import { Canvas } from '../Canvas';
import { ReferenceTool } from '../ReferenceTool';
import { RoomState, Pokemon } from '@/types';
import PusherClient from 'pusher-js';

interface GameAreaProps {
    gameState: RoomState;
    isDrawer: boolean;
    targetPokemon?: Pokemon;
    revealedWord: string;
    revealedId: number;
    timeRemaining: number;
    roomId: string;
    pusher: PusherClient | null;
    onSelectPokemon: (name: string) => void;
}

export function GameArea({
    gameState,
    isDrawer,
    targetPokemon,
    revealedWord,
    revealedId,
    timeRemaining,
    roomId,
    pusher,
    onSelectPokemon
}: GameAreaProps) {
    return (
        <div className="w-full h-full flex items-center justify-center overflow-hidden" style={{ containerType: 'size' }}>
            <div 
                className="relative bg-pd-surface rounded-2xl shadow-sm overflow-hidden flex flex-col"
                style={{ 
                    aspectRatio: '16/9', 
                    width: 'min(100cqw, 100cqh * 16 / 9)',
                }}
            >
                {gameState.status === 'LOBBY' ? (
                    <div className="absolute inset-0 pd-card flex flex-col items-center justify-center text-center p-4 md:p-8 animate-phase-in">
                        <Users className="w-10 h-10 md:w-24 md:h-24 text-pd-sky mb-2 md:mb-6 opacity-20" />
                        <h2 className="text-xl md:text-3xl font-black text-pd-text mb-1 tracking-tight px-4">Waiting for Players...</h2>
                        <p className="text-pd-text-muted max-w-md text-[10px] md:text-lg px-8">
                            Objective: Draw the Pokémon as fast as you can! Guess correctly to earn points and climb the leaderboard.
                        </p>
                    </div>
                ) : gameState.status === 'SELECTING' ? (
                    <div className="absolute inset-0 pd-card flex flex-col items-center justify-center text-center p-4 md:p-8 overflow-hidden animate-phase-in">
                        <div className="absolute inset-0 bg-pd-sky/5 animate-pulse pointer-events-none" />
                        <div className="z-10 mb-1 px-2 py-0.5 bg-pd-sky/15 rounded-full text-pd-sky text-[8px] md:text-sm font-black tracking-widest uppercase shrink-0">PHASE: SELECTION</div>
                        <h2 className="text-xl md:text-3xl lg:text-4xl font-black text-pd-text mb-2 md:mb-6 z-10 tracking-tight shrink-0 px-4">
                            {isDrawer ? "CHOOSE YOUR POKÉMON" : "THE DRAWER IS BROWSING..."}
                        </h2>

                        {isDrawer ? (
                            <div className="w-full max-w-4xl flex-1 min-h-0 overflow-y-auto px-2 z-20 scrollbar-hide">
                                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-2 md:gap-4 lg:gap-6 pb-4 max-w-2xl mx-auto">
                                    {gameState.wordOptions?.map((pokemon) => (
                                        <button
                                            key={pokemon.id}
                                            onClick={() => onSelectPokemon(pokemon.name)}
                                            className="group flex flex-col items-center p-2 md:p-4 lg:p-6 bg-pd-surface-alt rounded-xl md:rounded-2xl transition-all hover:bg-pd-surface-alt/70 hover:scale-[1.02] active:scale-95 shadow-sm"
                                        >
                                            {gameState.config.showReference !== false && (
                                                <div className="w-16 h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 mb-1 md:mb-3 relative group-hover:rotate-3 transition-transform">
                                                    <img
                                                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedex_id}.png`}
                                                        alt={pokemon.name}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            )}
                                            <span className="text-sm md:text-xl lg:text-2xl font-black text-pd-text uppercase tracking-tight group-hover:text-pd-sky transition-colors truncate w-full px-1">
                                                {pokemon.name}
                                            </span>
                                            <div className="hidden md:block mt-1 px-2 py-0.5 bg-pd-sky/10 rounded-full text-pd-sky text-[8px] md:text-xs font-bold font-mono">
                                                GEN {pokemon.generation}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 md:space-y-6 animate-phase-in flex flex-col items-center">
                                <div className="w-12 h-12 md:w-24 md:h-24 bg-pd-sky/15 rounded-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 md:w-12 md:h-12 text-pd-sky animate-spin" />
                                </div>
                                <div className="space-y-0.5 md:space-y-2 px-4">
                                    <p className="text-lg md:text-2xl font-black text-pd-text tracking-tight uppercase">GET READY TO GUESS!</p>
                                    <p className="text-pd-text-muted font-bold font-mono text-[10px] md:text-lg uppercase tracking-wider">Choosing ends in {timeRemaining}s</p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : gameState.status === 'ROUND_END' ? (
                    <div className="absolute inset-0 pd-card flex flex-col items-center justify-center text-center p-2 md:p-8 overflow-hidden animate-phase-in">
                        <div className="absolute inset-0 bg-pd-honey/5 animate-pulse pointer-events-none" />
                        <div className="z-10 mb-1 px-2 py-0.5 bg-pd-red/15 rounded-full text-pd-red text-[8px] md:text-sm font-black tracking-widest uppercase shrink-0">ROUND COMPLETE</div>
                        <h2 className="text-xl md:text-4xl lg:text-5xl font-black text-pd-text mb-1 z-10 tracking-tight shrink-0">TIME&apos;S UP!</h2>
                        <p className="text-pd-text-muted mb-2 md:mb-6 font-bold text-[10px] md:text-xl uppercase tracking-widest shrink-0">The Pokémon was...</p>

                        <div className="relative z-10 animate-in zoom-in duration-700 min-h-0 flex-1 flex flex-col items-center justify-center">
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-pd-sky/20 blur-[60px] md:blur-[80px] rounded-full scale-150 animate-pulse pointer-events-none" />
                            <div className="pd-panel p-3 md:p-12 rounded-2xl md:rounded-3xl shadow-sm md:shadow-md relative group flex flex-col items-center max-h-full overflow-hidden">
                                <span className="hidden md:block absolute -top-3 left-1/2 -translate-x-1/2 bg-pd-sky text-white px-3 md:px-5 py-0.5 md:py-1 rounded-full text-[10px] md:text-sm font-black tracking-widest uppercase">REVEALED</span>
                                <h3 className="text-lg md:text-6xl font-black text-pd-text uppercase tracking-tight mb-2 md:mb-6 truncate w-full text-center">{revealedWord || "???"}</h3>
                                <div className="w-20 h-20 md:w-48 md:h-48 relative transform hover:scale-110 transition-transform duration-500 flex-1 min-h-0">
                                    <img
                                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${revealedId}.png`}
                                        alt={revealedWord}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-2 md:mt-8 flex flex-col items-center gap-0.5 md:gap-2 animate-phase-in shrink-0">
                            <p className="text-pd-sky font-black text-xs md:text-2xl uppercase tracking-tight">Preparing next round...</p>
                            <p className="text-pd-text-muted font-bold font-mono text-[8px] md:text-sm tracking-widest">{timeRemaining}s REMAINING</p>
                        </div>
                    </div>
                ) : gameState.status === 'GAME_OVER' ? (
                    <div className="absolute inset-0 pd-card flex flex-col items-center justify-center text-center p-4 md:p-8 overflow-hidden animate-phase-in">
                        <div className="absolute inset-0 bg-pd-honey/10 pointer-events-none" />

                        <Trophy className="w-10 h-10 md:w-20 md:h-20 text-pd-honey mb-1 md:mb-4 animate-bounce shrink-0" />
                        <div className="z-10 mb-1 px-2 py-0.5 bg-pd-honey/15 rounded-full text-pd-honey text-[8px] md:text-xs font-black tracking-widest uppercase shrink-0">FINALE</div>
                        <h2 className="text-2xl md:text-6xl font-black text-pd-text mb-1 tracking-tight shrink-0">GAME OVER</h2>
                        <p className="text-pd-text-muted mb-2 md:mb-6 font-bold text-[10px] md:text-xl uppercase tracking-widest shrink-0">The Results are in!</p>

                        <div className="w-full max-w-lg pd-panel p-4 md:p-10 shadow-sm md:shadow-md z-10 relative overflow-hidden flex-1 min-h-0 flex flex-col justify-center">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Trophy className="w-24 h-24 md:w-32 md:h-32 rotate-12" />
                            </div>
                            {Object.values(gameState.players)
                                .sort((a, b) => b.score - a.score)
                                .slice(0, 1)
                                .map((winner) => (
                                    <div key={winner.id} className="flex flex-col items-center min-h-0 overflow-hidden">
                                        <div className="w-12 h-12 md:w-28 md:h-28 bg-gradient-to-tr from-pd-honey to-pd-honey-soft rounded-full flex items-center justify-center mb-2 md:mb-6 shadow-sm md:shadow-md relative animate-in zoom-in duration-1000 shrink-0">
                                            <Trophy className="w-6 h-6 md:w-14 md:h-14 text-white" />
                                        </div>
                                        <span className="text-[10px] md:text-lg text-pd-honey font-black uppercase tracking-widest mb-0.5 md:mb-2 shrink-0">POKÉMASTER</span>
                                        <h3 className="text-xl md:text-5xl font-black text-pd-text mb-1 tracking-tight truncate w-full px-2 shrink-0">{winner.name}</h3>
                                        <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                            <div className="h-[1px] md:h-[2px] w-4 md:w-8 bg-pd-honey/30" />
                                            <span className="text-lg md:text-4xl font-black text-pd-sky tabular-nums">{winner.score} <span className="text-[10px] md:text-xl text-pd-text-muted font-bold">PTS</span></span>
                                            <div className="h-[1px] md:h-[2px] w-4 md:w-8 bg-pd-honey/30" />
                                        </div>
                                    </div>
                                ))
                            }
                        </div>

                        <Button
                            onClick={() => window.location.href = '/'}
                            className="mt-3 md:mt-10 font-black px-4 md:px-16 py-3 md:py-8 text-sm md:text-2xl rounded-xl md:rounded-2xl transition-all hover:scale-105 active:scale-95 shrink-0"
                        >
                            {timeRemaining}s TO HOME...
                        </Button>
                    </div>
                ) : (
                    <div className="absolute inset-0 animate-phase-in h-full flex flex-col">
                        {isDrawer && targetPokemon && gameState.config.showReference !== false && <ReferenceTool pokemon={targetPokemon} />}
                        <Canvas roomId={roomId} isDrawer={isDrawer} pusher={pusher} />
                    </div>
                )}
            </div>
        </div>
    );
}
