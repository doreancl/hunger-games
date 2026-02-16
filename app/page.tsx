'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  createLocalMatchFromSetup,
  getSetupValidation,
  loadLocalMatchesFromStorage,
  saveLocalMatchesToStorage,
  type LocalMatchSummary
} from '@/lib/local-matches';

const CHARACTER_OPTIONS = [
  { id: 'char-01', name: 'Atlas' },
  { id: 'char-02', name: 'Nova' },
  { id: 'char-03', name: 'Kael' },
  { id: 'char-04', name: 'Mara' },
  { id: 'char-05', name: 'Orion' },
  { id: 'char-06', name: 'Luna' },
  { id: 'char-07', name: 'Ezra' },
  { id: 'char-08', name: 'Iris' },
  { id: 'char-09', name: 'Dax' },
  { id: 'char-10', name: 'Cora' },
  { id: 'char-11', name: 'Vex' },
  { id: 'char-12', name: 'Sage' }
];
const DEFAULT_CHARACTERS = CHARACTER_OPTIONS.slice(0, 10).map((character) => character.id);
const DEFAULT_SIMULATION_SPEED = '1x' as const;
const DEFAULT_EVENT_PROFILE = 'balanced' as const;
const DEFAULT_SURPRISE_LEVEL = 'normal' as const;

