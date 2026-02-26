"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import React from "react";

export function ClientOnlyWrapper({ children }: { children: React.ReactElement<{ playerName: string }> }) {
    const [playerName, setPlayerName] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const name = localStorage.getItem("pokedraw_player_name");
        if (!name) {
            router.push("/");
        } else {
            setPlayerName(name);
        }
    }, [router]);

    if (!playerName) return (
        <div className="flex h-screen w-full items-center justify-center bg-pd-bg">
            <Loader2 className="w-10 h-10 text-pd-sky animate-spin" />
        </div>
    );

    return React.cloneElement(children as React.ReactElement<any>, { playerName });
}
