CREATE TABLE "todos" (
	"id" uuid PRIMARY KEY,
	"organization_id" text NOT NULL,
	"title" varchar(200) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "todos_organization_id_index" ON "todos" ("organization_id");--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE;