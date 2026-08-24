import { WorkspaceStore } from "@effect-forge/core/workspace-store";
import { Workspace, type WorkspaceId } from "@effect-forge/domain/workspace";
import { eq } from "drizzle-orm";
import { Cause, Effect, Layer, Option, Schema } from "effect";
import * as SqlError from "effect/unstable/sql/SqlError";
import { DatabasePostgres } from "../database-postgres.ts";
import { workspaces } from "./schema.ts";

/** Provides PostgreSQL-backed workspace persistence. */
export const layer = Layer.effect(
  WorkspaceStore.Service,
  Effect.gen(function* () {
    const database = yield* DatabasePostgres.Service;

    const insert = Effect.fn("WorkspaceStorePostgres.insert")((workspace: Workspace) =>
      database
        .insert(workspaces)
        .values({ id: workspace.id, name: workspace.name })
        .pipe(
          Effect.mapError((cause) => {
            if (Cause.isCause(cause.cause)) {
              const failure = Cause.findErrorOption(cause.cause);
              if (
                Option.isSome(failure) &&
                Schema.is(SqlError.SqlError)(failure.value) &&
                Schema.is(SqlError.UniqueViolation)(failure.value.reason) &&
                failure.value.reason.constraint === "workspaces_name_unique"
              ) {
                return new WorkspaceStore.NameTaken({ name: workspace.name });
              }
            }
            return new WorkspaceStore.PersistenceError({ cause });
          }),
          Effect.as(workspace),
        ),
    );

    const findById = Effect.fn("WorkspaceStorePostgres.findById")((id: WorkspaceId) =>
      database
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, id))
        .limit(1)
        .pipe(
          Effect.flatMap((rows) => {
            const row = rows[0];
            return row === undefined
              ? Effect.succeed(Option.none())
              : Schema.decodeEffect(Workspace)(row).pipe(Effect.map(Option.some));
          }),
          Effect.mapError((cause) => new WorkspaceStore.PersistenceError({ cause })),
        ),
    );

    return WorkspaceStore.Service.of({ insert, findById });
  }),
);

export * as WorkspaceStorePostgres from "./workspace-store-postgres.ts";
