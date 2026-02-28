import { Users } from 'lucide-react';
import { cn } from '@/utils/cn';
import { RoomState } from '@/types';

interface GameSidebarProps {
    gameState: RoomState;
    playerId: string;
}

export function GameSidebar({ gameState, playerId }: GameSidebarProps) {
    return (
        <div className="pd-card p-3 md:p-5 shadow-sm flex flex-col min-h-0 h-full">
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
    );
}
