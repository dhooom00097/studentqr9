// PostgreSQL Schema
import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin", "teacher"] }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  password: text("password"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Sessions table - stores attendance sessions created by teachers
 */
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
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
  isActive: boolean("isActive").default(true).notNull(),
  /** GPS Location - Latitude */
  latitude: text("latitude"),
  /** GPS Location - Longitude */
  longitude: text("longitude"),
  /** GPS Radius in meters (default 500m) */
  radius: integer("radius").default(500).notNull(),
  /** When the session was created */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** When the session was last updated */
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  /** Optional: Link to a specific class */
  classId: integer("classId"),
});

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

/**
 * Classes table - groups of students managed by a teacher
 */
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  /** Teacher who owns this class */
  teacherId: integer("teacherId").notNull(),
  /** Class name (e.g. "Math 101") */
  name: text("name").notNull(),
  /** Optional description */
  description: text("description"),
  /** When the class was created */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** When the class was last updated */
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Class = typeof classes.$inferSelect;
export type InsertClass = typeof classes.$inferInsert;

/**
 * Students table - students enrolled in a class
 */
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  /** Class this student belongs to */
  classId: integer("classId").notNull(),
  /** Student ID (university ID) */
  studentId: text("studentId").notNull(),
  /** Student Name */
  name: text("name").notNull(),
  /** Student Email (optional) */
  email: text("email"),
  /** When the student was added */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// Type overrides for nullable GPS fields
export interface SessionWithGPS extends Session {
  latitude: string | null;
  longitude: string | null;
}

/**
 * Attendance records table - stores student attendance for each session
 */
export const attendanceRecords = pgTable("attendanceRecords", {
  id: serial("id").primaryKey(),
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
  /** IP Address of the device used for check-in */
  ipAddress: text("ipAddress"),
  /** When the student checked in */
  checkedInAt: timestamp("checkedInAt").defaultNow().notNull(),
});

export const allowedStudents = pgTable("allowed_students", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  studentId: text("studentId").notNull(),
  studentName: text("studentName"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
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
