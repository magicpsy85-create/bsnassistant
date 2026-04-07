import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

// Firebase Admin SDK 초기화
const serviceAccountPath = path.join(__dirname, '..', 'deploy-test1-24dc2-firebase-adminsdk-fbsvc-c61d9b269f.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('[Firebase] 서비스 계정 키 파일을 찾을 수 없습니다:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'deploy-test1-24dc2.firebasestorage.app'
  });
  console.log('[Firebase] Admin SDK 초기화 완료');
}

export const firestore = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
export default admin;
