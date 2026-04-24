/**
 * Database Connectivity Test
 * Run with: npm run test:db
 * Verifies that the database is properly set up for signup
 */

import { query } from "./src/config/database.js";
import { config } from "dotenv";

config();

const testDatabaseSetup = async () => {
  console.log("🔍 Testing Database Setup...\n");

  try {
    // Test 1: Database Connection
    console.log("Test 1: Database Connection");
    try {
      const result = await query("SELECT NOW() as now");
      console.log("✅ Database connection successful");
      console.log("   Current time:", result.rows[0].now);
    } catch (error) {
      console.error("❌ Database connection failed:");
      console.error("   Error:", error.message);
      console.log("   Check your .env file:");
      console.log("   - DB_HOST:", process.env.DB_HOST);
      console.log("   - DB_USER:", process.env.DB_USER);
      console.log("   - DB_NAME:", process.env.DB_NAME);
      return;
    }

    // Test 2: Tables Exist
    console.log("\nTest 2: Required Tables");
    const requiredTables = [
      "users",
      "roles",
      "students",
      "teachers",
      "parents",
      "school_settings",
    ];

    for (const table of requiredTables) {
      try {
        const result = await query(`SELECT COUNT(*) FROM ${table}`);
        const count = result.rows[0].count;
        console.log(`✅ Table '${table}' exists (${count} rows)`);
      } catch (error) {
        console.error(`❌ Table '${table}' does not exist`);
        console.error(`   Error: ${error.message}`);
      }
    }

    // Test 3: Roles Table
    console.log("\nTest 3: Roles Table Contents");
    try {
      const result = await query("SELECT id, name FROM roles");
      if (result.rows.length === 0) {
        console.error("❌ No roles found in database!");
        console.log("   Run: npm run seed");
      } else {
        console.log(`✅ Found ${result.rows.length} roles:`);
        result.rows.forEach((role) => {
          console.log(`   - ${role.name}: ${role.id}`);
        });
      }
    } catch (error) {
      console.error("❌ Failed to query roles:", error.message);
    }

    // Test 4: School Settings
    console.log("\nTest 4: School Settings");
    try {
      const result = await query("SELECT COUNT(*) FROM school_settings");
      const count = result.rows[0].count;
      if (count === 0) {
        console.warn("⚠️  No school settings found (optional)");
      } else {
        console.log(`✅ School settings exist (${count} record(s))`);
      }
    } catch (error) {
      console.error("❌ Failed to query school settings:", error.message);
    }

    console.log("\n📋 Summary:");
    console.log("If all tests passed, signup should work.");
    console.log("If some tests failed, follow the SIGNUP_FIX.md guide.\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  }
};

testDatabaseSetup();
