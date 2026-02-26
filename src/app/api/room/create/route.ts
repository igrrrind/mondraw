import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { RoomState, RoomStatus } from '@/types';

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(req: Request) {
    try {
        const { config } = await req.json();

        const roomId = generateRoomCode();

        const initialState: RoomState = {
            id: roomId,
            config: config || { gens: [1], difficulty: 3, maxPlayers: 8 },
            status: 'LOBBY' as RoomStatus,
            players: {},
            playerOrder: [],
            roundLimit: 10,
            currentRound: 0,
        };

        // Store in Upstash Redis. Expirations set to 12 hours.
        await redis.set(`room:${roomId}`, JSON.stringify(initialState), { ex: 43200 });

        return NextResponse.json({ roomId });
    } catch (error) {
        console.error('Error creating room:', error);
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }
}
