import { pgTable, unique, uuid, varchar } from "drizzle-orm/pg-core";

/** PostgreSQL representation of persisted workspaces. */
export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => [unique("workspaces_name_unique").on(table.name)],
);
