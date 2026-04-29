#!/usr/bin/env node
// SSR 페이지(*-page.ts) 백틱 템플릿 escape 함정 자동 검증
// 사용법: node scripts/check-ssr-escape.js <파일경로>

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.log('사용법: node scripts/check-ssr-escape.js <*-page.ts 파일경로>');
  process.exit(0);
}

if (!filePath.endsWith('-page.ts')) {
  console.log('대상 아님 (*-page.ts 파일만 검사):', filePath);
  process.exit(0);
}

if (!fs.existsSync(filePath)) {
  console.log('파일 없음:', filePath);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const issues = [];

// 백틱 템플릿 블록 추출
const backtickBlocks = content.match(/`[\s\S]*?`/g) || [];

backtickBlocks.forEach((block, idx) => {
  // 단일 escape \n 검출 (\\n, \\\\n은 정상이므로 제외)
  const matches = block.match(/(?<!\\)\\n(?!\\)/g);
  if (matches && matches.length > 0) {
    issues.push(`[블록 ${idx + 1}] 단일 escape \\n 발견 ${matches.length}건 → \\\\n으로 수정 필요`);
  }

  // firebase 호출 있으나 초기화 가드 누락
  // 통과 조건: ensureFirebaseInitialized | firebase.initializeApp( | await initFirebase(
  if (/firebase\.(auth|firestore|database)/.test(block) && !/ensureFirebaseInitialized|firebase\.initializeApp\(|await\s+initFirebase\(/.test(block)) {
    issues.push(`[블록 ${idx + 1}] firebase 호출 있음 + 초기화 가드 누락 (ensureFirebaseInitialized | firebase.initializeApp( | await initFirebase( 중 하나 필요)`);
  }
});

const relPath = path.relative(process.cwd(), filePath);

if (issues.length > 0) {
  console.log('');
  console.log('⚠ SSR escape 검증 경고');
  console.log('파일:', relPath);
  issues.forEach(i => console.log('  -', i));
  console.log('');
  process.exit(1);
} else {
  console.log('✓ SSR escape 검증 통과:', relPath);
  process.exit(0);
}
