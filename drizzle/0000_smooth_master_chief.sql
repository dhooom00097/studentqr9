CREATE TABLE `attendanceRecords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sessionId` integer NOT NULL,
	`studentName` text NOT NULL,
	`studentId` text NOT NULL,
	`studentEmail` text,
	`studentLatitude` text,
	`studentLongitude` text,
	`checkedInAt` integer DEFAULT '"2025-11-23T20:26:53.205Z"' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`teacherId` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`sessionCode` text NOT NULL,
	`pin` text NOT NULL,
	`isActive` integer DEFAULT 1 NOT NULL,
	`latitude` text,
	`longitude` text,
	`radius` integer DEFAULT 500 NOT NULL,
	`createdAt` integer DEFAULT '"2025-11-23T20:26:53.205Z"' NOT NULL,
	`updatedAt` integer DEFAULT '"2025-11-23T20:26:53.205Z"' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_sessionCode_unique` ON `sessions` (`sessionCode`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT '"2025-11-23T20:26:53.205Z"' NOT NULL,
	`updatedAt` integer DEFAULT '"2025-11-23T20:26:53.205Z"' NOT NULL,
	`lastSignedIn` integer DEFAULT '"2025-11-23T20:26:53.205Z"' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);