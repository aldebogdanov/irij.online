# Irij Website

## Running
- `irij run server.irj` — starts on http://localhost:8080
- Dependencies managed via `deps.irj` (git deps, not local paths)

## Spec Annotations
- All `pub fn` declarations MUST have spec annotations (`:: InputType OutputType`)
- Use `_` for positions where the spec is too complex or not yet determined
- `--no-spec-lint` is for human emergency development ONLY. Never use it as a workaround. Fix the annotations instead.

## Dependencies
- Never change git dependencies to local path dependencies
