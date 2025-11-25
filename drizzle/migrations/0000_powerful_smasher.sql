CREATE TABLE "allowed_students" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"studentId" text NOT NULL,
	"studentName" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendanceRecords" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"studentName" text NOT NULL,
	"studentId" text NOT NULL,
	"studentEmail" text,
	"studentLatitude" text,
	"studentLongitude" text,
	"checkedInAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"teacherId" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"sessionCode" text NOT NULL,
	"pin" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"latitude" text,
	"longitude" text,
	"radius" integer DEFAULT 500 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_sessionCode_unique" UNIQUE("sessionCode")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" text NOT NULL,
	"name" text,
	"email" text,
	"loginMethod" text,
	"role" text DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	"password" text,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
