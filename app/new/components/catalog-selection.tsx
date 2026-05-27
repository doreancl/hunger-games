import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { FranchiseEntry } from '@/lib/domain/types';

type MovieOption = {
  movie_id: string;
  movie_title: string;
};

type CatalogSelectionProps = {
  franchiseOptions: FranchiseEntry[];
  selectedFranchiseId: string | null;
  onSelectFranchise: (franchiseId: string) => void;
  moviesForSelectedFranchise: MovieOption[];
  selectedMovieIds: string[];
  toggleMovie: (movieId: string) => void;
  onGenerateRoster: () => void;
};

export function CatalogSelection(props: CatalogSelectionProps) {
  const {
    franchiseOptions,
    selectedFranchiseId,
    onSelectFranchise,
    moviesForSelectedFranchise,
    selectedMovieIds,
    toggleMovie,
    onGenerateRoster
  } = props;

  return (
    <Card className="h-full">
      <CardHeader className="space-y-4 px-6 py-[22px]">
        <CardTitle className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          1) Franquicia y catalogo
        </CardTitle>
        <div className="grid gap-2 font-mono text-[12.5px]">
          {franchiseOptions.map((franchise) => (
            <Button
              key={franchise.franchise_id}
              type="button"
              variant={selectedFranchiseId === franchise.franchise_id ? 'default' : 'outline'}
              className="justify-start"
              onClick={() => onSelectFranchise(franchise.franchise_id)}
            >
              {franchise.franchise_name}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-[22px]">
        <div className="space-y-2">
          <h4 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            2) Peliculas
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

        <div className="grid gap-2">
          <Button
            type="button"
            onClick={onGenerateRoster}
            disabled={!selectedFranchiseId || selectedMovieIds.length === 0}
          >
            Generar roster
          </Button>
          <Badge variant="secondary" className="w-fit">
            Peliculas activas: {selectedMovieIds.length}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
