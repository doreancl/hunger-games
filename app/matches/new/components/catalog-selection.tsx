import styles from '../page.module.css';
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
    <>
      <div>
        <strong>1) Franquicia</strong>
        <div className={styles.catalogSelectionGrid}>
          {franchiseOptions.map((franchise) => (
            <button
              key={franchise.franchise_id}
              type="button"
              className={`${styles.button} ${
                selectedFranchiseId === franchise.franchise_id
                  ? styles.buttonSelected
                  : styles.buttonGhost
              }`}
              onClick={() => onSelectFranchise(franchise.franchise_id)}
            >
              {franchise.franchise_name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <strong>2) Peliculas</strong>
        {selectedFranchiseId ? (
          moviesForSelectedFranchise.length > 0 ? (
            <div className={styles.movieGrid}>
              {moviesForSelectedFranchise.map((movie) => (
                <label
                  key={movie.movie_id}
                  htmlFor={`movie-${movie.movie_id}`}
                  className={styles.characterToggle}
                >
                  <input
                    id={`movie-${movie.movie_id}`}
                    type="checkbox"
                    checked={selectedMovieIds.includes(movie.movie_id)}
                    onChange={() => toggleMovie(movie.movie_id)}
                  />
                  {movie.movie_title}
                </label>
              ))}
            </div>
          ) : (
            <p>No hay peliculas disponibles para la franquicia elegida.</p>
          )
        ) : (
          <p>Selecciona una franquicia para habilitar peliculas.</p>
        )}
      </div>

      <div className={styles.inlineControls}>
        <button
          className={styles.button}
          type="button"
          onClick={onGenerateRoster}
          disabled={!selectedFranchiseId || selectedMovieIds.length === 0}
        >
          Generar roster
        </button>
        <span>Peliculas activas: {selectedMovieIds.length}</span>
      </div>
    </>
  );
}
