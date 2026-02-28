import Link from 'next/link';
import Image from 'next/image';
import { Timer } from 'lucide-react';
import { Button } from '../ui/button';
import { RoomState } from '@/types';

interface GameHeaderProps {
    roomId: string;
    gameState: RoomState;
    timeRemaining: number;
    onStartGame: () => void;
}

export function GameHeader({ roomId, gameState, timeRemaining, onStartGame }: GameHeaderProps) {
    return (
        <header className="flex flex-wrap justify-between items-center gap-2 bg-pd-surface rounded-xl p-2 md:p-4 mb-2 md:mb-4 shadow-sm shrink-0">
            <div className="flex items-center gap-2 md:gap-4">
                <Link href="/">
                    <Image
                        src="/logo2.png"
                        alt="PokéDraw"
                        width={120}
                        height={40}
                        className="h-6 md:h-10 w-auto"
                    />
                </Link>
                <div className="bg-pd-surface-alt px-1.5 md:px-3 py-1 rounded-lg text-pd-text-muted font-mono text-[10px] md:text-sm flex items-center gap-1 md:gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-pd-green animate-pulse" />
                    Room: {roomId}
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-6">
                {gameState.status === 'LOBBY' && (
                    <Button onClick={onStartGame} className="font-bold px-3 md:px-8 py-1 md:py-2 text-[10px] md:text-base h-8 md:h-11">
                        START GAME
                    </Button>
                )}
                <div className="flex items-center gap-1 md:gap-2 text-pd-sky font-bold text-sm md:text-xl bg-pd-sky/10 px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl h-8 md:h-11">
                    <Timer className="w-3 h-3 md:w-6 md:h-6" />
                    {timeRemaining}s
                </div>
            </div>
        </header>
    );
}
