const fs = require('fs');

async function generatePokemonData() {
    console.log('Fetching Gen 1 Pokemon data...');
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=151');
    const data = await res.json();

    const pokemonList = data.results.map((p, index) => {
        const pokedex_id = index + 1;
        let rarity = 3;

        // Assign simple rarity (1=Iconic, 5=Obscure)
        if ([1, 4, 7, 25, 133, 150].includes(pokedex_id)) rarity = 1;      // Starters + Pikachu + Eevee + Mewtwo
        else if ([2, 3, 5, 6, 8, 9, 143].includes(pokedex_id)) rarity = 2; // Evolutions + Snorlax
        else if (pokedex_id > 100) rarity = 4;                             // Later gen 1 are slightly harder for some

        return {
            id: pokedex_id,
            pokedex_id,
            name: p.name,
            generation: 1,
            rarity
        };
    });

    fs.writeFileSync('./data/pokemon.json', JSON.stringify(pokemonList, null, 2));
    console.log('Successfully generated data/pokemon.json with 151 entries.');
}

generatePokemonData().catch(console.error);
