# Decisions

- Deploy en Vercel.
- Framework de produccion: Next.js App Router.
- UI: shadcn/ui + Tailwind CSS.
- Tema default: `Eng Runbook`.
- Server stateless para continuidad.
- El cliente conserva snapshot completo en `localStorage`.
- La rehidratacion usa snapshot enviado por el cliente.
- No hay DB, memoria compartida ni filesystem para recuperar partidas en V1.
- La continuidad solo se garantiza en el mismo navegador/dispositivo.
- No se garantiza compatibilidad de snapshots entre versiones.
- Snapshot corrupto o incompatible se rechaza sin fallback.
- Se permite exportar snapshot como JSON.
- La entrada al juego abre la ultima partida disponible.
- No hay limite fijo de partidas locales en V1.
- V1 no requiere cuentas de usuario.
- No usar CSS modules en pantallas nuevas.
