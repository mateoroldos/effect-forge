import { sql } from "drizzle-orm";
import { check, index, pgTable, primaryKey, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { users } from "../identity/schema.ts";

/** PostgreSQL representation of persisted workspaces. */
export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => [unique("workspaces_name_unique").on(table.name)],
);

/** PostgreSQL representation of a user's role in one workspace. */
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 20 }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_id_index").on(table.userId),
    check("workspace_members_role_check", sql`${table.role} in ('owner', 'admin', 'member')`),
  ],
);
