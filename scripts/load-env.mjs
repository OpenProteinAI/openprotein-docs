/** Loads `.env.local`, then `.env`. Variables already set win. */
import { existsSync } from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {}
  }
}
