import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { RoomState } from '@/types';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
    try {
        const { roomId, playerId } = await req.json();

        const roomKey = `room:${roomId}`;
        const roomStateString = await redis.get(roomKey);
        
        if (!roomStateString) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const roomState: RoomState = typeof roomStateString === 'string' ? JSON.parse(roomStateString) : roomStateString;

        // Remove player
        if (roomState.players[playerId]) {
            delete roomState.players[playerId];
        }

        // Remove from playerOrder
        roomState.playerOrder = (roomState.playerOrder || []).filter(id => id !== playerId);

        // Check if room is now empty
        const remainingPlayerIds = Object.keys(roomState.players);
        
        if (remainingPlayerIds.length === 0) {
            // Delete room if empty
            await redis.del(roomKey);
            return NextResponse.json({ success: true, roomDeleted: true });
        }

        // If the player who left was the drawer, we might need to end the round or shift turns
        // For simplicity in this logic, we just save and trigger a sync
        await redis.set(roomKey, JSON.stringify(roomState), { ex: 43200 });

        // Notify other players
        await pusherServer.trigger(`presence-room-${roomId}`, "player-left", {
            playerId,
            players: roomState.players
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error leaving room:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
