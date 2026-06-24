import { expect, test, type Page } from '@playwright/test';

const LOCAL_MATCHES_STORAGE_KEY = 'hunger-games.local-matches.v1';
const LOCAL_RUNTIME_STORAGE_KEY = 'hunger-games.local-runtime.v1';

async function configureStarWarsRoster(page: Page, seed: string) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Setup de partida' })).toBeVisible();

  await page.getByRole('button', { name: 'Star Wars' }).click();
  await expect(page.getByLabel('A New Hope')).toBeVisible();
  await page.getByLabel('A New Hope').check();
  await page.getByLabel('The Empire Strikes Back').check();
  await expect(page.getByText('Seleccionados: 12')).toBeVisible();

  await expect(page.getByText('12 personajes seleccionados')).toBeVisible();
  await page.getByPlaceholder('manual o aleatoria').fill(seed);
}

async function startSimulation(page: Page, seed: string, speed: '1x' | '2x' | '4x' = '2x') {
  await configureStarWarsRoster(page, seed);
  await page.getByRole('button', { name: 'Iniciar simulacion' }).click();

  await expect(page.getByRole('heading', { name: 'Feed narrativo' })).toBeVisible({
    timeout: 20000
  });
  await expect(page.getByTestId('info-message')).toContainText('Simulacion iniciada');
  await expect(page.getByTestId('kpi-turn')).toContainText('0');
  await expect(page.getByTestId('kpi-alive')).toContainText('12');

  if (speed !== '2x') {
    await page.getByRole('button', { name: `Reproducir a ${speed}` }).click();
  }
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

async function getRuntimeMatchId(page: Page) {
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as { runtime?: { match_id?: string } };
      return parsed.runtime?.match_id ?? null;
    } catch {
      return null;
    }
  }, LOCAL_RUNTIME_STORAGE_KEY);
}

async function getLocalMatchIds(page: Page) {
  return page.evaluate((matchesKey) => {
    const raw = window.localStorage.getItem(matchesKey);
    if (!raw) {
      return [] as string[];
    }

    try {
      const parsed = JSON.parse(raw) as Array<{ id: string }>;
      return Array.isArray(parsed) ? parsed.map((item) => item.id) : [];
    } catch {
      return [];
    }
  }, LOCAL_MATCHES_STORAGE_KEY);
}

test('HP-01 starts a valid simulation from setup', async ({ page }) => {
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

test('HP-00 new match opens clean setup even when a saved match exists', async ({ page }) => {
  await startSimulation(page, 'arena-hp00', '4x');

  await page.goto('/');

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Setup de partida' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Partir de cero' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '1.1) Peliculas' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Iniciar simulacion' })).toBeDisabled();
  await expect(page.getByPlaceholder('manual o aleatoria')).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Ritmo inicial' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Feed narrativo' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Participantes' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Relaciones destacadas' })).toHaveCount(0);
});

test('HP-04 selects roster by default and allows global toggle', async ({ page }) => {
  await page.goto('/');
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

test('HP-05 /new redirects to the main setup', async ({ page }) => {
  await page.goto('/new');

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Setup de partida' })).toBeVisible();
});

test('HP-02 preserves progress after advancing and refreshing', async ({ page }) => {
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

test('HP-03 resumes a saved match from history', async ({ page }) => {
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

test('HP-06 turns autosave off and removes active runtime + match summary', async ({ page }) => {
  await startSimulation(page, 'arena-hp06');

  const runtimeMatchId = await getRuntimeMatchId(page);
  expect(runtimeMatchId).not.toBeNull();

  const matchesBefore = await getLocalMatchIds(page);
  expect(matchesBefore).toContain(runtimeMatchId);

  await page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('switch', { name: 'Guardar local' }).click();

  await expect(page.getByTestId('info-message')).toContainText(
    'Guardado local desactivado para la sesion actual.'
  );
  await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), LOCAL_RUNTIME_STORAGE_KEY)).toBeNull();
  const matchesAfter = await getLocalMatchIds(page);
  expect(matchesAfter).not.toContain(runtimeMatchId);
});

test('HP-07 ignores corrupt runtime envelopes and reports unrecoverable state', async ({ page }) => {
  await startSimulation(page, 'arena-hp07');
  await page.evaluate(
    ([storageKey, value]) => {
      window.localStorage.setItem(storageKey, value);
    },
    [LOCAL_RUNTIME_STORAGE_KEY, '{bad-json']
  );

  await page.reload();

  await expect(page.getByText('partida no recuperable. Inicia una nueva partida.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Feed narrativo' })).toHaveCount(0);
  await expect(page.getByTestId('kpi-turn')).toHaveCount(0);
});

test('HP-08 advances through POST /api/matches/:id/turns/advance', async ({ page }) => {
  const analyticsRequests: { event: string | null; properties: Record<string, unknown> | null }[] = [];
  const forbiddenAnalyticsKeys = new Set(['seed', 'snapshot', 'snapshot_id', 'snapshot_content', 'roster_names']);

  page.on('request', (request) => {
    if (!request.url().includes('/i/v0/e/')) {
      return;
    }

    const payload = request.postDataJSON() as unknown;
    if (payload && typeof payload === 'object') {
      const value = payload as { event?: string; properties?: Record<string, unknown> };
      analyticsRequests.push({
        event: typeof value.event === 'string' ? value.event : null,
        properties: value.properties && typeof value.properties === 'object' ? value.properties : null
      });
    }
  });

  const advanceRequest = page.waitForRequest((request) => {
    return request.method() === 'POST' && /\/api\/matches\/[^/]+\/turns\/advance$/.test(request.url());
  });

  await startSimulation(page, 'arena-hp08', '1x');

  const request = await advanceRequest;
  const endpoint = new URL(request.url());
  expect(endpoint.pathname).toMatch(/^\/api\/matches\/[^/]+\/turns\/advance$/);
  expect(request.method()).toBe('POST');

  await page.waitForTimeout(1000);
  if (analyticsRequests.length > 0) {
    for (const requestData of analyticsRequests) {
      if (!requestData.properties) {
        continue;
      }

      for (const key of Object.keys(requestData.properties)) {
        expect(forbiddenAnalyticsKeys.has(key)).toBe(false);
      }
    }
  }
});
