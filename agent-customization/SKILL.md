# Agent Coding Pattern — SKILL

Purpose: provide explicit, concise rules for an automated coding assistant to follow when editing this repository.

Principles

- Keep changes minimal and surgical. Prefer the smallest localized edit that fixes the problem.
- Respect existing public APIs and file structure — avoid renaming or moving files unless requested.
- Do not change unrelated code or reformat entire files.
- Prefer clarity and maintainability over cleverness.

Editing rules

- Use the repository's existing style (TypeScript, 2-space indentation, no extra comments).
- Use `apply_patch` (editor tooling) for edits. Do not modify files outside the project root.
- When adding new dependencies, update `package.json` and include a short reason for the addition.
- When changing DB schema or migrations, explain why and run `pnpm migrate` locally (or instruct the user how to).

Testing & verification

- Run `pnpm build` after type changes; run tests if present. Report errors and fix only those introduced by your edits.
- If you modify Prisma schema or migrations, run `pnpm generate` and `pnpm migrate` (or `pnpm db push`) and report results.

Docs & templates

- Update `README.md` when adding or removing major features.
- Add or update Postman or example requests when public endpoints are modified.

Communication rules

- Before running workspace-affecting commands (build, migrate), present a one-line preamble describing the action.
- For multi-step work, create and maintain a short TODO list with clear checkpoints.
- When a change might affect secrets, CI, or infra, explicitly warn the user and provide mitigation steps.

Safety & scope

- Do not commit or print secrets (env values, API keys) in diffs or outputs.
- When unsure about a destructive action (reverting migrations, dropping tables), ask the user.

Example workflow for an edit

1. Explain the planned change in one sentence.
2. Create a TODO list with 2–4 steps via the TODO tool.
3. Make minimal edits with `apply_patch`/file creation tools.
4. Run `pnpm build` and `pnpm migrate` if relevant.
5. Report results, include file links, and propose next steps.

End of SKILL file.
