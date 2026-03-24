import { NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
    try {
        const data = await req.text();
        const params = new URLSearchParams(data);
        const socketId = params.get('socket_id') as string;
        const channelName = params.get('channel_name') as string;

        // We expect the user to pass their desired playerName in the auth query or we generate one
        const playerParams = req.url.split('?')[1];
        const urlParams = new URLSearchParams(playerParams);
        const playerName = urlParams.get('playerName') || `Trainer_${Math.floor(Math.random() * 1000)}`;
        const userId = urlParams.get('userId') || socketId; // Use stable userId if provided

        const presenceData = {
            user_id: userId,
            user_info: {
                name: playerName,
            },
        };

        console.log("Pusher Auth Request:", { socketId, channelName, playerName, userId });
        const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
        return NextResponse.json(authResponse);
    } catch (error) {
        console.error('Pusher auth error:', error);
        return new NextResponse('Forbidden', { status: 403 });
    }
}
