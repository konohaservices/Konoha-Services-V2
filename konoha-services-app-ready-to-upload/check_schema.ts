
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const db = createClient({
  url: process.env.TURSO_URL || "file:konoha.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function check() {
  try {
    const res = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='settings'");
    console.log("Settings Table SQL:", res.rows[0]?.sql);
    
    const columns = await db.execute("PRAGMA table_info(settings)");
    console.log("Settings Columns:", columns.rows);
  } catch (e) {
    console.error("Error checking schema:", e);
  }
}

check();
