/** BSN 어시스턴트 챗봇 페이지 */
export function generateChatbotPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>BSN 어시스턴트</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    :root{
      --primary:#1A1A2E;--primary-dk:#2D2D4A;--primary-lt:#E8E8F0;
      --navy:#2C4A7C;--navy-dark:#1E3560;--navy-light:#EEF2F9;--navy-border:#C5D3EC;
      --bg:#F8F6F1;--surface:#FFFFFF;--border:#E2E2E2;
      --text:#1A1A2E;--sub:#6B6B80;--muted:#9CA3AF;
      --warn:#DC2626;--warn-lt:#FEE2E2;
      --radius:12px;--shadow:0 1px 4px rgba(0,0,0,0.07);
    }
    body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased;display:flex;flex-direction:column;overflow-y:scroll;}

    /* Navbar */
    nav{position:sticky;top:0;z-index:50;background:#ffffff;border-bottom:1px solid var(--border);}
    .nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;height:52px;display:flex;align-items:center;gap:20px;}
    .logo{display:flex;align-items:center;gap:8px;text-decoration:none;}
    .logo-mark{width:28px;height:28px;background:var(--navy);border-radius:8px;display:flex;align-items:center;justify-content:center;}
    .logo-text{font-family:'Poppins',sans-serif;font-size:15px;font-weight:700;color:var(--text);}
    .logo-text span{color:var(--navy);}
    .nav-links{display:flex;gap:2px;margin-left:8px;}
    .nav-link{padding:6px 14px;border-radius:8px;font-size:13px;font-weight:500;color:var(--sub);text-decoration:none;transition:all 0.15s;cursor:pointer;}
    .nav-link:hover{background:var(--bg);color:var(--text);}
    .nav-link.active{background:var(--navy-light);color:var(--navy);font-weight:600;}
    .nav-spacer{flex:1;}
    .nav-btn{padding:5px 12px;border:1px solid var(--border);border-radius:8px;background:#fff;color:var(--sub);font-size:12px;cursor:pointer;font-family:inherit;transition:all 0.15s;}
    .nav-btn:hover{border-color:var(--navy);color:var(--navy);}

    /* Chat */
    .chat-container{flex:1;max-width:760px;width:100%;margin:0 auto;padding:32px 24px 24px;display:flex;flex-direction:column;height:calc(100vh - 52px);}
    .chat-header{text-align:center;margin-bottom:28px;}
    .chat-header h1{font-family:'Poppins',sans-serif;font-size:24px;font-weight:700;color:var(--text);margin-bottom:8px;}
    .chat-header p{font-size:14px;color:var(--sub);line-height:1.5;}

    /* Messages */
    .messages{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:20px;padding-bottom:20px;scroll-behavior:smooth;}
    .messages::-webkit-scrollbar{width:5px;}
    .messages::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:3px;}
    .messages::-webkit-scrollbar-thumb:hover{background:#9CA3AF;}

    .msg{display:flex;gap:12px;max-width:85%;animation:fadeIn 0.25s ease;}
    .msg.user{align-self:flex-end;flex-direction:row-reverse;}
    .msg.bot{align-self:flex-start;}

    .msg-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;}
    .msg.bot .msg-avatar{background:var(--navy-light);color:var(--navy);}
    .msg.user .msg-avatar{background:#E8E8ED;color:var(--sub);}

    .msg-bubble{padding:14px 18px;border-radius:12px;font-size:14px;line-height:1.7;word-break:break-word;}
    .msg.user .msg-bubble{white-space:pre-wrap;}
    .msg.bot .msg-bubble{background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow);}
    .msg.user .msg-bubble{background:var(--primary);color:#fff;}

    /* Markdown */
    .msg.bot .msg-bubble h1,.msg.bot .msg-bubble h2,.msg.bot .msg-bubble h3{margin:14px 0 6px;font-weight:700;line-height:1.3;}
    .msg.bot .msg-bubble h1{font-size:17px;}
    .msg.bot .msg-bubble h2{font-size:15px;}
    .msg.bot .msg-bubble h3{font-size:14px;font-weight:600;}
    .msg.bot .msg-bubble p{margin:6px 0;}
    .msg.bot .msg-bubble ul,.msg.bot .msg-bubble ol{margin:6px 0;padding-left:20px;}
    .msg.bot .msg-bubble li{margin:3px 0;}
    .msg.bot .msg-bubble strong{font-weight:700;color:var(--navy-dark);}
    .msg.bot .msg-bubble em{font-style:italic;}
    .msg.bot .msg-bubble code{background:#F3F4F6;padding:2px 6px;border-radius:4px;font-size:13px;font-family:'Courier New',monospace;}
    .msg.bot .msg-bubble pre{background:#1E1E1E;color:#E5E5E5;padding:14px;border-radius:8px;overflow-x:auto;margin:10px 0;}
    .msg.bot .msg-bubble pre code{background:none;color:inherit;padding:0;}
    .msg.bot .msg-bubble blockquote{border-left:3px solid var(--navy);padding-left:12px;margin:8px 0;color:var(--sub);}
    .msg.bot .msg-bubble table{border-collapse:collapse;margin:10px 0;width:100%;}
    .msg.bot .msg-bubble th,.msg.bot .msg-bubble td{border:1px solid var(--border);padding:8px 12px;font-size:13px;text-align:left;}
    .msg.bot .msg-bubble th{background:#F9FAFB;font-weight:600;}
    .msg.bot .msg-bubble hr{border:none;border-top:1px solid var(--border);margin:12px 0;}
    .msg.bot .msg-bubble>*:first-child{margin-top:0;}
    .msg.bot .msg-bubble>*:last-child{margin-bottom:0;}

    /* Quick Actions */
    .quick-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;justify-content:center;}
    .quick-btn{padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:var(--surface);font-size:13px;font-weight:500;color:var(--sub);cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;box-shadow:var(--shadow);}
    .quick-btn:hover{border-color:var(--navy);color:var(--navy);background:var(--navy-light);}

    /* Input */
    .input-area{display:flex;gap:8px;padding:8px;background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-top:16px;}
    .input-area:focus-within{border-color:var(--navy);box-shadow:0 0 0 3px rgba(44,74,124,0.08);}
    .input-area textarea{flex:1;border:none;padding:8px 10px;font-size:14px;font-family:'Inter',sans-serif;color:var(--text);outline:none;resize:none;min-height:36px;max-height:120px;line-height:1.5;background:transparent;}
    .input-area textarea::placeholder{color:var(--muted);}
    .send-btn{width:36px;height:36px;border-radius:8px;border:none;background:var(--primary);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0;align-self:flex-end;}
    .send-btn:hover{background:var(--primary-dk);}
    .send-btn:disabled{background:#D1D5DB;cursor:not-allowed;}

    /* Typing */
    .typing{display:flex;gap:4px;padding:8px 16px;}
    .typing span{width:6px;height:6px;background:var(--muted);border-radius:50%;animation:bounce 1.4s infinite;}
    .typing span:nth-child(2){animation-delay:0.2s;}
    .typing span:nth-child(3){animation-delay:0.4s;}

    /* Login overlay */
    .login-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.35);backdrop-filter:blur(4px);z-index:200;align-items:center;justify-content:center;}
    .login-box{background:#fff;border-radius:16px;padding:36px 32px;max-width:380px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.12);}
    .login-box h3{font-size:18px;font-weight:700;margin-bottom:6px;}
    .login-box p{font-size:13px;color:var(--sub);margin-bottom:20px;}
    .login-box input{width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;outline:none;margin-bottom:10px;transition:border-color 0.15s;}
    .login-box input:focus{border-color:var(--navy);}
    .login-box .login-btn{width:100%;padding:12px;border-radius:8px;border:none;background:var(--navy);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:background 0.15s;}
    .login-box .login-btn:hover{background:var(--navy-dark);}
    .login-box .login-error{font-size:12px;color:var(--warn);margin-bottom:10px;display:none;}

    @keyframes bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

    @media(max-width:640px){
      .chat-container{padding:16px 12px 12px;}
      .msg{max-width:92%;}
      .quick-actions{gap:6px;}
      .quick-btn{font-size:12px;padding:6px 12px;}
    }
  </style>
</head>
<body>

<nav>
  <div class="nav-inner">
    <a href="/" class="logo">
      <div class="logo-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg></div>
      <span class="logo-text">BSN <span>Assistant</span></span>
    </a>
    <div class="nav-links">
      <a href="/insta#transaction" class="nav-link">실거래가</a>
      <a href="/insta" class="nav-link">콘텐츠 생성</a>
      <a href="/" class="nav-link active">챗봇</a>
      <a href="/admin" class="nav-link">관리자</a>
    </div>
    <div class="nav-spacer"></div>
    <span id="navUserName" style="font-size:12px;color:#6B6B80;margin-right:8px;display:none;"></span>
    <button id="logoutBtn" onclick="doLogout()" class="nav-btn" style="display:none;">나가기</button>
  </div>
</nav>

<div class="chat-container">
  <div class="chat-header">
    <h1>BSN 어시스턴트</h1>
    <p>내부규정과 업무에 대해 무엇이든 물어보세요</p>
  </div>

  <div class="messages" id="messages">
    <div class="msg bot">
      <div class="msg-avatar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
      </div>
      <div class="msg-bubble">안녕하세요 \u{1F44B} BSN 내부규정과 업무에 대해 무엇이든 물어보세요.</div>
    </div>
  </div>

  <div class="quick-actions" id="quickActions">
    <button class="quick-btn" onclick="askQuick(this)">담당자 변경은 어떻게 하나요?</button>
    <button class="quick-btn" onclick="askQuick(this)">파트너중개사 자격 조건은?</button>
    <button class="quick-btn" onclick="askQuick(this)">5% 네고 규정이 뭔가요?</button>
    <button class="quick-btn" onclick="askQuick(this)">매물 상태 변경 기준은?</button>
    <button class="quick-btn" onclick="askQuick(this)">계약 해지 시 매물은?</button>
  </div>

  <!-- 로그인 -->
  <div class="login-overlay" id="loginOverlay" style="display:none;">
    <div class="login-box" style="text-align:center;">
      <div style="font-size:28px;margin-bottom:8px;">&#128273;</div>
      <h3>BSN 어시스턴트</h3>
      <p>Google 계정으로 로그인하세요</p>
      <button class="login-btn" id="googleLoginBtn" onclick="doGoogleLogin()" style="display:flex;align-items:center;justify-content:center;gap:8px;">
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Google로 로그인
      </button>
      <div class="login-error" id="loginError"></div>
    </div>
  </div>
  <!-- 접근 거부 -->
  <div class="login-overlay" id="deniedOverlay" style="display:none;">
    <div class="login-box" style="text-align:center;">
      <div style="font-size:36px;margin-bottom:12px;">&#128683;</div>
      <h3>접근 권한 없음</h3>
      <p id="deniedEmail" style="font-size:12px;color:var(--muted);margin-bottom:16px;"></p>
      <p>등록되지 않은 계정입니다.<br>관리자에게 명단 등록을 요청하세요.</p>
      <button class="login-btn" onclick="doLogout()" style="margin-top:16px;">다른 계정으로 로그인</button>
    </div>
  </div>
  <!-- 세션 만료 -->
  <div class="login-overlay" id="kickedOverlay" style="display:none;">
    <div class="login-box" style="text-align:center;">
      <div style="font-size:36px;margin-bottom:12px;">&#128274;</div>
      <h3>다른 기기에서 로그인됨</h3>
      <p style="font-size:13px;color:var(--muted);margin-top:8px;">동일 계정으로 다른 곳에서 로그인하여<br>현재 세션이 종료되었습니다.</p>
      <button class="login-btn" onclick="doLogout()" style="margin-top:16px;">다시 로그인</button>
    </div>
  </div>

  <div class="input-area">
    <textarea id="userInput" placeholder="무엇이든 물어보세요..." rows="1" onkeydown="handleKey(event)" oninput="autoResize(this)"></textarea>
    <button class="send-btn" id="sendBtn" onclick="sendMessage()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
    </button>
  </div>
</div>

<script>
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
let isLoading = false;
let userName = localStorage.getItem('bsn_user_name') || '';
let userId = localStorage.getItem('bsn_user_id') || '';
let userRole = localStorage.getItem('bsn_user_role') || '';
let chatMessages = loadChatHistory();

function saveChatHistory() {
  localStorage.setItem('bsn_chat_history', JSON.stringify(chatMessages));
}
function loadChatHistory() {
  try { return JSON.parse(localStorage.getItem('bsn_chat_history') || '[]'); } catch { return []; }
}

const defaultQuestions = [
  '담당자 변경은 어떻게 하나요?',
  '파트너중개사 자격 조건은?',
  '5% 네고 규정이 뭔가요?',
  '매물 상태 변경 기준은?',
  '계약 해지 시 매물은?'
];

// ─── Firebase Google 로그인 ───
var firebaseApp = null;
var firebaseAuthInstance = null;

async function initFirebase() {
  try {
    var configRes = await fetch('/api/auth/config');
    var config = await configRes.json();
    firebaseApp = firebase.initializeApp(config);
    firebaseAuthInstance = firebase.auth();
  } catch(e) {
    console.error('[Firebase] 초기화 실패', e);
  }
}

var bsnChannel = null;
try { bsnChannel = new BroadcastChannel('bsn_auth'); } catch(e) {}

if (bsnChannel) {
  bsnChannel.onmessage = function(e) {
    if (e.data === 'ping' && sessionStorage.getItem('bsn_session_active')) {
      bsnChannel.postMessage('pong');
    }
    if (e.data === 'logout') {
      localStorage.removeItem('bsn_user_name');
      localStorage.removeItem('bsn_user_id');
      localStorage.removeItem('bsn_user_role');
      localStorage.removeItem('bsn_user_email');
      localStorage.removeItem('bsn_user_picture');
      localStorage.removeItem('bsn_firebase_token');
      localStorage.removeItem('bsn_session_id');
      sessionStorage.removeItem('bsn_session_active');
      location.reload();
    }
    if (e.data === 'kicked') {
      sessionStorage.removeItem('bsn_session_active');
      document.getElementById('kickedOverlay').style.display = 'flex';
    }
  };
}

function checkBrowserSession() {
  return new Promise(function(resolve) {
    if (sessionStorage.getItem('bsn_session_active')) {
      resolve(true);
      return;
    }
    if (!bsnChannel) { resolve(false); return; }
    var answered = false;
    function handler(e) {
      if (e.data === 'pong' && !answered) {
        answered = true;
        sessionStorage.setItem('bsn_session_active', 'true');
        resolve(true);
      }
    }
    bsnChannel.addEventListener('message', handler);
    bsnChannel.postMessage('ping');
    setTimeout(function() {
      bsnChannel.removeEventListener('message', handler);
      if (!answered) resolve(false);
    }, 500);
  });
}

var sessionCheckTimer = null;
function startSessionCheck() {
  if (sessionCheckTimer) clearInterval(sessionCheckTimer);
  sessionCheckTimer = setInterval(async function() {
    var email = localStorage.getItem('bsn_user_email');
    var sid = localStorage.getItem('bsn_session_id');
    if (!email || !sid) return;
    try {
      var res = await fetch('/api/auth/check-session', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:email,sessionId:sid}) });
      if (!res.ok) {
        var data = await res.json();
        if (data.kicked) {
          clearInterval(sessionCheckTimer);
          sessionStorage.removeItem('bsn_session_active');
          if (bsnChannel) bsnChannel.postMessage('kicked');
          document.getElementById('kickedOverlay').style.display = 'flex';
        }
      }
    } catch(e) {}
  }, 60000);
}

