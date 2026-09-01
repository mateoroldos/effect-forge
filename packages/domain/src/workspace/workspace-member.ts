import { Schema } from "effect";
import { UserId } from "../identity/identity.ts";
import { WorkspaceId } from "./workspace.ts";

/** A user's authority within one workspace. */
export const WorkspaceRole = Schema.Literals(["owner", "admin", "member"]);

/** A user's authority within one workspace. */
export type WorkspaceRole = typeof WorkspaceRole.Type;

/** A user's current role in a workspace. */
export const WorkspaceMember = Schema.Struct({
  workspaceId: WorkspaceId,
  userId: UserId,
  role: WorkspaceRole,
});

/** A user's current role in a workspace. */
export interface WorkspaceMember extends Schema.Schema.Type<typeof WorkspaceMember> {}
