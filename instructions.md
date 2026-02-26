This comprehensive Technical & Design Specification (TDS) is designed to be fed directly into an AI coding agent. It provides the architectural "gravity" needed to keep the app performant and the design "DNA" to make it look professional. You are fee to create additional documents to make the app better.

📜 Project PokéDraw: Technical Design Document
1. Project Vision

A real-time, multiplayer "Gartic-style" drawing game utilizing the Pokémon IP. The app features difficulty scaling based on Pokémon popularity/obscurity, generation-specific filters, and a high-performance drawing engine.
2. Visual & Interaction Design
🎨 Style: "Modern Rotom-Dex"

    Theme: Dark-mode primary with "cozy, soft" UI elements.

    Typography: Sans-serif (Inter or Geist).

    Countdown bar underneath drawing canvas

    Canvas: White or light-gray drawing surface


🕹️ User Experience (UX)

    Drawer View: Includes a "Reference Tool" (a small, toggleable modal showing the high-res official artwork of the target Pokémon). (fetched from PokeAPI)

    Guesser View: A chat-focused layout where correct guesses are hidden from others but trigger a visual "Confetti" or "Level Up" toast.

    Responsive: The canvas should maintain a fixed aspect ratio (16:9) and scale using CSS transform: scale() to fit mobile screens without breaking coordinate mapping.

3. Technical Stack & Architecture

    Framework: Next.js (App Router).

    Real-time Engine: Pusher Channels (Serverless-friendly, handles event broadcasting).

    State Store: Upstash Redis (Stores ephemeral room data: who is drawing, scores, time remaining).

    Database: Supabase (PostgreSQL) (Stores Pokémon metadata, Rarity scores, and User Profiles).

    Canvas Engine: HTML5 Canvas API + requestAnimationFrame for smooth line interpolation.

4. Data Models (PostgreSQL/Supabase/ local)
Table: pokemon (local json file)
Column	Type	Description
id	Int	Internal ID
pokedex_id	Int	Official Dex Number
name	String	Pokémon Name
generation	Int	1 through 9
rarity	Int	1 (Iconic) to 5 (Ultra-Obscure)
image_url not included, to be fetched with PokeAPI


Table: rooms
Column	Type	Description
id	UUID	Room Unique Identifier
config	JSONB	{ gens: [1,2], difficulty: 3, max_players: 8 }
status	Enum	LOBBY, DRAWING, ROUND_END, GAME_OVER

5. Game Logic 
A. The Drawing Stream (Low Latency)

To prevent lag, the AI agent must implement Point Throttling:

    Collect X/Y coordinates on mousemove.

    Buffer points into a small array.

    Broadcast to Pusher every 50ms (instead of every single pixel) to avoid hitting rate limits.

    Interpolate: The receiving clients should use quadraticCurveTo to connect points smoothly.

B. Word Selection Algorithm

When a round starts, the server-side function must:

    Fetch all Pokémon matching the room's generation and rarity settings.

    Randomly select 2 options.

    Present these to the "Drawer" for a 10-second selection phase.

C. Scoring System
Guesser Points=(Total Round TimeTime Remaining​)×500

    The Drawer earns 10% of every correct guesser's points.

    After 10 turns, declares the winner

6. API & Real-time Endpoints
POST /api/room/create

    Initializes Redis state for a new room.

    Sets default settings.

PUSHER Event: client-draw-event

    Payload: { x, y, lastX, lastY, color, size, isInitialPoint }

    Allows guessers to replicate the drawing in real-time.

PUSHER Event: word-guessed

    Triggered via a Server Action when a chat message matches room.currentWord.

    Updates Redis score and broadcasts to the room.


