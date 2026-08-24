CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY,
	"name" varchar(100) NOT NULL CONSTRAINT "workspaces_name_unique" UNIQUE
);
