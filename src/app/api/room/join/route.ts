import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { RoomState, Player } from '@/types';

export async function POST(req: Request) {
    try {
        const { roomId, playerId, playerName } = await req.json();

        const roomStateString = await redis.get(`room:${roomId}`);
        if (!roomStateString) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const roomState: RoomState = typeof roomStateString === 'string' ? JSON.parse(roomStateString) : roomStateString;

        // Add player to room state
        const newPlayer: Player = {
            id: playerId,
            name: playerName,
            score: 0,
            isDrawer: false,
            hasGuessed: false
        };

        roomState.players[playerId] = newPlayer;
        if (!roomState.playerOrder) roomState.playerOrder = []; // Migration safety
        if (!roomState.playerOrder.includes(playerId)) {
            roomState.playerOrder.push(playerId);
        }

        // Save back to Redis
        await redis.set(`room:${roomId}`, JSON.stringify(roomState), { ex: 43200 });

        return NextResponse.json({ success: true, roomState });
    } catch (error) {
        console.error('Error joining room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
