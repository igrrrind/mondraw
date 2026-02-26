import { redis } from '@/lib/redis';
import { RoomState } from '@/types';
import { GameClient } from '@/components/GameClient';
import { redirect } from 'next/navigation';
import { ClientOnlyWrapper } from '@/components/ClientOnlyWrapper';

export default async function RoomPage({ params }: { params: { id: string } }) {
    // Await the params object in Next.js 15
    const resolvedParams = await Promise.resolve(params);
    const roomId = resolvedParams.id;

    const roomData = await redis.get(`room:${roomId}`);

    if (!roomData) {
        redirect('/?error=room_not_found');
    }

    const initialState: RoomState = typeof roomData === 'string' ? JSON.parse(roomData) : roomData;

    return (
        <ClientOnlyWrapper>
            <GameClient
                roomId={roomId}
                initialState={initialState}
                playerName="Player1" // We map this inside the client from localStorage usually since Next Server doesn't know localstorage
            />
        </ClientOnlyWrapper>
    );
}


