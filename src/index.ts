import 'dotenv/config';
import express, { Request, Response } from 'express';
import { generateChatbotPageHTML } from './pages/chatbot-page';
import { generateAdminPageHTML } from './pages/admin-page';
import { handleChatbotMessage } from './chatbot';
import { generateInstaPageHTML } from './pages/insta-page';
import { generateAllContent } from './content-generator';
import { generateSingleCard } from './card-image';
import { getArticles, getArticleStats, deleteArticle, addArticlesFromUrls, addArticlesFromPdf } from './learn-store';
import axios from 'axios';
import multer from 'multer';
import {
  addRecord,
  getRecords,
  updateRecordStatus,
  getTopQuestions,
  getRuleDrafts,
  addRuleDraft,
  deleteRuleDraft,
  updateRuleDraft,
  markDraftsApplied,
  loadRulesFile,
  saveRulesFile,
  getMembers,
  saveMembers,
  addMember,
  updateMember,
  deleteMember,
  ChatRecord,
  RuleDraft,
  Member,
} from './data-store';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';
import { getTransactions, getTransactionsByPeriod, formatYm } from './molit-api';
import db from './db';
import { firestore, auth as firebaseAuth } from './firebase-admin';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// 서버 기본 타임아웃 5분 (GPT 호출 대기)
app.use((_req: any, _res: any, next: any) => { _req.setTimeout(300000); next(); });

// ─── 멤버 목록 API ───
app.get('/api/members', async (_req: Request, res: Response) => {
  res.json(await getMembers());
});

// 멤버 추가
const AUTO_TEAM_POSITIONS = ['대표', '상무', '이사', '팀장'];
const LOCKED_MEMBERS: Record<number, string> = { 94: '사장', 95: '부사장' };

app.post('/api/admin/members', async (req: Request, res: Response) => {
  const { name, position, department, team, phone, joinDate, birthDate, email, note, role } = req.body;
  if (!name || !phone) return res.status(400).json({ error: '이름과 연락처는 필수입니다.' });
  const members = await getMembers();
  const maxNo = members.length > 0 ? Math.max(...members.map(m => m.no)) : 0;
  const autoTeam = (AUTO_TEAM_POSITIONS.includes(position) && !team) ? (name + '팀') : (team || '');
  const newMember: Member = {
    no: maxNo + 1,
    name, position: position || '', department: department || '',
    team: autoTeam, phone, phoneLast4: phone.replace(/[^0-9]/g, '').slice(-4),
    joinDate: joinDate || '', birthDate: birthDate || '',
    email: email || '', note: note || '', role: role || '사용자',
  };
  await addMember(newMember);
  res.json({ success: true, member: newMember });
});

// 멤버 수정
app.put('/api/admin/members/:no', async (req: Request, res: Response) => {
  const no = parseInt(req.params.no);
  const updates = req.body;

  // 직책 고정 멤버: 직책 변경 차단
  if (LOCKED_MEMBERS[no] && updates.position && updates.position !== LOCKED_MEMBERS[no]) {
    updates.position = LOCKED_MEMBERS[no];
  }

  // 팀명 자동 생성: 대표/상무/이사/팀장
  if (AUTO_TEAM_POSITIONS.includes(updates.position)) {
    if (updates.name) {
      updates.team = updates.name + '팀';
    } else {
      const members = await getMembers();
      const member = members.find(m => m.no === no);
      if (member) updates.team = member.name + '팀';
    }
  }

  await updateMember(no, updates);
  res.json({ success: true });
});

// 멤버 삭제
app.delete('/api/admin/members/:no', async (req: Request, res: Response) => {
  const no = parseInt(req.params.no);
  await deleteMember(no);
  res.json({ success: true });
});

// ─── Firebase 인증 API ───

app.post('/api/auth/verify', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken 필요' });

    const decoded = await firebaseAuth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    if (!email) return res.status(403).json({ error: '이메일 정보 없음' });

    const membersSnap = await firestore.collection('members').where('email', '==', email).limit(1).get();

    if (membersSnap.empty) {
      // access_requests에 기록
      const existingReq = await firestore.collection('access_requests').where('email', '==', email).limit(1).get();
      if (existingReq.empty) {
        await firestore.collection('access_requests').add({
          email: email,
          googleName: name || '',
          picture: picture || '',
          status: 'pending',
          requestedAt: new Date().toISOString(),
          processedAt: null,
          processedBy: null
        });
        console.log('[외부 승인 요청] 신규:', email, name);
      } else {
        const doc = existingReq.docs[0];
        const data = doc.data();
        if (data.status === 'rejected') {
          await doc.ref.update({ status: 'pending', requestedAt: new Date().toISOString(), googleName: name || data.googleName, picture: picture || data.picture });
          console.log('[외부 승인 요청] 재요청:', email);
        }
      }
      return res.status(403).json({ error: '등록되지 않은 계정입니다. 관리자의 승인을 기다려주세요.', email: email });
    }

    const memberDoc = membersSnap.docs[0];
    const member = memberDoc.data();
    const sessionId = Math.random().toString(36).substr(2) + Date.now().toString(36);

    await memberDoc.ref.update({
      sessionId: sessionId,
      lastLoginAt: new Date().toISOString()
    });

    console.log('[인증 성공]', email, '→', member.name, '(' + member.role + ')');

    res.json({
      user: {
        uid,
        email: email,
        name: member.name || name || '',
        picture: picture || '',
        role: member.role || '사용자',
        memberNo: member.no,
        sessionId: sessionId
      }
    });
  } catch (e: any) {
    console.error('[Firebase 인증 오류]', e.message);
    res.status(401).json({ error: '인증 실패' });
  }
});

