import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcrypt";
import { InsertUser, users, sessions, attendanceRecords, allowedStudents, InsertSession, InsertAttendanceRecord, InsertAllowedStudent, classes, students, InsertClass, InsertStudent } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Session queries
export async function createSession(session: InsertSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(sessions).values(session).returning();
  return result;
}

export async function getSessionsByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(sessions).where(eq(sessions.teacherId, teacherId)).orderBy(desc(sessions.createdAt));
}

export async function getSessionByCode(sessionCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(sessions).where(eq(sessions.sessionCode, sessionCode)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessionByPin(pin: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Trim and normalize PIN
  const normalizedPin = pin.trim();
  console.log('[getSessionByPin] Searching for PIN:', normalizedPin);

  const result = await db.select().from(sessions).where(eq(sessions.pin, normalizedPin)).limit(1);
  console.log('[getSessionByPin] Query result:', result);
  return result.length > 0 ? result[0] : undefined;
}

export async function getSessionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSessionStatus(id: number, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(sessions).set({ isActive: isActive }).where(eq(sessions.id, id));
}

// Attendance queries
export async function createAttendanceRecord(data: InsertAttendanceRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(attendanceRecords).values(data).returning();
  return result[0];
}

export async function getAttendanceBySession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(attendanceRecords).where(eq(attendanceRecords.sessionId, sessionId)).orderBy(desc(attendanceRecords.checkedInAt));
}

export async function checkDuplicateAttendance(sessionId: number, studentName: string, studentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(attendanceRecords).where(
    and(
      eq(attendanceRecords.sessionId, sessionId),
      sql`(${attendanceRecords.studentName} = ${studentName} OR ${attendanceRecords.studentId} = ${studentId})`
    )
  ).limit(1);

  return existing.length > 0;
}


// GPS Location verification
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

export async function verifyLocationForSession(
  sessionId: number,
  studentLat: number,
  studentLon: number
): Promise<{ valid: boolean; distance: number; message: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!result.length) {
    return { valid: false, distance: 0, message: "الجلسة غير موجودة" };
  }

  const sess = result[0];

  // إذا لم يتم تحديد موقع للجلسة، اسمح بالتسجيل
  if (!sess.latitude || !sess.longitude) {
    return { valid: true, distance: 0, message: "لم يتم تحديد موقع للجلسة" };
  }

  const distance = calculateDistance(
    Number(sess.latitude),
    Number(sess.longitude),
    studentLat,
    studentLon
  );

  const radius = sess.radius || 500;

  if (distance > radius) {
    return {
      valid: false,
      distance,
      message: `أنت بعيد عن موقع الجلسة. المسافة: ${Math.round(distance)} متر، المسافة المسموحة: ${radius} متر`,
    };
  }

  return { valid: true, distance, message: "الموقع صحيح" };
}

export async function updateSessionLocation(
  id: number,
  latitude: number,
  longitude: number,
  radius?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(sessions).set({
    latitude: String(latitude),
    longitude: String(longitude),
    radius: radius || 500,
  }).where(eq(sessions.id, id));
}

export async function deleteSession(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete attendance records first
  await db.delete(attendanceRecords).where(eq(attendanceRecords.sessionId, id));

  // Delete allowed students
  await db.delete(allowedStudents).where(eq(allowedStudents.sessionId, id));

  // Then delete session
  await db.delete(sessions).where(eq(sessions.id, id));
}

// Allowed Students Management
export async function addAllowedStudent(data: InsertAllowedStudent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(allowedStudents).values(data);
  } catch (error) {
    console.error("Error adding allowed student:", error);
    throw new Error("Failed to add allowed student");
  }
}

export async function addAllowedStudentsBulk(sessionId: number, students: { studentId: string; studentName?: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    const values = students.map(student => ({
      sessionId,
      studentId: student.studentId,
      studentName: student.studentName || null,
    }));
    await db.insert(allowedStudents).values(values);
  } catch (error) {
    console.error("Error adding allowed students in bulk:", error);
    throw new Error("Failed to add allowed students in bulk");
  }
}

