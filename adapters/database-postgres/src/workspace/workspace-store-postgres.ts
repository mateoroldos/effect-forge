import { WorkspaceStore } from "@effect-forge/core/workspace-store";
import { UserId } from "@effect-forge/domain/identity";
import { Workspace } from "@effect-forge/domain/workspace";
import { WorkspaceRole } from "@effect-forge/domain/workspace-member";
import { asc, eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { Database } from "../internal/database.ts";
import { workspaceMembers, workspaces } from "./schema.ts";

/** Provides PostgreSQL-backed principal-scoped workspace persistence. */
const ownerRole: WorkspaceRole = "owner";

export const layer = Layer.effect(
  WorkspaceStore.Service,
  Effect.gen(function* () {
    const database = yield* Database.Service;

    const create = Effect.fn("WorkspaceStorePostgres.create")(
      (workspace: Workspace, ownerId: UserId) =>
        database
          .transaction((transaction) =>
            Effect.gen(function* () {
              const inserted = yield* transaction
                .insert(workspaces)
                .values(workspace)
                .onConflictDoNothing({ target: workspaces.name })
                .returning({ id: workspaces.id });
              if (inserted.length === 0) {
                return yield* new WorkspaceStore.NameTaken({ name: workspace.name });
              }

              yield* transaction.insert(workspaceMembers).values({
                workspaceId: workspace.id,
                userId: ownerId,
                role: ownerRole,
              });
              return workspace;
            }),
          )
          .pipe(
            Effect.mapError((cause) =>
              Schema.is(WorkspaceStore.NameTaken)(cause)
                ? cause
                : new WorkspaceStore.PersistenceError({ cause }),
            ),
          ),
    );

    const list = Effect.fn("WorkspaceStorePostgres.list")((userId: UserId) =>
      database
        .select({ id: workspaces.id, name: workspaces.name })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, userId))
        .orderBy(asc(workspaces.name))
        .pipe(
          Effect.flatMap(Schema.decodeEffect(Schema.Array(Workspace))),
          Effect.mapError((cause) => new WorkspaceStore.PersistenceError({ cause })),
        ),
    );

    return WorkspaceStore.Service.of({ create, list });
  }),
);

export * as WorkspaceStorePostgres from "./workspace-store-postgres.ts";
