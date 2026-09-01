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

/** Links structured external identities to application-owned users. */
export const identityLinks = pgTable(
  "identity_links",
  {
    identitySource: varchar("identity_source", { length: 100 }).notNull(),
    externalSubject: varchar("external_subject", { length: 255 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.identitySource, table.externalSubject] })],
);