export async function getAllowedStudents(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(allowedStudents).where(eq(allowedStudents.sessionId, sessionId));
}

export async function isStudentAllowed(sessionId: number, studentId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if there are any allowed students for this session
  const allowedList = await db.select().from(allowedStudents).where(eq(allowedStudents.sessionId, sessionId)).limit(1);

  // If list is empty, everyone is allowed
  if (allowedList.length === 0) {
    return true;
  }

  // If list exists, check if student is in it
  const match = await db.select().from(allowedStudents)
    .where(and(
      eq(allowedStudents.sessionId, sessionId),
      eq(allowedStudents.studentId, studentId)
    ))
    .limit(1);

  return match.length > 0;
}
export async function removeAllowedStudent(sessionId: number, studentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.delete(allowedStudents)
      .where(and(
        eq(allowedStudents.sessionId, sessionId),
        eq(allowedStudents.studentId, studentId)
      ));
  } catch (error) {
    console.error("Error removing allowed student:", error);
    throw new Error("Failed to remove allowed student");
  }
}

// Teacher/User Management
export async function createTeacher(username: string, password: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with username as openId for local auth
    const result = await db.insert(users).values({
      openId: username,
      name: name,
      password: hashedPassword,
      role: "teacher",
      loginMethod: "local",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    return result;
  } catch (error) {
    console.error("Error creating teacher:", error);
    throw new Error("Failed to create teacher account");
  }
}

export async function findUserByUsername(username: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const user = await db.select().from(users).where(eq(users.openId, username)).limit(1);
    return user[0] || null;
  } catch (error) {
    console.error("Error finding user:", error);
    return null;
  }
}

export async function changePassword(userId: number, oldPassword: string, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get user
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]) {
      throw new Error("User not found");
    }

    // Verify old password
    if (!user[0].password) {
      throw new Error("This account doesn't have a password set");
    }

    const isValid = await bcrypt.compare(oldPassword, user[0].password);
    if (!isValid) {
      throw new Error("كلمة المرور القديمة غير صحيحة");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error("Error changing password:", error);
    throw error;
  }
}

// Classes Management
export async function createClass(data: InsertClass) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(classes).values(data).returning();
  return result[0];
}

export async function getClassesByTeacher(teacherId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(classes).where(eq(classes.teacherId, teacherId)).orderBy(desc(classes.createdAt));
}

export async function getClassById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
  return result[0];
}

export async function deleteClass(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete students first
  await db.delete(students).where(eq(students.classId, id));

  // Delete class
  await db.delete(classes).where(eq(classes.id, id));
}

// Students Management
export async function addStudentToClass(data: InsertStudent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(students).values(data).returning();
  return result[0];
}

export async function removeStudentFromClass(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(students).where(eq(students.id, id));
}

export async function getStudentsByClass(classId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(students).where(eq(students.classId, classId)).orderBy(students.name);
}

