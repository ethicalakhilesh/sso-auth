/**
 * Usage: npm run seed -- yourusername "your-password"
 */
import "dotenv/config";
import { hashPassword } from "../lib/password";
import { createUser, findUserByUsername } from "../lib/airtable";
import { isValidUsername, USERNAME_RULES_HELP } from "../lib/username";

async function main() {
  const [, , argUsername, argPassword] = process.argv;
  const username = argUsername?.toLowerCase();
  const password = argPassword;

  if (!username || !password) {
    console.error('Usage: npm run seed -- yourusername "your-password"');
    process.exit(1);
  }

  if (!isValidUsername(username)) {
    console.error(`Invalid username. Rules: ${USERNAME_RULES_HELP}`);
    process.exit(1);
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    console.error(`A user with username "${username}" already exists.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  await createUser(username, passwordHash);

  console.log(`Created user: ${username}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
