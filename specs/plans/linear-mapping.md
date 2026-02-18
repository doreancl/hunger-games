# Linear mapping - hunger games

## Team / Project
- Team: `Sebacode`
- Project: `hunger games`

## Stories -> Linear Issues
- `US-001` -> `SEB-5` -> https://linear.app/sebacode/issue/SEB-5/01-us-001-contratos-y-modelo-base-de-dominio
- `US-002` -> `SEB-6` -> https://linear.app/sebacode/issue/SEB-6/02-us-002-ciclo-de-vida-base-de-partida
- `US-003A` -> `SEB-7` -> https://linear.app/sebacode/issue/SEB-7/03-us-003a-motor-director-catalogo
- `US-003B` -> `SEB-8` -> https://linear.app/sebacode/issue/SEB-8/03-us-003b-setup-ux-menu-partidas-locales
- `US-004` -> `SEB-9` -> https://linear.app/sebacode/issue/SEB-9/04-us-004-avance-de-turnos-server-authoritative (title pendiente de renombre en Linear)
- `US-005A` -> `SEB-10` -> https://linear.app/sebacode/issue/SEB-10/05-us-005a-ux-simulacion-en-vivo
- `US-005B` -> `SEB-11` -> https://linear.app/sebacode/issue/SEB-11/05-us-005b-continuidad-local-y-recuperacion
- `US-006A` -> `SEB-12` -> https://linear.app/sebacode/issue/SEB-12/06-us-006a-pantalla-final-replay
- `US-006B` -> `SEB-13` -> https://linear.app/sebacode/issue/SEB-13/06-us-006b-seguridad-y-hardening-api
- `US-006C` -> `SEB-14` -> https://linear.app/sebacode/issue/SEB-14/06-us-006c-observabilidad-y-reproducibilidad-operativa
- `US-007` -> `SEB-15` -> https://linear.app/sebacode/issue/SEB-15/07-us-007-suite-de-pruebas-integral
- `US-008` -> `SEB-16` -> https://linear.app/sebacode/issue/SEB-16/08-us-008-gate-final-de-release

## Dependency chain (blockedBy)
- `SEB-6` blocked by `SEB-5`
- `SEB-7` blocked by `SEB-6`
- `SEB-8` blocked by `SEB-6`
- `SEB-9` blocked by `SEB-7`, `SEB-8`
- `SEB-10` blocked by `SEB-9`
- `SEB-11` blocked by `SEB-9`
- `SEB-12` blocked by `SEB-10`, `SEB-11`
- `SEB-13` blocked by `SEB-9`, `SEB-11`
- `SEB-14` blocked by `SEB-9`
- `SEB-15` blocked by `SEB-12`, `SEB-13`, `SEB-14`
- `SEB-16` blocked by `SEB-15`
