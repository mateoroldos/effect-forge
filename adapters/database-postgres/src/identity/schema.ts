import { pgTable, primaryKey, unique, uuid, varchar } from "drizzle-orm/pg-core";

/** PostgreSQL representation of application-owned users. */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
  },
  (table) => [unique("users_email_unique").on(table.email)],
);

/** Links provider identities to application-owned users. */
export const providerIdentities = pgTable(
  "provider_identities",
  {
    provider: varchar("provider", { length: 100 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.provider, table.subject] })],
);
