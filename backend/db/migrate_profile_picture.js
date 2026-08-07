const pool = require('./pool');

async function migrateProfilePicture() {
  console.log('--- Updating offices table profile_picture column to LONGTEXT ---');
  try {
    await pool.query('ALTER TABLE offices MODIFY COLUMN profile_picture LONGTEXT NULL;');
    console.log('✅ Successfully updated profile_picture column to LONGTEXT!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating column type:', err);
    process.exit(1);
  }
}

migrateProfilePicture();
