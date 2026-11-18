/** Repair only the original local demo UUIDs. Default: inspect without writes. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, Prisma } from '@prisma/client';

const { DEMO_KEYS, createDemoIds, validateDemoIds } = await import(new URL('./demo-ids.ts', import.meta.url).href) as typeof import('./demo-ids.js');
const dataset = 'roadtoschool-demo-v1';
const manifestPath = fileURLToPath(new URL('../.seed-demo-credentials.json', import.meta.url));
class RepairError extends Error {}
type Row = Record<string, unknown>;
type Snapshot = Record<string, Row[]>;
const models = Prisma.dmmf.datamodel.models;
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
const table = (name: string) => `"public".${quote(name)}`;

function legacyId(key: string): string {
  const bytes = createHash('sha1').update(Buffer.from('6ba7b8109dad11d180b400c04fd430c8', 'hex')).update(`${dataset}:${key}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 15) | 0x50;
  bytes[8] = (bytes[8]! & 63) | 0x80;
  const hex = bytes.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

async function snapshot(tx: Prisma.TransactionClient): Promise<Snapshot> {
  const result: Snapshot = {};
  for (const model of models) {
    const name = model.dbName ?? model.name;
    const rows = await tx.$queryRawUnsafe<{ row: Row }[]>(`SELECT row_to_json(t) AS row FROM ${table(name)} AS t`);
    result[name] = rows.map(value => value.row);
  }
  return result;
}

const prisma = new PrismaClient({ log: [] });
try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
  const url = new URL(process.env.DATABASE_URL ?? '');
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || process.env.NODE_ENV === 'production' || (url.searchParams.get('schema') ?? 'public') !== 'public') {
    throw new RepairError('Only local non-production PostgreSQL/public is allowed.');
  }
  const apply = process.argv.includes('--apply');
  if (apply && (!process.argv.includes('--expect-db') || process.argv[process.argv.indexOf('--expect-db') + 1] !== database)) {
    throw new RepairError('Writing requires --apply --expect-db <exact database name>.');
  }
  const originalManifest = readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(originalManifest) as { dataset: string; target: { database: string; hostname: string; port: string }; ids?: Record<string, string> };
  if (manifest.dataset !== dataset || manifest.target.database !== database || manifest.target.hostname !== url.hostname || manifest.target.port !== (url.port || '5432')) {
    throw new RepairError('Demo manifest does not match this local target.');
  }
  const targetKey = createHash('sha256').update(`${url.hostname}:${url.port || '5432'}/${database}`).digest('hex').slice(0, 16);
  const journalPath = join(tmpdir(), `roadtoschool-uuid-repair-${targetKey}.json`);
  const journal = existsSync(journalPath) ? JSON.parse(readFileSync(journalPath, 'utf8')) as { ids: Record<string, string>; backupPath?: string } : null;
  const ids = manifest.ids ?? journal?.ids ?? createDemoIds();
  validateDemoIds(ids);
  const mapping = new Map(Object.values(DEMO_KEYS).flat().map(key => [legacyId(key), ids[key]!]));
  const replace = (text: string) => text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, value => mapping.get(value.toLowerCase()) ?? value);
  const transform = (value: unknown): unknown => JSON.parse(replace(JSON.stringify(value)));
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]))
    : value;
  const canonicalRows = (rows: Row[]) => rows.map(row => JSON.stringify(canonical(row))).sort();
  await prisma.$connect();
  let backupPath = journal?.backupPath;
  const result = await prisma.$transaction(async tx => {
    if (apply) {
      await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '10s'");
      await tx.$executeRawUnsafe(`LOCK TABLE ${models.map(model => table(model.dbName ?? model.name)).join(', ')} IN SHARE ROW EXCLUSIVE MODE`);
    }
    const before = await snapshot(tx);
    let oldCount = 0, newCount = 0;
    for (const [name, keys] of Object.entries(DEMO_KEYS)) {
      for (const key of keys) {
        const oldRow = before[name]!.find(row => row.id === legacyId(key));
        const newRow = before[name]!.find(row => row.id === ids[key]);
        oldCount += Number(!!oldRow); newCount += Number(!!newRow);
        if (!oldRow && !newRow) throw new RepairError(`Missing demo record: ${name}/${key}. No repair applied.`);
        if (oldRow && newRow) throw new RepairError(`Target ID collision: ${name}/${key}. No repair applied.`);
        const row = oldRow ?? newRow!;
        if (name === 'schools' && row.name !== 'DEMO · Trường RoadToSchool') throw new RepairError('Demo school identity mismatch.');
        if (name === 'users' && row.email !== `${key.slice(5)}@demo.roadtoschool.test`) throw new RepairError('Demo account identity mismatch.');
      }
    }
    if (oldCount && newCount) throw new RepairError('Mixed old/new IDs. Inspect before continuing.');
    if (!apply) return { mode: 'READ_ONLY', database, legacyIds: oldCount, repairedIds: newCount, wouldUpdate: oldCount, rowCounts: Object.fromEntries(Object.entries(before).map(([name, rows]) => [name, rows.length])) };
    const fks = await tx.$queryRawUnsafe<{ name: string; action: string }[]>("SELECT conname AS name, confupdtype::text AS action FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace");
    if (fks.some(fk => fk.action !== 'c')) throw new RepairError('A foreign key lacks ON UPDATE CASCADE. No repair applied.');
    if (oldCount) {
      backupPath = mkdtempSync(join(tmpdir(), 'roadtoschool-demo-uuid-'));
      writeFileSync(join(backupPath, 'database-before.json'), JSON.stringify(before), { mode: 0o600, flag: 'wx' });
      writeFileSync(join(backupPath, 'credentials-before.json'), originalManifest, { mode: 0o600, flag: 'wx' });
      writeFileSync(journalPath, JSON.stringify({ dataset, database, ids, backupPath, state: 'PENDING' }, null, 2), { mode: 0o600 });
      for (const [name, keys] of Object.entries(DEMO_KEYS)) {
        for (const key of keys) {
          const changed = await tx.$executeRawUnsafe(`UPDATE ${table(name)} SET id=$1 WHERE id=$2`, ids[key], legacyId(key));
          if (changed !== 1) throw new RepairError('Unexpected update count; rolling back.');
        }
      }
      // SQL FKs cascade. Also repair soft references, compound event keys and JSON snapshots.
      const cascaded = await snapshot(tx);
      for (const model of models) {
        const name = model.dbName ?? model.name;
        const primary = model.fields.filter(field => field.isId).map(field => field.name);
        const keyNames = primary.length ? primary : model.primaryKey?.fields;
        if (!keyNames?.length) throw new RepairError(`Missing primary key metadata: ${name}`);
        for (const row of cascaded[name]!) {
          const changes = model.fields.filter(field => field.kind !== 'object' && ['String', 'Json'].includes(field.type)).flatMap(field => {
            const column = field.dbName ?? field.name;
            const value = row[column];
            if (value == null) return [];
            const updated = field.type === 'Json' ? transform(value) : replace(value as string);
            return JSON.stringify(value) === JSON.stringify(updated) ? [] : [{ column, value: field.type === 'Json' ? JSON.stringify(updated) : updated, json: field.type === 'Json' }];
          });
          if (!changes.length) continue;
          const parameters: unknown[] = changes.map(change => change.value);
          const where = keyNames.map(key => {
            const field = model.fields.find(value => value.name === key)!;
            parameters.push(row[field.dbName ?? field.name]);
            return `${quote(field.dbName ?? field.name)}=$${parameters.length}`;
          }).join(' AND ');
          const changed = await tx.$executeRawUnsafe(`UPDATE ${table(name)} SET ${changes.map((change, n) => `${quote(change.column)}=$${n + 1}${change.json ? '::jsonb' : ''}`).join(', ')} WHERE ${where}`, ...parameters);
          if (changed !== 1) throw new RepairError('Unexpected reference update count; rolling back.');
        }
      }
    }
    const after = await snapshot(tx);
    for (const name of Object.keys(before)) {
      const expected = (oldCount ? transform(before[name]) : before[name]) as Row[];
      if (JSON.stringify(canonicalRows(expected)) !== JSON.stringify(canonicalRows(after[name]!))) throw new RepairError(`Data preservation check failed: ${name}; rolling back.`);
    }
    if (replace(JSON.stringify(after)) !== JSON.stringify(after)) throw new RepairError('Old demo references remain; rolling back.');
    return { mode: 'APPLY', database, convertedIds: oldCount, alreadyRepaired: oldCount === 0, schoolId: ids.school, preservedAllRowsAndOtherValues: true };
  }, { timeout: 60000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (apply) {
    // Journal survives a filesystem failure after DB commit; a rerun repairs the manifest only.
    const temporaryPath = manifestPath + '.tmp';
    writeFileSync(temporaryPath, JSON.stringify({ ...manifest, ids }, null, 2) + '\n', { mode: 0o600 });
    renameSync(temporaryPath, manifestPath);
    writeFileSync(journalPath, JSON.stringify({ dataset, database, ids, backupPath, state: 'COMPLETED' }, null, 2), { mode: 0o600 });
  }
  console.log(JSON.stringify({ ...result, ...(backupPath ? { backupPath } : {}) }));
} catch (error) {
  console.error(error instanceof RepairError ? error.message : `Demo ID repair failed (${String(error && typeof error === 'object' ? Reflect.get(error, 'code') ?? 'UNKNOWN' : 'UNKNOWN')}). Raw errors/credentials withheld. No automatic reseed.`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
