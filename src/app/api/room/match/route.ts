import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { RoomState } from '@/types';

export async function POST(req: Request) {
    try {
        // We might want to pass preferences in the future, but for now we just find any lobby
        // const { playerName } = await req.json();

        // 1. Get all room keys
        const keys = await redis.keys('room:*');

        if (keys.length === 0) {
            return NextResponse.json({ roomId: null });
        }

        // 2. Fetch room states in parallel
        const pipeline = redis.pipeline();
        keys.forEach(key => pipeline.get(key));
        const roomStatesStrings = await pipeline.exec();

        const activeRooms: RoomState[] = roomStatesStrings
            .filter((state): state is string => !!state)
            .map(state => typeof state === 'string' ? JSON.parse(state) : state)
            .filter((room: RoomState) => {
                const playerCount = Object.keys(room.players || {}).length;
                return room.status === 'LOBBY' && playerCount < (room.config.maxPlayers || 8);
            });

        if (activeRooms.length === 0) {
            return NextResponse.json({ roomId: null });
        }

        // 3. Matchmaking algorithm: Find the room with the most players that isn't full
        // to help fill rooms faster.
        activeRooms.sort((a, b) => {
            const countA = Object.keys(a.players || {}).length;
            const countB = Object.keys(b.players || {}).length;
            return countB - countA;
        });

        return NextResponse.json({ roomId: activeRooms[0].id });
    } catch (error) {
        console.error('Error matching room:', error);
        return NextResponse.json({ error: 'Failed to match room' }, { status: 500 });
    }
}
