import { pool } from "../config/database";

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🚀 Running migration...");

    // Check if 'obtained_marks' column exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name='your_table_name' AND column_name='obtained_marks';
    `);

    if (columnCheck.rowCount === 0) {
      // Column doesn't exist, add it
      console.log("Column 'obtained_marks' does not exist. Adding column...");
      await client.query(`
        ALTER TABLE your_table_name
        ADD COLUMN obtained_marks INTEGER;
      `);
      console.log("✅ Column 'obtained_marks' added successfully.");
    } else {
      console.log("Column 'obtained_marks' already exists. Skipping...");
    }

    // Example: rename column safely (if needed)
    // await client.query(`
    //   ALTER TABLE your_table_name
    //   RENAME COLUMN obtained_marks TO new_column_name;
    // `);

    console.log("🎉 Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    client.release();
  }
}

runMigration();
