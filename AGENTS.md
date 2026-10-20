# Irij Website

## Running
- `irij run server.irj` — starts on http://localhost:8080 (`PORT=…` to change)
- Dependencies managed via `irij.toml` (git deps, not local paths)

## Spec Annotations
- All `pub fn` declarations MUST have spec annotations (`:: InputType OutputType`)
- Use `_` for positions where the spec is too complex or not yet determined
- `--no-spec-lint` is for human emergency development ONLY. Never use it as a workaround. Fix the annotations instead.

## Versioning
- Version lives in `irij.toml` under `[project] version`
- Bump version when deploying significant changes (new features, API changes)
- Follow semver: patch for fixes, minor for features, major for breaking changes

## Dependencies
- Never change git dependencies to local path dependencies

## Learn course (/learn)
- Lessons are Markdown in `resources/learn/<slug>.md`; order, titles and parts are `learn-lessons` in `server.irj`
- `resources/learn.js` renders them: ```` ```irij ```` blocks become live editors, `:::exercise <id> <Title>` … `:::` containers become checked exercises (fences: `irij starter`, `irij solution`, `irij check`, `text expect`, `hint`); `irij fails` marks a block that errors on purpose, `irij static` one that is only shown
- Exercises run learner code + `resources/learn/harness.irj` + the check block through `POST /eval`
- After editing a lesson: `irij run scripts/check-course.irj [slug]` — every block must run as written, every solution must pass, every starter must not. CI runs it too
- A lesson that works around an engine limitation (a bug, or a feature not released yet) marks the spot with `<!-- engine-limit: <slug> — what to change once fixed -->` on the line above. `grep -rn "engine-limit" resources/learn` is the to-do list when Irij releases

## Keeping up with Irij (MANDATORY)
- The site runs the latest *released* Irij (`irij.jar` from the irij repo's releases, in CI and production). Content may only use what a release has shipped
- When an Irij release ships a noticeable change — different behaviour or output, a new or changed form, builtin, module, command or error message, a fixed limitation — open a site PR that:
  - adds the roadmap row (`home-roadmap` in `server.irj`), and feature cards / code examples for a feature
  - updates the `/learn` course: teach the new behaviour; resolve every `engine-limit` marker the release fixes, rewriting the lesson as if the limit never existed; run `scripts/check-course.irj`
  - updates playground examples (`pg-examples`) and `resources/irij-mode.js` (keyword and builtin lists mirror the irij repo's `editors/`)
  - adds `/docs` cards for new internals pages
- The irij repo's CLAUDE.md has the matching rule (*After a noticeable change*); its PR descriptions list what the site needs
