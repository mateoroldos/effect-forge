CREATE TABLE "identity_links" (
	"identity_source" varchar(100),
	"external_subject" varchar(255),
	"user_id" uuid NOT NULL,
	CONSTRAINT "identity_links_pkey" PRIMARY KEY("identity_source","external_subject")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY,
	"email" varchar(320) NOT NULL CONSTRAINT "users_email_unique" UNIQUE,
	"name" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"workspace_id" uuid,
	"user_id" uuid,
	"role" varchar(20) NOT NULL,
	CONSTRAINT "workspace_members_pkey" PRIMARY KEY("workspace_id","user_id"),
	CONSTRAINT "workspace_members_role_check" CHECK ("role" in ('owner', 'admin', 'member'))
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY,
	"name" varchar(100) NOT NULL CONSTRAINT "workspaces_name_unique" UNIQUE
);
--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_index" ON "workspace_members" ("user_id");--> statement-breakpoint
ALTER TABLE "identity_links" ADD CONSTRAINT "identity_links_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;