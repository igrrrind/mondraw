"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gamepad2, Users, Settings, Sparkles, PlusCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [generations, setGenerations] = useState<number[]>([1]);
  const [difficulty, setDifficulty] = useState(3);
  const [showReference, setShowReference] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const toggleGen = (gen: number) => {
    setGenerations((prev) =>
      prev.includes(gen)
        ? prev.filter((g) => g !== gen)
        : [...prev, gen].sort()
    );
  };

  const handleCreateRoom = async () => {
    if (!playerName) return alert("Please enter your name!");
    if (generations.length === 0) return alert("Select at least 1 generation!");
    setIsCreating(true);

    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: { gens: generations, difficulty, maxPlayers: 8, showReference },
        }),
      });

      if (!res.ok) throw new Error("Failed to create room");
      const { roomId } = await res.json();

      localStorage.setItem("pokedraw_player_name", playerName);
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error(error);
      alert("Error creating room. Check console.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = () => {
    if (!playerName) return alert("Please enter your name!");
    if (!joinCode) return alert("Please enter a room code!");

    localStorage.setItem("pokedraw_player_name", playerName);
    router.push(`/room/${joinCode}`);
  };

  const handleDevJoin = () => {
    const finalName = playerName || "Dev";
    localStorage.setItem("pokedraw_player_name", finalName);
    router.push(`/room/dev-room`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-pd-bg p-4 md:p-8 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] bg-pd-red/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-60px] w-[350px] h-[350px] bg-pd-green/10 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-4xl z-10 flex flex-col gap-6">

        {/* Title Block */}
        <div className="text-center mb-2">
          {/* <div className="inline-flex items-center justify-center w-16 h-16 bg-pd-red rounded-2xl mb-4 shadow-md">
            <Sparkles className="w-8 h-8 text-white" />
          </div> */}
          <h1 className="text-4xl md:text-5xl font-bold text-pd-text tracking-tight">
            Poké<span className="text-pd-red">Draw</span>
          </h1>
          <p className="text-pd-text-muted mt-2 text-base font-semibold">
            Draw Pokémon · Guess Fast · Win Points
          </p>
        </div>

        <Card className="flex flex-col md:flex-row gap-6 p-6 mx-auto w-full">
          <div className="flex flex-col gap-6 flex-1">
            {/* Name Input */}
            <div className="bg-pd-surface rounded-2xl p-5 ">
              <label className="text-xs font-bold text-pd-text-muted uppercase tracking-wider mb-2 block">
                Trainer Name
              </label>
              <input
                type="text"
                placeholder="Ash Ketchum"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
                className="w-full bg-pd-surface-alt rounded-xl p-4 text-pd-text text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-pd-green/40 transition-all placeholder:text-pd-text-muted/40"
              />
            </div>

            {/* Create Room Card */}
            <div className="bg-pd-surface rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-pd-green/15 rounded-xl flex items-center justify-center">
                    <Settings className="w-4.5 h-4.5 text-pd-green" />
                  </div>
                  <div>
                    <h3 className="font-bold text-pd-text text-base">Create a Room</h3>
                    <p className="text-pd-text-muted text-xs">Set up a lobby & invite friends</p>
                  </div>
                </div>

                {/* Generations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-pd-text-muted uppercase tracking-wider">
                      Generations ({generations.length})
                    </label>
                    <button className="text-xs font-semibold text-pd-green hover:underline" onClick={() => setGenerations([1, 2, 3, 4, 5, 6, 7, 8, 9])}>All</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((gen) => (
                      <button
                        key={gen}
                        onClick={() => toggleGen(gen)}
                        className={`w-9 h-9 rounded-lg font-bold text-sm transition-all flex items-center justify-center ${generations.includes(gen)
                          ? "bg-pd-green text-white scale-105"
                          : "bg-pd-surface-alt text-pd-text-muted hover:bg-pd-surface-alt/70"
                          }`}
                      >
                        {gen}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-xs font-bold text-pd-text-muted uppercase tracking-wider">
                      Difficulty
                    </label>
                    <span className="text-xs font-bold text-pd-honey">
                      {difficulty === 1 ? "Iconic" : difficulty === 2 ? "Easy" : difficulty === 3 ? "Normal" : difficulty === 4 ? "Hard" : "Obscure"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={difficulty}
                    onChange={(e) => setDifficulty(parseInt(e.target.value))}
                    className="w-full accent-pd-honey h-1.5 bg-pd-surface-alt rounded-full appearance-none cursor-pointer"
                  />
                </div>

                {/* Show Reference Toggle */}
                <div className="flex items-center justify-between p-3 bg-pd-surface-alt rounded-xl">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-pd-text">Show Reference</span>
                    <span className="text-[10px] text-pd-text-muted">Display Pokémon images while drawing</span>
                  </div>
                  <button
                    onClick={() => setShowReference(!showReference)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${showReference ? 'bg-pd-green' : 'bg-pd-surface-alt/80 border-2 border-pd-surface'
                      }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showReference ? 'left-7' : 'left-1'
                      }`} />
                  </button>
                </div>
              </div>

              <div className="px-5 pb-5">
                <Button onClick={handleCreateRoom} disabled={isCreating} className="w-full py-6 text-base gap-2">
                  <PlusCircle className="w-5 h-5" />
                  {isCreating ? "Creating..." : "Create Lobby"}
                </Button>
              </div>
            </div>
          </div>

          {/* Join Room */}
          <div className="bg-pd-surface rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-pd-sky/15 rounded-xl flex items-center justify-center">
                <Gamepad2 className="w-4.5 h-4.5 text-pd-sky" />
              </div>
              <h3 className="font-bold text-pd-text text-base">Join a Room</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Room Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="flex-1 bg-pd-surface-alt rounded-xl px-4 py-3 text-pd-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-pd-sky/30 placeholder:text-pd-text-muted/40"
              />
              <Button variant="secondary" onClick={handleJoinRoom} className="px-6">
                Join <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Debug */}
        {/* <button
          onClick={handleDevJoin}
          className="text-pd-text-muted/50 text-xs font-semibold hover:text-pd-text-muted transition-colors text-center py-2"
        >
          Debug: Quick Join →
        </button> */}
      </main>
    </div>
  );
}
