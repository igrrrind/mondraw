import { useState, useEffect } from 'react';
import { Pokemon } from '@/types';
import { Image as ImageIcon, X } from 'lucide-react';
import { Button } from './ui/button';

interface ReferenceToolProps {
    pokemon?: Pokemon;
}

export function ReferenceTool({ pokemon }: ReferenceToolProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (pokemon) {
            setImageUrl(`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.pokedex_id}.png`);
        }
    }, [pokemon]);

    if (!pokemon || !imageUrl) return null;

    return (
        <div className="absolute top-4 left-4 z-50">
            {!isOpen ? (
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => setIsOpen(true)}
                    className="rounded-full shadow-md animate-bounce"
                >
                    <ImageIcon className="w-6 h-6" />
                </Button>
            ) : (
                <div className="bg-pd-surface rounded-xl p-4 shadow-lg relative animate-in fade-in zoom-in w-48 transition-all">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute -top-3 -right-3 bg-pd-red text-white rounded-full p-1 shadow-md"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="bg-pd-surface-alt rounded-lg p-2 flex items-center justify-center overflow-hidden">
                        <img
                            src={imageUrl}
                            alt={pokemon.name}
                            className="w-full h-auto object-contain max-h-32"
                        />
                    </div>
                    <div className="mt-3 text-center">
                        <p className="text-xs text-pd-text-muted font-bold uppercase tracking-wider">Target</p>
                        <h3 className="text-pd-text font-black text-lg capitalize">{pokemon.name}</h3>
                    </div>
                </div>
            )}
        </div>
    );
}
