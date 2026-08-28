import { WorkspaceStore } from "@effect-forge/core/workspace-store";
import { Workspace } from "@effect-forge/domain/workspace";
import { asc } from "drizzle-orm";
import { Cause, Effect, Layer, Option, Schema } from "effect";
import * as SqlError from "effect/unstable/sql/SqlError";
import { Database } from "../internal/database.ts";
import { workspaces } from "./schema.ts";

/** Provides PostgreSQL-backed workspace persistence. */
export const layer = Layer.effect(
  WorkspaceStore.Service,
  Effect.gen(function* () {
    const database = yield* Database.Service;

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

    const list = database
      .select()
      .from(workspaces)
      .orderBy(asc(workspaces.name))
      .pipe(
        Effect.flatMap(Schema.decodeEffect(Schema.Array(Workspace))),
        Effect.mapError((cause) => new WorkspaceStore.PersistenceError({ cause })),
      );

    return WorkspaceStore.Service.of({ insert, list });
  }),
);

export * as WorkspaceStorePostgres from "./workspace-store-postgres.ts";
