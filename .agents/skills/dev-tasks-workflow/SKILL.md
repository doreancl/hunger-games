---
name: dev-tasks-workflow
description: Run a full PRD-to-execution documentation workflow using standardized templates and checkpoints. Use when the user asks to create PRDs, generate task lists, build technical specs, derive user stories, validate coverage, publish stories to GitHub, create implementation plans, or execute tasks step-by-step with explicit approvals.
---

# Dev Tasks Workflow

Execute planning and execution docs with the templates in `references/`.

## Core Rules

- Ask clarifying questions before drafting any planning document.
- Save outputs in repository-local `docs/` unless the referenced template explicitly requires another location.
- Keep documents explicit and implementation-ready for junior developers.
- Use the exact checklist style when generating task lists.
- During execution, complete one sub-task at a time and pause for user approval before continuing.

## Choose Workflow

Use `references/primary-workflow/` for the short 3-step flow:

1. Create PRD
2. Generate tasks
3. Process task list

Use `references/prd-tech-spec/` for the extended 9-step flow:

1. Product context
2. Technical guidelines
3. Base PRD
4. Technical specification
5. User stories
6. Coverage validation
7. Publish stories to GitHub
8. Create implementation plan
9. Execute task list

## File Map

Load only the file needed for the requested step.

### Primary Workflow

- `references/primary-workflow/1-create-prd.instructions.md`
- `references/primary-workflow/2-generate-tasks.instructions.md`
- `references/primary-workflow/3-process-task-list.instructions.md`

### Extended PRD + Tech Spec Workflow

- `references/prd-tech-spec/1-product-context.instructions.md`
- `references/prd-tech-spec/2-technical-guidelines.instructions.md`
- `references/prd-tech-spec/3-base-prd.instructions.md`
- `references/prd-tech-spec/4-generate-specification.instructions.md`
- `references/prd-tech-spec/5-generate-user-stories.instructions.md`
- `references/prd-tech-spec/6-validate-coverage.instructions.md`
- `references/prd-tech-spec/7-publish-user-stories-github.instructions.md`
- `references/prd-tech-spec/8-create-implementation-plan.instructions.md`
- `references/prd-tech-spec/9-execute-task-list.instructions.md`

### Legacy Entry Points

- `references/create-prd.instructions.md`
- `references/generate-tasks.instructions.md`
- `references/process-task-list.instructions.md`

Use these as aliases to the primary workflow behavior when the user references old filenames.

## Output Contracts

- PRD files: `docs/prd-[feature-name].md`
- Task list files: `docs/tasks-[prd-file-name].md`
- Product context: `docs/product-context.md`
- Technical guidelines: `docs/technical-guidelines.md`
- Technical spec: `docs/specification-[prd-name].md`
- User stories: follow filename format required by the loaded reference
- Coverage report: `docs/coverage-validation-[prd-name].md`
- GitHub publication report: `docs/github-user-stories-[prd-name].md`
- Implementation plan: `docs/tasks-[prd-name]-plan.md`

If the repository conventions differ, ask once and apply consistently.

## Execution Discipline

When running from an implementation task list:

1. Select next unchecked sub-task.
2. Implement only that sub-task.
3. Mark it `[x]` immediately.
4. Mark parent task `[x]` when all children are complete.
5. Pause and ask for approval before the next sub-task.

If GitHub issue sync is requested, keep issue checklists aligned with local task files.