export default function Home() {
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(DEFAULT_CHARACTERS);
  const [seed, setSeed] = useState('');
  const [simulationSpeed, setSimulationSpeed] = useState<'1x' | '2x' | '4x'>(
    DEFAULT_SIMULATION_SPEED
  );
  const [eventProfile, setEventProfile] = useState<'balanced' | 'aggressive' | 'chaotic'>(
    DEFAULT_EVENT_PROFILE
  );
  const [surpriseLevel, setSurpriseLevel] = useState<'low' | 'normal' | 'high'>(
    DEFAULT_SURPRISE_LEVEL
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localMatches, setLocalMatches] = useState<LocalMatchSummary[]>([]);
  const [openedMatchId, setOpenedMatchId] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const setupValidation = useMemo(
    () => getSetupValidation(selectedCharacters),
    [selectedCharacters]
  );
  const openedMatch =
    localMatches.find((match) => match.id === openedMatchId) ?? localMatches[0] ?? null;
  const tensionPreview = Math.min(100, 10 + selectedCharacters.length * 4);

  useEffect(() => {
    const { matches, error } = loadLocalMatchesFromStorage(window.localStorage);
    setLocalMatches(matches);
    setOpenedMatchId(matches[0]?.id ?? null);
    if (error) {
      setInfoMessage(error);
      return;
    }
    if (matches[0]) {
      applySetupFromMatch(matches[0]);
    }
  }, []);

  function applySetupFromMatch(match: LocalMatchSummary) {
    setSelectedCharacters(match.roster_character_ids);
    setSeed(match.settings.seed ?? '');
    setSimulationSpeed(match.settings.simulation_speed);
    setEventProfile(match.settings.event_profile);
    setSurpriseLevel(match.settings.surprise_level);
  }

  function resetSetupToDefaults() {
    setSelectedCharacters(DEFAULT_CHARACTERS);
    setSeed('');
    setSimulationSpeed(DEFAULT_SIMULATION_SPEED);
    setEventProfile(DEFAULT_EVENT_PROFILE);
    setSurpriseLevel(DEFAULT_SURPRISE_LEVEL);
  }

  function toggleCharacter(characterId: string) {
    setSelectedCharacters((previous) => {
      if (previous.includes(characterId)) {
        return previous.filter((id) => id !== characterId);
      }
      return [...previous, characterId];
    });
  }

  function generateSeed() {
    setSeed(crypto.randomUUID().slice(0, 8));
  }

  function onStartMatch() {
    if (!setupValidation.is_valid) {
      setInfoMessage('Config invalida. Revisa el roster antes de iniciar.');
      return;
    }

    const nowIso = new Date().toISOString();
    const newMatch = createLocalMatchFromSetup(
      {
        roster_character_ids: selectedCharacters,
        seed: seed.trim() === '' ? null : seed.trim(),
        simulation_speed: simulationSpeed,
        event_profile: eventProfile,
        surprise_level: surpriseLevel
      },
      nowIso,
      crypto.randomUUID()
    );

    const nextMatches = [newMatch, ...localMatches];
    const saveResult = saveLocalMatchesToStorage(window.localStorage, nextMatches);
    if (!saveResult.ok) {
      setInfoMessage(saveResult.error);
      return;
    }

    setLocalMatches(nextMatches);
    setOpenedMatchId(newMatch.id);
    setInfoMessage(`Partida creada (${newMatch.id.slice(0, 8)}).`);
  }

  function onOpenMatch(matchId: string) {
    const match = localMatches.find((item) => item.id === matchId);
    if (!match) {
      setInfoMessage('No se encontro la partida seleccionada.');
      return;
    }

    setOpenedMatchId(match.id);
    applySetupFromMatch(match);
    setInfoMessage(`Partida abierta (${match.id.slice(0, 8)}).`);
  }

  return (
    <main
      style={{
        maxWidth: 980,
        margin: '0 auto',
        padding: '24px 16px 48px',
        fontFamily: 'ui-sans-serif, system-ui'
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Hunger Games Simulator</h1>
        <p style={{ margin: 0, color: '#334155' }}>
          Fase actual: <strong>{openedMatch?.cycle_phase ?? 'setup'}</strong>
        </p>
        <div
          aria-label="barra de tension"
          style={{
            marginTop: 8,
            height: 10,
            borderRadius: 999,
            backgroundColor: '#e2e8f0',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${tensionPreview}%`,
              height: '100%',
              backgroundColor: tensionPreview > 70 ? '#dc2626' : '#0ea5e9'
            }}
          />
        </div>
      </header>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ marginBottom: 8 }}>Setup de partida</h2>
        <p style={{ marginTop: 0, color: '#475569' }}>
          Selecciona roster, seed y ritmo antes de iniciar.
        </p>

        <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          {CHARACTER_OPTIONS.map((character) => (
            <label key={character.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={selectedCharacters.includes(character.id)}
                onChange={() => toggleCharacter(character.id)}
              />
              {character.name}
            </label>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            Seed (opcional)
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                placeholder="manual o aleatoria"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={generateSeed}>
                Aleatoria
              </button>
            </div>
          </label>

          <label style={{ display: 'grid', gap: 4 }}>
            Ritmo
            <select
              value={simulationSpeed}
              onChange={(event) => setSimulationSpeed(event.target.value as '1x' | '2x' | '4x')}
            >
              <option value="1x">1x</option>
              <option value="2x">2x</option>
              <option value="4x">4x</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            style={{ justifySelf: 'start' }}
          >
            {showAdvanced ? 'Ocultar opciones avanzadas' : 'Mostrar opciones avanzadas'}
          </button>

          {showAdvanced ? (
            <>
              <label style={{ display: 'grid', gap: 4 }}>
                Perfil de eventos
                <select
                  value={eventProfile}
                  onChange={(event) =>
                    setEventProfile(event.target.value as 'balanced' | 'aggressive' | 'chaotic')
                  }
                >
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                  <option value="chaotic">Chaotic</option>
                </select>
              </label>

              <label style={{ display: 'grid', gap: 4 }}>
                Nivel de sorpresa
                <select
                  value={surpriseLevel}
                  onChange={(event) =>
                    setSurpriseLevel(event.target.value as 'low' | 'normal' | 'high')
                  }
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </label>
            </>
          ) : null}
        </div>

        <div style={{ marginTop: 14, padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}>
          <strong>Resumen</strong>
          <p style={{ margin: '6px 0' }}>
            Roster: {selectedCharacters.length} personajes | Seed:{' '}
            {seed.trim() === '' ? 'aleatoria al iniciar' : seed.trim()} | Ritmo: {simulationSpeed}
          </p>
          {setupValidation.issues.length > 0 ? (
            <ul style={{ marginTop: 4, marginBottom: 8 }}>
              {setupValidation.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: '6px 0', color: '#166534' }}>Configuracion valida.</p>
          )}

          <button type="button" disabled={!setupValidation.is_valid} onClick={onStartMatch}>
            Iniciar partida nueva
          </button>
          <button type="button" onClick={resetSetupToDefaults} style={{ marginLeft: 8 }}>
            Nuevo setup
          </button>
          {infoMessage ? <p style={{ marginBottom: 0 }}>{infoMessage}</p> : null}
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 8 }}>Partidas locales</h2>
        {localMatches.length === 0 ? (
          <p style={{ color: '#64748b' }}>No hay partidas guardadas en este navegador.</p>
        ) : (
          <ul style={{ display: 'grid', gap: 10, padding: 0 }}>
            {localMatches.map((match) => (
              <li
                key={match.id}
                style={{
                  listStyle: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: 10
                }}
              >
                <p style={{ margin: '0 0 6px' }}>
                  <strong>{match.id.slice(0, 8)}</strong> | {match.cycle_phase} | turno{' '}
                  {match.turn_number}
                </p>
                <p style={{ margin: '0 0 8px', color: '#475569' }}>
                  Vivos: {match.alive_count}/{match.total_participants} | Seed:{' '}
                  {match.settings.seed ?? 'sin seed'}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenMatch(match.id)}
                >
                  Abrir partida y cargar setup
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
