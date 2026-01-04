import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking database schema for 'User' table...");

        // Check columns and their nullability in PostgreSQL
        const columns: any[] = await prisma.$queryRawUnsafe(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'User'
    `);

        console.log("User table columns:");
        console.table(columns);

        const emailColumn = columns.find(c => c.column_name === 'email');
        if (emailColumn) {
            if (emailColumn.is_nullable === 'NO') {
                console.error("FATAL: Column 'email' is NOT NULL in database!");
            } else {
                console.log("Column 'email' IS NULLABLE in database.");
            }
        } else {
            console.error("Column 'email' not found!");
        }

    } catch (error) {
        console.error("Error checking schema:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
