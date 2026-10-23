import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const diffTarget = 'docs/ai-review/LATEST.diff';
let combinedDiff = '';

// 1. Git diff for tracked files modified in Round 3
const modifiedFiles = [
  'mobile/package.json',
  'mobile/package-lock.json',
  'mobile/app/(tabs)/settings.tsx',
  'mobile/app/parent/student-detail/[id].tsx',
  'mobile/context/auth-context.tsx',
  'mobile/services/api-client.ts',
  'web/src/lib/types.ts',
  'web/src/lib/api-client.ts',
  'web/src/components/admin/admin-nav.config.ts',
  'web/src/components/icons.tsx',
  'web/src/components/admin/admin-sidebar.tsx',
  'web/src/app/admin/settings/page.tsx',
  'web/src/app/admin/students/[id]/page.tsx',
];

for (const file of modifiedFiles) {
  try {
    const diff = execSync(`git diff -- "${file}"`, { encoding: 'utf-8' });
    if (diff && diff.trim()) {
      combinedDiff += diff + '\n';
    }
  } catch (e) {
    // ignore
  }
}

// 2. New untracked files created in Round 3
const newFiles = [
  'docs/architecture/account-vehicle-student-requests-wireframes.md',
  'web/src/app/admin/vehicles/page.tsx',
  'web/src/app/admin/vehicles/add-vehicle-modal.tsx',
  'web/src/app/admin/requests/page.tsx',
  'web/src/app/admin/requests/request-detail-modal.tsx',
  'mobile/services/vietmap.service.ts',
  'mobile/app/parent/update-requests/[studentId].tsx',
  'mobile/app/parent/update-requests/detail/[requestId].tsx',
  'mobile/app/parent/create-request/information/[studentId].tsx',
  'mobile/app/parent/create-request/address/[studentId].tsx',
  'mobile/app/parent/create-request/verify-otp.tsx',
  'api/scripts/test_live_round3.js',
];

for (const file of newFiles) {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const lineCount = lines.length;
      combinedDiff += `diff --git a/${file} b/${file}\n`;
      combinedDiff += `new file mode 100644\n`;
      combinedDiff += `--- /dev/null\n`;
      combinedDiff += `+++ b/${file}\n`;
      combinedDiff += `@@ -0,0 +1,${lineCount} @@\n`;
      combinedDiff += lines.map((line) => `+${line}`).join('\n') + '\n';
    } catch (e) {
      // ignore
    }
  }
}

fs.writeFileSync(diffTarget, combinedDiff);
console.log(`Generated ${diffTarget} with length ${combinedDiff.length} characters.`);

// Backup copy into docs/ai-review/history/
const historyDir = 'docs/ai-review/history';
if (!fs.existsSync(historyDir)) {
  fs.mkdirSync(historyDir, { recursive: true });
}
fs.writeFileSync(path.join(historyDir, 'round3-implementation.diff'), combinedDiff);
console.log(`Saved backup to ${path.join(historyDir, 'round3-implementation.diff')}`);
