
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { users } from "../drizzle/schema";

async function seed() {
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
    });
    const db = drizzle(pool);

    console.log("Seeding user...");

    try {
        const result = await db.insert(users).values({
            id: 1,
            openId: "teacher_1",
            name: "Teacher",
            email: "teacher@example.com",
            role: "teacher",
            loginMethod: "local",
        }).onConflictDoNothing().returning();

        console.log("User seeded:", result);
    } catch (error) {
        console.error("Error seeding user:", error);
    } finally {
        await pool.end();
    }
}

seed();
