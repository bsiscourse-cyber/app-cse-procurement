const bcrypt = require('bcryptjs');
const readline = require('readline');

async function generateHash(plainText) {
  const saltRounds = 10;
  const hash = await bcrypt.hash(plainText.trim(), saltRounds);
  const isValid = await bcrypt.compare(plainText.trim(), hash);

  console.log('\n========================================');
  console.log('       PASSWORD HASH GENERATOR');
  console.log('========================================');
  console.log(`Input Password:  "${plainText}"`);
  console.log(`Bcrypt Hash:     ${hash}`);
  console.log(`Salt Rounds:     ${saltRounds}`);
  console.log(`Hash Verified:   ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log('========================================');
  console.log('\nSample SQL Update Query:');
  console.log(`UPDATE offices SET password_hash = '${hash}' WHERE office_name = 'Your Office Name';`);
  console.log('========================================\n');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    for (const pwd of args) {
      await generateHash(pwd);
    }
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Enter plaintext password to hash: ', async (inputPassword) => {
    if (!inputPassword || !inputPassword.trim()) {
      console.log('❌ Password cannot be empty.');
      rl.close();
      process.exit(1);
    }

    await generateHash(inputPassword);
    rl.close();
  });
}

main().catch((err) => {
  console.error('Error generating hash:', err);
  process.exit(1);
});
