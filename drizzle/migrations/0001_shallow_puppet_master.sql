CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacherId" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"classId" integer NOT NULL,
	"studentId" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "classId" integer;