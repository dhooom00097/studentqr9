PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_attendanceRecords` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sessionId` integer NOT NULL,
	`studentName` text NOT NULL,
	`studentId` text NOT NULL,
	`studentEmail` text,
	`studentLatitude` text,
	`studentLongitude` text,
	`checkedInAt` integer DEFAULT '"2025-11-23T20:27:41.981Z"' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_attendanceRecords`("id", "sessionId", "studentName", "studentId", "studentEmail", "studentLatitude", "studentLongitude", "checkedInAt") SELECT "id", "sessionId", "studentName", "studentId", "studentEmail", "studentLatitude", "studentLongitude", "checkedInAt" FROM `attendanceRecords`;--> statement-breakpoint
DROP TABLE `attendanceRecords`;--> statement-breakpoint
ALTER TABLE `__new_attendanceRecords` RENAME TO `attendanceRecords`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
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
	`createdAt` integer DEFAULT '"2025-11-23T20:27:41.981Z"' NOT NULL,
	`updatedAt` integer DEFAULT '"2025-11-23T20:27:41.981Z"' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "teacherId", "title", "description", "sessionCode", "pin", "isActive", "latitude", "longitude", "radius", "createdAt", "updatedAt") SELECT "id", "teacherId", "title", "description", "sessionCode", "pin", "isActive", "latitude", "longitude", "radius", "createdAt", "updatedAt" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_sessionCode_unique` ON `sessions` (`sessionCode`);--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT '"2025-11-23T20:27:41.980Z"' NOT NULL,
	`updatedAt` integer DEFAULT '"2025-11-23T20:27:41.980Z"' NOT NULL,
	`lastSignedIn` integer DEFAULT '"2025-11-23T20:27:41.980Z"' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "openId", "name", "email", "loginMethod", "role", "createdAt", "updatedAt", "lastSignedIn") SELECT "id", "openId", "name", "email", "loginMethod", "role", "createdAt", "updatedAt", "lastSignedIn" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);