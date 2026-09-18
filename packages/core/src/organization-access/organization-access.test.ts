import { assert, describe, it } from "@effect/vitest";
import { Principal, UserId } from "@effect-forge/domain/identity";
import { OrganizationId, OrganizationMember } from "@effect-forge/domain/organization";
import { Effect, Layer, Option } from "effect";
import { OrganizationAccess } from "./organization-access.ts";
import { OrganizationMembership } from "./organization-membership.ts";
import { Permission } from "./permission.ts";

const organizationId = OrganizationId.make("org-1");
const principal = Principal.make({ userId: UserId.make("user-1") });
const permission = Permission.define({ key: "todo:update", grantedTo: ["admin"] });
const layerWith = (
  member: Effect.Effect<Option.Option<OrganizationMember>, OrganizationMembership.Unavailable>,
) =>
  OrganizationAccess.layer.pipe(
    Layer.provide(
      Layer.succeed(OrganizationMembership.Service, {
        member: (requestedOrganization, requestedUser) =>
          requestedOrganization === organizationId && requestedUser === principal.userId
            ? member
            : Effect.succeed(Option.none()),
      }),
    ),
  );

describe("Permission", () => {
  it("keeps owner authority and explicit delegated grants", () => {
    const ownerOnly = Permission.define({ key: "todo:delete", grantedTo: [] });
    assert.isTrue(Permission.allows(ownerOnly, ["owner"]));
    assert.isFalse(Permission.allows(ownerOnly, ["admin", "member"]));
    assert.isTrue(Permission.allows(permission, ["member", "admin"]));
    assert.isFalse(Permission.allows(permission, ["member"]));
    assert.throws(() => Permission.define({ key: "todo", grantedTo: [] }));
  });
});

describe("OrganizationAccess", () => {
  it.effect("returns current membership evidence for an authorized role", () => {
    const member = OrganizationMember.make({
      organizationId,
      userId: principal.userId,
      roles: ["admin"],
    });
    return Effect.gen(function* () {
      const access = yield* OrganizationAccess.Service;
      assert.deepEqual(yield* access.require(principal, organizationId, permission), member);
    }).pipe(Effect.provide(layerWith(Effect.succeed(Option.some(member)))));
  });

  it.effect.each([
    { actor: Principal.make({ userId: UserId.make("user-2") }), target: organizationId },
    { actor: principal, target: OrganizationId.make("org-2") },
  ])("does not reuse membership for another user or organization %#", ({ actor, target }) =>
    Effect.gen(function* () {
      const access = yield* OrganizationAccess.Service;
      yield* access.require(principal, organizationId, permission);
      assert.deepEqual(
        yield* access.require(actor, target, permission).pipe(Effect.flip),
        new OrganizationAccess.Denied({ organizationId: target, permission: permission.key }),
      );
    }).pipe(
      Effect.provide(
        layerWith(
          Effect.succeed(
            Option.some(
              OrganizationMember.make({
                organizationId,
                userId: principal.userId,
                roles: ["admin"],
              }),
            ),
          ),
        ),
      ),
    ),
  );

  it.effect.each([
    Option.none<OrganizationMember>(),
    Option.some(
      OrganizationMember.make({ organizationId, userId: principal.userId, roles: ["member"] }),
    ),
  ])("denies absent membership or a role without the capability %#", (member) =>
    Effect.gen(function* () {
      const access = yield* OrganizationAccess.Service;
      assert.deepEqual(
        yield* access.require(principal, organizationId, permission).pipe(Effect.flip),
        new OrganizationAccess.Denied({ organizationId, permission: permission.key }),
      );
    }).pipe(Effect.provide(layerWith(Effect.succeed(member)))),
  );

  it.effect("preserves membership availability failures", () => {
    const failure = new OrganizationMembership.Unavailable({ cause: "offline" });
    return Effect.gen(function* () {
      const access = yield* OrganizationAccess.Service;
      assert.strictEqual(
        yield* access.require(principal, organizationId, permission).pipe(Effect.flip),
        failure,
      );
    }).pipe(Effect.provide(layerWith(Effect.fail(failure))));
  });
});
