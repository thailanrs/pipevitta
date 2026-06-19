import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars from root .env before running migration command
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const migrationUrl = process.env.MIGRATION_DATABASE_URL;

if (!migrationUrl) {
  console.error('❌ MIGRATION_DATABASE_URL is not defined in .env');
  process.exit(1);
}

// Override DATABASE_URL for Prisma CLI command
process.env.DATABASE_URL = migrationUrl;

try {
  console.log('🔄 Running migrations with admin privileges...');
  execSync('npx prisma migrate dev', { stdio: 'inherit' });
  console.log('✅ Migrations completed successfully.');
} catch (error) {
  console.error('❌ Migration failed.');
  process.exit(1);
}
