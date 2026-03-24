import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { pusherServer } from '@/lib/pusher';
import { RoomState } from '@/types';

export async function POST(req: Request) {
    try {
        const { roomId, playerId, guess, timeRemaining, totalRoundTime } = await req.json();

        const roomStateString = await redis.get(`room:${roomId}`);
        if (!roomStateString) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const roomState: RoomState = typeof roomStateString === 'string' ? JSON.parse(roomStateString) : roomStateString;

        // Verify if the guessing player exists
        const player = roomState.players[playerId];
        if (!player) {
            return NextResponse.json({ error: 'Player not found' }, { status: 404 });
        }

        // Check if the guess is correct (case-insensitive)
        const isCorrect = roomState.status === 'DRAWING' &&
            roomState.currentWord &&
            guess.toLowerCase().trim() === roomState.currentWord.toLowerCase().trim();

        if (isCorrect) {
            // Check if player already guessed to prevent double scoring
            if (player.hasGuessed) {
                return NextResponse.json({ message: 'Already guessed' });
            }

            // Calculate score based on time remaining and correct guess count
            // Max score 500, decreases as more players guess, drawer gets points
            const correctGuessesCount = Object.values(roomState.players).filter(p => p.hasGuessed).length;
            const scoreGained = Math.max(100, Math.floor(((timeRemaining / (totalRoundTime || 60)) * 500) - (correctGuessesCount * 10)));
            const drawerScoreGained = 250; // Drawer gets 5 points per correct guess as per description

            // Update Guesser state
            roomState.players[playerId].score += scoreGained;
            roomState.players[playerId].hasGuessed = true;

            // Find Drawer and update their score
            const drawer = Object.values(roomState.players).find(p => p.isDrawer);
            if (drawer && roomState.players[drawer.id]) {
                roomState.players[drawer.id].score += drawerScoreGained;
            }

            // Save state back to Redis
            await redis.set(`room:${roomId}`, JSON.stringify(roomState), { ex: 43200 });

            // Check if all guessers have finished
            const playersList = Object.values(roomState.players);
            const guessers = playersList.filter(p => !p.isDrawer);
            const everyoneGuessed = guessers.length > 0 && guessers.every(p => p.hasGuessed);

            if (everyoneGuessed) {
                // Trigger end-round logic – using a internal fetch or background job is better, 
                // but keeping it simple as per original implementation for now.
                // Note: In production, you'd use a more robust way to trigger this.
                try {
                    await fetch(`${new URL(req.url).origin}/api/room/end-round`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ roomId })
                    });
                } catch (e) {
                    console.error("Failed to trigger end-round", e);
                }
            }

            // Broadcast corrected information
            await pusherServer.trigger(`presence-room-${roomId}`, "word-guessed", {
                playerId,
                playerName: player.name,
                scoreGained,
                players: roomState.players
            });

            return NextResponse.json({ success: true, scoreGained });
        }

        // If incorrect, broadcast as a guess attempt
        await pusherServer.trigger(`presence-room-${roomId}`, "guess-attempt", {
            playerId,
            playerName: roomState.players[playerId].name,
            message: guess
        });

        return NextResponse.json({ success: false });

    } catch (error) {
        console.error('Error evaluating guess:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
