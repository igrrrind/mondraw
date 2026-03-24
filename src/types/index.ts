export type RoomStatus = 'LOBBY' | 'SELECTING' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export interface Pokemon {
  id: number;
  pokedex_id: number;
  name: string;
  generation: number;
  rarity: number;
}

export interface RoomConfig {
  gens: number[];
  difficulty: number;
  maxPlayers: number;
  showReference?: boolean;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isDrawer: boolean;
  avatarUrl?: string;
  hasGuessed?: boolean;
}

export interface RoomState {
  id: string;
  config: RoomConfig;
  status: RoomStatus;
  players: Record<string, Player>;
  playerOrder: string[];
  currentWord?: string;
  currentPokemonId?: number;
  wordOptions?: Pokemon[];
  roundTimer?: number;
  roundLimit: number;
  currentRound: number;
  roundStartTime?: number; // timestamp when phase started
}

export interface DrawPoint {
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  color: string;
  size: number;
  isInitialPoint: boolean;
}