app.post('/api/auth/check-session', async (req: Request, res: Response) => {
  try {
    const { email, sessionId } = req.body;
    if (!email || !sessionId) return res.status(400).json({ error: 'email, sessionId 필요' });

    const snap = await firestore.collection('members').where('email', '==', email).limit(1).get();
    if (snap.empty) return res.status(403).json({ error: '등록되지 않은 계정' });

    const member = snap.docs[0].data();
    if (member.sessionId !== sessionId) {
      return res.status(401).json({ kicked: true, error: '다른 기기에서 로그인되었습니다' });
    }
    res.json({ valid: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Firebase 클라이언트 설정 전달
app.get('/api/auth/config', (_req: Request, res: Response) => {
  res.json({
    apiKey: process.env.FB_WEB_API_KEY || '',
    authDomain: 'deploy-test1-24dc2.firebaseapp.com',
    projectId: 'deploy-test1-24dc2',
    storageBucket: 'deploy-test1-24dc2.firebasestorage.app'
  });
});

// ─── 챗봇 페이지 ───
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/insta#transaction');
});

app.get('/chatbot', (_req: Request, res: Response) => {
  res.send(generateChatbotPageHTML());
});

// ─── 관리자 페이지 ───
app.get('/admin', (_req: Request, res: Response) => {
  res.send(generateAdminPageHTML());
});

// ─── 콘텐츠 생성 페이지 ───
app.get('/insta', (_req: Request, res: Response) => {
  res.send(generateInstaPageHTML());
});

// ─── 콘텐츠 생성 API ───
app.post('/api/content/generate', async (req: Request, res: Response) => {
  try {
    req.setTimeout(300000); // 5분 타임아웃
    res.setTimeout(300000);
    const { mode, input } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: '입력 내용이 필요합니다.' });
    }
    const result = await generateAllContent(mode === 'url' ? 'url' : 'text', input.trim());

    // URL 모드일 때 자동으로 학습에 추가 (중복은 내부에서 스킵)
    if (mode === 'url') {
      addArticlesFromUrls([input.trim()]).then(r => {
        if (r.added > 0) console.log('[학습] 콘텐츠 생성 URL 자동 학습:', input.trim());
      }).catch(() => {});
    }

    res.json({ success: true, result });
  } catch (err: any) {
    console.error('콘텐츠 생성 오류:', err);
    if (err.status === 401) {
      return res.status(500).json({ error: '환경 변수를 확인해주세요 (OPENAI_API_KEY)' });
    }
    res.status(500).json({ error: '콘텐츠 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

// ─── 카드 이미지 생성 API ───
app.post('/api/content/generate-card', async (req: Request, res: Response) => {
  try {
    req.setTimeout(300000);
    res.setTimeout(300000);
    const { cardIndex, topic, tag, title, style, imageIdea } = req.body;
    if (typeof cardIndex !== 'number' || !title) {
      return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
    }
    const imageBase64 = await generateSingleCard({
      cardIndex,
      topic: topic || '',
      tag: tag || '',
      title,
      style: style || 'dark',
      imageIdea: imageIdea || undefined
    });
    res.json({ success: true, imageBase64 });
  } catch (err: any) {
    console.error('카드 이미지 생성 오류:', err);
    res.status(500).json({ error: '이미지 생성 중 오류가 발생했습니다.' });
  }
});

// ─── 지역 좌표 변환 API ───
const REGION_CACHE: Record<string, { lat: number; lng: number }> = {
  '성수동': { lat: 37.5445, lng: 127.0560 }, '강남역': { lat: 37.4979, lng: 127.0276 },
  '강남구': { lat: 37.4979, lng: 127.0276 }, '한남동': { lat: 37.5340, lng: 127.0010 },
  '이태원': { lat: 37.5345, lng: 126.9946 }, '여의도': { lat: 37.5219, lng: 126.9245 },
  '홍대': { lat: 37.5563, lng: 126.9236 }, '압구정': { lat: 37.5270, lng: 127.0285 },
  '청담동': { lat: 37.5247, lng: 127.0474 }, '을지로': { lat: 37.5660, lng: 126.9910 },
  '종로': { lat: 37.5704, lng: 126.9831 }, '명동': { lat: 37.5636, lng: 126.9827 },
  '신사동': { lat: 37.5239, lng: 127.0231 }, '서초구': { lat: 37.4837, lng: 127.0146 },
  '서초동': { lat: 37.4837, lng: 127.0146 }, '삼성동': { lat: 37.5088, lng: 127.0631 },
  '역삼동': { lat: 37.5007, lng: 127.0365 }, '잠실': { lat: 37.5133, lng: 127.1001 },
  '마포구': { lat: 37.5538, lng: 126.9084 }, '마포': { lat: 37.5538, lng: 126.9084 },
  '용산구': { lat: 37.5311, lng: 126.9810 }, '용산': { lat: 37.5311, lng: 126.9810 },
  '건대': { lat: 37.5404, lng: 127.0696 }, '왕십리': { lat: 37.5614, lng: 127.0380 },
  '뚝섬': { lat: 37.5475, lng: 127.0470 }, '송파구': { lat: 37.5048, lng: 127.1127 },
  '영등포': { lat: 37.5171, lng: 126.9078 }, '광화문': { lat: 37.5759, lng: 126.9769 },
  '논현동': { lat: 37.5112, lng: 127.0288 }, '서교동': { lat: 37.5527, lng: 126.9183 },
  '연남동': { lat: 37.5660, lng: 126.9260 }, '성동구': { lat: 37.5506, lng: 127.0409 },
  '중구': { lat: 37.5641, lng: 126.9979 },
};

function findRegionFromCache(region: string): { lat: number; lng: number } | null {
  if (REGION_CACHE[region]) return REGION_CACHE[region];
  const keys = Object.keys(REGION_CACHE).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (region.includes(key)) return REGION_CACHE[key];
  }
  return null;
}

app.post('/api/content/geocode', async (req: Request, res: Response) => {
  const { region } = req.body;
  console.log('[geocode] 요청 region:', JSON.stringify(region));
  if (!region) return res.status(400).json({ error: '지역명이 필요합니다.' });

  // 부분 매칭 캐시 검색
  const cached = findRegionFromCache(region);
  console.log('[geocode] 캐시 결과:', cached ? 'HIT' : 'MISS');
  if (cached) return res.json({ ...cached, address: region });

  // 카카오 로컬 API
  const kakaoKey = process.env.KAKAO_REST_API_KEY;
  if (!kakaoKey) return res.status(500).json({ error: '카카오 API 키가 설정되지 않았습니다.' });

  try {
    const resp = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
      params: { query: region },
      headers: { 'Authorization': 'KakaoAK ' + kakaoKey },
      timeout: 5000
    });
    const doc = resp.data?.documents?.[0];
    if (!doc) return res.status(404).json({ error: '해당 지역을 찾을 수 없습니다.' });
    const coords = { lat: parseFloat(doc.y), lng: parseFloat(doc.x), address: doc.address_name || region };
    REGION_CACHE[region] = { lat: coords.lat, lng: coords.lng };
    res.json(coords);
  } catch (err: any) {
    console.error('Geocode 오류:', err.message);
    res.status(500).json({ error: '좌표 변환 중 오류가 발생했습니다.' });
  }
});

// ─── 카카오 JS 키 전달 API ───
app.get('/api/kakao-key', (_req: Request, res: Response) => {
  res.json({ key: process.env.KAKAO_JS_API_KEY || '' });
});

// ─── 외부 승인 관리 ───
app.get('/api/admin/access-requests', async (_req: Request, res: Response) => {
  try {
    const snap = await firestore.collection('access_requests').orderBy('requestedAt', 'desc').get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/access-requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, position, department, team, phone, joinDate, role, processedBy } = req.body;
    if (!name) return res.status(400).json({ error: '성명은 필수입니다' });
    if (!department) return res.status(400).json({ error: '소속은 필수입니다' });
    if (!position) return res.status(400).json({ error: '직책은 필수입니다' });
    if (!phone) return res.status(400).json({ error: '연락처는 필수입니다' });

    const reqDoc = firestore.collection('access_requests').doc(id);
    const reqSnap = await reqDoc.get();
    if (!reqSnap.exists) return res.status(404).json({ error: '요청을 찾을 수 없습니다' });
    const reqData = reqSnap.data()!;

    // 최대 no 구하기
    const membersSnap = await firestore.collection('members').get();
    let maxNo = 0;
    membersSnap.docs.forEach(d => { const n = d.data().no || 0; if (n > maxNo) maxNo = n; });

    const phoneLast4 = phone.replace(/[^0-9]/g, '').slice(-4);

    // 자동 팀 생성
    const AUTO_TEAM_POSITIONS = ['대표', '상무', '이사', '팀장'];
    const autoTeam = AUTO_TEAM_POSITIONS.includes(position) ? name + '팀' : (team || '');

    const newMember = {
      no: maxNo + 1,
      name,
      position,
      department,
      team: autoTeam,
      phone,
      phoneLast4,
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      birthDate: '',
      email: reqData.email,
      role: role || '사용자',
      lastLoginAt: null,
      sessionId: null
    };
    await firestore.collection('members').add(newMember);

    await reqDoc.update({
      status: 'approved',
      approvedName: name,
      processedAt: new Date().toISOString(),
      processedBy: processedBy || '관리자'
    });

    console.log('[외부 승인 완료]', reqData.email, '→', name, department, position);
    res.json({ success: true, member: newMember });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/access-requests/:id/reject', async (req: Request, res: Response) => {
  try {
    const { processedBy } = req.body;
    await firestore.collection('access_requests').doc(req.params.id).update({
      status: 'rejected',
      processedAt: new Date().toISOString(),
      processedBy: processedBy || '관리자'
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/access-requests/:id', async (req: Request, res: Response) => {
  try {
    await firestore.collection('access_requests').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── AI 뉴스 추천 API ───
app.get('/api/content/recommend-news', async (_req: Request, res: Response) => {
  try {
    const naverId = process.env.NAVER_CLIENT_ID;
    const naverSecret = process.env.NAVER_CLIENT_SECRET;
    if (!naverId || !naverSecret) return res.json({ articles: [], error: '뉴스 검색 API가 설정되지 않았습니다' });

    // 학습 데이터에서 키워드 추출
    const learned = getArticles();
    let keywords: string[] = [];

    if (learned.length > 0) {
      const regionCount: Record<string, number> = {};
      const tagCount: Record<string, number> = {};
      learned.forEach(a => {
        if (a.region) { const r = a.region.split(/[,\s]/)[0].trim(); if (r) regionCount[r] = (regionCount[r] || 0) + 1; }
        (a.tags || []).forEach(t => { if (t !== '기타') tagCount[t] = (tagCount[t] || 0) + 1; });
      });
      const topRegions = Object.entries(regionCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
      const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
      topRegions.forEach(r => keywords.push(r + ' 빌딩'));
      topTags.forEach(t => keywords.push('빌딩 ' + t));
      keywords.push('서울 상업용 부동산 매매');
    } else {
      keywords = ['서울 빌딩 매매', '상업용 부동산 거래', '서울 상권 분석', '빌딩 임대료', '상가 권리금'];
    }

    // 네이버 뉴스 검색
    const includeKw = ['빌딩','상가','오피스','상업용','근린생활','업무용','꼬마빌딩','공실률','임대료','권리금','리테일','수익형','상권','매물','평당가','연면적','대지면적','캡레이트','NOI'];
    const excludeKw = ['아파트','주택','전세','월세','청약','입주','모델하우스','분양권','래미안','자이','힐스테이트','푸르지오','국회','여당','야당','탄핵','선거','의원','정당','후보','검찰','경찰','수사','재판','판결','구속','기소','피의자','범죄','살인','폭행','성범죄','마약','주가','코스피','코스닥','환율','기준금리','한은','연준','ETF','삼성전자','SK하이닉스','반도체','배터리','자동차','K-POP','축구','야구','올림픽'];
    const sourceMap: Record<string, string> = { 'mk.co.kr':'매일경제','hankyung.com':'한국경제','sedaily.com':'서울경제','mt.co.kr':'머니투데이','edaily.co.kr':'이데일리','newsis.com':'뉴시스','yna.co.kr':'연합뉴스','chosun.com':'조선일보','donga.com':'동아일보','hani.co.kr':'한겨레','khan.co.kr':'경향신문','joongang.co.kr':'중앙일보','dt.co.kr':'디지털타임스','biz.chosun.com':'조선비즈','asiae.co.kr':'아시아경제','fnnews.com':'파이낸셜뉴스','heraldcorp.com':'헤럴드경제','etoday.co.kr':'이투데이' };

    function cleanHtml(t: string) { return (t || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'"); }
    function getSource(link: string) { try { const h = new URL(link).hostname.replace('www.', ''); for (const [d, n] of Object.entries(sourceMap)) { if (h.includes(d)) return n; } return h; } catch { return '뉴스'; } }
    function fmtDate(pd: string) { const d = new Date(pd); return d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0'); }

    const learnedUrls = new Set(learned.map(a => a.url));
    const seen = new Set<string>();
    const allResults: any[] = [];
    const now = Date.now();

    for (const kw of keywords) {
      try {
        const resp = await axios.get('https://openapi.naver.com/v1/search/news.json', {
          params: { query: kw, display: 100, start: 1, sort: 'date' },
          headers: { 'X-Naver-Client-Id': naverId, 'X-Naver-Client-Secret': naverSecret },
          timeout: 5000
        });
        for (const item of (resp.data.items || [])) {
          const link = item.link || '';
          if (!link.includes('news.naver.com') && !link.includes('n.news.naver.com')) continue;
          if (seen.has(link)) continue;
          const diffDays = (now - new Date(item.pubDate).getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 7) continue;
          const title = cleanHtml(item.title);
          const desc = cleanHtml(item.description);
          const combined = title + ' ' + desc;
          const hasInclude = includeKw.some(k => title.includes(k));
          const hasExclude = excludeKw.some(k => combined.includes(k));
          if (!hasInclude || hasExclude) continue;
          if (learnedUrls.has(link) || learnedUrls.has(item.originallink)) continue;
          seen.add(link);
          const tag = kw.replace(' 빌딩', '').replace('빌딩 ', '').replace('서울 상업용 부동산 매매', '서울');
          allResults.push({
            title, url: link, originalUrl: item.originallink || '',
            source: getSource(item.originallink || link),
            date: fmtDate(item.pubDate),
            description: cleanHtml(item.description),
            matchedTags: [tag].slice(0, 3),
            _ts: new Date(item.pubDate).getTime()
          });
        }
      } catch { /* skip keyword */ }
    }

    allResults.sort((a, b) => b._ts - a._ts);
    res.json({ articles: allResults.map(({ _ts, ...r }) => r) });
  } catch (err: any) {
    console.error('[뉴스 추천] 에러:', err.message);
    res.json({ articles: [], error: err.message });
  }
});

// ─── 학습 자료 API ───
const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 }, fileFilter: (_req, file, cb) => { file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('PDF 파일만 업로드 가능합니다')); } });

app.get('/api/learn/articles', (_req: Request, res: Response) => {
  const articles = getArticles();
  const stats = getArticleStats();
  res.json({ articles, ...stats });
});

app.post('/api/learn/add', async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) return res.status(400).json({ error: 'URL 목록이 필요합니다.' });
    const result = await addArticlesFromUrls(urls);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/learn/upload-pdf', (req: Request, res: Response, next: any) => {
  pdfUpload.array('files', 10)(req, res, (err: any) => {
    if (err) {
      console.error('[PDF 업로드] multer 에러:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    const files = (req as any).files as { originalname: string; buffer: Buffer }[];
    console.log('[PDF 업로드] 파일 수:', files ? files.length : 0);
    if (!files || files.length === 0) return res.status(400).json({ error: '파일이 필요합니다.' });
    files.forEach((f, i) => console.log('[PDF 업로드] 파일', i, ':', f.originalname, f.buffer.length, 'bytes'));
    const result = await addArticlesFromPdf(files);
    console.log('[PDF 업로드] 완료:', result.added, '추가,', result.failed, '실패');
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[PDF 업로드] 처리 에러:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/learn/articles/:id', (req: Request, res: Response) => {
  const remaining = deleteArticle(req.params.id);
  res.json({ success: true, remaining });
});

// ─── 카카오맵 서버 캡처 API (puppeteer-core) ───
import puppeteer from 'puppeteer-core';

function findChromePath(): string | null {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  return null;
}

app.post('/api/content/capture-map', async (req: Request, res: Response) => {
  let browser: any = null;
  try {
    const { region } = req.body;
    if (!region) return res.json({ error: '지역명이 없습니다' });

    // 좌표 가져오기
    const cached = findRegionFromCache(region);
    let coords = cached;
    if (!coords && process.env.KAKAO_REST_API_KEY) {
      try {
        const kakaoRes = await axios.get('https://dapi.kakao.com/v2/local/search/keyword.json', {
          params: { query: region },
          headers: { 'Authorization': 'KakaoAK ' + process.env.KAKAO_REST_API_KEY },
          timeout: 5000
        });
        const doc = kakaoRes.data?.documents?.[0];
        if (doc) coords = { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
      } catch {}
    }
    if (!coords) return res.json({ error: '지역 좌표를 찾을 수 없습니다' });

    const chromePath = findChromePath();
    if (!chromePath) return res.json({ error: 'Chrome 브라우저를 찾을 수 없습니다' });

    const KAKAO_JS_KEY = process.env.KAKAO_JS_API_KEY;
    if (!KAKAO_JS_KEY) return res.json({ error: 'KAKAO_JS_API_KEY 미설정' });

    const mapHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false"></script>
<style>*{margin:0;padding:0}body{width:1080px;height:1080px;overflow:hidden}#map{width:1080px;height:1080px}</style>
</head><body><div id="map"></div><script>
kakao.maps.load(function(){
  var map=new kakao.maps.Map(document.getElementById('map'),{center:new kakao.maps.LatLng(${coords.lat},${coords.lng}),level:4});
  new kakao.maps.Marker({position:new kakao.maps.LatLng(${coords.lat},${coords.lng})}).setMap(map);
  new kakao.maps.Circle({center:new kakao.maps.LatLng(${coords.lat},${coords.lng}),radius:500,strokeWeight:3,strokeColor:'#2C4A7C',strokeOpacity:0.9,fillColor:'#2C4A7C',fillOpacity:0.12}).setMap(map);
  kakao.maps.event.addListener(map,'tilesloaded',function(){window.__MAP_READY__=true});
});
</script></body></html>`;

    console.log('[카카오맵] puppeteer 브라우저 시작:', chromePath);
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new' as any,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--window-size=1080,1080']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080 });
    await page.setExtraHTTPHeaders({ 'Referer': 'http://localhost:3000' });
    await page.setContent(mapHtml, { waitUntil: 'networkidle0', timeout: 20000 });

    console.log('[카카오맵] 타일 로딩 대기 중...');
    await page.waitForFunction('window.__MAP_READY__ === true', { timeout: 15000 })
      .catch(() => console.log('[카카오맵] 타일 타임아웃, 그래도 캡처 시도'));
    await new Promise(r => setTimeout(r, 2000));

    console.log('[카카오맵] 스크린샷 캡처 중...');
    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      clip: { x: 0, y: 0, width: 1080, height: 1080 }
    });

    await browser.close();
    browser = null;
    console.log('[카카오맵] 캡처 성공, 크기:', (screenshot as string).length);
    res.json({ imageBase64: screenshot });
  } catch (e: any) {
    console.error('[카카오맵] 캡처 에러:', e.message);
    if (browser) { try { await browser.close(); } catch {} }
    res.json({ error: e.message });
  }
});

// ─── 챗봇 API ───
app.post('/api/chatbot', async (req: Request, res: Response) => {
  const { message, userId, userName } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: '메시지를 입력해 주세요.' });
  }

  try {
    const reply = await handleChatbotMessage(message);

    // 답변 내용으로 AI해결 / 직접 문의 판단
    const unresolvedKeywords = [
      '규정에 명시되어 있지 않',
      '규정에 없습니다',
      '확인이 필요',
      '관리자에게 문의',
      '상담원에게 문의',
      '알 수 없습니다',
      '파악이 어렵',
      '일시적인 오류',
      '답변할 수 없',
      '정보가 없',
      '그에 대한 규정은 없',
      '해당 내용은 현재 규정에',
    ];
    const isUnresolved = unresolvedKeywords.some(keyword => reply.includes(keyword));
    const status: '직접 문의' | 'AI해결' = isUnresolved ? '직접 문의' : 'AI해결';

    // 상담 기록 저장
    const record: ChatRecord = {
      id: crypto.randomUUID(),
      userId: userId || 'anonymous',
      userName: userName || '익명',
      question: message.trim(),
      answer: reply,
      status,
      timestamp: new Date().toISOString(),
    };
    await addRecord(record);

    res.json({ reply, recordId: record.id, status: record.status });
  } catch (err) {
    console.error('챗봇 오류:', err);
    res.status(500).json({ error: '죄송합니다. 일시적인 오류가 발생했습니다.' });
  }
});

// ─── 추천 질문 API (빈도 기반) ───
app.get('/api/chatbot/top-questions', async (_req: Request, res: Response) => {
  const questions = await getTopQuestions(5);
  res.json({ questions });
});

// ═══ 관리자 API ═══

// 상담 기록 조회
app.get('/api/admin/records', async (req: Request, res: Response) => {
  let records = await getRecords();
  const userId = req.query.userId as string;
  if (userId) {
    records = records.filter(r => r.userId === userId);
  }
  res.json(records);
});

// 상담 상태 변경
app.put('/api/admin/records/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  if (status !== 'AI해결' && status !== '직접 문의' && status !== '오류') {
    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  }
  await updateRecordStatus(req.params.id, status);
  res.json({ success: true });
});

// 오류 신고 — 기존 레코드를 오류로 업데이트
app.put('/api/admin/records/:id/report-error', async (req: Request, res: Response) => {
  try {
    const { errorNote } = req.body;
    if (!errorNote) return res.status(400).json({ error: '오류 내용 필요' });
    const ref = firestore.collection('records').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: '기록을 찾을 수 없습니다' });
    const existing = doc.data()!;
    await ref.update({
      status: '오류',
      answer: (existing.answer || '') + '\n\n[오류 신고] ' + errorNote
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 규정 초안 조회
app.get('/api/admin/drafts', async (_req: Request, res: Response) => {
  res.json(await getRuleDrafts());
});

// 규정 초안 추가
app.post('/api/admin/drafts', async (req: Request, res: Response) => {
  const { section, itemNumber, action, content, reason, updatedBy } = req.body;
  const draft: RuleDraft = {
    id: crypto.randomUUID(),
    section,
    itemNumber: itemNumber || 'new',
    action,
    content,
    reason: reason || '',
    updatedBy: updatedBy || '알 수 없음',
    timestamp: new Date().toISOString(),
    applied: false,
  };
  await addRuleDraft(draft);
  res.json({ success: true, draft });
});

// 규정 초안 수정
app.put('/api/admin/drafts/:id', async (req: Request, res: Response) => {
  const updated = await updateRuleDraft(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json({ success: true });
});

// 규정 초안 삭제
app.delete('/api/admin/drafts/:id', async (req: Request, res: Response) => {
  await deleteRuleDraft(req.params.id);
  res.json({ success: true });
});

// 규정 초안 일괄 적용
app.post('/api/admin/drafts/apply', async (_req: Request, res: Response) => {
  const drafts = (await getRuleDrafts()).filter(d => !d.applied);
  if (drafts.length === 0) {
    return res.json({ success: true, applied: 0 });
  }

  let rules = await loadRulesFile();

  for (const draft of drafts) {
    const sectionHeader = `# ${draft.section}`;
    const sectionIdx = rules.indexOf(sectionHeader);
    if (sectionIdx === -1 && draft.action !== '추가') continue;

    const afterHeader = sectionIdx + sectionHeader.length;
    const nextSectionIdx = rules.indexOf('\n# ', afterHeader);
    const sectionEnd = nextSectionIdx === -1 ? rules.length : nextSectionIdx;
    let sectionContent = rules.slice(afterHeader, sectionEnd);

    if (draft.action === '수정' && draft.itemNumber !== 'new') {
      const itemRegex = new RegExp(`^${draft.itemNumber}\\. .+$`, 'm');
      if (itemRegex.test(sectionContent)) {
        sectionContent = sectionContent.replace(itemRegex, `${draft.itemNumber}. ${draft.content}`);
      }
    } else if (draft.action === '추가') {
      const lines = sectionContent.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const lastNumMatch = lastLine.match(/^(\d+)\./);
      const nextNum = lastNumMatch ? parseInt(lastNumMatch[1]) + 1 : 1;
      sectionContent = sectionContent.trimEnd() + `\n${nextNum}. ${draft.content}\n`;
    } else if (draft.action === '삭제' && draft.itemNumber !== 'new') {
      const itemRegex = new RegExp(`^${draft.itemNumber}\\. .+\n?`, 'm');
      sectionContent = sectionContent.replace(itemRegex, '');
    }

    rules = rules.slice(0, afterHeader) + sectionContent + rules.slice(sectionEnd);
  }

  await saveRulesFile(rules);
  await markDraftsApplied(drafts.map(d => d.id));

  res.json({ success: true, applied: drafts.length });
});

// 현재 규정 조회
app.get('/api/admin/rules', async (_req: Request, res: Response) => {
  res.json({ content: await loadRulesFile() });
});

// 규정 직접 수정 (섹션별 또는 전체)
app.post('/api/admin/rules/update', async (req: Request, res: Response) => {
  const { content } = req.body;
  if (typeof content !== 'string') {
    return res.status(400).json({ error: '내용이 필요합니다.' });
  }
  await saveRulesFile(content);
  res.json({ success: true });
});

// 섹션 추가
app.post('/api/admin/rules/section', async (req: Request, res: Response) => {
  const { sectionName, updatedBy } = req.body;
  if (!sectionName || typeof sectionName !== 'string') {
    return res.status(400).json({ error: '섹션 이름이 필요합니다.' });
  }
  let rules = await loadRulesFile();
  rules = rules.trimEnd() + '\n\n# ' + sectionName.trim() + '\n';
  await saveRulesFile(rules);
  await addRuleDraft({
    id: crypto.randomUUID(),
    section: sectionName.trim(),
    itemNumber: '',
    action: '추가',
    content: '새 섹션 생성',
    reason: '섹션 추가',
    timestamp: new Date().toISOString(),
    applied: false,
    updatedBy: updatedBy || '알 수 없음',
  });
  res.json({ success: true });
});

// 섹션 삭제
app.delete('/api/admin/rules/section/:sectionName', async (req: Request, res: Response) => {
  const sectionName = decodeURIComponent(req.params.sectionName);
  const updatedBy = req.body?.updatedBy || '알 수 없음';
  let rules = await loadRulesFile();
  const header = '# ' + sectionName;
  const idx = rules.indexOf(header);
  if (idx === -1) {
    return res.status(404).json({ error: '섹션을 찾을 수 없습니다.' });
  }
  const nextIdx = rules.indexOf('\n# ', idx + header.length);
  const end = nextIdx === -1 ? rules.length : nextIdx;
  const start = idx > 0 && rules[idx - 1] === '\n' ? idx - 1 : idx;
  rules = rules.slice(0, start) + rules.slice(end);
  await saveRulesFile(rules);
  await addRuleDraft({
    id: crypto.randomUUID(),
    section: sectionName,
    itemNumber: '',
    action: '삭제',
    content: '섹션 전체 삭제',
    reason: '섹션 삭제',
    timestamp: new Date().toISOString(),
    applied: false,
    updatedBy,
  });
  res.json({ success: true });
});

// ─── 행정구역 데이터 ───
let regionData: any = {};
try {
  const regionPath = path.join(__dirname, '..', 'data', 'region_codes.json');
  regionData = JSON.parse(fs.readFileSync(regionPath, 'utf-8'));
  console.log('[행정구역] region_codes.json 로드 완료');
} catch (e: any) {
  console.error('[행정구역] region_codes.json 로드 실패:', e.message);
}

app.get('/api/regions', (_req: Request, res: Response) => {
  res.json(regionData);
});

// ─── 실거래가 테스트 ───
app.get('/api/transaction/test', async (req: Request, res: Response) => {
  try {
    const { sggCd, dealYm } = req.query;
    if (!sggCd || !dealYm) {
      return res.status(400).json({ error: 'sggCd와 dealYm이 필요합니다' });
    }
    const data = await getTransactions(String(sggCd), String(dealYm));
    res.json({
      sggCd,
      dealYm,
      count: data.length,
      sample: data.slice(0, 3),
      fromDB: true,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 실거래가 디버그 ───
app.get('/api/transaction/debug', async (req: Request, res: Response) => {
  try {
    const sggCd = String(req.query.sggCd || '');
    const dealYm = String(req.query.dealYm || '');
    if (!sggCd || !dealYm) return res.status(400).json({ error: 'sggCd, dealYm 필요' });

    // 1) API 원본 데이터 직접 호출
    const apiKey = process.env.MOLIT_API_KEY;
    const baseUrl = 'http://apis.data.go.kr/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade';
    const params = new URLSearchParams({
      serviceKey: apiKey || '',
      LAWD_CD: sggCd,
      DEAL_YMD: dealYm,
      pageNo: '1',
      numOfRows: '1000',
    });
    const resp = await fetch(`${baseUrl}?${params.toString()}`);
    const xmlText = await resp.text();
    const { XMLParser } = require('fast-xml-parser');
    const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
    const result = parser.parse(xmlText);
    const body = result?.response?.body;
    const rawItems = body?.items?.item;
    const apiItems: any[] = !rawItems ? [] : Array.isArray(rawItems) ? rawItems : [rawItems];

    // buildingType 분류
    const typeCount: any = {};
    apiItems.forEach((t: any) => {
      const bt = String(t.buildingType || '(없음)').trim();
      typeCount[bt] = (typeCount[bt] || 0) + 1;
    });

    // umd_nm별 건수
    const umdCount: any = {};
    apiItems.forEach((t: any) => {
      const umd = String(t.umdNm || '(없음)').trim();
      umdCount[umd] = (umdCount[umd] || 0) + 1;
    });

    // cdeal_day 유무
    const cancelCount = apiItems.filter((t: any) => t.cdealDay && String(t.cdealDay).trim() !== '').length;

    // 2) DB 저장 데이터
    const dbData = db.prepare('SELECT * FROM transactions WHERE sgg_cd = ? AND deal_ym = ?').all(sggCd, dealYm) as any[];
    const dbUmdCount: any = {};
    dbData.forEach((t: any) => {
      const umd = t.umd_nm || '(없음)';
      dbUmdCount[umd] = (dbUmdCount[umd] || 0) + 1;
    });
    const dbCancelCount = dbData.filter((t: any) => t.cdeal_day && t.cdeal_day.trim() !== '').length;

    // fetch_log
    const log = db.prepare('SELECT * FROM fetch_log WHERE sgg_cd = ? AND deal_ym = ?').get(sggCd, dealYm);

    res.json({
      api: {
        totalCount: body?.totalCount || 0,
        itemCount: apiItems.length,
        buildingTypeBreakdown: typeCount,
        umdBreakdown: umdCount,
        cancelCount,
        items: apiItems.map((t: any) => ({
          umdNm: t.umdNm, jibun: t.jibun, buildingType: t.buildingType,
          buildingUse: t.buildingUse, dealAmount: t.dealAmount,
          dealYear: t.dealYear, dealMonth: t.dealMonth, dealDay: t.dealDay,
          cdealDay: t.cdealDay, buildYear: t.buildYear,
          buildingAr: t.buildingAr, plottageAr: t.plottageAr
        }))
      },
      db: {
        count: dbData.length,
        umdBreakdown: dbUmdCount,
        cancelCount: dbCancelCount
      },
      fetchLog: log
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── 실거래가 통계 계산 ───
function calculateStats(transactions: any[], prevTransactions: any[]) {
  const valid = transactions.filter((t: any) => !t.cdeal_day || t.cdeal_day.trim() === '');
  const prevValid = prevTransactions.filter((t: any) => !t.cdeal_day || t.cdeal_day.trim() === '');
  const totalCount = valid.length;
  const cancelCount = transactions.length - valid.length;

  const avgPrice = totalCount > 0
    ? Math.round(valid.reduce((s: number, t: any) => s + t.deal_amount, 0) / totalCount)
    : 0;

  const validPyeong = valid.filter((t: any) => t.plottage_ar && t.plottage_ar > 0);
  const avgPricePerPyeong = validPyeong.length > 0
    ? Math.round(validPyeong.reduce((s: number, t: any) => s + (t.deal_amount / t.plottage_ar * 3.3058), 0) / validPyeong.length)
    : 0;

  const validArea = valid.filter((t: any) => t.building_ar && t.building_ar > 0);
  const avgPricePerArea = validArea.length > 0
    ? Math.round(validArea.reduce((s: number, t: any) => s + (t.deal_amount / t.building_ar * 3.3058), 0) / validArea.length)
    : 0;

  const prevCount = prevValid.length;

  // 전기 평균 매매가
  const prevAvgPrice = prevCount > 0
    ? Math.round(prevValid.reduce((s: number, t: any) => s + t.deal_amount, 0) / prevCount)
    : 0;

  // 전기 토지 평당가
  const prevPyeong = prevValid.filter((t: any) => t.plottage_ar > 0);
  const prevAvgPP = prevPyeong.length > 0
    ? Math.round(prevPyeong.reduce((s: number, t: any) => s + (t.deal_amount / t.plottage_ar * 3.3058), 0) / prevPyeong.length)
    : 0;

  // 전기 연면적 평당가
  const prevArea = prevValid.filter((t: any) => t.building_ar && t.building_ar > 0);
  const prevAvgPA = prevArea.length > 0
    ? Math.round(prevArea.reduce((s: number, t: any) => s + (t.deal_amount / t.building_ar * 3.3058), 0) / prevArea.length)
    : 0;

  const volumeChange = prevCount > 0 ? Math.round((totalCount - prevCount) / prevCount * 100) : 0;
  const priceChange = prevAvgPP > 0 ? Math.round((avgPricePerPyeong - prevAvgPP) / prevAvgPP * 100) : 0;
  const avgPriceChange = prevAvgPrice > 0 ? Math.round((avgPrice - prevAvgPrice) / prevAvgPrice * 100) : 0;
  const areaChange = prevAvgPA > 0 ? Math.round((avgPricePerArea - prevAvgPA) / prevAvgPA * 100) : 0;

  const buyerCorp = valid.filter((t: any) => t.buyer_gbn === '법인').length;
  const buyerPersonal = valid.filter((t: any) => t.buyer_gbn === '개인').length;
  const sellerCorp = valid.filter((t: any) => t.sler_gbn === '법인').length;
  const sellerPersonal = valid.filter((t: any) => t.sler_gbn === '개인').length;

  const byDong: any = {};
  valid.forEach((t: any) => {
    const dong = t.umd_nm || '기타';
    if (!byDong[dong]) byDong[dong] = { count: 0, totalAmount: 0, totalPP: 0, ppCount: 0 };
    byDong[dong].count++;
    byDong[dong].totalAmount += t.deal_amount;
    if (t.plottage_ar > 0) {
      byDong[dong].totalPP += t.deal_amount / t.plottage_ar * 3.3058;
      byDong[dong].ppCount++;
    }
  });

  const byUse: any = {};
  valid.forEach((t: any) => { const u = t.building_use || '기타'; byUse[u] = (byUse[u] || 0) + 1; });

  const byMonth: any = {};
  valid.forEach((t: any) => {
    const ym = t.deal_year + '.' + String(t.deal_month).padStart(2, '0');
    if (!byMonth[ym]) byMonth[ym] = { count: 0, totalAmount: 0 };
    byMonth[ym].count++;
    byMonth[ym].totalAmount += t.deal_amount;
  });

  const byBuildYear: any = { '~1990': 0, '1990~2000': 0, '2000~2010': 0, '2010~2020': 0, '2020~': 0 };
  valid.forEach((t: any) => {
    const y = parseInt(t.build_year);
    if (!y) return;
    if (y < 1990) byBuildYear['~1990']++;
    else if (y < 2000) byBuildYear['1990~2000']++;
    else if (y < 2010) byBuildYear['2000~2010']++;
    else if (y < 2020) byBuildYear['2010~2020']++;
    else byBuildYear['2020~']++;
  });

  const byLandUse: any = {};
  valid.forEach((t: any) => { const lu = t.land_use || '기타'; byLandUse[lu] = (byLandUse[lu] || 0) + 1; });

  const jibunCount: any = {};
  valid.forEach((t: any) => {
    if (!t.jibun || !t.umd_nm) return;
    const key = t.umd_nm + ' ' + t.jibun;
    jibunCount[key] = (jibunCount[key] || 0) + 1;
  });
  const reTrades = Object.entries(jibunCount)
    .filter(([_, count]) => (count as number) >= 2)
    .map(([key, count]) => ({ location: key, count }));

  let highest: any = null, lowest: any = null;
  validPyeong.forEach((t: any) => {
    const pp = t.deal_amount / t.plottage_ar * 3.3058;
    if (!highest || pp > highest.pricePerPyeong) highest = { ...t, pricePerPyeong: Math.round(pp) };
    if (!lowest || pp < lowest.pricePerPyeong) lowest = { ...t, pricePerPyeong: Math.round(pp) };
  });

  const now = new Date();
  const currentYm = formatYm(now);
  const hasCurrentMonth = valid.some((t: any) => t.deal_ym === currentYm);

  return {
    totalCount, cancelCount, avgPrice, avgPricePerPyeong, avgPricePerArea,
    prevPeriodChange: { volume: volumeChange, price: priceChange, avgPrice: avgPriceChange, area: areaChange, hasPrev: prevCount > 0 },
    buyer: {
      corp: { count: buyerCorp, ratio: totalCount > 0 ? Math.round(buyerCorp / totalCount * 100) : 0 },
      personal: { count: buyerPersonal, ratio: totalCount > 0 ? Math.round(buyerPersonal / totalCount * 100) : 0 }
    },
    seller: {
      corp: { count: sellerCorp, ratio: totalCount > 0 ? Math.round(sellerCorp / totalCount * 100) : 0 },
      personal: { count: sellerPersonal, ratio: totalCount > 0 ? Math.round(sellerPersonal / totalCount * 100) : 0 }
    },
    byDong, byUse, byMonth, byBuildYear, byLandUse, reTrades, highest, lowest,
    isCurrentMonthIncluded: hasCurrentMonth
  };
}

// ─── 실거래가 조회 API ───
app.get('/api/transaction/query', async (req: Request, res: Response) => {
  try {
    const regionsStr = String(req.query.regions || '');
    const months = parseInt(String(req.query.months || '6'));
    const startMonth = req.query.startMonth ? String(req.query.startMonth) : null;
    const endMonth = req.query.endMonth ? String(req.query.endMonth) : null;
    const dong = req.query.dong ? String(req.query.dong) : null;

    if (!regionsStr) return res.status(400).json({ error: 'regions 파라미터가 필요합니다' });
    const regions = regionsStr.split(',').slice(0, 3);

    // 기간 계산
    let ymList: string[] = [];
    let prevYmList: string[] = [];
    const now = new Date();

    if (startMonth && endMonth) {
      const sy = parseInt(startMonth.substring(0, 4)), sm = parseInt(startMonth.substring(4, 6)) - 1;
      const ey = parseInt(endMonth.substring(0, 4)), em = parseInt(endMonth.substring(4, 6)) - 1;
      const s = new Date(sy, sm); const e = new Date(ey, em);
      for (let d = new Date(s); d <= e; d.setMonth(d.getMonth() + 1)) ymList.push(formatYm(d));
      const span = ymList.length;
      for (let i = span; i < span * 2; i++) {
        const pd = new Date(sy, sm - (i - span + 1) - (span - 1));
        pd.setMonth(pd.getMonth() + (span - 1));
        prevYmList.push(formatYm(new Date(sy, sm - i)));
      }
      // Recalculate prevYmList properly
      prevYmList = [];
      for (let i = 0; i < span; i++) {
        prevYmList.push(formatYm(new Date(sy, sm - span + i)));
      }
    } else {
      for (let i = 0; i < months; i++) {
        ymList.push(formatYm(new Date(now.getFullYear(), now.getMonth() - i, 1)));
      }
      for (let i = months; i < months * 2; i++) {
        prevYmList.push(formatYm(new Date(now.getFullYear(), now.getMonth() - i, 1)));
      }
    }

    // 지역명 매핑
    const sggNameMap: any = {};
    for (const sido of Object.values(regionData) as any[]) {
      for (const [sggName, sggInfo] of Object.entries(sido) as any[]) {
        sggNameMap[sggInfo.code] = sggName;
      }
    }

    const results: any[] = [];
    for (const sggCd of regions) {
      let allTx: any[] = [];
      let prevTx: any[] = [];

      for (const ym of ymList) {
        const data = await getTransactions(sggCd, ym);
        allTx.push(...data);
      }
      for (const ym of prevYmList) {
        const data = await getTransactions(sggCd, ym);
        prevTx.push(...data);
      }

      if (dong) {
        allTx = allTx.filter((t: any) => t.umd_nm && t.umd_nm.includes(dong));
        prevTx = prevTx.filter((t: any) => t.umd_nm && t.umd_nm.includes(dong));
      }

      const stats = calculateStats(allTx, prevTx);
      results.push({
        sggCd,
        sggNm: sggNameMap[sggCd] || sggCd,
        dongFilter: dong,
        transactions: allTx,
        stats
      });
    }

    res.json({ results });
  } catch (e: any) {
    console.error('[실거래가 조회 오류]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── 실거래가 랭킹 API ───
app.get('/api/transaction/ranking', async (req: Request, res: Response) => {
  try {
    const sido = String(req.query.sido || '전국');
    const months = parseInt(String(req.query.months || '6'));
    const sortBy = String(req.query.sortBy || 'totalCount');
    const sgg = req.query.sgg ? String(req.query.sgg) : null;
    const startMonth = req.query.startMonth ? String(req.query.startMonth) : null;
    const endMonth = req.query.endMonth ? String(req.query.endMonth) : null;

    const now = new Date();
    const ymList: string[] = [];
    const prevYmList: string[] = [];

    if (startMonth && endMonth) {
      const sy = parseInt(startMonth.substring(0, 4)), sm = parseInt(startMonth.substring(4, 6)) - 1;
      const ey = parseInt(endMonth.substring(0, 4)), em = parseInt(endMonth.substring(4, 6)) - 1;
      for (let d = new Date(sy, sm); d <= new Date(ey, em); d.setMonth(d.getMonth() + 1)) {
        ymList.push(formatYm(new Date(d)));
      }
      for (let i = 0; i < ymList.length; i++) {
        prevYmList.push(formatYm(new Date(sy - 1, sm + i, 1)));
      }
    } else {
      for (let i = 0; i < months; i++) {
        ymList.push(formatYm(new Date(now.getFullYear(), now.getMonth() - i, 1)));
      }
      for (let i = 0; i < months; i++) {
        prevYmList.push(formatYm(new Date(now.getFullYear() - 1, now.getMonth() - i, 1)));
      }
    }

    const sortFn = (a: any, b: any) => {
      if (sortBy === 'avgPricePerPyeong') return b.stats.avgPricePerPyeong - a.stats.avgPricePerPyeong;
      if (sortBy === 'avgPrice') return b.stats.avgPrice - a.stats.avgPrice;
      if (sortBy === 'avgPricePerArea') return b.stats.avgPricePerArea - a.stats.avgPricePerArea;
      return b.stats.totalCount - a.stats.totalCount;
    };

    // ─── 전국 모드: 시/도별 랭킹 ───
    if (sido === '전국') {
      const sidoEntries = Object.entries(regionData as any);
      const sidoRanking: any[] = [];

      for (let si = 0; si < sidoEntries.length; si += 2) {
        const sidoBatch = sidoEntries.slice(si, si + 2);
        const batchResults = await Promise.all(sidoBatch.map(async ([sidoName, sidoObj]) => {
          const sggEntries = Object.entries(sidoObj as any) as [string, any][];
          let allTx: any[] = [];
          let prevTx: any[] = [];

          for (const [, sggInfo] of sggEntries) {
            const sggCd = (sggInfo as any).code;
            for (const ym of ymList) { allTx.push(...await getTransactions(sggCd, ym)); }
            for (const ym of prevYmList) { prevTx.push(...await getTransactions(sggCd, ym)); }
          }

          const stats = calculateStats(allTx, prevTx);
          return { name: sidoName, stats };
        }));
        sidoRanking.push(...batchResults);
      }

      sidoRanking.sort(sortFn);

      res.json({
        type: 'sido',
        sido: '전국',
        period: { start: ymList[ymList.length - 1], end: ymList[0] },
        prevPeriod: { start: prevYmList[prevYmList.length - 1], end: prevYmList[0] },
        ranking: sidoRanking
      });
      return;
    }

    // ─── 시/도 선택 모드 ───
    const sidoData = (regionData as any)[sido];
    if (!sidoData) return res.status(400).json({ error: '유효하지 않은 시/도입니다' });

    // ─── 특정 구 선택 → 동별 랭킹 ───
    if (sgg && sidoData[sgg]) {
      const sggInfo = sidoData[sgg];
      const sggCd = sggInfo.code;

      let allTx: any[] = [];
      let prevTx: any[] = [];
      for (const ym of ymList) { allTx.push(...await getTransactions(sggCd, ym)); }
      for (const ym of prevYmList) { prevTx.push(...await getTransactions(sggCd, ym)); }

      const fullStats = calculateStats(allTx, prevTx);

      const dongs = sggInfo.dongs || [];
      const dongRanking: any[] = [];

      for (const dong of dongs) {
        const dongTx = allTx.filter((t: any) => t.umd_nm && t.umd_nm.includes(dong));
        const dongPrevTx = prevTx.filter((t: any) => t.umd_nm && t.umd_nm.includes(dong));
        if (dongTx.length === 0) continue;
        const dongStats = calculateStats(dongTx, dongPrevTx);
        dongRanking.push({
          name: dong,
          sggCd,
          sggNm: sgg,
          stats: dongStats,
          transactions: dongTx
        });
      }

      dongRanking.sort(sortFn);

      res.json({
        type: 'dong',
        sido,
        sgg,
        period: { start: ymList[ymList.length - 1], end: ymList[0] },
        prevPeriod: { start: prevYmList[prevYmList.length - 1], end: prevYmList[0] },
        fullStats,
        ranking: dongRanking
      });
      return;
    }

    // ─── 전체 구 → 구별 랭킹 (3개씩 순차 병렬) ───
    const sggEntries = Object.entries(sidoData) as [string, any][];
    const ranking: any[] = [];

    for (let i = 0; i < sggEntries.length; i += 3) {
      const batch = sggEntries.slice(i, i + 3);
      const results = await Promise.all(batch.map(async ([sggName, sggInfo]: [string, any]) => {
        const sggCd = sggInfo.code;
        let allTx: any[] = [];
        let prevTx: any[] = [];

        for (const ym of ymList) { allTx.push(...await getTransactions(sggCd, ym)); }
        for (const ym of prevYmList) { prevTx.push(...await getTransactions(sggCd, ym)); }

        const stats = calculateStats(allTx, prevTx);
        return {
          name: sggName,
          sggCd,
          stats,
          transactions: allTx
        };
      }));
      ranking.push(...results);
    }

    ranking.sort(sortFn);

    res.json({
      type: 'sgg',
      sido,
      period: { start: ymList[ymList.length - 1], end: ymList[0] },
      prevPeriod: { start: prevYmList[prevYmList.length - 1], end: prevYmList[0] },
      ranking
    });
  } catch (e: any) {
    console.error('[랭킹 API 오류]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── 네이버 뉴스 검색 ───
async function searchNaverNews(query: string, count: number = 5): Promise<{ title: string; description: string; url: string }[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];
  try {
    const resp = await axios.get('https://openapi.naver.com/v1/search/news.json', {
      params: { query, display: count, sort: 'date' },
      headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret },
      timeout: 5000
    });
    return (resp.data.items || []).map((item: any) => ({
      title: (item.title || '').replace(/<[^>]*>/g, ''),
      description: (item.description || '').replace(/<[^>]*>/g, ''),
      url: item.originallink || item.link || ''
    }));
  } catch (e: any) {
    console.log('[네이버 뉴스] 검색 실패:', e.message);
    return [];
  }
}

// ─── Brave Search 헬퍼 ───
async function searchBrave(query: string, count: number = 3): Promise<{ title: string; description: string; url: string }[]> {
  const braveKey = process.env.BRAVE_API_KEY;
  if (!braveKey) return [];
  try {
    const resp = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: { q: query, count, search_lang: 'ko' },
      headers: { 'X-Subscription-Token': braveKey, 'Accept': 'application/json' },
      timeout: 5000
    });
    return (resp.data.web?.results || []).map((item: any) => ({
      title: item.title || '',
      description: item.description || '',
      url: item.url || ''
    }));
  } catch (e: any) {
    console.log('[Brave Search] 실패:', e.message);
    return [];
  }
}

async function searchTransactionNews(regionName: string, transactions: any[]): Promise<string> {
  if (!transactions || !transactions.length) return '';

  const notable = transactions
    .filter((t: any) => (!t.cdeal_day || t.cdeal_day.trim() === '') && t.deal_amount >= 100000)
    .sort((a: any, b: any) => b.deal_amount - a.deal_amount)
    .slice(0, 5);

  if (!notable.length) return '';

  const results: { tx: any; articles: { title: string; url: string; description: string }[] }[] = [];

  for (const tx of notable) {
    const dong = tx.umd_nm || '';
    const amountEok = Math.round(tx.deal_amount / 10000);
    const areaM2 = Math.round(tx.plottage_ar || 0);
    const amountStr = String(amountEok);
    const amountComma = amountEok >= 1000 ? amountEok.toLocaleString() : amountStr;

    let matched: { title: string; url: string; description: string }[] = [];

    // 1차: 네이버 뉴스 검색 (우선)
    const naverQueries = [
      `${regionName} ${dong} ${amountEok}억 매매`,
      `${dong} 빌딩 ${amountEok}억`,
      `${regionName} ${dong} 빌딩 매각`
    ];

    for (const query of naverQueries) {
      if (matched.length > 0) break;
      const articles = await searchNaverNews(query, 5);
      matched = articles.filter(a => {
        const text = (a.title + ' ' + a.description).replace(/,/g, '');
        const textOriginal = a.title + ' ' + a.description;
        return (text.includes(dong) || textOriginal.includes(dong)) && (
          text.includes(amountStr) ||
          textOriginal.includes(amountComma) ||
          text.includes(String(areaM2))
        );
      });
    }

    // 2차: 네이버에서 못 찾으면 Brave 검색 보조
    if (matched.length === 0) {
      const braveQueries = [
        `${regionName} ${dong} ${amountEok}억 매매 빌딩`,
        `${dong} 빌딩 매각 ${amountEok}억`
      ];
      for (const query of braveQueries) {
        if (matched.length > 0) break;
        const articles = await searchBrave(query, 5);
        matched = articles.filter(a => {
          const text = (a.title + ' ' + a.description).replace(/,/g, '');
          const textOriginal = a.title + ' ' + a.description;
          return (text.includes(dong) || textOriginal.includes(dong)) && (
            text.includes(amountStr) ||
            textOriginal.includes(amountComma) ||
            text.includes(String(areaM2))
          );
        });
      }
    }

    if (matched.length > 0) {
      results.push({ tx, articles: matched.slice(0, 2) });
      console.log(`[거래 뉴스 매칭] ${dong} ${amountEok}억 → ${matched.length}건 매칭 (${matched[0].url.includes('naver') ? '네이버' : '기타'})`);
    } else {
      console.log(`[거래 뉴스 매칭] ${dong} ${amountEok}억 → 매칭 없음`);
    }
  }

  if (!results.length) return '';

  let context = '\n\n[거래 관련 뉴스 — 아래 거래와 뉴스가 매칭됨. 리포트에 반드시 이 거래를 언급하고 뉴스 내용을 근거로 활용할 것]';
  results.forEach(r => {
    const dong = r.tx.umd_nm || '';
    const amountEok = Math.round(r.tx.deal_amount / 10000);
    context += `\n\n* 매칭 거래: ${dong} ${r.tx.jibun || ''} / ${amountEok}억 / 대지 ${r.tx.plottage_ar || 0}㎡ / 연면적 ${r.tx.building_ar || 0}㎡`;
    r.articles.forEach(a => {
      context += `\n  기사 제목: ${a.title}`;
      context += `\n  기사 내용: ${a.description}`;
      context += `\n  URL: ${a.url}`;
    });
  });

  return context;
}

async function searchMarketContext(regionNames: string[]): Promise<string> {
  if (!regionNames.length) return '';
  const results: string[] = [];

  // 네이버 뉴스 우선
  for (const name of regionNames.slice(0, 3)) {
    const articles = await searchNaverNews(name + ' 상업용 빌딩 시장', 3);
    articles.forEach(a => {
      results.push(`- ${a.title}: ${a.description} (${a.url})`);
    });
  }

  // 네이버 결과가 부족하면 Brave 보조
  if (results.length < 3) {
    for (const name of regionNames.slice(0, 2)) {
      const articles = await searchBrave(name + ' 상업용 부동산 시장 동향', 3);
      articles.forEach(a => {
        results.push(`- ${a.title}: ${a.description} (${a.url})`);
      });
    }
  }

  if (!results.length) return '';
  return '\n\n[최신 시장 동향]\n' + results.slice(0, 8).join('\n');
}

// ─── AI 인사이트 ───
app.post('/api/transaction/insight', async (req: Request, res: Response) => {
  try {
    const { regions } = req.body;
    if (!regions || !Array.isArray(regions)) return res.status(400).json({ error: 'regions 데이터 필요' });

    const regionNames = regions.map((r: any) => r.sggNm || r.name || '').filter(Boolean);

    // 병렬: 시장 동향 검색 + 거래 뉴스 검색
    const [marketContext, ...txNewsResults] = await Promise.all([
      searchMarketContext(regionNames),
      ...regions.map((r: any) => searchTransactionNews(r.sggNm || r.name || '', r.transactions || []))
    ]);
    const txNewsContext = txNewsResults.filter(Boolean).join('');

    const summary = regions.map((r: any) => {
      const s = r.stats;
      return `[${r.sggNm || r.name || ''}${r.dongFilter ? ' ' + r.dongFilter : ''}]\n거래건수: ${s.totalCount}건, 평균매매가: ${s.avgPrice}만원, 평당매매가: ${s.avgPricePerPyeong}만원\n법인매수: ${s.buyer.corp.ratio}%, 법인매도: ${s.seller.corp.ratio}%\n전년대비 거래량: ${s.prevPeriodChange.volume > 0 ? '+' : ''}${s.prevPeriodChange.volume}%, 전년대비 가격: ${s.prevPeriodChange.price > 0 ? '+' : ''}${s.prevPeriodChange.price}%`;
    }).join('\n\n');

    const OpenAI = require('openai');
    const openai = new OpenAI();
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [
        { role: 'system', content: `당신은 상업업무용 부동산(빌딩) 매매 시장 분석 전문가입니다.

[서식 규칙]
1. 4~5개 포인트로 작성
2. 각 포인트: ① [핵심 요약] → [원인 분석 1~2문장]
3. 마지막 포인트는 향후 전망
4. 마크다운 문법 금지

[분석 규칙]
- 전년대비 변동 항목은 반드시 원인을 분석해라
- 거래 관련 뉴스가 제공되면 해당 거래를 구체적으로 언급하고, 뉴스 내용을 근거로 활용해라
- 뉴스 URL이 제공되면 분석 마지막에 "참조:" 로 URL을 표시해라
- AI가 자동 생성한 티가 나는 정형화된 패턴을 피해라. 현장 브로커가 동료에게 브리핑하듯이 직접적이고 실무적인 톤으로 써라.` },
        { role: 'user', content: `다음 지역의 상업업무용 부동산 실거래 데이터를 분석해주세요:\n\n${summary}${txNewsContext}${marketContext}` }
      ]
    });

    res.json({ insight: resp.choices[0]?.message?.content || '' });
  } catch (e: any) {
    console.error('[AI 인사이트 오류]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── 리포트 생성 ───
app.post('/api/transaction/report', async (req: Request, res: Response) => {
  try {
    const { regions } = req.body;
    if (!regions || !Array.isArray(regions)) return res.status(400).json({ error: 'regions 데이터 필요' });

    const regionNames = regions.map((r: any) => r.sggNm || r.name || '').filter(Boolean);

    // 거래 목록 취합 (recentTx 또는 transactions에서)
    // recentTx + transactions 합쳐서 검색 (중복 제거 불필요, searchTransactionNews가 상위 5건만 선택)
    const allTxForSearch = regions.map((r: any) => {
      const txList = [...(r.recentTx || []), ...(r.transactions || [])];
      return { name: r.sggNm || r.name || '', txList };
    });

    // 병렬: 시장 동향 + 거래 뉴스
    const [marketContext, ...txNewsResults] = await Promise.all([
      searchMarketContext(regionNames),
      ...allTxForSearch.map(item => searchTransactionNews(item.name, item.txList))
    ]);
    const txNewsContext = txNewsResults.filter(Boolean).join('');

    const summary = regions.map((r: any) => {
      const s = r.stats;
      const dongInfo = s.byDong ? Object.entries(s.byDong).map(([d, v]: any) => `${d}: ${v.count}건, 평균 ${v.ppCount > 0 ? Math.round(v.totalPP / v.ppCount) : 0}만/평`).join(', ') : '';
      const useInfo = s.byUse ? Object.entries(s.byUse).map(([u, c]) => `${u} ${c}건`).join(', ') : '';
      let txDetail = '';
      if (s.highest) txDetail += `\n최고 평당가 거래: ${s.highest.umd_nm || ''} ${s.highest.jibun || ''}, ${s.highest.land_use || ''}, 대지 ${s.highest.plottage_ar || 0}㎡, ${Math.round(s.highest.pricePerPyeong)}만/평, ${s.highest.deal_amount}만원`;
      if (s.lowest) txDetail += `\n최저 평당가 거래: ${s.lowest.umd_nm || ''} ${s.lowest.jibun || ''}, ${s.lowest.land_use || ''}, 대지 ${s.lowest.plottage_ar || 0}㎡, ${Math.round(s.lowest.pricePerPyeong)}만/평, ${s.lowest.deal_amount}만원`;
      if (r.recentTx && r.recentTx.length) {
        txDetail += '\n최근 주요 거래:';
        r.recentTx.forEach((t: any) => { txDetail += `\n- ${t.umd_nm || ''} ${t.jibun || ''} / ${t.building_use || ''} / 대지${t.plottage_ar || 0}㎡ / ${t.deal_amount}만원 / ${t.deal_year}.${String(t.deal_month).padStart(2,'0')}`; });
      }
      return `[${r.sggNm || r.name || ''}${r.dongFilter ? ' ' + r.dongFilter : ''}]\n총 ${s.totalCount}건 (해제 ${s.cancelCount || 0}건)\n평균매매가: ${s.avgPrice}만원, 토지평당: ${s.avgPricePerPyeong}만, 연면적평당: ${s.avgPricePerArea}만\n전년대비 거래량 ${s.prevPeriodChange.volume}%, 가격 ${s.prevPeriodChange.price}%\n법인매수 ${s.buyer.corp.ratio}%, 법인매도 ${s.seller.corp.ratio}%\n동별: ${dongInfo}\n용도: ${useInfo}${txDetail}`;
    }).join('\n\n');

    const OpenAI = require('openai');
    const openai = new OpenAI();
    const resp = await openai.chat.completions.create({
      model: 'gpt-5',
      reasoning_effort: 'low' as any,
      max_completion_tokens: 4000,
      messages: [
        { role: 'user', content: `당신은 BSN빌사남부동산중개법인의 상업업무용 부동산(빌딩) 매매 시장 분석 전문가입니다.

다음 실거래 데이터와 관련 뉴스를 바탕으로 시장 리포트를 작성하세요.

[구성]
1. 시장 개요 (2~3문장)
2. 전년대비 변동 원인 분석 (거래량, 가격 변동의 구체적 원인)
3. 핵심 트렌드 (3~4개 포인트)
4. 주목할 거래 (특이 거래 1~2건 — 관련 뉴스가 있으면 해당 기사 내용을 근거로 활용)
5. 향후 전망 (2~3문장)

[중요 규칙]
- 거래 관련 뉴스가 제공되면, 해당 거래를 리포트에서 구체적으로 다루고 뉴스 내용을 분석 근거로 사용해라.
- 리포트 하단에 "참조 기사:" 섹션을 만들어 관련 뉴스 URL을 나열해라. 뉴스가 없으면 이 섹션은 생략해라.

[문체 규칙]
- 마크다운 문법(**, * 등) 사용 금지
- AI가 자동 생성한 티가 나는 정형화된 패턴을 피해라. 어떤 단어든 문맥에 맞으면 자유롭게 써라.
- 현장 실무자가 대표에게 보고하듯이 직접적이고 간결한 문체로 작성
- 이모지 허용

[데이터]
${summary}
${txNewsContext}
${marketContext}` }
      ]
    });

    res.json({ report: resp.choices[0]?.message?.content || '' });
  } catch (e: any) {
    console.error('[리포트 생성 오류]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── app export (Cloud Functions용) ───
export { app };

// ─── 로컬 서버 시작 (직접 실행 시에만) ───
const isDirectRun = require.main === module;
if (isDirectRun) {
  if (!process.env.MOLIT_API_KEY) {
    console.warn('[경고] MOLIT_API_KEY가 .env에 설정되지 않았습니다');
  }
  app.listen(PORT, () => {
    console.log('');
    console.log('  BSN 규정 챗봇 서버 시작!');
    console.log(`  -> 챗봇:    http://localhost:${PORT}`);
    console.log(`  -> 관리자:  http://localhost:${PORT}/admin`);
    console.log('');
  });
}
