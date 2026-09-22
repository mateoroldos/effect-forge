import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { organization } from "../auth/schema.ts";

export const todos = pgTable(
  "todos",
  {
    id: uuid("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    description: varchar("description", { length: 2000 }).notNull().default(""),
    completed: boolean("completed").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("todos_organization_id_index").on(table.organizationId)],
);
