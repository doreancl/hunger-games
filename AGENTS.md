# Repository Guidelines

## Project Structure

- `cmd/gog/`: CLI entrypoint.
- `internal/`: implementation (`cmd/`, Google API client layer, auth store).
- Tests: `*_test.go` next to code.
- `bin/`: build outputs; `docs/`: plans/specs.

## Build, Test, and Development Commands

- `make` / `make build`: build `bin/dorean_g`.
- `make tools`: install pinned dev tools into `.tools/`.
- `make fmt` / `make lint` / `make test` / `make ci`: format, lint, test, full local gate.
- `make dg -- ...`: build + run CLI via alias target.
- Hooks: `lefthook install` enables pre-commit/pre-push checks.

## Coding Style & Naming Conventions

- Formatting: `make fmt` (`goimports` local prefix `google-cli` + `gofumpt`).
- Keep stdout parseable and error messages clear.

## Testing Guidelines

- Unit tests: stdlib `testing` (and `httptest` where needed).
- Run all tests with `make test`.
- Run full local checks with `make ci`.

## Commit & Pull Request Guidelines

- Follow Conventional Commits with action-oriented subjects.
- Group related changes; avoid bundling unrelated refactors.
- PRs should summarize scope, note testing performed, and mention user-facing changes.

## Security & Configuration Tips

- Never commit OAuth credential JSON files or token files.
- Credentials path:
  - `--credentials` flag, or
  - `GCAL_CREDENTIALS` env var, or
  - default config directory (`dorean_g`).
