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

// CSV → JSON 초기화 (최초 1회)
function initMembersFromCSV() {
  const existing = getMembers();
  if (existing.length > 0) return; // 이미 JSON에 데이터 있으면 스킵

  const csvPath = path.resolve(__dirname, '..', '명단.CSV');
  if (!fs.existsSync(csvPath)) return;

  const buf = fs.readFileSync(csvPath);
  const text = iconv.decode(buf, 'cp949');
  const lines = text.split('\n').filter(l => l.trim().replace(/,/g, '').length > 0);
  const members: Member[] = [];

  // 대표(문승환)를 기본 관리자로 설정
  for (const line of lines) {
    const cols = line.split(',');
    const no = parseInt(cols[1]);
    if (isNaN(no)) continue;
    const name = (cols[6] || '').trim();
    const rawDept = (cols[4] || '').trim();
    const deptMap: Record<string, string> = { '매매': '빌딩', 'pent': 'PENT', '자산관리': 'CARE', '본부': '경영' };
    const department = deptMap[rawDept] || rawDept;
    const position = (cols[5] || '').trim();
    const phone = (cols[7] || '').trim();
    const email = (cols[8] || '').trim();
    const team = (cols[9] || '').trim();
    const joinDate = (cols[2] || '').trim();
    const birthDate = (cols[3] || '').trim();
    const note = (cols[0] || '').trim();
    const phoneLast4 = phone.replace(/[^0-9]/g, '').slice(-4);
    const role: '관리자' | '사용자' = (position === '대표' || position === '이사' || position === '부장') ? '관리자' : '사용자';
    if (name) members.push({ no, name, position, department, team, phone, phoneLast4, joinDate, birthDate, email, note, role });
  }

  saveMembers(members);
  console.log(`  CSV에서 ${members.length}명의 멤버를 가져왔습니다.`);
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// CSV 초기화
initMembersFromCSV();

// ─── 멤버 목록 API ───
app.get('/api/members', (_req: Request, res: Response) => {
  res.json(getMembers());
});

// 멤버 추가
app.post('/api/admin/members', (req: Request, res: Response) => {
  const { name, position, department, team, phone, joinDate, birthDate, email, note, role } = req.body;
  if (!name || !phone) return res.status(400).json({ error: '이름과 연락처는 필수입니다.' });
  const members = getMembers();
  const maxNo = members.length > 0 ? Math.max(...members.map(m => m.no)) : 0;
  const newMember: Member = {
    no: maxNo + 1,
    name, position: position || '', department: department || '',
    team: team || '', phone, phoneLast4: phone.replace(/[^0-9]/g, '').slice(-4),
    joinDate: joinDate || '', birthDate: birthDate || '',
    email: email || '', note: note || '', role: role || '사용자',
  };
  addMember(newMember);
  res.json({ success: true, member: newMember });
});

// 멤버 수정
app.put('/api/admin/members/:no', (req: Request, res: Response) => {
  const no = parseInt(req.params.no);
  updateMember(no, req.body);
  res.json({ success: true });
});

// 멤버 삭제
app.delete('/api/admin/members/:no', (req: Request, res: Response) => {
  const no = parseInt(req.params.no);
  deleteMember(no);
  res.json({ success: true });
});

// ─── 챗봇 페이지 ───
app.get('/', (_req: Request, res: Response) => {
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
    const { mode, input } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: '입력 내용이 필요합니다.' });
    }
    const result = await generateAllContent(mode === 'url' ? 'url' : 'text', input.trim());
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
    const includeKw = ['빌딩','상가','부동산','매매','상권','임대','개발','거래','오피스','리테일','권리금','공실','투자','재건축','재개발','수익률','건물','토지','분양','임차','점포'];
    const excludeKw = ['아파트','주택','전세','월세','청약','입주','모델하우스','분양권','래미안','자이','힐스테이트','푸르지오'];
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
          params: { query: kw, display: 10, start: 1, sort: 'date' },
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
          const hasInclude = includeKw.some(k => title.includes(k));
          const hasExclude = excludeKw.some(k => title.includes(k));
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
    const count = parseInt((_req.query.count as string) || '5') || 5;
    res.json({ articles: allResults.slice(0, count).map(({ _ts, ...r }) => r) });
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
    addRecord(record);

    res.json({ reply, recordId: record.id, status: record.status });
  } catch (err) {
    console.error('챗봇 오류:', err);
    res.status(500).json({ error: '죄송합니다. 일시적인 오류가 발생했습니다.' });
  }
});

