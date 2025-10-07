import { ensureDatabase } from '../src/db.js';

console.log('🔄 Running database migration...');

try {
  ensureDatabase();
  console.log('✅ Database migration completed successfully');
  console.log('📊 Database tables created/verified');
} catch (error) {
  console.error('❌ Database migration failed:', error);
  process.exit(1);
}