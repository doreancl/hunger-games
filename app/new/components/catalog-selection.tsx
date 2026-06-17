import { Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { FranchiseEntry } from '@/lib/domain/types';
import { cn } from '@/lib/utils';

type MovieOption = {
  movie_id: string;
  movie_title: string;
};

type CatalogSelectionProps = {
  franchiseOptions: FranchiseEntry[];
  selectedFranchiseId: string | null;
  isScratchMode: boolean;
  onSelectFranchise: (franchiseId: string) => void;
  moviesForSelectedFranchise: MovieOption[];
  selectedMovieIds: string[];
  toggleMovie: (movieId: string) => void;
  startFromScratch: () => void;
  generateRandomRoster: () => void;
};

export function CatalogSelection(props: CatalogSelectionProps) {
  const {
    franchiseOptions,
    selectedFranchiseId,
    isScratchMode,
    onSelectFranchise,
    moviesForSelectedFranchise,
    selectedMovieIds,
    toggleMovie,
    startFromScratch,
    generateRandomRoster
  } = props;
  const optionButtonClassName =
    'justify-start hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background';
  const activeOptionButtonClassName = 'ring-2 ring-ring ring-offset-2 ring-offset-background';

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-4 px-6 py-[22px]">
        <CardTitle className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          1) Franquicia y catalogo
        </CardTitle>
        <div className="grid gap-2 font-mono text-[12.5px]">
          <div className="grid grid-cols-[minmax(0,4fr)_minmax(0,1fr)] gap-2">
            <Button
              type="button"
              variant={isScratchMode ? 'default' : 'outline'}
              className={cn(
                optionButtonClassName,
                isScratchMode && activeOptionButtonClassName
              )}
              onClick={startFromScratch}
            >
              Partir de cero
            </Button>
            <Button
              type="button"
              variant="outline"
              size="default"
              className="w-full px-0 hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background"
              onClick={generateRandomRoster}
              aria-label="Generar roster aleatorio"
              title="Generar roster aleatorio"
            >
              <Dices data-icon="inline-start" aria-hidden="true" />
            </Button>
          </div>
          {franchiseOptions.map((franchise) => (
            <Button
              key={franchise.franchise_id}
              type="button"
              variant={selectedFranchiseId === franchise.franchise_id ? 'default' : 'outline'}
              className={cn(
                optionButtonClassName,
                selectedFranchiseId === franchise.franchise_id && activeOptionButtonClassName
              )}
              onClick={() => onSelectFranchise(franchise.franchise_id)}
            >
              {franchise.franchise_name}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-6 pb-[22px]">
        {isScratchMode ? null : (
          <div className="flex flex-col gap-2">
            <h4 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              1.1) Peliculas
            </h4>
            {selectedFranchiseId ? (
              moviesForSelectedFranchise.length > 0 ? (
                <div className="grid gap-2 font-mono text-[12.5px]">
                  {moviesForSelectedFranchise.map((movie) => {
                    const checked = selectedMovieIds.includes(movie.movie_id);
                    return (
                      <Label
                        key={movie.movie_id}
                        htmlFor={`movie-${movie.movie_id}`}
                        className="flex items-center gap-2 rounded-md bg-muted px-3 py-2"
                      >
                        <Checkbox
                          data-analytics-control="movie_selection"
                          id={`movie-${movie.movie_id}`}
                          checked={checked}
                          onChange={() => toggleMovie(movie.movie_id)}
                        />
                        {movie.movie_title}
                      </Label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hay peliculas disponibles para la franquicia elegida.
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Selecciona una franquicia para habilitar peliculas.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
