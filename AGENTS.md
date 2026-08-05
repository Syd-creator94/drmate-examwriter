# Repository Context Instructions

Use `project-context-os` when work changes, audits, reconstructs, or hands off
durable project context. Route the task before loading canonical documentation.

## Fast route

Use the fast route for routine implementation, bug fixing, diagnosis, and
evidence-backed status updates that do not change accepted product direction,
architecture, privacy, security, clinical logic, catalog provenance, or the
canonical artifact system.

1. Read this file, the target source and tests, and only the canonical sections
   that can affect the task.
2. Do not read `project-context.yaml` or the artifact registry unless the task
   concerns governance, source-of-truth boundaries, artifact selection, or a
   rule declared there.
3. Do not require a context change preview for an already authorized routine
   code change or a purely evidence-backed status synchronization.
4. Verify implementation claims against source code, tests, configuration,
   generated schemas, or other inspected repository evidence.
5. Update `docs/project/status.md` only when verified work materially changes
   the recorded project state.

## Context-changing route

Use this route for accepted scope or workflow changes, architecture, privacy,
security or clinical-safety boundaries, ADRs, canonical decisions, and changes
to the artifact system.

1. Read `project-context.yaml`, `docs/context/artifact-registry.yaml`, and only
   the canonical documents semantically affected by the task.
2. Classify material claims as `USER_CONFIRMED`, `DECIDED`, `CODE_VERIFIED`,
   `PROPOSED`, `INFERRED`, `UNKNOWN`, or `REJECTED`.
3. Show a compact change preview and obtain explicit confirmation before editing
   canonical context.
4. Make the smallest semantically necessary changes and preserve relevant
   decision history.
5. Update `docs/project/status.md` when accepted work changes project state.

For both routes, run available relevant checks and explicitly report unavailable
checks, contradictions, limitations, and remaining unknowns.

## Clinical safety

- Dr. Mate may support, but must not silently replace, the clinician's decision.
- A contact-lens matching result is a list of explainable candidates, not a prescription or a claim of clinical suitability.
- Keep manufacturer facts, clinician-authored rules, patient observations, and system outputs distinguishable and traceable.
- Never infer a missing clinical value. Preserve it as unknown and show its effect on the result.
- Do not commit identifiable patient data, credentials, or private clinical exports to the repository.
- Clinical matching logic, catalog storage, provenance, privacy, or security decisions require an ADR before implementation.

Repository evidence governs implementation state. Explicit accepted decisions govern intended direction.
