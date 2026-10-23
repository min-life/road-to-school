const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const diffOutput = execSync('git diff mobile/package.json "mobile/app/(tabs)/settings.tsx" mobile/services/api-client.ts', {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf-8',
  });

  const diffPath = path.resolve(__dirname, '../docs/ai-review/LATEST.diff');
  fs.writeFileSync(diffPath, diffOutput, 'utf-8');
  console.log(`LATEST.diff updated successfully (${diffOutput.length} bytes).`);
} catch (err) {
  console.error('Error generating diff:', err);
  process.exit(1);
}
