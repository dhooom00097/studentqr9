import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { randomBytes } from "crypto";



export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    // Create new teacher account
    createTeacher: publicProcedure
      .input(z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.createTeacher(input.username, input.password, input.name);
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error.message || "فشل في إنشاء حساب المعلم",
          });
        }
      }),

    // Change password
    changePassword: publicProcedure
      .input(z.object({
        userId: z.number(),
        oldPassword: z.string(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        try {
          await db.changePassword(input.userId, input.oldPassword, input.newPassword);
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message || "فشل في تغيير كلمة المرور",
          });
        }
      }),
  }),

  attendance: router({
    // Get attendance records for a session
    getBySession: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAttendanceBySession(input.sessionId);
      }),

    // Check in a student (public endpoint)
    checkIn: publicProcedure
      .input(z.object({
        sessionCode: z.string(),
        studentName: z.string().min(1),
        studentId: z.string().min(1),
        studentEmail: z.string().email().optional(),
        studentLatitude: z.number().optional(),
        studentLongitude: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Find session by code
        const session = await db.getSessionByCode(input.sessionCode);
        if (!session) {
          throw new Error("الجلسة غير موجودة");
        }
        if (!session.isActive) {
          throw new Error("الجلسة مغلقة حالياً");
        }

        // Verify location if provided
        if (session.latitude && session.longitude) {
          if (!input.studentLatitude || !input.studentLongitude) {
            throw new Error("يجب تفعيل الموقع لتسجيل الحضور في هذه الجلسة");
          }

          const locationCheck = await db.verifyLocationForSession(
            session.id,
            input.studentLatitude,
            input.studentLongitude
          );
          if (!locationCheck.valid) {
            throw new Error(locationCheck.message);
          }
        }

        // Check if student is allowed (Whitelist)
        const isAllowed = await db.isStudentAllowed(session.id, input.studentId);
        if (!isAllowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "عذراً، لست في قائمة الطلاب المسموح لهم بالتسجيل في هذه الجلسة",
          });
        }

        // Check for duplicate attendance
        const isDuplicate = await db.checkDuplicateAttendance(session.id, input.studentName, input.studentId);
        if (isDuplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "تم تسجيل حضورك مسبقاً (الاسم أو الرقم الجامعي مسجل بالفعل)",
          });
        }  // Create attendance record
        await db.createAttendanceRecord({
          sessionId: session.id,
          studentName: input.studentName,
          studentId: input.studentId,
          studentEmail: input.studentEmail || null,
          studentLatitude: input.studentLatitude ? String(input.studentLatitude) : null,
          studentLongitude: input.studentLongitude ? String(input.studentLongitude) : null,
        } as any);

        return {
          success: true,
          sessionTitle: session.title,
        };
      }),

    // Verify session exists and is active (for QR scan)
    verifySession: publicProcedure
      .input(z.object({ sessionCode: z.string() }))
      .query(async ({ input }) => {
        const session = await db.getSessionByCode(input.sessionCode);
        if (!session) {
          return { valid: false, message: "الجلسة غير موجودة" };
        }
        if (!session.isActive) {
          return { valid: false, message: "الجلسة مغلقة حالياً" };
        }
        return {
          valid: true,
          sessionTitle: session.title,
          sessionDescription: session.description,
        };
      }),

    // Verify session by PIN
    verifyByPin: publicProcedure
      .input(z.object({ pin: z.string() }))
      .query(async ({ input }) => {
        // Clean PIN: remove any non-numeric characters
        const cleanPin = input.pin.replace(/\D/g, '').trim();
        console.log('[verifyByPin] Received PIN:', input.pin, '→ Cleaned:', cleanPin);
        const session = await db.getSessionByPin(cleanPin);
        console.log('[verifyByPin] Found session:', session);
        if (!session) {
          return { valid: false, message: "رقم PIN غير صحيح" };
        }
        if (!session.isActive) {
          return { valid: false, message: "الجلسة مغلقة حالياً" };
        }
        return {
          valid: true,
          sessionCode: session.sessionCode,
          sessionTitle: session.title,
          sessionDescription: session.description,
        };
      }),
  }),

  sessions: router({
    // Create a new session
    create: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const sessionCode = randomBytes(16).toString('hex');
        // Generate random 6-digit PIN
        const pin = Math.floor(100000 + Math.random() * 900000).toString();
        // Use a default teacher ID of 1 for simple auth
        await db.createSession({
          teacherId: 1,
          title: input.title,
          description: input.description || null,
          sessionCode,
          pin,
          isActive: 1,
          latitude: null,
          longitude: null,
          radius: 500,
        } as any);
        return { success: true, sessionCode, pin };
      }),

    // Get all sessions for current teacher
    list: publicProcedure.query(async () => {
      // Return all sessions for teacher ID 1
      return await db.getSessionsByTeacher(1);
    }),

    // Get session by ID with attendance count
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const session = await db.getSessionById(input.id);
        if (!session) return null;
        const attendance = await db.getAttendanceBySession(input.id);
        return {
          ...session,
          attendanceCount: attendance.length,
        };
      }),

    // Toggle session active status
    toggleStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        isActive: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.updateSessionStatus(input.id, input.isActive);
        return { success: true };
      }),

    // Update session location
    updateLocation: publicProcedure
      .input(z.object({
        id: z.number(),
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateSessionLocation(
          input.id,
          input.latitude,
          input.longitude,
          input.radius
        );
        return { success: true };
      }),

    // Delete session
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSession(input.id);
        return { success: true };
      }),

    // Get allowed students
    getAllowedStudents: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAllowedStudents(input.sessionId);
      }),

    // Add allowed student
    addAllowedStudent: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        studentId: z.string(),
        studentName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.addAllowedStudent(input);
        return { success: true };
      }),

    // Add allowed students in bulk
    addAllowedStudentsBulk: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        students: z.array(z.object({
          studentId: z.string(),
          studentName: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        await db.addAllowedStudentsBulk(input.sessionId, input.students);
        return { success: true };
      }),

    // Remove allowed student
    removeAllowedStudent: publicProcedure
      .input(z.object({
        sessionId: z.number(),
        studentId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.removeAllowedStudent(input.sessionId, input.studentId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
