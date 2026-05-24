import { expect, test, type Page } from '@playwright/test';

const LOCAL_MATCHES_STORAGE_KEY = 'hunger-games.local-matches.v1';
const LOCAL_RUNTIME_STORAGE_KEY = 'hunger-games.local-runtime.v1';

async function configureStarWarsRoster(page: Page, seed: string, speed: '1x' | '2x' | '4x' = '2x') {
  await page.goto('/new');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Setup de partida' })).toBeVisible();

  await page.getByRole('button', { name: 'Star Wars' }).click();
  await expect(page.getByLabel('A New Hope')).toBeVisible();
  await page.getByLabel('A New Hope').check();
  await page.getByLabel('The Empire Strikes Back').check();
  await expect(page.getByText('Seleccionados: 12')).toBeVisible();
  await page.getByRole('button', { name: 'Generar roster' }).click();

  await expect(page.getByText('Roster: 12', { exact: false })).toBeVisible();
  await page.getByPlaceholder('manual o aleatoria').fill(seed);
  await page.getByRole('combobox', { name: 'Ritmo inicial' }).selectOption(speed);
}

async function startSimulation(page: Page, seed: string, speed: '1x' | '2x' | '4x' = '2x') {
  await configureStarWarsRoster(page, seed, speed);
  await page.getByRole('button', { name: 'Iniciar simulacion' }).click();

  await expect(page.getByRole('heading', { name: 'Feed narrativo' })).toBeVisible();
  await expect(page.getByTestId('info-message')).toContainText('Simulacion iniciada');
  await expect(page.getByTestId('kpi-turn')).toContainText('0');
  await expect(page.getByTestId('kpi-alive')).toContainText('12');
}

async function getRuntimeTurn(page: Page) {
  const runtime = await page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { runtime?: { turn_number?: number } };
    return parsed.runtime?.turn_number ?? null;
  }, LOCAL_RUNTIME_STORAGE_KEY);

  expect(runtime).not.toBeNull();
  return runtime as number;
}

test('HP-01 inicia una simulacion valida desde setup', async ({ page }) => {
  await startSimulation(page, 'arena-hp01', '2x');

  await expect(page).toHaveURL(/\/sessions\//);
  await expect(page.getByText('Fase actual:', { exact: false })).toContainText('Bloodbath');
  await expect(page.getByText('Configuracion valida para iniciar.')).toHaveCount(0);

  const localState = await page.evaluate(([matchesKey, runtimeKey]) => ({
    hasMatches: Boolean(window.localStorage.getItem(matchesKey)),
    hasRuntime: Boolean(window.localStorage.getItem(runtimeKey))
  }), [LOCAL_MATCHES_STORAGE_KEY, LOCAL_RUNTIME_STORAGE_KEY]);

  expect(localState).toEqual({ hasMatches: true, hasRuntime: true });
});

test('HP-00 nueva partida abre setup limpio aunque exista una partida guardada', async ({ page }) => {
  await startSimulation(page, 'arena-hp00', '4x');

  await page.goto('/new');

  await expect(page).toHaveURL(/\/new$/);
  await expect(page.getByRole('heading', { name: 'Setup de partida' })).toBeVisible();
  await expect(page.getByText('Roster: 0 | Seed: aleatoria al iniciar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar simulacion' })).toBeDisabled();
  await expect(page.getByPlaceholder('manual o aleatoria')).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Ritmo inicial' })).toHaveValue('2x');
  await expect(page.getByRole('heading', { name: 'Feed narrativo' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Participantes' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Relaciones destacadas' })).toHaveCount(0);
});

test('HP-04 selecciona roster por defecto y permite toggle global', async ({ page }) => {
  await page.goto('/new');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Star Wars' }).click();
  await expect(page.getByLabel('A New Hope')).toBeVisible();
  await page.getByLabel('A New Hope').check();

  await expect(page.getByText('Seleccionados: 6')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Seleccionar todo el roster' })).toBeChecked();

  await page.getByRole('checkbox', { name: 'Seleccionar todo el roster' }).uncheck();
  await expect(page.getByText('Seleccionados: 0')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Seleccionar todo el roster' }).check();
  await expect(page.getByText('Seleccionados: 6')).toBeVisible();
});

test('HP-02 conserva progreso tras avanzar y refrescar', async ({ page }) => {
  await startSimulation(page, 'arena-hp02', '1x');

  await expect.poll(() => getRuntimeTurn(page), { timeout: 7000 }).toBeGreaterThanOrEqual(2);
  await page.getByRole('button', { name: 'Pausar simulacion' }).click();
  const feedCountBeforeReload = await page.getByTestId('feed-item').count();
  expect(feedCountBeforeReload).toBeGreaterThanOrEqual(2);

  const turnBeforeReload = await getRuntimeTurn(page);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Feed narrativo' })).toBeVisible();
  await expect(page.getByTestId('feed-item')).toHaveCount(feedCountBeforeReload);
  await expect(page.getByTestId('kpi-turn')).toContainText(String(turnBeforeReload));
  await expect(page.getByTestId('kpi-alive')).toContainText(/\d+/);
  await expect(page.getByRole('button', { name: 'Reproducir a 1x' })).toBeEnabled();
});

test('HP-03 reanuda una partida guardada desde historial', async ({ page }) => {
  await startSimulation(page, 'arena-hp03', '4x');
  await expect.poll(() => getRuntimeTurn(page), { timeout: 5000 }).toBeGreaterThanOrEqual(1);
  await page.getByRole('button', { name: 'Pausar simulacion' }).click();
  await expect(page.getByTestId('kpi-speed')).toContainText('Pausa');

  const expectedTurn = await getRuntimeTurn(page);

  await page.goto('/sessions');
  await expect(page.getByRole('heading', { name: 'Historial de partidas' })).toBeVisible();
  await page.getByRole('link', { name: 'Reanudar' }).first().click();

  await expect(page).toHaveURL(/\/sessions\//);
  await expect(page.getByRole('heading', { name: 'Feed narrativo' })).toBeVisible();
  await expect(page.getByTestId('feed-item').first()).toBeVisible();
  await expect(page.getByTestId('kpi-turn')).toContainText(String(expectedTurn));
  await expect(page.getByRole('button', { name: 'Reproducir a 4x' })).toBeEnabled();
});
