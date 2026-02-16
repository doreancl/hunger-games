# Repository Guidelines

## Project Structure

- `app/`: Next.js App Router pages and API routes.
- `app/api/matches/route.ts`: match creation endpoint.
- `lib/`: domain contracts and simulation/state logic.
- `tests/`: Vitest test suite (`*.test.ts`).
- `specs/`: layered spec docs and implementation plans.

## Build, Test, and Development Commands

- `npm run dev`: run local development server.
- `npm run build`: production build.
- `npm run start`: run built app.
- `npm run lint`: run Next.js linting.
- `npm run test:unit`: run unit tests.
- `npm run test:coverage`: run tests with coverage report.
- `npm run validate`: lint + unit + coverage gate.

## Coding Style & Naming Conventions

- Language: TypeScript (`.ts`), strict and explicit domain typing.
- Keep domain contracts centralized in `lib/domain/schemas.ts` and `lib/domain/types.ts`.
- Preserve API error shape consistency (typed `error.code`, `error.message`, optional `details`).
- Prefer small pure functions in domain logic for testability.

## Testing Guidelines

- Test framework: Vitest (`tests/**/*.test.ts`).
- Coverage uses V8 provider with thresholds at 90% (lines/functions/branches/statements).
- Add/update tests in `tests/` alongside behavioral changes in `app/` or `lib/`.
- Run `npm run validate` before opening a PR.

## Commit & Pull Request Guidelines

- Follow Conventional Commits with action-oriented subjects.
- Group related changes; avoid bundling unrelated refactors.
- PR should include:
  - Scope and user-visible behavior changes.
  - Commands executed (`npm run lint`, `npm run test:unit`, `npm run test:coverage`).
  - Any spec/plan updates under `specs/` when applicable.

## Security & Configuration Tips

- Never commit secrets or environment files with credentials.
- Validate request and response payloads at API boundaries using Zod schemas.
- Keep contract-breaking changes synchronized across:
  - `lib/domain/schemas.ts`
  - `lib/domain/types.ts`
  - `tests/domain-contracts.test.ts`
