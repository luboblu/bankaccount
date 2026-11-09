# Work Orders

## Current request: local startup guidance

### Scope and conclusion

- User asks how to start the project locally.
- The repository currently exposes a TypeScript adapter core and test suites, not a long-running application server.
- No product implementation, package-script expansion, database reset, external deployment, or credential creation is authorized.

### Ordered work

| Phase | Owner | Inputs | Outputs | Blocking conditions | Definition of done |
|---|---|---|---|---|---|
| 1. Startup surface inspection | Morgan (PM) | `package.json`, `tsconfig.json`, `src/`, `tests/`, `compose.yaml`, `.env.example` | Accurate local command sequence and capability boundary | Missing or contradictory entrypoint information | Commands map directly to declared scripts or documented local infrastructure |
| 2. Local verification | Iris (reviewer) | Phase 1 findings, available Node/npm environment | Verification result and caveats | Node/npm unavailable or dependency install is not possible | Report whether the declared build/test path can run; do not claim server readiness |
| 3. User handoff | Morgan (PM) | Phases 1–2 | Concise local startup instructions | Human decision needed for adding a server/start script | User receives the exact current commands and knows what is not available |

### Human decision required

- If the user expects a browser UI, HTTP API, or `npm start`, product/architecture scope must first approve implementing an application entrypoint. This is outside the current startup-guidance task.

### Current evidence

- `npm run build`, `npm run typecheck`, `npm test`, and `npm run test:qa` are declared scripts.
- `npm run verify` is the aggregate verification path.
- `docker compose up -d postgres` starts optional local PostgreSQL after creating `.env` from `.env.example`.
- There is no `start`/`dev` script and no executable HTTP/Web UI entrypoint in `src/`.

## Current request

Produce a project delivery brief for BankHub. The brief must accurately state the delivered scope, available artifacts, verification evidence, known limitations, handoff steps, and items requiring human decision. No product implementation, external deployment, credential creation, or irreversible operation is authorized by this request.

## Status

- Planning status: ready for ordered review and handoff.
- Existing delivery artifact: `DELIVERY_BRIEF.md`.
- PM checkpoint: the brief is evidence-based and must not claim unimplemented UI/API or production readiness.

## Project baseline

- Runtime: Node.js `>=22 <25`.
- Package manager: npm, with TypeScript `5.9.3` as the only declared development dependency.
- Current executable scope: TypeScript adapter core and Node test suites under `tests/`.
- Database: optional local PostgreSQL 16 via `compose.yaml`; schema is mounted from `database/schema.sql`.
- There is currently no `start` or application-server script in `package.json`.
- `README.md` appears to contain encoding-corrupted text, so `package.json`, `compose.yaml`, and `.env.example` are the authoritative startup references for this request.

## Execution order

| Phase | Owner | Inputs | Outputs | Blocking conditions | Definition of done |
|---|---|---|---|---|---|
| 1. Delivery scope synthesis | planner | `SPEC.md`, `IMPLEMENTATION_PLAN.md`, current source tree, existing reports | Delivery scope, acceptance framing, assumptions, and exclusions | Conflicting or missing product commitments | A concise scope statement distinguishes specified roadmap from implemented capability |
| 2. Technical delivery assessment | architect | Phase 1 output, `ARCHITECTURE.md`, `API_SPEC.md`, `DB_SCHEMA.md`, `package.json` | Artifact inventory, architecture status, operational prerequisites, and gaps | Architecture documents describe future components absent from the executable tree | Every claimed deliverable is tied to a repository artifact or explicitly marked planned |
| 3. Verification and risk review | reviewer | Phase 1–2 outputs, `QA_REPORT.md`, tests, README | Test evidence, limitations, known risks, and handoff checklist | Verification environment or dependency availability limits evidence | Delivery brief reports actual commands/results and does not overclaim UI/API readiness |
| 4. Delivery brief assembly | Bob (PM) | Approved outputs from Phases 1–3 | User-facing project delivery explanation | Human decision required for scope expansion, deployment, or security changes | Brief is complete, traceable, and suitable for stakeholder handoff |

## Human decision required

- Confirm whether the delivery brief is for the current implemented core only or should also present the PRD/architecture roadmap as planned work.
- Any request to claim a production-ready Web UI/API, deploy externally, add real bank credentials, or implement missing services requires explicit scope approval.

## Handoff notes

The delivery brief should lead with the actual current deliverable: TypeScript bank-adapter core, tests, database schema, and design documents. Include `npm install` followed by `npm run verify` as the primary verification path; document optional local PostgreSQL setup from `.env.example` and `compose.yaml`. State clearly that no `start`/`dev` script or Web/API server entrypoint exists, and distinguish QA evidence from environment limitations such as offline dependency installation. Preserve existing user changes and do not modify product code during this planning stage.

## Dispatch plan

1. Atlas (`planner`) — validate scope against the specification and implementation plan; identify assumptions, exclusions, and overclaim risks.
2. Orion (`architect`) — reconcile the artifact inventory with architecture/API/database documents and identify operational prerequisites or missing executable components.
3. Iris (`reviewer`) — validate test evidence, limitations, and the handoff checklist against the QA report and test layout.
4. Bob (PM) — consolidate reviewed findings into the stakeholder-facing delivery explanation and record unresolved human decisions.
