
import { createTeacher } from "../server/db";
import { getDb } from "../server/db";

async function seed() {
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to database");
        process.exit(1);
    }

    try {
        console.log("Creating admin user...");
        await createTeacher("admin", "admin123", "Admin User");
        console.log("Admin user created successfully!");
        console.log("Username: admin");
        console.log("Password: admin123");
    } catch (error: any) {
        if (error.message.includes("UNIQUE constraint failed")) {
            console.log("Admin user already exists.");
        } else {
            console.error("Failed to create admin user:", error);
        }
    }
    process.exit(0);
}

seed();
