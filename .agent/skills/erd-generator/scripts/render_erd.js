#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

try {
  mkdirSync('docs/architecture', { recursive: true });
  execSync(
    'npx --no-install mmdc -i docs/architecture/schema.mmd -o docs/architecture/erd.svg',
    { encoding: 'utf8', stdio: 'pipe' },
  );
  console.log('SUCCESS');
  process.exitCode = 0;
} catch (error) {
  const trace = error.stderr?.toString().trimEnd() || error.message;
  console.error(`SYNTAX_ERROR: ${trace}`);
  process.exitCode = 1;
}
