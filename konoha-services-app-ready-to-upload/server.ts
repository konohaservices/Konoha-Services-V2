import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { format } from 'date-fns';
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = createClient({
  url: process.env.TURSO_URL || "file:konoha.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Initialize Database
async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'admin'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS technicians (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'technician'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      price_ac_1_2 REAL DEFAULT 2.5,
      price_sofa_seat REAL DEFAULT 1.5,
      price_mattress_big REAL DEFAULT 5.0,
      price_mattress_small REAL DEFAULT 3.0,
      price_curtains REAL DEFAULT 2.0,
      price_carpet_meter REAL DEFAULT 1.0,
      duration_ac_1_2 INTEGER DEFAULT 30,
      duration_sofa_seat INTEGER DEFAULT 15,
      duration_mattress_big INTEGER DEFAULT 30,
      duration_mattress_small INTEGER DEFAULT 20,
      duration_curtains INTEGER DEFAULT 20,
      duration_carpet_meter INTEGER DEFAULT 10,
      bookings_enabled INTEGER DEFAULT 1,
      whatsapp_number TEXT DEFAULT '97333333333',
      pricing_rules TEXT DEFAULT '[]',
      working_hours TEXT DEFAULT '{}',
      reminder_months INTEGER DEFAULT 6
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_phone TEXT,
      location TEXT,
      service_date TEXT,
      service_time TEXT,
      services TEXT, -- JSON
      total_duration_minutes INTEGER,
      total_price_bhd REAL,
      discount_amount REAL,
      notes TEXT,
      technician_id INTEGER,
      status TEXT DEFAULT 'pending',
      quality_status TEXT DEFAULT 'pending_review', -- pending_review, approved, flagged
      rating INTEGER,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(technician_id) REFERENCES technicians(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      category TEXT, -- fuel, parts, labor, other
      amount REAL,
      description TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      logged_by INTEGER,
      FOREIGN KEY(booking_id) REFERENCES bookings(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS booking_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      url TEXT,
      type TEXT, -- before, after
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(booking_id) REFERENCES bookings(id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      message TEXT,
      type TEXT, -- 'booking_assigned', 'job_completed', 'inventory_low'
      read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration for existing databases
  try {
    await db.execute("ALTER TABLE bookings ADD COLUMN quality_status TEXT DEFAULT 'pending_review'");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE settings ADD COLUMN pricing_rules TEXT DEFAULT '[]'");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE settings ADD COLUMN working_hours TEXT DEFAULT '{}'");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE settings ADD COLUMN reminder_months INTEGER DEFAULT 6");
  } catch (e) {}

  // Fix missing id column in settings table from older versions
  try {
    const tableInfo = await db.execute("PRAGMA table_info(settings)");
    const hasId = tableInfo.rows.some((col: any) => col.name === 'id');
    if (!hasId) {
      await db.execute("ALTER TABLE settings ADD COLUMN id INTEGER DEFAULT 1");
    }
  } catch (e) {
    console.error("Settings ID migration error:", e);
  }

  // Seed Admin
  const adminRes = await db.execute({
    sql: "SELECT * FROM users WHERE username = ?",
    args: ["admin"]
  });
  if (adminRes.rows.length === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    await db.execute({
      sql: "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      args: ["admin", hash, "admin"]
    });
    console.log("Admin user created: admin / admin123");
  }

  // Seed Technician
  const techRes = await db.execute({
    sql: "SELECT * FROM technicians WHERE phone = ?",
    args: ["33333333"]
  });
  if (techRes.rows.length === 0) {
    const hash = bcrypt.hashSync("1234", 10);
    await db.execute({
      sql: "INSERT INTO technicians (name, phone, password) VALUES (?, ?, ?)",
      args: ["Ali Tech", "33333333", hash]
    });
    console.log("Technician user created: 33333333 / 1234");
  }

  // Seed Settings
  const settingsRes = await db.execute("SELECT * FROM settings WHERE id = 1");
  if (settingsRes.rows.length === 0) {
    await db.execute(`
      INSERT INTO settings (id, bookings_enabled, whatsapp_number) 
      VALUES (1, 1, '97333333333')
    `);
    console.log("Default settings created");
  }
}

// Helper to check availability
async function isSlotAvailable(db: any, date: string, time: string, duration: number, excludeBookingId?: number): Promise<boolean> {
  const [h, m] = time.split(':').map(Number);
  const start = h * 60 + m;
  const end = start + duration;

  const res = await db.execute({
    sql: "SELECT id, service_time, total_duration_minutes FROM bookings WHERE service_date = ? AND status != 'cancelled'",
    args: [date]
  });
  const bookings = res.rows;
  
  for (const booking of bookings) {
    if (excludeBookingId && booking.id == excludeBookingId) continue;

    const [bh, bm] = (booking.service_time as string).split(':').map(Number);
    const bStart = bh * 60 + bm;
    const bEnd = bStart + (booking.total_duration_minutes as number);

    if (start < bEnd && end > bStart) {
      return false;
    }
  }
  return true;
}

async function optimizeSchedule(db: any, date: string, newBooking: { time: string, duration: number, id?: number }) {
  const techRes = await db.execute("SELECT id FROM technicians");
  const technicians = techRes.rows;
  
  const settingsRes = await db.execute("SELECT working_hours FROM settings WHERE id = 1");
  const settings = settingsRes.rows[0];
  const workingHours = JSON.parse((settings?.working_hours as string) || '{}');
  
  const dateObj = new Date(date);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[dateObj.getDay()];
  
  const dayConfig = workingHours[dayName] || { start: '08:00', end: '18:00', enabled: true };
  if (dayConfig.enabled === false || dayConfig.is_off === true) return null;

  const [startH, startM] = dayConfig.start.split(':').map(Number);
  const [endH, endM] = dayConfig.end.split(':').map(Number);
  const dayStart = startH * 60 + startM;
  const dayEnd = endH * 60 + endM;

  let bestResult: any = null;

  // Try to fit in any technician's schedule
  for (const tech of technicians) {
    const res = await db.execute({
      sql: "SELECT id, service_time, total_duration_minutes FROM bookings WHERE service_date = ? AND technician_id = ? AND status != 'cancelled'",
      args: [date, tech.id]
    });
    const bookings = res.rows;
    
    const all = bookings.map(b => ({ 
      id: b.id, 
      time: b.service_time as string, 
      duration: b.total_duration_minutes as number, 
      isNew: false 
    }));
    
    if (newBooking.id) {
      const idx = all.findIndex(b => b.id === newBooking.id);
      if (idx !== -1) all.splice(idx, 1);
    }

    all.push({ 
      id: newBooking.id || -1, 
      time: newBooking.time, 
      duration: newBooking.duration, 
      isNew: true 
    });
    
    // Sort by preferred time
    all.sort((a, b) => {
      const [ah, am] = a.time.split(':').map(Number);
      const [bh, bm] = b.time.split(':').map(Number);
      return (ah * 60 + am) - (bh * 60 + bm);
    });

    // Tight pack from the start of the day
    let currentTime = dayStart;
    let possible = true;
    const schedule = [];
    
    for (const b of all) {
      if (currentTime + b.duration > dayEnd) {
        possible = false;
        break;
      }
      const h = Math.floor(currentTime / 60);
      const m = currentTime % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      schedule.push({ ...b, optimizedTime: timeStr });
      currentTime += b.duration;
    }

    if (possible) {
      const [ph, pm] = newBooking.time.split(':').map(Number);
      const preferredMinutes = ph * 60 + pm;
      const optimizedBooking = schedule.find(s => s.isNew);
      const [oh, om] = (optimizedBooking as any).optimizedTime.split(':').map(Number);
      const optimizedMinutes = oh * 60 + om;
      
      const shift = Math.abs(optimizedMinutes - preferredMinutes);
      
      if (!bestResult || shift < bestResult.shift) {
        bestResult = { technicianId: tech.id, schedule, shift };
      }
    }
  }
  
  return bestResult;
}

async function startServer() {
  await initDb();
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

  // Ensure uploads directory exists
  const UPLOADS_DIR = path.join(__dirname, 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR);
  }
  app.use('/uploads', express.static(UPLOADS_DIR));

  // API Routes
  
  // Login Admin
  app.post("/api/login", async (req, res) => {
    const { password } = req.body;
    // Simple admin check for now, or check username 'admin'
    const userRes = await db.execute("SELECT * FROM users WHERE username = 'admin'");
    const user = userRes.rows[0] as any;
    
    if (user && bcrypt.compareSync(password, user.password)) {
      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ success: false, error: "Invalid password" });
    }
  });

  // Change Admin Password
  app.post("/api/admin/change-password", async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    
    try {
      const userRes = await db.execute({
        sql: "SELECT * FROM users WHERE username = ?",
        args: [username || 'admin']
      });
      const user = userRes.rows[0] as any;
      
      if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
        return res.status(401).json({ success: false, error: "Invalid current password" });
      }

      const newHash = bcrypt.hashSync(newPassword, 10);
      await db.execute({
        sql: "UPDATE users SET password = ? WHERE id = ?",
        args: [newHash, user.id]
      });

      res.json({ success: true, message: "Password updated successfully" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Login Technician
  app.post("/api/technician/login", async (req, res) => {
    const { phone, password } = req.body;
    const techRes = await db.execute({
      sql: "SELECT * FROM technicians WHERE phone = ?",
      args: [phone]
    });
    const tech = techRes.rows[0] as any;

    if (tech && bcrypt.compareSync(password, tech.password)) {
      res.json({ success: true, technician: { id: tech.id, name: tech.name, phone: tech.phone, role: "technician" } });
    } else {
      res.status(401).json({ success: false, error: "Invalid credentials" });
    }
  });

  // Get Technicians
  app.get("/api/technicians", async (req, res) => {
    try {
      const techRes = await db.execute("SELECT id, name, phone, role FROM technicians");
      res.json({ success: true, technicians: techRes.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create Technician
  app.post("/api/technicians", async (req, res) => {
    const { name, phone, password } = req.body;
    try {
      const hash = bcrypt.hashSync(password, 10);
      const info = await db.execute({
        sql: "INSERT INTO technicians (name, phone, password) VALUES (?, ?, ?)",
        args: [name, phone, hash]
      });
      res.json({ success: true, technician: { id: Number(info.lastInsertRowid), name, phone } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update Technician
  app.patch("/api/technicians/:id", async (req, res) => {
    const { id } = req.params;
    const { name, phone, password } = req.body;
    
    try {
      const updates = [];
      const params = [];
      
      if (name) {
        updates.push("name = ?");
        params.push(name);
      }
      if (phone) {
        updates.push("phone = ?");
        params.push(phone);
      }
      if (password) {
        const hash = bcrypt.hashSync(password, 10);
        updates.push("password = ?");
        params.push(hash);
      }
      
      if (updates.length === 0) {
        return res.json({ success: true });
      }
      
      const query = `UPDATE technicians SET ${updates.join(", ")} WHERE id = ?`;
      params.push(id);
      
      await db.execute({ sql: query, args: params });
      
      const techRes = await db.execute({
        sql: "SELECT id, name, phone FROM technicians WHERE id = ?",
        args: [id]
      });
      res.json({ success: true, technician: techRes.rows[0] });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Settings
  app.get("/api/settings", async (req, res) => {
    const settingsRes = await db.execute("SELECT * FROM settings WHERE id = 1");
    const settings = settingsRes.rows[0];
    if (settings) {
      // Convert 1/0 to boolean for bookings_enabled
      (settings as any).bookings_enabled = (settings as any).bookings_enabled === 1;
      
      // Parse JSON fields
      try {
        (settings as any).pricing_rules = JSON.parse((settings as any).pricing_rules as string || '[]');
        (settings as any).working_hours = JSON.parse((settings as any).working_hours as string || '{}');
      } catch (e) {
        (settings as any).pricing_rules = [];
        (settings as any).working_hours = {};
      }

      (settings as any).reminder_months = (settings as any).reminder_months || 6;

      res.json({ success: true, settings });
    } else {
      res.status(500).json({ success: false, error: "Settings not found" });
    }
  });

  // Update Settings
  app.post("/api/settings", async (req, res) => {
    const settings = req.body;
    try {
      const keys = Object.keys(settings).filter(k => k !== 'id');
      const values = keys.map(k => {
        if (k === 'bookings_enabled') return settings[k] ? 1 : 0;
        if (k === 'pricing_rules' || k === 'working_hours') return JSON.stringify(settings[k]);
        return settings[k];
      });
      
      const setClause = keys.map(k => `${k} = ?`).join(", ");
      const query = `UPDATE settings SET ${setClause} WHERE id = 1`;
      await db.execute({ sql: query, args: values });
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create Booking
  app.post("/api/bookings", async (req, res) => {
    const { 
      customer_phone, location, service_date, service_time, 
      services, total_duration_minutes, total_price_bhd, 
      discount_amount, notes, technician_id, bypass_working_hours 
    } = req.body;

    try {
      let finalTime = service_time;
      let finalTechnicianId = technician_id;

      if (!bypass_working_hours) {
        const optimized = await optimizeSchedule(db, service_date, { time: service_time, duration: total_duration_minutes });
        if (!optimized) {
          return res.status(409).json({ success: false, error: "Slot no longer available within working hours" });
        }
        
        finalTechnicianId = optimized.technicianId;

        // Update other bookings if they were shifted
        for (const b of optimized.schedule) {
          if (!b.isNew && b.time !== b.optimizedTime) {
            await db.execute({
              sql: "UPDATE bookings SET service_time = ? WHERE id = ?",
              args: [b.optimizedTime, b.id]
            });
          }
          if (b.isNew) {
            finalTime = b.optimizedTime;
          }
        }
      }

      const query = `
        INSERT INTO bookings (
          customer_phone, location, service_date, service_time, 
          services, total_duration_minutes, total_price_bhd, 
          discount_amount, notes, technician_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const info = await db.execute({
        sql: query,
        args: [
          customer_phone, location, service_date, finalTime, 
          JSON.stringify(services), total_duration_minutes, total_price_bhd, 
          discount_amount, notes, finalTechnicianId || null, 'confirmed'
        ]
      });

      res.json({ success: true, booking: { id: Number(info.lastInsertRowid), service_time: finalTime } });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get Bookings
  app.get("/api/bookings", async (req, res) => {
    const { status, date, technician_id } = req.query;
    let query = "SELECT * FROM bookings WHERE 1=1";
    const params = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (date) {
      query += " AND service_date = ?";
      params.push(date);
    }
    if (technician_id) {
      query += " AND technician_id = ?";
      params.push(technician_id);
    }

    query += " ORDER BY service_date DESC, service_time DESC";

    try {
      const resBookings = await db.execute({ sql: query, args: params as any[] });
      const bookings = resBookings.rows;
      // Parse services JSON
      const parsedBookings = bookings.map((b: any) => ({
        ...b,
        services: JSON.parse(b.services as string)
      }));
      res.json({ success: true, bookings: parsedBookings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update Booking
  app.patch("/api/bookings/:id", async (req, res) => {
    const { id } = req.params;
    const { status, technician_id, notes, services, total_price_bhd, total_duration_minutes } = req.body;
    
    console.log(`PATCH /api/bookings/${id} - Status: ${status}, Tech: ${technician_id}`);

    try {
      let query = "UPDATE bookings SET ";
      const updates = [];
      const params = [];

      if (status) {
        // If changing from cancelled to something else, check availability
        if (status !== 'cancelled') {
           const bookingRes = await db.execute({
             sql: "SELECT * FROM bookings WHERE id = ?",
             args: [id]
           });
           const booking = bookingRes.rows[0] as any;
           if (booking && booking.status === 'cancelled') {
              if (!await isSlotAvailable(db, booking.service_date, booking.service_time, booking.total_duration_minutes, Number(id))) {
                 return res.status(409).json({ success: false, error: "Slot no longer available" });
              }
           }
        }
        updates.push("status = ?");
        params.push(status);
      }
      if (technician_id !== undefined) {
        updates.push("technician_id = ?");
        params.push(technician_id);
      }
      if (notes !== undefined) {
        updates.push("notes = ?");
        params.push(notes);
      }
      if (services !== undefined) {
        updates.push("services = ?");
        params.push(JSON.stringify(services));
      }
      if (total_price_bhd !== undefined) {
        updates.push("total_price_bhd = ?");
        params.push(total_price_bhd);
      }
      if (total_duration_minutes !== undefined) {
        updates.push("total_duration_minutes = ?");
        params.push(total_duration_minutes);
      }

      if (updates.length === 0) {
        return res.json({ success: true });
      }

      query += updates.join(", ") + " WHERE id = ?";
      params.push(id);

      console.log(`Executing SQL: ${query} with params: ${JSON.stringify(params)}`);
      await db.execute({ sql: query, args: params });

      // Notification Logic
      try {
        const bookingRes = await db.execute({
          sql: "SELECT * FROM bookings WHERE id = ?",
          args: [id]
        });
        const booking = bookingRes.rows[0] as any;
        
        // 1. Notify Technician if assigned
        if (technician_id && booking.technician_id) {
          await db.execute({
            sql: "INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)",
            args: [
              technician_id,
              `New booking #${id} assigned to you for ${booking.service_date} at ${booking.service_time}`,
              'booking_assigned'
            ]
          });
        }

        // 2. Notify Admin if completed
        if (status === 'completed') {
          // Get all admins (assuming role='admin' in users table)
          const adminsRes = await db.execute("SELECT id FROM users WHERE role = 'admin'");
          const admins = adminsRes.rows;
          for (const admin of admins) {
            await db.execute({
              sql: "INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)",
              args: [admin.id, `Booking #${id} completed by technician`, 'job_completed']
            });
          }
        }
      } catch (e) {
        console.error("Notification error:", e);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Check Availability
  app.get("/api/availability", async (req, res) => {
    const { date, duration } = req.query;
    const requestedDuration = Number(duration) || 30;
    
    try {
      const settingsRes = await db.execute("SELECT working_hours FROM settings WHERE id = 1");
      const settings = settingsRes.rows[0] as any;
      const workingHours = JSON.parse(settings?.working_hours || '{}');
      const dateObj = new Date(date as string);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[dateObj.getDay()];
      const dayConfig = workingHours[dayName] || { start: '08:00', end: '18:00', enabled: true };
      
      if (dayConfig.enabled === false || dayConfig.is_off === true) {
        return res.json({ success: true, slots: [] });
      }

      const [startH, startM] = dayConfig.start.split(':').map(Number);
      const [endH, endM] = dayConfig.end.split(':').map(Number);
      const dayStart = startH * 60 + startM;
      const dayEnd = endH * 60 + endM;

      const techRes = await db.execute("SELECT id FROM technicians");
      const technicians = techRes.rows;
      const availableTimes = new Set<string>();

      for (const tech of technicians) {
        const bookingsRes = await db.execute({
          sql: "SELECT total_duration_minutes FROM bookings WHERE service_date = ? AND technician_id = ? AND status != 'cancelled'",
          args: [date as string, tech.id]
        });
        const bookings = bookingsRes.rows;
        const totalBookedMinutes = bookings.reduce((sum, b) => sum + (b.total_duration_minutes as number), 0);
        
        const packedEndTime = dayStart + totalBookedMinutes;
        
        // Any slot starting at or after packedEndTime that fits within dayEnd
        for (let time = dayStart; time <= dayEnd - requestedDuration; time += 30) {
          if (time >= packedEndTime) {
            const h = Math.floor(time / 60);
            const m = time % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            availableTimes.add(timeStr);
          }
        }
      }

      res.json({ success: true, slots: Array.from(availableTimes).sort() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

    // --- Expenses & Profitability ---

    // Create Expense
    app.post("/api/expenses", async (req, res) => {
      const { booking_id, category, amount, description, logged_by } = req.body;
      try {
        const info = await db.execute({
          sql: "INSERT INTO expenses (booking_id, category, amount, description, logged_by) VALUES (?, ?, ?, ?, ?)",
          args: [booking_id, category, amount, description, logged_by]
        });
        res.json({ success: true, expense: { id: Number(info.lastInsertRowid) } });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Get Expenses
    app.get("/api/expenses", async (req, res) => {
      const { booking_id, start_date, end_date } = req.query;
      let query = "SELECT * FROM expenses WHERE 1=1";
      const params = [];

      if (booking_id) {
        query += " AND booking_id = ?";
        params.push(booking_id);
      }
      if (start_date) {
        query += " AND date >= ?";
        params.push(start_date);
      }
      if (end_date) {
        query += " AND date <= ?";
        params.push(end_date);
      }
      
      query += " ORDER BY date DESC";

      try {
        const expenseRes = await db.execute({ sql: query, args: params as any[] });
        res.json({ success: true, expenses: expenseRes.rows });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Profitability Report
    app.get("/api/reports/profitability", async (req, res) => {
      const { start_date, end_date } = req.query;
      
      try {
        // Calculate Revenue
        let revenueQuery = "SELECT SUM(total_price_bhd) as total_revenue FROM bookings WHERE status IN ('confirmed', 'completed')";
        const revParams = [];
        if (start_date) { revenueQuery += " AND service_date >= ?"; revParams.push(start_date); }
        if (end_date) { revenueQuery += " AND service_date <= ?"; revParams.push(end_date); }
        
        const revenueResult = (await db.execute({ sql: revenueQuery, args: revParams as any[] })).rows[0] as any;
        const totalRevenue = revenueResult?.total_revenue || 0;

        // Calculate Expenses
        let expenseQuery = "SELECT category, SUM(amount) as total FROM expenses WHERE 1=1";
        const expParams = [];
        if (start_date) { expenseQuery += " AND date >= ?"; expParams.push(start_date); }
        if (end_date) { expenseQuery += " AND date <= ?"; expParams.push(end_date); }
        expenseQuery += " GROUP BY category";

        const expenseRes = await db.execute({ sql: expenseQuery, args: expParams as any[] });
        const expensesByCategory = expenseRes.rows;
        const totalExpenses = expensesByCategory.reduce((sum: number, item: any) => sum + item.total, 0);

        res.json({
          success: true,
          revenue: totalRevenue,
          expenses: totalExpenses,
          net_profit: totalRevenue - totalExpenses,
          breakdown: expensesByCategory
        });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // --- Photos & Quality Control ---

    // Upload Photo (Store URL/Base64)
    app.post("/api/bookings/:id/photos", async (req, res) => {
      const { id } = req.params;
      const { url, type } = req.body; 
      
      try {
        let finalUrl = url;

        // Check if it's base64
        if (url && url.startsWith('data:image')) {
          // Extract extension and data
          // Format: data:image/jpeg;base64,/9j/4AAQSkZJRgABA...
          const matches = url.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
          
          if (matches && matches.length === 3) {
            let ext = matches[1];
            if (ext === 'jpeg') ext = 'jpg';
            
            const data = matches[2];
            const buffer = Buffer.from(data, 'base64');
            const filename = `photo-${id}-${Date.now()}.${ext}`;
            const filepath = path.join(UPLOADS_DIR, filename);
            
            fs.writeFileSync(filepath, buffer);
            finalUrl = `/uploads/${filename}`;
          }
        }

        await db.execute({
          sql: "INSERT INTO booking_photos (booking_id, url, type) VALUES (?, ?, ?)",
          args: [id, finalUrl, type]
        });
        res.json({ success: true, url: finalUrl });
      } catch (err: any) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Get Booking Photos
    app.get("/api/bookings/:id/photos", async (req, res) => {
      const { id } = req.params;
      try {
        const photoRes = await db.execute({
          sql: "SELECT * FROM booking_photos WHERE booking_id = ?",
          args: [id]
        });
        res.json({ success: true, photos: photoRes.rows });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Admin Gallery (Recent photos with booking info)
    app.get("/api/admin/gallery", async (req, res) => {
      try {
        const photoRes = await db.execute(`
          SELECT p.*, b.customer_phone, b.location, b.service_date, b.quality_status, t.name as technician_name
          FROM booking_photos p
          JOIN bookings b ON p.booking_id = b.id
          LEFT JOIN technicians t ON b.technician_id = t.id
          ORDER BY p.uploaded_at DESC
          LIMIT 50
        `);
        res.json({ success: true, photos: photoRes.rows });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Update Quality Status
    app.patch("/api/bookings/:id/quality", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body; // approved, flagged
      
      try {
        await db.execute({
          sql: "UPDATE bookings SET quality_status = ? WHERE id = ?",
          args: [status, id]
        });
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Submit Feedback
    app.post("/api/bookings/:id/feedback", async (req, res) => {
      const { id } = req.params;
      const { rating, feedback } = req.body;
      
      try {
        await db.execute({
          sql: "UPDATE bookings SET rating = ?, feedback = ? WHERE id = ?",
          args: [rating, feedback, id]
        });
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Customer History
    app.get("/api/customers/:phone/history", async (req, res) => {
      const { phone } = req.params;
      try {
        const bookingRes = await db.execute({
          sql: "SELECT * FROM bookings WHERE customer_phone = ? ORDER BY service_date DESC",
          args: [phone]
        });
        const bookings = bookingRes.rows;
        const parsed = bookings.map((b: any) => ({ ...b, services: JSON.parse(b.services as string) }));
        res.json({ success: true, bookings: parsed });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Reminders
    app.get("/api/admin/reminders", async (req, res) => {
      try {
        const settingsRes = await db.execute("SELECT reminder_months FROM settings WHERE id = 1");
        const settings = settingsRes.rows[0] as any;
        const months = settings?.reminder_months || 6;
        
        const customerRes = await db.execute(`
          SELECT customer_phone, MAX(service_date) as last_service
          FROM bookings
          WHERE status = 'completed'
          GROUP BY customer_phone
          HAVING last_service < date('now', '-${months} months')
        `);
        
        res.json({ success: true, reminders: customerRes.rows });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Clear Data (Admin)
    app.post("/api/admin/clear-data", async (req, res) => {
      const { type, olderThanMonths } = req.body;
      const months = Number(olderThanMonths) || 6;
      
      try {
        if (type === 'photos') {
          // 1. Get photos to delete
          const photoRes = await db.execute(`SELECT url FROM booking_photos WHERE uploaded_at < datetime('now', '-${months} months')`);
          const photos = photoRes.rows;
          
          // 2. Delete files
          let deletedFiles = 0;
          for (const photo of photos) {
            if (photo.url && (photo.url as string).startsWith('/uploads/')) {
              const filename = (photo.url as string).replace('/uploads/', '');
              const filepath = path.join(UPLOADS_DIR, filename);
              if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                deletedFiles++;
              }
            }
          }

          // 3. Delete records
          const result = await db.execute(`DELETE FROM booking_photos WHERE uploaded_at < datetime('now', '-${months} months')`);
          res.json({ success: true, message: `Deleted ${result.rowsAffected} photo records and ${deletedFiles} files.` });

        } else if (type === 'cancelled_bookings') {
          const result = await db.execute(`DELETE FROM bookings WHERE status = 'cancelled' AND service_date < date('now', '-${months} months')`);
          res.json({ success: true, message: `Deleted ${result.rowsAffected} cancelled bookings.` });
        } else {
          res.status(400).json({ success: false, error: "Invalid type" });
        }
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

  // --- Notifications ---
  app.get("/api/notifications", async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ success: false, error: "User ID required" });
    
    try {
      const notificationRes = await db.execute({
        sql: "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
        args: [user_id as string]
      });
      res.json({ success: true, notifications: notificationRes.rows });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    const { id } = req.params;
    try {
      await db.execute({
        sql: "UPDATE notifications SET read = 1 WHERE id = ?",
        args: [id]
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
