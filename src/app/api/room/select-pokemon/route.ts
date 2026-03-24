import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { pusherServer } from '@/lib/pusher';
import { RoomState, RoomStatus } from '@/types';

export async function POST(req: Request) {
    try {
        const { roomId, playerId, pokemonName } = await req.json();

        const roomStateString = await redis.get(`room:${roomId}`);
        if (!roomStateString) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const roomState: RoomState = typeof roomStateString === 'string' ? JSON.parse(roomStateString) : roomStateString;

        // Verify the selector is the drawer
        const player = roomState.players[playerId];
        if (!player || !player.isDrawer) {
            return NextResponse.json({ error: 'Only the drawer can select the Pokemon' }, { status: 403 });
        }

        if (roomState.status !== 'SELECTING') {
            return NextResponse.json({ error: 'Not in selection phase' }, { status: 400 });
        }

        const selectedPokemon = roomState.wordOptions?.find(p => p.name === pokemonName);
        if (!selectedPokemon) {
            return NextResponse.json({ error: 'Invalid selection' }, { status: 400 });
        }

        roomState.status = 'DRAWING' as RoomStatus;
        roomState.currentWord = selectedPokemon.name;
        roomState.currentPokemonId = selectedPokemon.pokedex_id;
        roomState.roundTimer = 60;
        roomState.roundStartTime = Date.now();
        roomState.wordOptions = undefined; // Clear options

        // Save state back to Redis
        await redis.set(`room:${roomId}`, JSON.stringify(roomState), { ex: 43200 });

        // Broadcast to all clients
        await pusherServer.trigger(`presence-room-${roomId}`, "round-started", {
            status: roomState.status,
            currentRound: roomState.currentRound,
            players: roomState.players,
            targetPokemon: selectedPokemon,
        });

        // Sync timer across all clients
        await pusherServer.trigger(`presence-room-${roomId}`, "timer-sync", {
            timeRemaining: 60
        });

        return NextResponse.json({ success: true, roomState });
    } catch (error) {
        console.error('Error selecting pokemon:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
