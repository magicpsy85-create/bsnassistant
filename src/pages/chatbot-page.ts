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
      <a href="/" class="nav-link active">챗봇</a>
      <a href="/insta" class="nav-link">콘텐츠 생성</a>
      <a href="/insta#transaction" class="nav-link">실거래가</a>
      <a href="/admin" class="nav-link">관리자</a>
    </div>
    <div class="nav-spacer"></div>
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
  <div class="login-overlay" id="namePrompt" style="display:none;">
    <div class="login-box">
      <h3>본인 확인</h3>
      <p>이름과 핸드폰 번호 뒤 4자리를 입력해 주세요.</p>
      <input type="text" id="loginName" placeholder="이름" onkeydown="if(event.key==='Enter')document.getElementById('loginPhone').focus()">
      <input type="text" id="loginPhone" placeholder="핸드폰 뒤 4자리" maxlength="4" inputmode="numeric" onkeydown="if(event.key==='Enter')doLogin()">
      <div class="login-error" id="loginError"></div>
      <button class="login-btn" onclick="doLogin()">시작하기</button>
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
let allMembers = [];
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

async function initLogin() {
  if (userName) {
    document.getElementById('logoutBtn').style.display = 'block';
    restoreChatHistory();
    return;
  }
  try {
    const res = await fetch('/api/members');
    allMembers = await res.json();
  } catch(e) {}
  document.getElementById('namePrompt').style.display = 'flex';
  document.getElementById('loginName').focus();
}

async function doLogin() {
  const name = document.getElementById('loginName').value.trim();
  const phone = document.getElementById('loginPhone').value.trim();
  const errEl = document.getElementById('loginError');
  if (!name || !phone || phone.length !== 4) {
    errEl.textContent = '이름과 핸드폰 뒤 4자리를 모두 입력해 주세요.';
    errEl.style.display = 'block';
    return;
  }
  try {
    const res = await fetch('/api/members');
    allMembers = await res.json();
  } catch(e) {}
  const found = allMembers.find(m => m.name === name && m.phoneLast4 === phone);
  if (!found) {
    errEl.textContent = '이름 또는 번호가 일치하지 않습니다.';
    errEl.style.display = 'block';
    return;
  }
  userName = found.name;
  userId = 'member_' + found.no;
  localStorage.setItem('bsn_user_name', userName);
  localStorage.setItem('bsn_user_id', userId);
  localStorage.setItem('bsn_user_role', found.role || '사용자');
  document.getElementById('namePrompt').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'block';
  inputEl.focus();
}

function doLogout() {
  localStorage.removeItem('bsn_user_name');
  localStorage.removeItem('bsn_user_id');
  localStorage.removeItem('bsn_user_role');
  localStorage.removeItem('bsn_chat_history');
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
      const bubble = addMessage('bot', msg.content);
      if (msg.showConsultBtn) {
        const actionDiv = document.createElement('div');
        actionDiv.style.cssText = 'margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;';
        actionDiv.innerHTML = \`<a href="https://pf.kakao.com/_Ugaxcu" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 10px;border:1px solid var(--border);color:var(--sub);background:white;border-radius:6px;cursor:pointer;text-decoration:none;font-family:'Inter',sans-serif;transition:all 0.15s;" onmouseover="this.style.borderColor='#2C4A7C';this.style.color='#2C4A7C';" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--sub)';">\u{1F4AC} 직접 문의</a>\`;
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
      const userRole = localStorage.getItem('bsn_user_role') || '사용자';
      if (userRole === '관리자') {
        actionHtml += \`<button class="report-btn" onclick="showReportForm(this, '\${esc(text).replace(/'/g, "\\\\'")}', '\${esc(data.reply).replace(/'/g, "\\\\'")}' )" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 10px;border:1px solid var(--border);color:var(--sub);background:white;border-radius:6px;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;">⚑ 오류신고</button>\`;
      }
      if (actionHtml) {
        actionDiv.innerHTML = actionHtml;
        bubble.appendChild(actionDiv);
      }

      chatMessages.push({ role: 'bot', content: data.reply, recordId, status, showConsultBtn, timestamp: new Date().toISOString() });
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

function showReportForm(btn, question, answer) {
  const existing = btn.closest('.msg-bubble').querySelector('.report-form');
  if (existing) { existing.remove(); return; }
  const form = document.createElement('div');
  form.className = 'report-form';
  form.style.cssText = 'margin-top:10px;border:1px solid var(--border);border-radius:8px;padding:12px;background:#FAFAFA;';
  form.innerHTML = \`
    <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px;">오류 신고</div>
    <textarea class="report-text" placeholder="어떤 부분이 잘못되었는지 설명해 주세요..." style="width:100%;min-height:60px;border:1px solid var(--border);border-radius:6px;padding:8px 10px;font-size:12px;font-family:'Inter',sans-serif;outline:none;resize:vertical;box-sizing:border-box;"></textarea>
    <div style="display:flex;gap:6px;margin-top:8px;">
      <button onclick="submitReport(this, \${JSON.stringify(question).replace(/"/g, '&quot;')}, \${JSON.stringify(answer).replace(/"/g, '&quot;')})" style="padding:5px 12px;border-radius:6px;border:none;background:var(--navy);color:#fff;font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;">제출</button>
      <button onclick="this.closest('.report-form').remove()" style="padding:5px 12px;border-radius:6px;border:1px solid var(--border);background:#fff;color:var(--sub);font-size:11px;cursor:pointer;font-family:'Inter',sans-serif;">취소</button>
    </div>
  \`;
  btn.closest('.msg-bubble').appendChild(form);
  form.querySelector('textarea').focus();
}

async function submitReport(btn, question, answer) {
  const form = btn.closest('.report-form');
  const text = form.querySelector('.report-text').value.trim();
  if (!text) return;
  await fetch('/api/admin/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section: '오류신고',
      itemNumber: '',
      action: '오류신고',
      content: text,
      reason: 'AI답변: ' + answer.substring(0, 100),
      updatedBy: localStorage.getItem('bsn_user_name') || '알 수 없음',
    })
  });
  form.innerHTML = '<div style="font-size:11px;color:var(--navy);font-weight:600;padding:4px 0;">✓ 오류 신고가 접수되었습니다.</div>';
}

</script>
</body>
</html>`;
}
