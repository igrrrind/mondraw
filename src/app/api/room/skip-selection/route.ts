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

        // Idempotency: only skip if still in SELECTING phase
        if (roomState.status !== 'SELECTING') {
            return NextResponse.json({ success: true, message: 'Already moved past selection' });
        }

        // Transition to ROUND_END (skipped turn) or GAME_OVER
        if (roomState.currentRound >= 10) {
            roomState.status = 'GAME_OVER' as RoomStatus;
        } else {
            roomState.status = 'ROUND_END' as RoomStatus;
        }

        roomState.currentWord = "(skipped)";
        roomState.currentPokemonId = 0;
        roomState.wordOptions = undefined;

        // Save state back to Redis
        await redis.set(`room:${roomId}`, JSON.stringify(roomState), { ex: 43200 });

        // Broadcast to all clients — skipped turn
        await pusherServer.trigger(`presence-room-${roomId}`, "round-ended", {
            status: roomState.status,
            revealedWord: "(skipped)",
            revealedId: 0,
            players: roomState.players,
            currentRound: roomState.currentRound
        });

        // Sync timer for the reveal phase
        await pusherServer.trigger(`presence-room-${roomId}`, "timer-sync", {
            timeRemaining: 10
        });

        return NextResponse.json({ success: true, roomState });
    } catch (error) {
        console.error('Error skipping selection:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
