---
name: plan-writer-user-stories
description: Generate execution work plans from Layered SDD specs produced by spec-writer-layer. Use when the user asks to create, update, or refine an implementation plan in user story format based on files in specs/ and store it under specs/plans/.
---

# Plan writer user stories

Transform existing layered specs into an implementation work plan written as user stories.

## Key Principles

1. **Minimal and elegant**: Every line must serve a purpose
2. **User-value first**: Each story must represent a clear user outcome
3. **Spec-grounded**: Stories must come from existing specs, not invention
4. **Living documents**: Plans evolve, they are never "done"
5. **Only required stories**: Include only stories needed for the requested scope

## Inputs

Read only what is needed:
- `specs/spec.md` for global context and confirmed decisions.
- Existing layer files (`specs/L1-*` to `specs/L9-*`) relevant to scope.
- Existing plans in `specs/plans/` if present, to avoid duplication.

If critical scope is ambiguous, ask a yes/no question first.

## Output location

Always write plans under:
- `specs/plans/`

Preferred filename:
- `specs/plans/<topic>-plan.md`

If topic is unknown, use:
- `specs/plans/work-plan.md`

## Process

1. **Understand the requirement**: Ask clarifying yes/no questions if needed
2. **Identify scope and outcomes**: What must be delivered first?
3. **Read existing specs and plans**: Extract constraints already defined
4. **Write minimally and only required stories**
5. **Validate**: Check against minimalism checklist
6. **Reference examples**: Reuse relevant style from existing files in `specs/`

## Plan format (required)

Use this minimal structure:

```md
# Plan: <topic>

## Scope
- <1-5 bullets tied to specs>

## User stories

### US-001 - <short title>
- As a <type of user>, I want <capability>, so that <outcome>.
- Acceptance criteria:
  - Given <context>, when <action>, then <result>.
  - Given <context>, when <action>, then <result>.
- Spec traceability: <spec files and sections>
- Dependencies: <none or US-xxx>
- Priority: <P0|P1|P2>

### US-002 - <short title>
...

## Delivery order
1. <US-xxx>
2. <US-xxx>

## Risks and assumptions
- Risks:
  - <only real risks>
- Assumptions:
  - <explicit assumptions>
```

## Writing rules

- Write concise, implementation-ready stories; avoid filler.
- Keep each story independently testable.
- Include explicit acceptance criteria per story.
- Map every story to source spec files (traceability).
- Use specs as constraints for behavior, quality, UX, data, security, testing, architecture, integrations, and tech boundaries.
- Do not invent features not grounded in existing specs.
- If specs conflict, call it out in Risks and assumptions.

## Story slicing heuristics

- Slice by vertical value, not by technical component.
- Prefer stories that can be completed in 0.5-2 days.
- Split large stories by scenario, role, or lifecycle stage.
- Merge tiny stories if they cannot deliver standalone value.

## Living documents

- Treat plans as living documents.
- Update the existing plan when scope changes instead of creating duplicates.
- Keep changes explicit and consistent with the latest specs.

## Anti-patterns to avoid

- Do not create oversized stories that mix many deliverables.
- Do not add boilerplate sections without decision value.
- Do not future-proof with speculative work not present in specs.
- Do not explain basic concepts that the agent already knows.
- Do not include fluff that does not affect execution decisions.

## Minimalism Checklist

Before completing:
- [ ] Can the team execute directly from this plan?
- [ ] Is every line necessary?
- [ ] Have I removed obvious or repetitive details?
- [ ] Is this the clearest and shortest useful framing?
- [ ] Am I defining WHAT/WHY and avoiding unnecessary HOW?

## Quality checklist

Before finishing, ensure:
- [ ] All stories follow user story format.
- [ ] Every story has acceptance criteria.
- [ ] Every story references source specs.
- [ ] Delivery order is dependency-safe.
- [ ] Plan file is saved in `specs/plans/`.
