# Parent Agent

## Rol
Orquestar subagentes stateless y efimeros.

## Regla base
- El parent no implementa producto.
- El parent no guarda memoria entre corridas.
- Fuente de verdad: GitHub (labels, comentarios, PRs).

## Run once
1. `scan`: listar issues por trigger de cada subagente.
2. `dispatch`: lanzar subagentes para issues independientes.
3. `collect`: consolidar resultados.
4. `exit`: terminar.

## Anti-colision
- Un solo `status:*` por issue.
- Un solo `agent:*` por issue.
- Un solo subagente por issue por corrida.
- `1 issue = 1 worktree` cuando el subagente toca codigo.

## Respuesta
- `#issue -> subagente -> resultado -> next`.
