# Architecture

## Owners

| Area              | Owns                                                       |
| ----------------- | ---------------------------------------------------------- |
| `apps/*`          | Entrypoints, runtime resources, and production composition |
| `packages/domain` | Shared values, schemas, and domain decisions               |
| `packages/core`   | Application policy, workflows, and the ports they need     |
| `adapters/*`      | Translation between core ports and external technology     |
| `packages/ui`     | Shared components and visual vocabulary                    |

Domain and core do not depend on frameworks, SQL, or provider SDKs. UI deliberately
uses a framework. Applications do not import one another.

Core owns domain-shaped ports and their expected failures. Adapters decode external
values and translate provider failures into those contracts. Only composition roots
select production adapters. Pass operation-specific values as explicit inputs.

A pure decision belongs with the policy it expresses: application authorization
can be pure and still belong in core. Add a layer or port only when the behavior
needs that boundary.

## Dependency policy

[Workspace rules](../../../../tools/architecture/workspaces.ts) define the allowed
workspace dependencies and package scope in one place. They apply to development and type-only
dependencies as well as production code; they do not forbid third-party libraries.

- `check:workspaces` checks that the policy matches workspace manifests, their names and locations, and their declared dependencies. Update the policy when adding or removing a workspace.
- The Oxlint boundary rule checks source imports against the same policy, including
  relative imports, re-exports, type imports, and literal dynamic imports.

Neither check proves Layer placement, authorization, or framework independence.
Review those decisions against the ownership rules above.