// ─── 추천 질문 API (빈도 기반) ───
app.get('/api/chatbot/top-questions', (_req: Request, res: Response) => {
  const questions = getTopQuestions(5);
  res.json({ questions });
});

// ═══ 관리자 API ═══

// 상담 기록 조회
app.get('/api/admin/records', (req: Request, res: Response) => {
  let records = getRecords();
  const userId = req.query.userId as string;
  if (userId) {
    records = records.filter(r => r.userId === userId);
  }
  res.json(records);
});

// 상담 상태 변경
app.put('/api/admin/records/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  if (status !== 'AI해결' && status !== '직접 문의') {
    return res.status(400).json({ error: '유효하지 않은 상태입니다.' });
  }
  updateRecordStatus(req.params.id, status);
  res.json({ success: true });
});

// 규정 초안 조회
app.get('/api/admin/drafts', (_req: Request, res: Response) => {
  res.json(getRuleDrafts());
});

// 규정 초안 추가
app.post('/api/admin/drafts', (req: Request, res: Response) => {
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
  addRuleDraft(draft);
  res.json({ success: true, draft });
});

// 규정 초안 수정
app.put('/api/admin/drafts/:id', (req: Request, res: Response) => {
  const updated = updateRuleDraft(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json({ success: true });
});

// 규정 초안 삭제
app.delete('/api/admin/drafts/:id', (req: Request, res: Response) => {
  deleteRuleDraft(req.params.id);
  res.json({ success: true });
});

// 규정 초안 일괄 적용
app.post('/api/admin/drafts/apply', (_req: Request, res: Response) => {
  const drafts = getRuleDrafts().filter(d => !d.applied);
  if (drafts.length === 0) {
    return res.json({ success: true, applied: 0 });
  }

  let rules = loadRulesFile();

  for (const draft of drafts) {
    const sectionHeader = `# ${draft.section}`;
    const sectionIdx = rules.indexOf(sectionHeader);
    if (sectionIdx === -1 && draft.action !== '추가') continue;

    // 다음 섹션 시작 위치 찾기
    const afterHeader = sectionIdx + sectionHeader.length;
    const nextSectionIdx = rules.indexOf('\n# ', afterHeader);
    const sectionEnd = nextSectionIdx === -1 ? rules.length : nextSectionIdx;
    let sectionContent = rules.slice(afterHeader, sectionEnd);

    if (draft.action === '수정' && draft.itemNumber !== 'new') {
      // 해당 항목 번호 찾아서 교체
      const itemRegex = new RegExp(`^${draft.itemNumber}\\. .+$`, 'm');
      if (itemRegex.test(sectionContent)) {
        sectionContent = sectionContent.replace(itemRegex, `${draft.itemNumber}. ${draft.content}`);
      }
    } else if (draft.action === '추가') {
      // 섹션 끝에 추가
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

  saveRulesFile(rules);
  markDraftsApplied(drafts.map(d => d.id));

  res.json({ success: true, applied: drafts.length });
});

// 현재 규정 조회
app.get('/api/admin/rules', (_req: Request, res: Response) => {
  res.json({ content: loadRulesFile() });
});

// 규정 직접 수정 (섹션별 또는 전체)
app.post('/api/admin/rules/update', (req: Request, res: Response) => {
  const { content } = req.body;
  if (typeof content !== 'string') {
    return res.status(400).json({ error: '내용이 필요합니다.' });
  }
  saveRulesFile(content);
  res.json({ success: true });
});

// 섹션 추가
app.post('/api/admin/rules/section', (req: Request, res: Response) => {
  const { sectionName, updatedBy } = req.body;
  if (!sectionName || typeof sectionName !== 'string') {
    return res.status(400).json({ error: '섹션 이름이 필요합니다.' });
  }
  let rules = loadRulesFile();
  rules = rules.trimEnd() + '\n\n# ' + sectionName.trim() + '\n';
  saveRulesFile(rules);
  addRuleDraft({
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
app.delete('/api/admin/rules/section/:sectionName', (req: Request, res: Response) => {
  const sectionName = decodeURIComponent(req.params.sectionName);
  const updatedBy = req.body?.updatedBy || '알 수 없음';
  let rules = loadRulesFile();
  const header = '# ' + sectionName;
  const idx = rules.indexOf(header);
  if (idx === -1) {
    return res.status(404).json({ error: '섹션을 찾을 수 없습니다.' });
  }
  const nextIdx = rules.indexOf('\n# ', idx + header.length);
  const end = nextIdx === -1 ? rules.length : nextIdx;
  // Remove from preceding newline if exists
  const start = idx > 0 && rules[idx - 1] === '\n' ? idx - 1 : idx;
  rules = rules.slice(0, start) + rules.slice(end);
  saveRulesFile(rules);
  addRuleDraft({
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
  const prevPyeong = prevValid.filter((t: any) => t.plottage_ar > 0);
  const prevAvgPP = prevPyeong.length > 0
    ? Math.round(prevPyeong.reduce((s: number, t: any) => s + (t.deal_amount / t.plottage_ar * 3.3058), 0) / prevPyeong.length)
    : 0;

  const volumeChange = prevCount > 0 ? Math.round((totalCount - prevCount) / prevCount * 100) : 0;
  const priceChange = prevAvgPP > 0 ? Math.round((avgPricePerPyeong - prevAvgPP) / prevAvgPP * 100) : 0;

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
    prevPeriodChange: { volume: volumeChange, price: priceChange },
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

// ─── AI 인사이트 ───
app.post('/api/transaction/insight', async (req: Request, res: Response) => {
  try {
    const { regions } = req.body;
    if (!regions || !Array.isArray(regions)) return res.status(400).json({ error: 'regions 데이터 필요' });

    const summary = regions.map((r: any) => {
      const s = r.stats;
      return `[${r.sggNm}${r.dongFilter ? ' ' + r.dongFilter : ''}]\n거래건수: ${s.totalCount}건, 평균매매가: ${s.avgPrice}만원, 평당매매가: ${s.avgPricePerPyeong}만원\n법인매수: ${s.buyer.corp.ratio}%, 법인매도: ${s.seller.corp.ratio}%\n전기대비 거래량: ${s.prevPeriodChange.volume > 0 ? '+' : ''}${s.prevPeriodChange.volume}%, 전기대비 가격: ${s.prevPeriodChange.price > 0 ? '+' : ''}${s.prevPeriodChange.price}%`;
    }).join('\n\n');

    const OpenAI = require('openai');
    const openai = new OpenAI();
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [
        { role: 'system', content: '당신은 상업업무용 부동산(빌딩) 매매 시장 분석 전문가입니다. 빌딩 매매 중개 관점에서 실거래 데이터를 분석하고 인사이트를 제공하세요. 간결하게 핵심만 3~5개 포인트로 작성하세요. 각 포인트는 한 줄로.' },
        { role: 'user', content: `다음 지역의 상업업무용 부동산 실거래 데이터를 비교 분석해주세요:\n\n${summary}` }
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

    const summary = regions.map((r: any) => {
      const s = r.stats;
      const dongInfo = Object.entries(s.byDong).map(([d, v]: any) => `${d}: ${v.count}건, 평균 ${v.ppCount > 0 ? Math.round(v.totalPP / v.ppCount) : 0}만/평`).join(', ');
      const useInfo = Object.entries(s.byUse).map(([u, c]) => `${u} ${c}건`).join(', ');
      return `[${r.sggNm}${r.dongFilter ? ' ' + r.dongFilter : ''}]\n총 ${s.totalCount}건 (해제 ${s.cancelCount}건)\n평균매매가: ${s.avgPrice}만원, 토지평당: ${s.avgPricePerPyeong}만, 연면적평당: ${s.avgPricePerArea}만\n전기대비 거래량 ${s.prevPeriodChange.volume}%, 가격 ${s.prevPeriodChange.price}%\n법인매수 ${s.buyer.corp.ratio}%, 법인매도 ${s.seller.corp.ratio}%\n동별: ${dongInfo}\n용도: ${useInfo}`;
    }).join('\n\n');

    const OpenAI = require('openai');
    const openai = new OpenAI();
    const resp = await openai.chat.completions.create({
      model: 'gpt-5',
      reasoning_effort: 'low' as any,
      max_completion_tokens: 4000,
      messages: [
        { role: 'user', content: `당신은 BSN빌사남부동산중개법인의 상업업무용 부동산(빌딩) 매매 시장 분석 전문가입니다.\n\n다음 실거래 데이터를 바탕으로 시장 리포트를 작성하세요.\n빌딩 매매 중개 관점에서 작성하되, 매수자와 매도자 모두에게 유용한 정보를 포함하세요.\n\n구성:\n1. 시장 개요 (2~3문장)\n2. 핵심 트렌드 (3~4개 포인트)\n3. 주목할 거래 (특이 거래 1~2건)\n4. 시장 전망 (2~3문장)\n\n데이터:\n${summary}` }
      ]
    });

    res.json({ report: resp.choices[0]?.message?.content || '' });
  } catch (e: any) {
    console.error('[리포트 생성 오류]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── 서버 시작 ───
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
