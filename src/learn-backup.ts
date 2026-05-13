import fs from 'fs';
import path from 'path';
import { firestore } from './firebase-admin';
import type { LearnData } from './learn-store';

const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');
const FIRESTORE_DEBOUNCE_MS = 5 * 60 * 1000;
const DAILY_RETENTION_DAYS = 30;

// PM2 fork single instance 전제. multi-instance 전환 시 Firestore meta fetch로 재설계 필요.
let lastFirestoreBackupAt = 0;

interface BackupOptions {
  force?: boolean;
}

export async function backupLearnedArticles(
  data: LearnData,
  options: BackupOptions = {}
): Promise<void> {
  try {
    ensureBackupDir();

    const now = new Date();
    const dateStr = formatDate(now);

    writeLocalDaily(data, dateStr);

    if (now.getDate() === 1) {
      writeLocalMonthly(data, dateStr);
    }

    rotateOldDailyBackups();

    const shouldBackupFirestore =
      options.force ||
      (Date.now() - lastFirestoreBackupAt) >= FIRESTORE_DEBOUNCE_MS;

    if (shouldBackupFirestore) {
      await writeFirestoreBackup(data, now);
      lastFirestoreBackupAt = Date.now();
      console.log(
        `[learn-backup] Firestore backup OK (${data.articles.length} articles)`
      );
    } else {
      console.log('[learn-backup] Firestore debounce skip');
    }
  } catch (err) {
    console.error('[learn-backup] backup failed:', err);
  }
}

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function writeLocalDaily(data: LearnData, dateStr: string): void {
  const dest = path.join(BACKUP_DIR, `learned_articles_${dateStr}.json`);
  const tmp = dest + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, dest);
}

function writeLocalMonthly(data: LearnData, dateStr: string): void {
  const dest = path.join(BACKUP_DIR, `monthly_${dateStr}.json`);
  const tmp = dest + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, dest);
}

function rotateOldDailyBackups(): void {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const entries = fs.readdirSync(BACKUP_DIR);
  const cutoff = Date.now() - DAILY_RETENTION_DAYS * 24 * 60 * 60 * 1000;

  for (const entry of entries) {
    // monthly_ 접두사는 영구 보존 — daily만 회전
    if (!entry.startsWith('learned_articles_') || !entry.endsWith('.json')) {
      continue;
    }

    const full = path.join(BACKUP_DIR, entry);
    try {
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(full);
        console.log(`[learn-backup] rotated old daily: ${entry}`);
      }
    } catch (err) {
      console.error(`[learn-backup] rotate failed for ${entry}:`, err);
    }
  }
}

async function writeFirestoreBackup(data: LearnData, now: Date): Promise<void> {
  await firestore.collection('backups').doc('learned_articles_latest').set({
    data,
    backedUpAt: now.toISOString(),
    articleCount: data.articles.length,
  });
}
