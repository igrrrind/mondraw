"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

const BACKGROUND_IMAGES = [
  "bg1.jpeg", "bg2.jpeg", "bg3.jpeg", "bg4.jpeg", "bg5.jpeg",
  "bg6.jpeg", "bg7.jpeg", "bg8.jpeg", "bg9.jpeg", "bg10.jpeg",
  "bg11.jpeg", "bg12.jpeg", "bg13.jpeg", "bg14.jpeg"
];

const DIFFICULTY_POKEMON: Record<number, string> = {
  1: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png", // Pikachu (Iconic)
  2: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png",  // Charmander (Easy)
  3: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png", // Gengar (Normal)
  4: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/384.png", // Rayquaza (Hard)
  5: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/493.png", // Arceus (Obscure)
};

export default function Home() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [generations, setGenerations] = useState<number[]>([1]);
  const [difficulty, setDifficulty] = useState(3);
  const [showReference, setShowReference] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const randomBg = BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)];
    setBgImage(randomBg);

    const checkSize = () => setIsDesktop(window.innerWidth >= 768);
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

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

  const handleQuickPlay = async () => {
    if (!playerName) return alert("Please enter your name!");
    setIsMatching(true);

    try {
      const res = await fetch("/api/room/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName }),
      });

      if (!res.ok) throw new Error("Matchmaking failed");
      const { roomId } = await res.json();

      if (roomId) {
        localStorage.setItem("pokedraw_player_name", playerName);
        router.push(`/room/${roomId}`);
      } else {
        // No room found, automatically create one with current settings
        await handleCreateRoom();
      }
    } catch (error) {
      console.error(error);
      alert("Error finding a room. Check console.");
    } finally {
      setIsMatching(false);
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
    <div className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8 relative">
      {/* Background Image */}
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <Image
            src={`/backgrounds/${bgImage}`}
            alt="Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-" />
        </div>
      )}

      {/* Decorative background blobs */}
      <div className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] bg-pd-red/10 rounded-full blur-3xl pointer-events-none z-10" />
      <div className="absolute bottom-[-100px] right-[-60px] w-[350px] h-[350px] bg-pd-green/10 rounded-full blur-3xl pointer-events-none z-10" />

      <main className="w-full max-w-4xl z-10 flex flex-col gap-6">

        {/* Title Block */}
        <div className="text-center mb-2">
          {/* <div className="inline-flex items-center justify-center w-16 h-16 bg-pd-red rounded-2xl mb-4 shadow-md">
            <Sparkles className="w-8 h-8 text-white" />
          </div> */}
          {/* <Image
            src="/logo.png"
            alt="PokéDraw"
            width={80}
            height={80}
            className="mx-auto h-auto w-48 md:w-36"
            priority
          /> */}
          {/* <p className="text-white mt-2 text-base font-semibold">
            Draw Pokémon · Guess Fast · Win Points
          </p> */}
        </div>

        <Card className="flex flex-col md:flex-row gap-2 pt-8 md:pt-10 mx-auto w-full relative overflow-visible">

          <div className="flex justify-center items-center absolute top-[-60px] left-4">
            <Image
              src="/logo2.png"
              alt="PokéDraw"
              width={80}
              height={80}
              className="h-auto w-32 md:w-36 z-99"
              priority
            />
            <div className="bg-pd-surface p-3 py-2 rounded-2xl mb-10">
              <label className="text-xs text-center font-bold text-pd-text-muted uppercase tracking-wider mb-2 block">
                Trainer Name
              </label>
              <input
                type="text"
                placeholder="Nickname..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
                className="w-full bg-pd-surface-alt rounded-xl p-3 text-pd-text text-base font-semibold focus:outline-none focus:ring-2 focus:ring-pd-green/40 transition-all placeholder:text-pd-text-muted/40"
              />


            </div>
          </div>


          <div className="flex flex-col justify-center pt-4 flex-1">
            {/* Name Input & Quick Play */}
            <div className="md:block flex items-center bg-pd-surface rounded-2xl p-5 pt-4 pb-0 md:space-y-4 gap-4 ">
              {/* <label className="text-xs font-bold text-pd-text-muted uppercase tracking-wider mb-2 block">
                Trainer Name
              </label> */}
              {/* Show Reference Toggle */}
              <div className="flex items-center justify-between p-3 bg-pd-surface-alt rounded-xl flex-1">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-pd-text">Show Reference</span>
                  <span className="text-[10px] text-pd-text-muted">Display Pokémon images while drawing</span>
                </div>
                <button
                  onClick={() => setShowReference(!showReference)}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-[2px] border-2 cursor-pointer ${showReference ? 'bg-pd-green border-transparent' : 'bg-pd-surface-alt/80 border-pd-surface'
                    }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${showReference ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                </button>
              </div>
              <div className="flex items-center gap-4">


                <Button
                  onClick={handleQuickPlay}
                  disabled={isMatching || isCreating}
                  className="w-full flex-1 py-5 text-base gap-2 bg-pd-red hover:bg-pd-red/90 shadow-md shadow-pd-red/20 border-b-4 border-black/20"
                >
                  {isMatching ? "Searching..." : "Play!"}
                </Button>
              </div>

              {/* Join Room (Desktop only) */}
              {isDesktop && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mt-6 pt-6 border-t border-pd-text/5">
                    <div className="w-8 h-8 bg-pd-sky/15 rounded-lg flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 text-pd-sky" />
                    </div>
                    <h3 className="font-bold text-pd-text">Join Room</h3>
                  </div>
                  <div className="flex gap-4 mt-3">
                    <input
                      type="text"
                      placeholder="Code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="flex-1 bg-pd-surface-alt rounded-lg p-3 text-pd-text font-mono text-base focus:outline-none focus:ring-2 focus:ring-pd-sky/30 placeholder:text-pd-text-muted/40"
                    />
                    <Button variant="secondary" onClick={handleJoinRoom} className="px-4 py-3 h-full text-base">
                      Join <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>




          </div>

          {/* Pokéball Separator */}
          <div className="flex items-center justify-center py-2 md:py-0 px-5 space-x-6">
            {/* Mobile-only Join Room */}
            {!isDesktop && (
              <div className="flex flex-1 flex-col w-full mb-6">
                <div className="flex items-center gap-3  border-t border-pd-text/5 pt-4">
                  <div className="w-8 h-8 bg-pd-sky/15 rounded-lg flex items-center justify-center">
                    <Gamepad2 className="w-4 h-4 text-pd-sky" />
                  </div>
                  <h3 className="font-bold text-pd-text">Join Room</h3>
                </div>
                <div className="gap-4 mt-3 flex">
                  <input
                    type="text"
                    placeholder="Code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="flex-1 bg-pd-surface-alt rounded-lg p-3 text-pd-text font-mono text-base focus:outline-none focus:ring-2 focus:ring-pd-sky/30 placeholder:text-pd-text-muted/40"
                  />
                  <Button variant="secondary" onClick={handleJoinRoom} className="px-4 py-3 h-full text-base">
                    Join <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}
            <div className="relative w-12 h-12 flex items-center justify-center md:mt-0 mt-8">
              {/* The Pokéball shape */}
              <div className="absolute w-full h-full rounded-full border-[3px] border-pd-text bg-white overflow-hidden shadow-sm rotate-[-10deg]">
                <div className="absolute top-0 left-0 w-full h-1/2 bg-pd-red border-b-[3px] border-pd-text" />
              </div>
              {/* Center button with "OR" */}
              <div className="z-10 w-6 h-6 rounded-full border-[3px] border-pd-text bg-white flex items-center justify-center shadow-inner">
                <span className="text-[8px] font-black text-pd-text-muted uppercase tracking-tighter">OR</span>
              </div>
            </div>
          </div>

          {/* Create Room Card */}
          <div className="bg-pd-surface rounded-2xl overflow-hidden">
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
              <div className="relative pt-6">
                <div className="flex justify-between mb-2">
                  <label className="text-xs font-bold text-pd-text-muted uppercase tracking-wider">
                    Difficulty
                  </label>
                  <span className="text-xs font-bold text-pd-honey">
                    {difficulty === 1 ? "Iconic" : difficulty === 2 ? "Easy" : difficulty === 3 ? "Normal" : difficulty === 4 ? "Hard" : "Obscure"}
                  </span>
                </div>

                <div className="relative h-10 flex items-center">
                  {/* Level Indicators (Dots) */}
                  <div className="absolute w-full flex justify-between px-2.5 pointer-events-none">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${difficulty >= level ? 'bg-pd-honey' : 'bg-pd-text/20'
                          }`}
                      />
                    ))}
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={difficulty}
                    onChange={(e) => setDifficulty(parseInt(e.target.value))}
                    className="w-full accent-transparent h-1.5 bg-pd-surface-alt/50 rounded-full appearance-none cursor-pointer z-10 relative [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-10 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:bg-transparent"
                  />

                  {/* Custom Pokemon Thumb */}
                  <div
                    className="absolute pointer-events-none transition-all duration-300 ease-out z-20 flex items-center justify-center"
                    style={{
                      left: `calc(${(difficulty - 1) * 25}% - 20px)`,
                      width: '40px',
                      height: '40px',
                      top: '-28px', // Positioned physically above the track
                    }}
                  >
                    <Image
                      src={DIFFICULTY_POKEMON[difficulty]}
                      alt="Difficulty Icon"
                      width={40}
                      height={40}
                      className="object-contain drop-shadow-lg animate-bounce-slow"
                    />
                  </div>
                </div>

                <style jsx>{`
                  @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                  }
                  .animate-bounce-slow {
                    animation: bounce-slow 2s infinite ease-in-out;
                  }
                `}</style>
              </div>


            </div>

            <div className="px-5 pb-5">
              <Button onClick={handleCreateRoom} disabled={isCreating} className="w-full flex-1 py-5 text-base gap-2 bg-pd-red hover:bg-pd-red/90 shadow-md shadow-pd-red/20 border-b-4 border-black/20">
                <PlusCircle className="w-5 h-5" />
                {isCreating ? "Creating..." : "Create Lobby"}
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
