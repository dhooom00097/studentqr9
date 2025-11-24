import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = sqliteTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(new Date()).notNull(), // SQLite doesn't support onUpdateNow natively in the same way, handled in app logic or trigger if needed, but for now default is fine
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).default(new Date()).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Sessions table - stores attendance sessions created by teachers
 */
export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Teacher who created this session */
  teacherId: integer("teacherId").notNull(),
  /** Session name/title */
  title: text("title").notNull(),
  /** Session description */
  description: text("description"),
  /** Unique code for QR generation */
  sessionCode: text("sessionCode").notNull().unique(),
  /** Simple 6-digit PIN for manual entry */
  pin: text("pin").notNull(),
  /** Whether the session is currently active */
  isActive: integer("isActive").default(1).notNull(),
  /** GPS Location - Latitude */
  latitude: text("latitude"),
  /** GPS Location - Longitude */
  longitude: text("longitude"),
  /** GPS Radius in meters (default 500m) */
  radius: integer("radius").default(500).notNull(),
  /** When the session was created */
  createdAt: integer("createdAt", { mode: "timestamp" }).default(new Date()).notNull(),
  /** When the session was last updated */
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(new Date()).notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

// Type overrides for nullable GPS fields
export interface SessionWithGPS extends Session {
  latitude: string | null;
  longitude: string | null;
}

/**
 * Attendance records table - stores student attendance for each session
 */
export const attendanceRecords = sqliteTable("attendanceRecords", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Session this attendance belongs to */
  sessionId: integer("sessionId").notNull(),
  /** Student name */
  studentName: text("studentName").notNull(),
  /** Student ID (university ID number) */
  studentId: text("studentId").notNull(),
  /** Student email (optional) */
  studentEmail: text("studentEmail"),
  /** Student location at check-in - Latitude */
  studentLatitude: text("studentLatitude"),
  /** Student location at check-in - Longitude */
  studentLongitude: text("studentLongitude"),
  /** When the student checked in */
  checkedInAt: integer("checkedInAt", { mode: "timestamp" }).default(new Date()).notNull(),
});

export const allowedStudents = sqliteTable("allowed_students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("sessionId").notNull(),
  studentId: text("studentId").notNull(),
  studentName: text("studentName"),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(new Date()).notNull(),
});

export type SelectAttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = typeof attendanceRecords.$inferInsert;

export type SelectAllowedStudent = typeof allowedStudents.$inferSelect;
export type InsertAllowedStudent = typeof allowedStudents.$inferInsert;

// Type overrides for nullable location fields
export interface AttendanceWithLocation extends SelectAttendanceRecord {
  studentLatitude: string | null;
  studentLongitude: string | null;
}
