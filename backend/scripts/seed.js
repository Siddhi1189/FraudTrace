import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import { User } from '../src/models/user.model.js';
import { DataBatch } from '../src/models/dataBatch.model.js';
import { simulateData } from '../src/services/data.service.js';
import { runFullAnalysis } from '../src/services/analysis.service.js';

// PLACEHOLDER(FT-4): Minimum password length of 8 characters
function validatePassword(password, label) {
  if (!password || password.length < 8) {
    throw new Error(`${label} password must be at least 8 characters long`);
  }
}

export async function seedUsers() {
  const analystEmail = (process.env.SEED_ANALYST_EMAIL || 'analyst@fraudtrace.local').trim().toLowerCase();
  const analystPassword = process.env.SEED_ANALYST_PASSWORD || 'Password123!';
  const analystName = process.env.SEED_ANALYST_NAME || 'Analyst User';

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@fraudtrace.local').trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!';
  const adminName = process.env.SEED_ADMIN_NAME || 'Admin User';

  validatePassword(analystPassword, 'Analyst');
  validatePassword(adminPassword, 'Admin');

  const saltRounds = 10;

  // Idempotent upsert for Analyst
  const existingAnalyst = await User.findOne({ email: analystEmail });
  if (!existingAnalyst) {
    const passwordHash = await bcrypt.hash(analystPassword, saltRounds);
    await User.create({
      name: analystName,
      email: analystEmail,
      passwordHash,
      role: 'ANALYST',
    });
    console.log(`[Seed] Created ANALYST user: ${analystEmail}`);
  } else {
    console.log(`[Seed] ANALYST user already exists: ${analystEmail}`);
  }

  // Idempotent upsert for Admin
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
    await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
    });
    console.log(`[Seed] Created ADMIN user: ${adminEmail}`);
  } else {
    console.log(`[Seed] ADMIN user already exists: ${adminEmail}`);
  }
}

export async function seedDemoData() {
  const existingSeedBatch = await DataBatch.findOne({ source: 'SIMULATION', seed: 42 });
  if (existingSeedBatch) {
    console.log(`[Seed] Demo data batch (seed: 42) already exists: Batch ID ${existingSeedBatch._id}`);
    return existingSeedBatch;
  }

  console.log('[Seed] Seeding initial demo transactions (seed 42, small)...');
  const result = await simulateData({ seed: 42, size: 'small' });
  console.log(
    `[Seed] Created demo data batch ${result.batch._id}: ${result.batch.acceptedRows} transactions accepted, ${result.batch.duplicateRows} duplicates, ${result.batch.rejectedRows} rejected.`
  );

  // Run initial topological detection, ring grouping, and risk scoring for the seed batch
  console.log('[Seed] Running initial graph analysis on seed transactions...');
  await runFullAnalysis({ trigger: 'SEED' });
  console.log('[Seed] Initial graph analysis complete. Alerts and rings created.');

  return result.batch;
}

async function runSeed() {
  try {
    await connectDB();
    console.log('[Seed] Starting database seed...');
    await seedUsers();
    await seedDemoData();
    console.log('[Seed] Seeding complete.');
  } catch (error) {
    console.error(`[Seed] Error running seed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB.');
  }
}

// Run only if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed();
}