async function initLogin() {
  await initFirebase();
  var hasLocal = localStorage.getItem('bsn_user_name') && localStorage.getItem('bsn_user_id');

  if (!hasLocal) {
    document.getElementById('loginOverlay').style.display = 'flex';
    return;
  }

  var alive = await checkBrowserSession();
  if (!alive) {
    localStorage.removeItem('bsn_user_name');
    localStorage.removeItem('bsn_user_id');
    localStorage.removeItem('bsn_user_role');
    localStorage.removeItem('bsn_user_email');
    localStorage.removeItem('bsn_user_picture');
    localStorage.removeItem('bsn_firebase_token');
    localStorage.removeItem('bsn_session_id');
    userName = ''; userId = ''; userRole = '';
    document.getElementById('loginOverlay').style.display = 'flex';
    return;
  }

  try {
    var email = localStorage.getItem('bsn_user_email');
    var sid = localStorage.getItem('bsn_session_id');
    if (email && sid) {
      var sRes = await fetch('/api/auth/check-session', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:email,sessionId:sid}) });
      if (!sRes.ok) {
        var sData = await sRes.json();
        if (sData.kicked) {
          sessionStorage.removeItem('bsn_session_active');
          if (bsnChannel) bsnChannel.postMessage('kicked');
          document.getElementById('kickedOverlay').style.display = 'flex';
          return;
        }
        doLogout();
        return;
      }
    }
    var token = localStorage.getItem('bsn_firebase_token');
    if (token) {
      var res = await fetch('/api/auth/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({idToken:token}) });
      if (res.ok) {
        var data = await res.json();
        if (data.user) {
          userRole = data.user.role;
          localStorage.setItem('bsn_user_role', userRole);
          localStorage.setItem('bsn_session_id', data.user.sessionId || '');
          sessionStorage.setItem('bsn_session_active', 'true');
          document.getElementById('navUserName').textContent = userName; document.getElementById('navUserName').style.display = 'inline';
          document.getElementById('logoutBtn').style.display = 'block';
          restoreChatHistory();
          startSessionCheck();
          return;
        }
      }
    }
  } catch(e) {}
  doLogout();
}

