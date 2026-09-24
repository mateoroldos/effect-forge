# Core

Application services own permissions and workflows. Declare permissions beside
the capability. Call `OrganizationAccess.require(principal, organizationId, permission)`
before accessing its store. Owner authority is implicit; admin and member grants
are explicit. Membership lookup failure is an availability error, not a denial.

Keep principal and organization IDs explicit in operation inputs. Require stores
to retain organization scope on reads and writes, including updates by resource ID.
Provider roles and membership data enter through `OrganizationMembership`.

Register request-callable services in the dependency-open [Application.layer](src/application.ts).
Derive its exposed services with `Layer.Success` and requirements with `Layer.Services`.
Composition roots and tests supply adapters. Keep schedulers, consumers, migration
runners, and long-running fibers outside this graph.

Test permission decisions beside their definition and enforcement through services
with substitute Layers. Use [TodoDirectory](src/todo/todo-directory.ts) as an example.
