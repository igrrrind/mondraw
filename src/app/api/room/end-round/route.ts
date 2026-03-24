import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { pusherServer } from '@/lib/pusher';
import { RoomState, RoomStatus } from '@/types';

export async function POST(req: Request) {
    try {
        const { roomId } = await req.json();

        const roomStateString = await redis.get(`room:${roomId}`);
        if (!roomStateString) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const roomState: RoomState = typeof roomStateString === 'string' ? JSON.parse(roomStateString) : roomStateString;

        // If already in ROUND_END or GAME_OVER, ignore
        if (roomState.status === 'ROUND_END' || roomState.status === 'GAME_OVER') {
            return NextResponse.json({ success: true, roomState });
        }

        const revealedWord = roomState.currentWord;
        const revealedId = roomState.currentPokemonId || 25; // Fallback to Pikachu only if something went wrong

        // Transition to ROUND_END or GAME_OVER
        if (roomState.currentRound >= 10) {
            roomState.status = 'GAME_OVER' as RoomStatus;
        } else {
            roomState.status = 'ROUND_END' as RoomStatus;
        }

        roomState.roundStartTime = Date.now();
        roomState.currentWord = undefined;
        roomState.wordOptions = undefined;

        // Save state back to Redis
        await redis.set(`room:${roomId}`, JSON.stringify(roomState), { ex: 43200 });

        // Broadcast to all clients
        await pusherServer.trigger(`presence-room-${roomId}`, "round-ended", {
            status: roomState.status,
            revealedWord,
            revealedId,
            players: roomState.players,
            currentRound: roomState.currentRound
        });

        // Sync timer across all clients
        await pusherServer.trigger(`presence-room-${roomId}`, "timer-sync", {
            timeRemaining: 10
        });

        return NextResponse.json({ success: true, roomState });
    } catch (error) {
        console.error('Error ending round:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
