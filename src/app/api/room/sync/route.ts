import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { RoomState } from '@/types';

export async function POST(req: Request) {
    try {
        const { roomId } = await req.json();

        const roomStateString = await redis.get(`room:${roomId}`);
        if (!roomStateString) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const roomState: RoomState = typeof roomStateString === 'string' ? JSON.parse(roomStateString) : roomStateString;

        // Calculate current time remaining based on roundStartTime
        let timeRemaining = 0;
        if (roomState.status !== 'LOBBY' && roomState.status !== 'GAME_OVER' && roomState.roundStartTime) {
            const totalTime = roomState.status === 'SELECTING' ? 15 : 
                             roomState.status === 'ROUND_END' ? 10 : 60;
            
            const elapsed = Math.floor((Date.now() - roomState.roundStartTime) / 1000);
            timeRemaining = Math.max(0, totalTime - elapsed);
        }

        return NextResponse.json({ 
            status: roomState.status,
            players: roomState.players,
            currentRound: roomState.currentRound,
            timeRemaining,
            currentWord: roomState.currentWord,
            currentPokemonId: roomState.currentPokemonId,
            wordOptions: roomState.wordOptions
        });
    } catch (error) {
        console.error('Error syncing room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