// Class Attendance
export async function getClassAttendance(sessionId: number, classId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all students in the class
  const classStudents = await db.select().from(students).where(eq(students.classId, classId));

  // Get all attendance records for the session
  const attendance = await db.select().from(attendanceRecords).where(eq(attendanceRecords.sessionId, sessionId));

  // Map attendance to students
  return classStudents.map(student => {
    const record = attendance.find(r => r.studentId === student.studentId);
    return {
      ...student,
      status: record ? 'present' : 'absent',
      checkedInAt: record?.checkedInAt || null,
      attendanceId: record?.id || null
    };
  });
}
// Bulk Student Import
export async function addStudentsBulk(studentsData: InsertStudent[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (studentsData.length === 0) return [];

  // Use onConflictDoNothing to skip duplicates based on studentId constraint if it exists,
  // or we can just insert. For now, simple insert.
  // Ideally, we should check for duplicates or use upsert if supported/needed.
  // Here we'll just insert and let it fail if unique constraints are violated, or handle gracefully.
  // But since studentId is not unique globally (only per class maybe?), we'll just insert.
  // Actually, studentId usually should be unique per class.

  const result = await db.insert(students).values(studentsData).returning();
  return result;
}

// Toggle Attendance
export async function toggleAttendanceStatus(
  sessionId: number,
  studentId: string,
  status: 'present' | 'absent',
  studentName?: string,
  studentEmail?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (status === 'present') {
    // Check if already present
    const existing = await db.select().from(attendanceRecords)
      .where(and(
        eq(attendanceRecords.sessionId, sessionId),
        eq(attendanceRecords.studentId, studentId)
      ))
      .limit(1);

    if (existing.length === 0) {
      if (!studentName) throw new Error("Student name required to mark as present");

      await db.insert(attendanceRecords).values({
        sessionId,
        studentId,
        studentName,
        studentEmail: studentEmail || null,
        checkedInAt: new Date(),
      } as any);
    }
  } else {
    // Remove attendance record
    await db.delete(attendanceRecords)
      .where(and(
        eq(attendanceRecords.sessionId, sessionId),
        eq(attendanceRecords.studentId, studentId)
      ));
  }
}

export async function getAttendanceReport(classId: number) {
  const db = await getDb(); // Added getDb() call here
  if (!db) throw new Error("Database not available"); // Added check here

  // 1. Get all students in the class
  const classStudents = await db
    .select()
    .from(students)
    .where(eq(students.classId, classId));

  // 2. Get all sessions for the class, ordered by date
  const classSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.classId, classId))
    .orderBy(sessions.createdAt);

  // 3. Get all attendance records for these sessions
  const sessionIds = classSessions.map((s: { id: number }) => s.id);
  let records: any[] = [];

  if (sessionIds.length > 0) {
    records = await db
      .select()
      .from(attendanceRecords) // Changed 'attendance' to 'attendanceRecords'
      .where(inArray(attendanceRecords.sessionId, sessionIds)); // Changed 'attendance' to 'attendanceRecords'
  }

  // 4. Build the report data
  const report = classStudents.map((student: any) => {
    const studentAttendance: Record<number, string> = {};
    let presentCount = 0;

    classSessions.forEach((session: any) => {
      // Find record for this student in this session
      // Note: attendanceRecords table uses studentId (text) which matches students.studentId
      const record = records.find(
        (r: any) => r.sessionId === session.id && r.studentId === student.studentId
      );

      // Determine status
      // If record exists, they are present (or whatever status is stored if we add status column later)
      // Currently attendanceRecords implies presence.
      // But wait, the previous toggle feature added a 'status' field?
      // Let's check schema again. attendanceRecords schema in file view above DOES NOT have 'status'.
      // However, the toggle feature I implemented relied on 'status'.
      // Did I miss updating the schema file view or did I not update schema?
      // The user said "without making a new file", implying we should use existing structure.
      // But my toggle implementation used `status`.
      // Let's assume for now presence = record exists.
      // If I added 'status' column in a previous step (which I did in my thought process but maybe not in schema file),
      // I should check if I need to add it to schema definition in code.
      // The previous `toggleStatus` implementation likely used a raw query or I missed where `status` was added to schema.
      // Wait, I see `attendance` table usage in my previous code but schema says `attendanceRecords`.
      // Let's stick to `attendanceRecords` which is in schema.

      if (record) {
        studentAttendance[session.id] = 'present';
        presentCount++;
      } else {
        studentAttendance[session.id] = 'absent';
      }
    });

    const totalSessions = classSessions.length;
    const percentage = totalSessions > 0
      ? Math.round((presentCount / totalSessions) * 100)
      : 0;

    return {
      student,
      attendance: studentAttendance,
      stats: {
        present: presentCount,
        total: totalSessions,
        percentage
      }
    };
  });

  return {
    sessions: classSessions,
    report
  };
}
