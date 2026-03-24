import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { pusherServer } from '@/lib/pusher';
import { RoomState, RoomStatus } from '@/types';
import { getRandomPokemon, getWordOptions } from '@/utils/pokemon';

export async function POST(req: Request) {
    try {
        const { roomId } = await req.json();

        const roomStateString = await redis.get(`room:${roomId}`);
        if (!roomStateString) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const roomState: RoomState = typeof roomStateString === 'string' ? JSON.parse(roomStateString) : roomStateString;

        // Sync playerOrder with current players to handle leaves/joins
        const activePlayerIds = Object.keys(roomState.players);
        
        if (!roomState.playerOrder || roomState.playerOrder.length === 0) {
            roomState.playerOrder = activePlayerIds;
        } else {
            // Filter out players who are no longer in the room
            roomState.playerOrder = roomState.playerOrder.filter(id => activePlayerIds.includes(id));
            // Add new players who aren't in the order yet to the end of the queue
            activePlayerIds.forEach(id => {
                if (!roomState.playerOrder.includes(id)) {
                    roomState.playerOrder.push(id);
                }
            });
        }

        const playerOrder = roomState.playerOrder;
        const currentDrawerId = playerOrder.find(id => roomState.players[id]?.isDrawer);
        const currentDrawerIndex = currentDrawerId ? playerOrder.indexOf(currentDrawerId) : -1;
        
        // Find next valid drawer. If someone left, currentDrawerIndex might be -1 or invalid.
        let nextDrawerIndex = (currentDrawerIndex + 1) % playerOrder.length;
        let nextDrawerId = playerOrder[nextDrawerIndex];

        // Reset all, set new drawer
        // If the game was OVER, reset the round count and scores
        if (roomState.status === 'GAME_OVER') {
            roomState.currentRound = 0;
            Object.keys(roomState.players).forEach(id => {
                if (roomState.players[id]) {
                    roomState.players[id].score = 0;
                }
            });
            // Also reset to first player in queue for new game
            nextDrawerIndex = 0;
            nextDrawerId = playerOrder[0];
        }

        Object.keys(roomState.players).forEach((id) => {
            const player = roomState.players[id];
            if (player) {
                player.isDrawer = id === nextDrawerId;
                player.hasGuessed = false;
            }
        });

        const options = getWordOptions(roomState.config);

        roomState.status = 'SELECTING' as RoomStatus;
        roomState.wordOptions = options;
        roomState.currentRound += 1;
        roomState.roundTimer = 15; // 15 seconds to pick
        roomState.roundStartTime = Date.now();

        // Reset currentWord until selected
        roomState.currentWord = undefined;

        // Save state back to Redis
        await redis.set(`room:${roomId}`, JSON.stringify(roomState), { ex: 43200 });

        // Broadcast to all clients
        await pusherServer.trigger(`presence-room-${roomId}`, "word-selection-started", {
            status: roomState.status,
            currentRound: roomState.currentRound,
            players: roomState.players,
            wordOptions: options, // Only drawer should ideally see this, but for simplicity we broadcast and filter client-side
        });

        // Sync timer across all clients
        await pusherServer.trigger(`presence-room-${roomId}`, "timer-sync", {
            timeRemaining: 15
        });

        return NextResponse.json({ success: true, roomState });
    } catch (error) {
        console.error('Error starting round:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