async function doGoogleLogin() {
  var errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  var btn = document.getElementById('googleLoginBtn');
  btn.disabled = true; btn.textContent = '로그인 중...';
  try {
    var provider = new firebase.auth.GoogleAuthProvider();
    var result = await firebaseAuthInstance.signInWithPopup(provider);
    var idToken = await result.user.getIdToken();

    var res = await fetch('/api/auth/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({idToken:idToken}) });
    var data = await res.json();

    if (!res.ok || !data.user) {
      document.getElementById('loginOverlay').style.display = 'none';
      document.getElementById('deniedEmail').textContent = data.email || result.user.email || '';
      document.getElementById('deniedOverlay').style.display = 'flex';
      btn.disabled = false; btn.textContent = 'Google로 로그인';
      return;
    }

    userName = data.user.name || result.user.displayName || '';
    userId = data.user.uid;
    userRole = data.user.role;
    localStorage.setItem('bsn_user_name', userName);
    localStorage.setItem('bsn_user_id', userId);
    localStorage.setItem('bsn_user_role', userRole);
    localStorage.setItem('bsn_user_email', data.user.email);
    localStorage.setItem('bsn_user_picture', data.user.picture || '');
    localStorage.setItem('bsn_firebase_token', idToken);
    localStorage.setItem('bsn_session_id', data.user.sessionId || '');
    sessionStorage.setItem('bsn_session_active', 'true');

    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('navUserName').textContent = userName; document.getElementById('navUserName').style.display = 'inline';
    document.getElementById('logoutBtn').style.display = 'block';
    restoreChatHistory();
    startSessionCheck();
  } catch(e) {
    errEl.textContent = '로그인 중 오류가 발생했습니다';
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Google로 로그인';
  }
}

function doLogout() {
  try { firebaseAuthInstance.signOut(); } catch(e) {}
  if (bsnChannel) bsnChannel.postMessage('logout');
  localStorage.removeItem('bsn_user_name');
  localStorage.removeItem('bsn_user_id');
  localStorage.removeItem('bsn_user_role');
  localStorage.removeItem('bsn_user_email');
  localStorage.removeItem('bsn_user_picture');
  localStorage.removeItem('bsn_firebase_token');
  localStorage.removeItem('bsn_session_id');
  sessionStorage.removeItem('bsn_session_active');
  if (sessionCheckTimer) clearInterval(sessionCheckTimer);
  location.reload();
}
initLogin();

async function loadTopQuestions() {
  try {
    const res = await fetch('/api/chatbot/top-questions');
    const data = await res.json();
    const questions = data.questions.length >= 3 ? data.questions : defaultQuestions;
    const container = document.getElementById('quickActions');
    container.innerHTML = questions.map(q =>
      \`<button class="quick-btn" onclick="askQuick(this)">\${q}</button>\`
    ).join('');
  } catch(e) {}
}
loadTopQuestions();

function restoreChatHistory() {
  if (chatMessages.length === 0) return;
  chatMessages.forEach(msg => {
    if (msg.role === 'user') {
      addMessage('user', msg.content);
    } else if (msg.role === 'bot') {
      var bubble = addMessage('bot', msg.content);
      var actionDiv = document.createElement('div');
      actionDiv.style.cssText = 'margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
      var actionHtml = '';
      if (msg.showConsultBtn) {
        actionHtml += '<a href="https://pf.kakao.com/_Ugaxcu" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 10px;border:1px solid var(--border);color:var(--sub);background:white;border-radius:6px;cursor:pointer;text-decoration:none;font-family:inherit;transition:all 0.15s;">\u{1F4AC} 직접 문의</a>';
      }
      if (msg.recordId && msg.question) {
        actionHtml += '<button class="report-btn" data-rid="' + msg.recordId + '" onclick="showReportFormFromHistory(this)" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 10px;border:1px solid var(--border);color:var(--sub);background:white;border-radius:6px;cursor:pointer;font-family:inherit;transition:all 0.15s;">⚑ 오류신고</button>';
      }
      if (actionHtml) {
        actionDiv.innerHTML = actionHtml;
        bubble.appendChild(actionDiv);
      }
    }
  });
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function askQuick(btn) {
  inputEl.value = btn.textContent;
  sendMessage();
}

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  if (role === 'bot') {
    avatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';
  } else {
    avatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  if (role === 'bot') {
    bubble.innerHTML = marked.parse(text);
  } else {
    bubble.textContent = text;
  }

  div.appendChild(avatar);
  div.appendChild(bubble);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return bubble;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.id = 'typing';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>';

  const typing = document.createElement('div');
  typing.className = 'msg-bubble';
  typing.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';

  div.appendChild(avatar);
  div.appendChild(typing);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;
  inputEl.value = '';
  inputEl.style.height = 'auto';

  addMessage('user', text);
  chatMessages.push({ role: 'user', content: text, timestamp: new Date().toISOString() });
  saveChatHistory();
  showTyping();

  try {
    const res = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, userId, userName }),
    });

    removeTyping();

    if (res.ok) {
      const data = await res.json();
      const status = data.status;
      const recordId = data.recordId;
      const showConsultBtn = (status === '직접 문의');
      const bubble = addMessage('bot', data.reply);

      const actionDiv = document.createElement('div');
      actionDiv.style.cssText = 'margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
      let actionHtml = '';
      if (showConsultBtn) {
        actionHtml += \`<a href="https://pf.kakao.com/_Ugaxcu" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 10px;border:1px solid var(--border);color:var(--sub);background:white;border-radius:6px;cursor:pointer;text-decoration:none;font-family:'Inter',sans-serif;transition:all 0.15s;" onmouseover="this.style.borderColor='#2C4A7C';this.style.color='#2C4A7C';" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--sub)';">\u{1F4AC} 직접 문의</a>\`;
      }
      actionHtml += \`<button class="report-btn" onclick="showReportForm(this, '\${esc(text).replace(/'/g, "\\\\'")}', '\${esc(data.reply).replace(/'/g, "\\\\'")}', '\${recordId}' )" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 10px;border:1px solid var(--border);color:var(--sub);background:white;border-radius:6px;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;">⚑ 오류신고</button>\`;
      if (actionHtml) {
        actionDiv.innerHTML = actionHtml;
        bubble.appendChild(actionDiv);
      }

      chatMessages.push({ role: 'bot', content: data.reply, question: text, recordId, status, showConsultBtn, timestamp: new Date().toISOString() });
      saveChatHistory();
    } else {
      const err = await res.json().catch(() => ({}));
      const errMsg = err.error || '죄송합니다. 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      addMessage('bot', errMsg);
      chatMessages.push({ role: 'bot', content: errMsg, timestamp: new Date().toISOString() });
      saveChatHistory();
    }
  } catch (e) {
    removeTyping();
    const errMsg = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.';
    addMessage('bot', errMsg);
    chatMessages.push({ role: 'bot', content: errMsg, timestamp: new Date().toISOString() });
    saveChatHistory();
  }

  isLoading = false;
  sendBtn.disabled = false;
  inputEl.focus();
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function showReportFormFromHistory(btn) {
  var rid = btn.getAttribute('data-rid');
  showReportForm(btn, '', '', rid);
}

function showReportForm(btn, question, answer, recordId) {
  var existing = btn.closest('.msg-bubble').querySelector('.report-form');
  if (existing) { existing.remove(); return; }
  var form = document.createElement('div');
  form.className = 'report-form';
  form.style.cssText = 'margin-top:10px;border:1px solid var(--border);border-radius:8px;padding:12px;background:#FAFAFA;';
  form.innerHTML = '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px;">오류 신고</div>' +
    '<textarea class="report-text" placeholder="어떤 부분이 잘못되었는지 설명해 주세요..." style="width:100%;min-height:60px;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:12px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box;"></textarea>' +
    '<div style="display:flex;gap:6px;margin-top:8px;">' +
    '<button class="report-submit-btn" style="padding:5px 12px;border-radius:6px;border:none;background:var(--navy);color:#fff;font-size:11px;cursor:pointer;font-family:inherit;">제출</button>' +
    '<button class="report-cancel-btn" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--sub);font-size:11px;cursor:pointer;font-family:inherit;">취소</button>' +
    '</div>';
  form.querySelector('.report-submit-btn').onclick = function() { submitReport(this, recordId); };
  form.querySelector('.report-cancel-btn').onclick = function() { form.remove(); };
  btn.closest('.msg-bubble').appendChild(form);
  form.querySelector('textarea').focus();
}

async function submitReport(btn, recordId) {
  var form = btn.closest('.report-form');
  var text = form.querySelector('.report-text').value.trim();
  if (!text) return;
  btn.disabled = true; btn.textContent = '제출 중...';
  try {
    await fetch('/api/admin/records/' + recordId + '/report-error', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errorNote: text })
    });
    form.innerHTML = '<div style="font-size:11px;color:var(--navy);font-weight:600;padding:4px 0;">오류 신고가 접수되었습니다.</div>';
    setTimeout(function() { form.remove(); }, 2000);
  } catch(e) {
    btn.disabled = false; btn.textContent = '제출';
  }
}

</script>
</body>
</html>`;
}
