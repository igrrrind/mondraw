import pokemonData from '../data/pokemon.json';
import { Pokemon, RoomConfig } from '../types';

export function getRandomPokemon(config: RoomConfig): Pokemon {
    const validPokemon = (pokemonData as Pokemon[]).filter(
        (p) =>
            config.gens.includes(p.generation) &&
            p.rarity <= config.difficulty
    );

    if (validPokemon.length === 0) {
        return (pokemonData as Pokemon[])[24]; // Pikachu fallback
    }

    return validPokemon[Math.floor(Math.random() * validPokemon.length)];
}

export function getWordOptions(config: RoomConfig): [Pokemon, Pokemon] {
    // Filter Pokémon based on room configuration
    const validPokemon = (pokemonData as Pokemon[]).filter(
        (p) =>
            config.gens.includes(p.generation) &&
            p.rarity <= config.difficulty
    );

    // If no valid Pokémon exist, fallback to Pikachu and Bulbasaur
    if (validPokemon.length < 2) {
        const fallback = pokemonData as Pokemon[];
        return [fallback[24], fallback[0]];
    }

    // Randomly select 2 unique Pokémon
    const firstIndex = Math.floor(Math.random() * validPokemon.length);
    let secondIndex = Math.floor(Math.random() * validPokemon.length);

    while (firstIndex === secondIndex) {
        secondIndex = Math.floor(Math.random() * validPokemon.length);
    }

    return [validPokemon[firstIndex], validPokemon[secondIndex]];
}
