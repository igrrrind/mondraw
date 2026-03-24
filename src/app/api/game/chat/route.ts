import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
    try {
        const { roomId, playerId, playerName, message } = await req.json();

        if (!message || !message.trim()) {
            return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
        }

        await pusherServer.trigger(`presence-room-${roomId}`, "chat-message", {
            playerId,
            playerName,
            message: message.trim()
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending chat message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
