import { query } from "./src/config/database.js";
import { hashPassword } from "./src/utils/auth.js";
import { config } from "dotenv";

config();

const seedDatabase = async () => {
  try {
    console.log("Starting database seeding...");

    // Check if roles already exist
    const existingRoles = await query("SELECT COUNT(*) as count FROM roles");
    const roleCount = parseInt(existingRoles.rows[0].count);

    if (roleCount > 0) {
      console.log(
        `Database already has ${roleCount} roles. Skipping role insertion.`,
      );
    } else {
      console.log("Inserting default roles...");

      await query(
        `INSERT INTO roles (name, description) VALUES 
        ($1, $2), 
        ($3, $4), 
        ($5, $6), 
        ($7, $8)`,
        [
          "admin",
          "System administrator with full access",
          "teacher",
          "Teacher with access to class and student data",
          "student",
          "Student with access to own academic data",
          "parent",
          "Parent with access to child academic data",
        ],
      );

      console.log("✅ Roles inserted successfully");
    }

    // Check if school settings exist
    const existingSettings = await query(
      "SELECT COUNT(*) as count FROM school_settings",
    );
    const settingsCount = parseInt(existingSettings.rows[0].count);

    if (settingsCount === 0) {
      console.log("Inserting default school settings...");

      await query(
        `INSERT INTO school_settings (school_name, school_code, principal_name, city, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          "Default School",
          "SCHOOL001",
          "Principal Name",
          "City",
          "123-456-7890",
          "school@example.com",
        ],
      );

      console.log("✅ School settings inserted successfully");
    }

    console.log("✅ Database seeding completed!\n");
    console.log("Available roles:");
    const roles = await query("SELECT id, name FROM roles");
    roles.rows.forEach((role) => {
      console.log(`  - ${role.name}: ${role.id}`);
    });

    // Ensure a default admin user exists with known credentials
    const adminRole = roles.rows.find((r) => r.name === "admin");
    if (adminRole) {
      const adminExists = await query("SELECT id FROM users WHERE email = $1", [
        "admin@school.com",
      ]);
      if (!adminExists.rowCount || adminExists.rowCount === 0) {
        console.log("\n👤 Creating default admin user...");
        const hashedPassword = await hashPassword("Admin@123");
        await query(
          `INSERT INTO users (email, password_hash, first_name, last_name, role_id, status)
           VALUES ($1, $2, $3, $4, $5, 'active')`,
          ["admin@school.com", hashedPassword, "Admin", "User", adminRole.id],
        );
        console.log("✅ Default admin created: admin@school.com / Admin@123");
      } else {
        console.log("ℹ️  Default admin already exists: admin@school.com");
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
