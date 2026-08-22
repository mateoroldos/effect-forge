import { Schema } from "effect";

/** A stable identifier for a workspace. */
export const WorkspaceId = Schema.String.pipe(
  Schema.check(Schema.isUUID(4)),
  Schema.brand("WorkspaceId"),
);

/** A non-empty, trimmed workspace name of at most 100 characters. */
export const WorkspaceName = Schema.String.pipe(
  Schema.check(Schema.isTrimmed()),
  Schema.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  Schema.brand("WorkspaceName"),
);

/** A workspace visible to its members. */
export const Workspace = Schema.Struct({
  id: WorkspaceId,
  name: WorkspaceName,
});

export interface Workspace extends Schema.Schema.Type<typeof Workspace> {}

/** A stable identifier for a workspace. */
export type WorkspaceId = typeof WorkspaceId.Type;

/** A display name for a workspace. */
export type WorkspaceName = typeof WorkspaceName.Type;
