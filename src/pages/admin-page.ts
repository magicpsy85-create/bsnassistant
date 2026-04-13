/** BSN 어시스턴트 관리자 페이지 */
export function generateAdminPageHTML(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>관리자 — BSN 어시스턴트</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    :root{
      --primary:#1A1A2E;--primary-dk:#2D2D4A;--primary-lt:#E8E8F0;
      --navy:#2C4A7C;--navy-dark:#1E3560;--navy-light:#EEF2F9;--navy-border:#C5D3EC;
      --accent:#0369A1;--accent-lt:#EFF6FF;
      --warn:#DC2626;--warn-lt:#FEF2F2;
      --success:#16A34A;--success-lt:#F0FDF4;
      --bg:#F8F6F1;--surface:#FFFFFF;--border:#E2E2E2;
      --text:#1A1A2E;--sub:#6B6B80;--muted:#9CA3AF;
      --radius:12px;--shadow:0 1px 4px rgba(0,0,0,0.07);
    }
    body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased;}

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

    /* Layout */
    .container{max-width:1200px;margin:0 auto;padding:28px 24px;}

    /* Tabs */
    .tabs{display:flex;gap:2px;margin-bottom:28px;border-bottom:1px solid var(--border);padding-bottom:0;}
    .tab{padding:12px 20px;font-size:13px;font-weight:600;color:var(--sub);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.15s;}
    .tab:hover{color:var(--text);}
    .tab.active{color:var(--navy);border-bottom-color:var(--navy);}

    /* Cards */
    .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);padding:24px;margin-bottom:20px;}
    .card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
    .card-title{font-size:15px;font-weight:700;}

    /* Table */
    .table-wrap{overflow-x:auto;}
    table{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed;}
    #membersBody table,#members-section table{table-layout:fixed;}
    th{background:#F4F2ED;padding:10px 6px;text-align:left;font-weight:600;color:var(--sub);border-bottom:1px solid var(--border);white-space:nowrap;overflow:hidden;font-size:12px;}
    td{padding:12px 6px;border-bottom:1px solid #F3F3F3;vertical-align:middle;overflow:hidden;}
    tr:hover td{background:#F4F2ED;}
    .tenure{font-size:10px;color:var(--muted);margin-top:1px;}
    .team-tag{font-size:13px;color:var(--text);cursor:pointer;margin-top:1px;}
    .team-tag:hover{text-decoration:underline;color:var(--navy);}

    /* Badges */
    .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;}
    .badge-ai{background:#EEF2F9;color:#2C4A7C;border:1px solid #C5D3EC;}
    .badge-human{background:#FFF7ED;color:#C2410C;border:1px solid #FED7AA;}
    .badge-error{background:#FCEBEB;color:#E24B4A;border:1px solid #F7C1C1;}
    .answer-row{display:none;background:var(--bg);}
    .answer-row.open{display:table-row;}
    .answer-row td{padding:12px 16px;font-size:12px;color:var(--sub);line-height:1.7;white-space:pre-wrap;word-break:break-word;border-top:none;}
    .question-row{cursor:pointer;}
    .question-row:hover{background:rgba(44,74,124,0.02);}
    .q-arrow{font-size:10px;color:var(--muted);margin-left:4px;display:inline-block;transition:transform 0.2s;}
    .q-arrow.open{transform:rotate(180deg);}
    .badge-pending{background:var(--accent-lt);color:var(--accent);}
    .badge-applied{background:var(--success-lt);color:var(--success);}

    /* Buttons */
    .btn{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:var(--surface);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:'Inter',sans-serif;}
    .btn:hover{border-color:var(--navy);color:var(--navy);}
    .btn-primary{background:var(--navy);color:#fff;border-color:var(--navy);}
    .btn-primary:hover{background:var(--navy-dark);border-color:var(--navy-dark);}
    .btn-danger{color:var(--warn);border-color:#FECACA;}
    .btn-danger:hover{background:var(--warn-lt);}
    .btn-sm{padding:5px 12px;font-size:12px;}

    /* Filter */
    .filter-bar{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center;}
    .filter-bar input,.filter-bar select{padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:'Inter',sans-serif;outline:none;background:#fff;transition:border-color 0.15s;}
    .filter-bar input:focus,.filter-bar select:focus{border-color:var(--navy);}

    /* Stats */
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px;}
    .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center;cursor:pointer;transition:all 0.15s;box-shadow:var(--shadow);}
    .stat-card:hover{border-color:var(--navy);}.stat-card.active{border:2px solid var(--navy);background:var(--navy-light);}
    .stat-card:hover{border-color:var(--navy);}
    .stat-card.active{border-color:var(--navy);background:var(--navy-light);}
    .stat-num{font-size:26px;font-weight:800;color:var(--primary);font-family:'Poppins',sans-serif;}
    .stat-label{font-size:12px;color:var(--sub);margin-top:4px;font-weight:500;}

    /* Rule Editor - Split Layout */
    .rule-split{display:flex;gap:16px;height:calc(100vh - 220px);min-height:500px;}
    .rule-left{width:35%;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);overflow:hidden;}
    .rule-right{width:65%;display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);overflow:hidden;}
    .rule-panel-header{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;background:#F4F2ED;}
    .rule-panel-title{font-size:14px;font-weight:700;flex:1;}
    .rule-tree{flex:1;overflow-y:auto;padding:0 0 8px;}
    .rule-tree::-webkit-scrollbar{width:4px;}
    .rule-tree::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:2px;}
    .section-item{padding:10px 16px;font-size:13px;font-weight:500;color:var(--text);cursor:pointer;display:flex;align-items:center;gap:8px;border-bottom:1px solid #F3F3F3;transition:all 0.1s;user-select:none;}
    .section-item:hover{background:#F5F4F0;}
    .section-item.active{background:#EEF2F9;border-left:3px solid #2C4A7C;color:#2C4A7C;font-weight:600;padding-left:13px;}
    .section-item .section-check{display:none;flex-shrink:0;}
    .section-item .section-check.show{display:inline-flex;}
    .section-item .section-check input{width:15px;height:15px;cursor:pointer;}
    .section-item .section-name{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .btn-md-save{padding:6px 14px;border-radius:8px;border:none;background:#2C4A7C;color:white;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;white-space:nowrap;}
    .btn-md-save:hover{background:#1E3A5F;}
    .rule-editor-area{flex:1;display:flex;flex-direction:column;overflow:hidden;}
    .rule-editor-placeholder{flex:1;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;}
    .rule-editor-content{flex:1;display:flex;flex-direction:column;padding:16px;}
    .rule-editor-label{font-size:12px;font-weight:600;color:var(--sub);margin-bottom:8px;}
    .rule-editor-textarea{flex:1;width:100%;border:1px solid var(--border);border-radius:8px;padding:12px;font-size:13px;font-family:'Inter',sans-serif;outline:none;resize:none;line-height:1.8;transition:border-color 0.15s;box-sizing:border-box;}
    .rule-editor-textarea:focus{border-color:var(--navy);}
    .rule-editor-actions{display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--border);background:#F4F2ED;}
    .btn-add-section{font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid var(--navy);color:var(--navy);background:white;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;}
    .btn-add-section:hover{background:var(--navy-light);}
    .btn-del-section{font-size:12px;padding:4px 10px;border-radius:6px;border:1px solid var(--warn);color:var(--warn);background:white;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;}
    .btn-del-section:hover{background:var(--warn-lt);}
    .btn-md-sync{padding:6px 14px;border-radius:8px;border:none;background:var(--primary);color:white;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;}
    .btn-md-sync:hover{background:var(--primary-dk);}
    .draft-textarea{width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 8px;font-size:12px;font-family:'Inter',sans-serif;outline:none;resize:vertical;min-height:40px;line-height:1.5;transition:border-color 0.15s;box-sizing:border-box;}
    .draft-textarea:focus{border-color:#2C4A7C;}
    .btn-del{padding:4px 10px;border:1px solid #EF4444;color:#EF4444;background:white;border-radius:6px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;transition:all 0.15s;white-space:nowrap;}
    .btn-del:hover{background:#FEF2F2;}

    /* Rule Form */
    .rule-form{display:flex;flex-direction:column;gap:14px;}
    .form-row{display:flex;gap:12px;}
    .form-row>*{flex:1;}
    .form-group label{display:block;font-size:12px;font-weight:600;color:var(--sub);margin-bottom:6px;}
    .form-group input,.form-group select,.form-group textarea{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:'Inter',sans-serif;outline:none;background:#fff;transition:border-color 0.15s;}
    .form-group textarea{min-height:80px;resize:vertical;}
    .form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:var(--navy);}

    @media(max-width:900px){
      .rule-split{flex-direction:column;height:auto;}
      .rule-left,.rule-right{width:100%;}
      .rule-left{max-height:300px;}
      .rule-right{min-height:400px;}
    }

    /* Pagination */
    .pagination{display:flex;justify-content:center;gap:4px;margin-top:16px;}
    .page-btn{width:32px;height:32px;border:1px solid var(--border);border-radius:8px;background:var(--surface);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
    .page-btn:hover{border-color:var(--navy);}
    .page-btn.active{background:var(--navy);color:#fff;border-color:var(--navy);}

    /* Inline edit */
    tr.editing td{background:#FEFCE8;padding:4px 6px;}
    tr.editing input,tr.editing select{width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:'Inter',sans-serif;outline:none;background:#fff;box-sizing:border-box;transition:border-color 0.15s;}
    tr.editing input:focus,tr.editing select:focus{border-color:var(--navy);}
    tr.editing input{min-width:60px;}
    .inline-actions{display:flex;gap:4px;white-space:nowrap;}

    /* Toast */
    .toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;background:#1F2937;color:#fff;border-radius:10px;font-size:13px;font-weight:500;z-index:100;opacity:0;transform:translateY(10px);transition:all 0.3s;}
    .toast.show{opacity:1;transform:translateY(0);}

    /* Login overlay */
    .login-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.35);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;}
    .login-box{background:#fff;border-radius:16px;padding:36px 32px;width:380px;box-shadow:0 8px 32px rgba(0,0,0,0.12);}
    .login-box h2{font-size:18px;font-weight:700;margin-bottom:6px;}
    .login-box p{font-size:13px;color:var(--sub);margin-bottom:20px;}
    .login-box input{width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:8px;font-size:14px;font-family:'Inter',sans-serif;outline:none;margin-bottom:10px;transition:border-color 0.15s;}
    .login-box input:focus{border-color:var(--navy);}
    .login-box .login-btn{width:100%;padding:12px;border:none;border-radius:8px;background:var(--navy);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:background 0.15s;}
    .login-box .login-btn:hover{background:var(--navy-dark);}
    .login-box .login-error{color:var(--warn);font-size:12px;margin-bottom:10px;display:none;}

    /* Section hidden */
    .section{display:none;}
    .section.active{display:block;}

    @media(max-width:768px){
      .form-row{flex-direction:column;}
      .stats{grid-template-columns:1fr 1fr;}
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
      <a href="/insta" class="nav-link">실거래가</a>
      <a href="/insta#content" class="nav-link">콘텐츠 생성</a>
      <a href="/chatbot" class="nav-link">챗봇</a>
      <a href="/admin" class="nav-link active">관리자</a>
    </div>
    <div class="nav-spacer"></div>
    <span id="adminUserName" style="font-size:12px;color:#6B6B80;margin-right:8px;"></span>
    <button onclick="doLogout()" class="nav-btn">나가기</button>
  </div>
</nav>

<!-- Login overlay -->
<div id="adminLoginOverlay" class="login-overlay" style="display:none;">
  <div class="login-box" style="text-align:center;">
    <div style="font-size:28px;margin-bottom:8px;">&#128272;</div>
    <h2>관리자 로그인</h2>
    <p>관리자 권한이 있는 Google 계정으로 로그인하세요.</p>
    <button class="login-btn" id="adminGoogleBtn" onclick="doAdminGoogleLogin()" style="display:flex;align-items:center;justify-content:center;gap:8px;">
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
      Google로 로그인
    </button>
    <div class="login-error" id="adminLoginError"></div>
  </div>
</div>

<div class="container">
  <!-- Tabs -->
  <div class="tabs">
    <button class="tab active" onclick="switchTab('records')">상담 기록</button>
    <button class="tab" onclick="switchTab('rules')">규정 설정</button>
    <button class="tab" onclick="switchTab('members')">사용자 관리</button>
  </div>

  <!-- 상담 기록 -->
  <div id="records-section" class="section active">
    <div class="stats" id="stats"></div>
    <div id="userFilterBanner" style="display:none;background:var(--navy-light);border:1px solid var(--navy);border-radius:10px;padding:10px 16px;margin-bottom:16px;display:none;align-items:center;gap:12px;">
      <span id="userFilterLabel" style="font-size:13px;font-weight:600;color:var(--navy);"></span>
      <button onclick="clearUserFilter()" class="btn btn-sm" style="font-size:11px;padding:3px 10px;">전체 보기</button>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">상담 기록</div>
        <input type="text" id="searchInput" placeholder="사용자, 질문 검색..." oninput="filterRecords()" style="width:200px;padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;font-family:inherit;outline:none;background:var(--surface);color:var(--text);margin-left:12px;">
        <div style="flex:1;"></div>
        <button class="btn btn-sm" onclick="exportCSV()">CSV 내보내기</button>
      </div>
      <div class="table-wrap">
        <table style="width:100%;table-layout:fixed;border-collapse:collapse;">
          <colgroup>
            <col style="width:150px">
            <col style="width:200px">
            <col>
            <col style="width:100px">
          </colgroup>
          <thead><tr><th style="text-align:center;">시간</th><th style="text-align:center;">사용자</th><th style="text-align:center;">질문</th><th style="text-align:center;">결과</th></tr></thead>
          <tbody id="recordsBody"></tbody>
        </table>
      </div>
      <div class="pagination" id="pagination"></div>
    </div>
  </div>

  <!-- 명단 관리 -->
  <div id="members-section" class="section">
    <div class="stats" id="memberStats"></div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">사용자 명단</div>
        <button class="btn btn-sm" onclick="exportMembersCSV()">CSV 내보내기</button>
      </div>
      <div class="filter-bar">
        <button class="btn btn-primary btn-sm" onclick="addNewMemberRow()">+ 추가</button>
        <input type="text" id="memberSearchInput" placeholder="이름 검색..." oninput="filterMemberList()">
        <select id="memberGroupFilter" onchange="filterMemberList()">
          <option value="">전체 인원</option>
          <option value="팀장">팀장</option>
          <option value="팀원">팀원</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:40px;text-align:center;">No</th>
              <th style="width:90px;text-align:center;">최근로그인</th>
              <th style="width:80px;text-align:center;">위촉일</th>
              <th style="width:70px;text-align:center;">성명</th>
              <th style="width:80px;text-align:center;">소속</th>
              <th style="width:60px;text-align:center;">직책</th>
              <th style="width:110px;text-align:center;">연락처</th>
              <th style="width:180px;text-align:center;">이메일</th>
              <th style="width:56px;text-align:center;">권한</th>
              <th style="width:100px;text-align:center;">관리</th>
            </tr>
          </thead>
          <tbody id="membersBody"></tbody>
        </table>
      </div>
      <div class="pagination" id="memberPagination"></div>
    </div>
  </div>

  <!-- 규정 설정 -->
  <div id="rules-section" class="section">
    <div class="rule-split">
      <!-- 좌측: 규정 트리 -->
      <div class="rule-left">
        <div class="rule-panel-header">
          <div class="rule-panel-title">규정 목차</div>
          <div style="display:flex;gap:4px;" id="sectionBtnGroup">
            <button class="btn-add-section" onclick="addNewSection()" title="섹션 추가">+ 추가</button>
            <button class="btn-del-section" id="delSectionBtn" onclick="startDeleteMode()" title="섹션 삭제">− 삭제</button>
            <button class="btn-del-section" id="delConfirmBtn" onclick="confirmDeleteSections()" style="display:none;border-color:#DC2626;color:#DC2626;">삭제 확인</button>
            <button class="btn-add-section" id="delCancelBtn" onclick="cancelDeleteMode()" style="display:none;">취소</button>
          </div>
        </div>
        <div class="rule-tree" id="ruleTree">로딩 중...</div>
      </div>
      <!-- 우측: 편집기 -->
      <div class="rule-right">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border);background:#F4F2ED;">
          <span id="ruleEditorTitle" style="font-weight:600;font-size:15px;color:var(--text);white-space:nowrap;">규정 편집</span>
          <div style="display:flex;align-items:center;gap:8px;flex:1;margin-left:16px;max-width:340px;">
            <input id="ruleSearchInput" type="text" placeholder="규정 내용 검색..." style="width:100%;padding:6px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:white;outline:none;font-family:'Inter',sans-serif;" oninput="searchRules(this.value)" onfocus="this.style.borderColor='#2C4A7C'" onblur="this.style.borderColor='var(--border)'">
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-left:8px;">
            <button class="btn-md-save" onclick="syncMdFile()">\u{1F4BE} MD 저장</button>
          </div>
        </div>
        <div class="rule-editor-area" id="ruleEditorArea">
          <div id="searchResults" style="display:none;"></div>
          <div class="rule-editor-placeholder">좌측에서 섹션 또는 항목을 선택하세요</div>
        </div>
      </div>
    </div>

    <!-- 변경 이력 -->
    <div class="card" style="margin-top:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px 0;">
        <span style="font-weight:700;font-size:15px;">변경 이력</span>
        <div style="display:flex;gap:6px;">
          <button class="draft-filter-btn" data-action="all" onclick="filterDrafts('all')" style="background:#2C4A7C;color:white;border:1px solid #2C4A7C;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;">전체</button>
          <button class="draft-filter-btn" data-action="수정" onclick="filterDrafts('수정')" style="background:white;color:var(--sub);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;">수정</button>
          <button class="draft-filter-btn" data-action="추가" onclick="filterDrafts('추가')" style="background:white;color:var(--sub);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;">추가</button>
          <button class="draft-filter-btn" data-action="삭제" onclick="filterDrafts('삭제')" style="background:white;color:var(--sub);border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;">삭제</button>
          <button class="draft-filter-btn" data-action="오류신고" onclick="filterDrafts('오류신고')" style="background:white;color:#C2410C;border:1px solid #FED7AA;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;">오류신고</button>
        </div>
      </div>
      <div class="table-wrap">
        <table style="width:100%;table-layout:fixed;border-collapse:collapse;">
          <colgroup>
            <col style="width:140px">
            <col style="width:70px">
            <col style="width:80px">
            <col style="width:56px">
            <col>
            <col style="width:56px">
          </colgroup>
          <thead><tr><th>시간</th><th>수정자</th><th style="padding-right:4px;">섹션</th><th style="text-align:center;padding-left:2px;padding-right:2px;">작업</th><th>내용</th><th style="text-align:center;">삭제</th></tr></thead>
          <tbody id="draftsBody"></tbody>
        </table>
      </div>
    </div>
  </div>

</div>

<div class="toast" id="toast"></div>

<script>
let allRecords = [];
let allDrafts = [];
let currentDraftFilter = 'all';
const PAGE_SIZE = 20;
let currentPage = 1;
let recordMembers = {}; // userId -> member info
let filterUserId = null; // 사용자별 필터
let statFilter = null;

let allMembers = [];
let draftMembers = {}; // name lookup for drafts: updatedBy -> member name
window._deleteMode = false;
let memberPage = 1;
const MEMBER_PAGE_SIZE = 9999;

// ─── BroadcastChannel ───
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
      location.href = '/';
    }
    if (e.data === 'kicked') {
      sessionStorage.removeItem('bsn_session_active');
      document.querySelector('.container').innerHTML = '<div class="card" style="text-align:center;padding:60px;"><div style="font-size:36px;margin-bottom:12px;">&#128274;</div><h2 style="margin-bottom:12px;">다른 기기에서 로그인됨</h2><p style="color:var(--sub);margin-bottom:20px;">동일 계정으로 다른 곳에서 로그인하여 현재 세션이 종료되었습니다.</p><a href="/" class="btn btn-primary">다시 로그인</a></div>';
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

// ─── Firebase Google 로그인 (관리자) ───
var firebaseApp = null;
var firebaseAuthInstance = null;

async function initFirebase() {
  try {
    var configRes = await fetch('/api/auth/config');
    var config = await configRes.json();
    firebaseApp = firebase.initializeApp(config);
    firebaseAuthInstance = firebase.auth();
  } catch(e) { console.error('[Firebase] 초기화 실패', e); }
}

async function checkAdminAccess() {
  await initFirebase();

  var hasLocal = localStorage.getItem('bsn_user_name') && localStorage.getItem('bsn_user_id');
  if (!hasLocal) {
    return await showAdminLogin();
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
    return await showAdminLogin();
  }

  var sEmail = localStorage.getItem('bsn_user_email');
  var sSid = localStorage.getItem('bsn_session_id');
  if (sEmail && sSid) {
    try {
      var sRes = await fetch('/api/auth/check-session', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:sEmail,sessionId:sSid}) });
      if (!sRes.ok) {
        var sData = await sRes.json();
        if (sData.kicked) {
          sessionStorage.removeItem('bsn_session_active');
          if (bsnChannel) bsnChannel.postMessage('kicked');
          document.querySelector('.container').innerHTML = '<div class="card" style="text-align:center;padding:60px;"><div style="font-size:36px;margin-bottom:12px;">&#128274;</div><h2 style="margin-bottom:12px;">다른 기기에서 로그인됨</h2><p style="color:var(--sub);margin-bottom:20px;">동일 계정으로 다른 곳에서 로그인하여 현재 세션이 종료되었습니다.</p><a href="/" class="btn btn-primary">다시 로그인</a></div>';
          return false;
        }
      }
    } catch(e) {}
  }

  var token = localStorage.getItem('bsn_firebase_token');
  if (!token) return await showAdminLogin();

  try {
    var res = await fetch('/api/auth/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({idToken:token}) });
    if (!res.ok) return await showAdminLogin();
    var data = await res.json();
    if (!data.user || data.user.role !== '관리자') {
      document.querySelector('.container').innerHTML = '<div class="card" style="text-align:center;padding:60px;"><div style="font-size:36px;margin-bottom:12px;">&#128683;</div><h2 style="margin-bottom:12px;">관리자 전용 페이지</h2><p style="color:var(--sub);margin-bottom:20px;">관리자 권한이 있는 계정만 접근할 수 있습니다.<br>현재 계정: ' + esc(data.user.email || '') + '</p><a href="/" class="btn btn-primary">챗봇으로 돌아가기</a></div>';
      return false;
    }
    localStorage.setItem('bsn_user_role', data.user.role);
    localStorage.setItem('bsn_session_id', data.user.sessionId || '');
    sessionStorage.setItem('bsn_session_active', 'true');
    document.getElementById('adminUserName').textContent = data.user.name || localStorage.getItem('bsn_user_name') || '';
    return true;
  } catch(e) {
    return await showAdminLogin();
  }
}

function showAdminLogin() {
  return new Promise(function(resolve) {
    document.getElementById('adminLoginOverlay').style.display = 'flex';
    window._adminLoginResolve = resolve;
  });
}

async function doAdminGoogleLogin() {
  var errEl = document.getElementById('adminLoginError');
  errEl.style.display = 'none';
  var btn = document.getElementById('adminGoogleBtn');
  btn.disabled = true; btn.textContent = '로그인 중...';
  try {
    var provider = new firebase.auth.GoogleAuthProvider();
    var result = await firebaseAuthInstance.signInWithPopup(provider);
    var idToken = await result.user.getIdToken();
    var res = await fetch('/api/auth/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({idToken:idToken}) });
    if (!res.ok) {
      var errData = await res.json();
      errEl.textContent = errData.error || '등록되지 않은 계정입니다';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Google로 로그인';
      return;
    }
    var data = await res.json();
    if (!data.user) throw new Error('인증 실패');
    if (data.user.role !== '관리자') {
      errEl.textContent = '관리자 권한이 없는 계정입니다. (' + data.user.email + ')';
      errEl.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Google로 로그인';
      return;
    }
    localStorage.setItem('bsn_user_name', data.user.name);
    localStorage.setItem('bsn_user_id', data.user.uid);
    localStorage.setItem('bsn_user_role', data.user.role);
    localStorage.setItem('bsn_user_email', data.user.email);
    localStorage.setItem('bsn_user_picture', data.user.picture || '');
    localStorage.setItem('bsn_firebase_token', idToken);
    localStorage.setItem('bsn_session_id', data.user.sessionId || '');
    sessionStorage.setItem('bsn_session_active', 'true');
    document.getElementById('adminLoginOverlay').style.display = 'none';
    if (window._adminLoginResolve) window._adminLoginResolve(true);
  } catch(e) {
    errEl.textContent = '로그인 중 오류가 발생했습니다';
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Google로 로그인';
  }
}

async function init() {
  const hasAccess = await checkAdminAccess();
  if (!hasAccess) return;
  try {
    await Promise.all([loadRecords(), loadDraftMembers(), loadDrafts(), loadRules(), loadMemberList()]);
  } catch(e) {
    console.error('[init] 데이터 로드 오류:', e);
    // 개별 로드 재시도
    try { await loadRecords(); } catch(e2) { console.error('[loadRecords]', e2); }
    try { await loadDraftMembers(); } catch(e2) { console.error('[loadDraftMembers]', e2); }
    try { await loadDrafts(); } catch(e2) { console.error('[loadDrafts]', e2); }
    try { await loadRules(); } catch(e2) { console.error('[loadRules]', e2); }
    try { await loadMemberList(); } catch(e2) { console.error('[loadMemberList]', e2); }
  }
}

function doLogout() {
  try { firebase.auth().signOut(); } catch(e) {}
  localStorage.removeItem('bsn_user_name');
  localStorage.removeItem('bsn_user_id');
  localStorage.removeItem('bsn_user_role');
  localStorage.removeItem('bsn_user_email');
  localStorage.removeItem('bsn_user_picture');
  localStorage.removeItem('bsn_firebase_token');
  location.href = '/';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

async function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById(name + '-section').classList.add('active');
  if (name === 'records') {
    statFilter = null;
    document.getElementById('searchInput').value = '';
    currentPage = 1;
  }
  if (name === 'members') {
    statFilter = null;
    teamFilter = null;
    document.getElementById('memberSearchInput').value = '';
    document.getElementById('memberGroupFilter').value = '';
    memberPage = 1;
    updateMemberStats();
    renderMemberList();
  }
  if (name === 'rules') {
    await loadDraftMembers();
    renderDrafts();
  }
}

async function loadDraftMembers() {
  try {
    const res = await fetch('/api/members');
    const members = await res.json();
    draftMembers = {};
    members.forEach(m => { draftMembers[m.name] = m; });
    window.cachedMembers = members;
  } catch(e) {}
}

function resolveUpdaterName(updatedBy) {
  const members = window.cachedMembers || [];
  if (!updatedBy) return '알 수 없음';
  const byName = members.find(m => m.name === updatedBy);
  if (byName) return byName.name;
  const byEmail = members.find(m => m.email === updatedBy);
  if (byEmail) return byEmail.name;
  const byNo = members.find(m => String(m.no) === String(updatedBy));
  if (byNo) return byNo.name;
  if (updatedBy === '관리자') {
    const currentName = localStorage.getItem('bsn_user_name');
    if (currentName) {
      const byCurrentName = members.find(m => m.name === currentName);
      if (byCurrentName) return byCurrentName.name;
      return currentName;
    }
  }
  return updatedBy;
}

// ═══ 상담 기록 ═══
async function loadRecords() {
  const [recRes, memRes] = await Promise.all([fetch('/api/admin/records'), fetch('/api/members')]);
  allRecords = await recRes.json();
  const members = await memRes.json();
  recordMembers = {};
  members.forEach(m => { recordMembers[m.name] = m; });

  if (filterUserId) {
    allRecords = allRecords.filter(r => r.userName === filterUserId);
  }

  updateStats();
  populateUserFilter();
  renderRecords();

  const banner = document.getElementById('userFilterBanner');
  if (filterUserId && recordMembers[filterUserId]) {
    const m = recordMembers[filterUserId];
    document.getElementById('userFilterLabel').textContent = m.name + '님의 질문 기록 (' + allRecords.length + '건)';
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function updateStats() {
  const total = allRecords.length;
  const aiSolved = allRecords.filter(r => r.status === 'AI해결').length;
  const humanReq = allRecords.filter(r => r.status === '직접 문의').length;
  const errorCount = allRecords.filter(r => r.status === '오류').length;
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = allRecords.filter(r => r.timestamp.slice(0, 10) === today).length;
  const users = new Set(allRecords.map(r => r.userName)).size;

  document.getElementById('stats').innerHTML = \`
    <div class="stat-card \${statFilter === null ? 'active' : ''}" onclick="filterByStat(null)"><div class="stat-num">\${total}</div><div class="stat-label">전체 상담</div></div>
    <div class="stat-card \${statFilter === 'AI해결' ? 'active' : ''}" onclick="filterByStat('AI해결')"><div class="stat-num">\${aiSolved}</div><div class="stat-label">AI 해결</div></div>
    <div class="stat-card \${statFilter === '직접 문의' ? 'active' : ''}" onclick="filterByStat('직접 문의')"><div class="stat-num">\${humanReq}</div><div class="stat-label">직접 문의</div></div>
    <div class="stat-card \${statFilter === '오류' ? 'active' : ''}" onclick="filterByStat('오류')"><div class="stat-num" style="\${errorCount > 0 ? 'color:#E24B4A;' : ''}">\${errorCount}</div><div class="stat-label">오류 신고</div></div>
    <div class="stat-card \${statFilter === 'today' ? 'active' : ''}" onclick="filterByStat('today')"><div class="stat-num">\${todayCount}</div><div class="stat-label">오늘 상담</div></div>
    <div class="stat-card"><div class="stat-num">\${users}</div><div class="stat-label">이용자 수</div></div>
  \`;
}

function populateUserFilter() {}

function filterByStat(type) {
  statFilter = type;
  document.getElementById('searchInput').value = '';
  currentPage = 1;
  updateStats();
  renderRecords();
}

function filterRecords() { currentPage = 1; renderRecords(); }

function getFilteredRecords() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  return allRecords.filter(r => {
    if (search && !r.userName.toLowerCase().includes(search) && !r.question.toLowerCase().includes(search)) return false;
    if (statFilter === 'AI해결' || statFilter === '직접 문의' || statFilter === '오류') {
      if (r.status !== statFilter) return false;
    }
    if (statFilter === 'today' && r.timestamp.slice(0, 10) !== today) return false;
    return true;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function renderRecords() {
  const filtered = getFilteredRecords();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);

  document.getElementById('recordsBody').innerHTML = page.map((r, idx) => {
    const m = recordMembers[r.userName];
    const userDisplay = m
      ? '<span style="cursor:pointer;color:var(--navy);text-decoration:underline;font-weight:600;" onclick="filterByUser(\\'' + esc(r.userName).replace(/'/g, "\\\\'") + '\\')">' + esc(m.name) + '</span><span style="font-size:11px;color:var(--sub);margin-left:4px;">' + esc(m.department) + (m.team && m.team !== '-' ? ' ' + esc(m.team) : '') + ' / ' + esc(m.position) + '</span>'
      : esc(r.userName);
    var badgeClass = r.status === 'AI해결' ? 'badge-ai' : r.status === '오류' ? 'badge-error' : 'badge-human';
    var rowId = 'ans_' + start + '_' + idx;
    return \`
    <tr class="question-row" onclick="var a=document.getElementById('\${rowId}');var ar=this.querySelector('.q-arrow');if(a){a.classList.toggle('open');if(ar)ar.classList.toggle('open');}">
      <td style="white-space:nowrap;font-size:12px;text-align:center;">\${formatDate(r.timestamp)}</td>
      <td style="text-align:center;">\${userDisplay}</td>
      <td>\${esc(r.question.slice(0, 80))}\${r.question.length > 80 ? '...' : ''} <span class="q-arrow">&#9660;</span></td>
      <td style="text-align:center;"><span class="badge \${badgeClass}">\${r.status}</span></td>
    </tr>
    <tr class="answer-row" id="\${rowId}">
      <td colspan="4">\${r.answer ? esc(r.answer) : '<span style="color:var(--muted);">답변 기록 없음</span>'}</td>
    </tr>
  \`; }).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:40px;">상담 기록이 없습니다</td></tr>';

  let pHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    pHtml += \`<button class="page-btn \${i === currentPage ? 'active' : ''}" onclick="goPage(\${i})">\${i}</button>\`;
  }
  document.getElementById('pagination').innerHTML = pHtml;
}

function goPage(p) { currentPage = p; renderRecords(); }

function filterByUser(userName) {
  filterUserId = userName;
  currentPage = 1;
  loadRecords();
}

function clearUserFilter() {
  filterUserId = null;
  currentPage = 1;
  loadRecords();
}



function exportCSV() {
  const filtered = getFilteredRecords();
  const header = '시간,사용자,질문,답변,상태\\n';
  const rows = filtered.map(r => \`"\${r.timestamp}","\${r.userName}","\${r.question.replace(/"/g, '""')}","\${(r.answer || '').replace(/"/g, '""')}","\${r.status}"\`).join('\\n');
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), header + rows], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'chatbot-records.csv';
  a.click();
}

// ═══ 규정 설정 ═══
let ruleContent = '';
let ruleSections = []; // { title, startIdx, endIdx, items: [{ num, text, lineIdx }] }
let selectedSection = null;
let selectedItem = null;

async function loadRules() {
  const res = await fetch('/api/admin/rules');
  const data = await res.json();
  ruleContent = data.content || '';
  window.cachedRulesContent = ruleContent;
  parseRuleSections();
  renderRuleTree();
}

function parseRuleSections() {
  ruleSections = [];
  const lines = ruleContent.split('\\n');
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      if (currentSection) {
        currentSection.endIdx = i;
        ruleSections.push(currentSection);
      }
      currentSection = { title: line.replace('# ', '').trim(), startIdx: i, endIdx: lines.length, items: [] };
    } else if (currentSection) {
      const itemMatch = line.match(/^(\\d+)\\.\\s+(.+)/);
      if (itemMatch) {
        currentSection.items.push({ num: itemMatch[1], text: itemMatch[2].trim(), lineIdx: i });
      }
    }
  }
  if (currentSection) {
    currentSection.endIdx = lines.length;
    ruleSections.push(currentSection);
  }
}

function renderRuleTree() {
  const tree = document.getElementById('ruleTree');
  if (ruleSections.length === 0) {
    tree.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">규정이 없습니다</div>';
    return;
  }

  let html = '';
  ruleSections.forEach((sec, si) => {
    const isActive = selectedSection === si;
    const showCheck = window._deleteMode;
    html += '<div class="section-item' + (isActive ? ' active' : '') + '" onclick="selectSection(' + si + ')">';
    html += '<span class="section-check' + (showCheck ? ' show' : '') + '"><input type="checkbox" value="' + si + '" onclick="event.stopPropagation()"></span>';
    html += '<span class="section-name">' + esc(sec.title) + '</span>';
    html += '</div>';
  });

  tree.innerHTML = html || '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">규정이 없습니다</div>';
}

async function searchRules(query) {
  const resultsEl = document.getElementById('searchResults');
  if (!query || query.trim().length < 1) {
    if (resultsEl) resultsEl.style.display = 'none';
    return;
  }
  if (!window.cachedRulesContent) {
    window.cachedRulesContent = ruleContent || '';
    if (!window.cachedRulesContent) {
      try {
        const res = await fetch('/api/admin/rules');
        const data = await res.json();
        window.cachedRulesContent = data.content || '';
      } catch(e) {}
    }
  }
  const content = window.cachedRulesContent || '';
  const lines = content.split('\\n');
  const q = query.trim().toLowerCase();
  const matches = [];
  lines.forEach((line, i) => {
    if (line.toLowerCase().includes(q)) {
      let sectionName = '';
      for (let j = i; j >= 0; j--) {
        if (lines[j].startsWith('# ')) {
          sectionName = lines[j].replace('# ', '').trim();
          break;
        }
      }
      matches.push({ line: line.trim(), sectionName, lineIndex: i });
    }
  });
  if (!resultsEl) return;
  resultsEl.style.cssText = 'display:block;max-height:calc(100vh - 320px);overflow-y:auto;padding:8px;background:white;border-bottom:1px solid var(--border);';
  if (matches.length === 0) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">&quot;' + esc(query) + '&quot;에 해당하는 규정을 찾을 수 없습니다.</div>';
    return;
  }
  const escQ = query.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$$&');
  resultsEl.innerHTML = matches.slice(0, 20).map(m => {
    const highlighted = esc(m.line).replace(new RegExp(escQ, 'gi'), match => '<mark style="background:#FEF9C3;color:#854D0E;border-radius:2px;padding:0 1px;">' + match + '</mark>');
    return '<div onclick="selectSearchResult(\\'' + esc(m.sectionName).replace(/'/g, "\\\\\\\\'") + '\\')" style="padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:4px;border:1px solid var(--border);transition:background 0.15s;" onmouseover="this.style.background=\\'#F5F4F0\\'" onmouseout="this.style.background=\\'white\\'"><div style="font-size:11px;color:#2C4A7C;font-weight:600;margin-bottom:4px;">' + esc(m.sectionName || '섹션 없음') + '</div><div style="font-size:13px;color:var(--text);line-height:1.5;">' + highlighted + '</div></div>';
  }).join('');
  if (matches.length > 20) {
    resultsEl.innerHTML += '<div style="padding:8px;text-align:center;font-size:12px;color:var(--muted);">총 ' + matches.length + '건 중 20건 표시</div>';
  }
}

function selectSearchResult(sectionName) {
  document.getElementById('ruleSearchInput').value = '';
  const resultsEl = document.getElementById('searchResults');
  if (resultsEl) resultsEl.style.display = 'none';
  if (sectionName) {
    const si = ruleSections.findIndex(s => s.title === sectionName);
    if (si !== -1) selectSection(si);
  }
}

function selectSection(si) {
  if (window._deleteMode) return;
  if (selectedSection === si) {
    selectedSection = null;
    renderRuleTree();
    showEditorPlaceholder();
    return;
  }
  selectedSection = si;
  selectedItem = null;
  renderRuleTree();
  showSectionEditor(si);
}

function showEditorPlaceholder() {
  document.getElementById('ruleEditorTitle').textContent = '규정 편집';
  document.getElementById('ruleEditorArea').innerHTML = '<div id="searchResults" style="display:none;"></div><div class="rule-editor-placeholder">좌측에서 섹션을 선택하세요</div>';
}

function showSectionEditor(si) {
  const sec = ruleSections[si];
  if (!sec) return;
  const lines = ruleContent.split('\\n');
  const sectionText = lines.slice(sec.startIdx, sec.endIdx).join('\\n');

  document.getElementById('ruleEditorTitle').textContent = sec.title;
  document.getElementById('ruleEditorArea').innerHTML = \`
    <div id="searchResults" style="display:none;"></div>
    <div class="rule-editor-content">
      <div class="rule-editor-label">섹션 전체 편집 (마크다운)</div>
      <textarea class="rule-editor-textarea" id="ruleEditTA">\${esc(sectionText)}</textarea>
    </div>
    <div class="rule-editor-actions">
      <button class="btn btn-primary btn-sm" onclick="saveSectionEdit(\${si})">저장</button>
      <button class="btn btn-sm" onclick="showEditorPlaceholder()">취소</button>
    </div>
  \`;
}

function showItemEditor(si, itemNum) {
  const sec = ruleSections[si];
  if (!sec) return;
  const item = sec.items.find(it => it.num === itemNum);
  if (!item) return;

  document.getElementById('ruleEditorTitle').textContent = sec.title + ' > 항목 ' + itemNum;
  document.getElementById('ruleEditorArea').innerHTML = \`
    <div id="searchResults" style="display:none;"></div>
    <div class="rule-editor-content">
      <div class="rule-editor-label">항목 \${itemNum} 편집</div>
      <textarea class="rule-editor-textarea" id="ruleEditTA" style="min-height:100px;">\${esc(item.text)}</textarea>
      <div style="margin-top:10px;">
        <div class="rule-editor-label">변경 사유 (선택)</div>
        <input type="text" id="ruleEditReason" placeholder="변경 사유를 입력하세요" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:'Inter',sans-serif;outline:none;box-sizing:border-box;">
      </div>
    </div>
    <div class="rule-editor-actions">
      <button class="btn btn-primary btn-sm" onclick="saveItemEdit(\${si}, '\${itemNum}')">저장</button>
      <button class="btn btn-danger btn-sm" onclick="deleteItem(\${si}, '\${itemNum}')">삭제</button>
      <button class="btn btn-sm" onclick="showEditorPlaceholder()">취소</button>
    </div>
  \`;
}

async function saveSectionEdit(si) {
  const sec = ruleSections[si];
  const newText = document.getElementById('ruleEditTA').value;
  const lines = ruleContent.split('\\n');
  const before = lines.slice(0, sec.startIdx).join('\\n');
  const after = lines.slice(sec.endIdx).join('\\n');
  ruleContent = before + (before ? '\\n' : '') + newText + (after ? '\\n' : '') + after;

  await fetch('/api/admin/rules/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: ruleContent })
  });

  await fetch('/api/admin/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: sec.title, itemNumber: 'all', action: '수정', content: '섹션 전체 수정', reason: '관리자 직접 편집', updatedBy: getAdminName() })
  });

  parseRuleSections();
  renderRuleTree();
  showSectionEditor(si);
  await loadDrafts();
  showToast('섹션이 저장되었습니다.');
}

async function saveItemEdit(si, itemNum) {
  const sec = ruleSections[si];
  const newText = document.getElementById('ruleEditTA').value.trim();
  const reason = document.getElementById('ruleEditReason')?.value.trim() || '관리자 직접 편집';
  if (!newText) { showToast('내용을 입력해 주세요.'); return; }

  const lines = ruleContent.split('\\n');
  const item = sec.items.find(it => it.num === itemNum);
  if (item) {
    lines[item.lineIdx] = itemNum + '. ' + newText;
  }
  ruleContent = lines.join('\\n');

  await fetch('/api/admin/rules/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: ruleContent })
  });

  await fetch('/api/admin/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: sec.title, itemNumber: itemNum, action: '수정', content: newText, reason: reason, updatedBy: getAdminName() })
  });

  parseRuleSections();
  renderRuleTree();
  selectItem(si, itemNum);
  await loadDrafts();
  showToast('항목이 저장되었습니다.');
}

async function deleteItem(si, itemNum) {
  if (!confirm('항목 ' + itemNum + '을(를) 삭제하시겠습니까?')) return;
  const sec = ruleSections[si];
  const item = sec.items.find(it => it.num === itemNum);
  if (!item) return;

  const lines = ruleContent.split('\\n');
  lines.splice(item.lineIdx, 1);
  ruleContent = lines.join('\\n');

  await fetch('/api/admin/rules/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: ruleContent })
  });

  await fetch('/api/admin/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: sec.title, itemNumber: itemNum, action: '삭제', content: '항목 삭제됨', reason: '관리자 직접 삭제', updatedBy: getAdminName() })
  });

  selectedItem = null;
  parseRuleSections();
  renderRuleTree();
  showSectionEditor(si);
  await loadDrafts();
  showToast('항목이 삭제되었습니다.');
}

function addNewItemToSection() {
  if (selectedSection === null) return;
  const sec = ruleSections[selectedSection];
  const lastItem = sec.items.length > 0 ? sec.items[sec.items.length - 1] : null;
  const nextNum = lastItem ? String(parseInt(lastItem.num) + 1) : '1';

  document.getElementById('ruleEditorTitle').textContent = sec.title + ' > 새 항목';
  document.getElementById('ruleEditorArea').innerHTML = \`
    <div id="searchResults" style="display:none;"></div>
    <div class="rule-editor-content">
      <div class="rule-editor-label">새 항목 추가 (항목번호: \${nextNum})</div>
      <textarea class="rule-editor-textarea" id="ruleEditTA" style="min-height:100px;" placeholder="규정 내용을 입력하세요..."></textarea>
      <div style="margin-top:10px;">
        <div class="rule-editor-label">변경 사유 (선택)</div>
        <input type="text" id="ruleEditReason" placeholder="추가 사유를 입력하세요" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:'Inter',sans-serif;outline:none;box-sizing:border-box;">
      </div>
    </div>
    <div class="rule-editor-actions">
      <button class="btn btn-primary btn-sm" onclick="saveNewItem(\${selectedSection}, '\${nextNum}')">추가</button>
      <button class="btn btn-sm" onclick="showSectionEditor(\${selectedSection})">취소</button>
    </div>
  \`;
  document.getElementById('ruleEditTA').focus();
}

async function saveNewItem(si, itemNum) {
  const sec = ruleSections[si];
  const newText = document.getElementById('ruleEditTA').value.trim();
  const reason = document.getElementById('ruleEditReason')?.value.trim() || '관리자 직접 추가';
  if (!newText) { showToast('내용을 입력해 주세요.'); return; }

  const lines = ruleContent.split('\\n');
  const insertIdx = sec.endIdx;
  const newLine = itemNum + '. ' + newText;
  lines.splice(insertIdx, 0, newLine);
  ruleContent = lines.join('\\n');

  await fetch('/api/admin/rules/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: ruleContent })
  });

  await fetch('/api/admin/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: sec.title, itemNumber: itemNum, action: '추가', content: newText, reason: reason, updatedBy: getAdminName() })
  });

  parseRuleSections();
  renderRuleTree();
  selectItem(si, itemNum);
  await loadDrafts();
  showToast('항목이 추가되었습니다.');
}

function getAdminName() {
  return localStorage.getItem('bsn_user_name') || '관리자';
}

function addNewSection() {
  const tree = document.getElementById('ruleTree');
  const existing = document.getElementById('newSectionInput');
  if (existing) { existing.focus(); return; }
  const inputDiv = document.createElement('div');
  inputDiv.id = 'newSectionInput';
  inputDiv.style.cssText = 'padding:8px 12px;display:flex;gap:6px;border-bottom:1px solid var(--border);';
  inputDiv.innerHTML = '<input type="text" id="newSectionName" placeholder="새 섹션 이름" style="flex:1;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:\\'Inter\\',sans-serif;outline:none;"><button onclick="confirmAddSection()" style="padding:4px 10px;border:none;border-radius:6px;background:var(--navy);color:#fff;font-size:12px;cursor:pointer;font-family:\\'Inter\\',sans-serif;">확인</button><button onclick="document.getElementById(\\'newSectionInput\\').remove()" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--sub);font-size:12px;cursor:pointer;font-family:\\'Inter\\',sans-serif;">취소</button>';
  tree.insertBefore(inputDiv, tree.firstChild);
  document.getElementById('newSectionName').focus();
  document.getElementById('newSectionName').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') confirmAddSection();
    if (e.key === 'Escape') inputDiv.remove();
  });
}

async function confirmAddSection() {
  const name = document.getElementById('newSectionName')?.value.trim();
  if (!name) return;
  await fetch('/api/admin/rules/section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionName: name, updatedBy: localStorage.getItem('bsn_user_name') || '알 수 없음' })
  });
  await loadRules();
  await loadDrafts();
  showToast('새 섹션이 추가되었습니다.');
}

function startDeleteMode() {
  window._deleteMode = true;
  document.getElementById('delSectionBtn').style.display = 'none';
  document.getElementById('delConfirmBtn').style.display = '';
  document.getElementById('delCancelBtn').style.display = '';
  renderRuleTree();
}

function cancelDeleteMode() {
  window._deleteMode = false;
  document.getElementById('delSectionBtn').style.display = '';
  document.getElementById('delConfirmBtn').style.display = 'none';
  document.getElementById('delCancelBtn').style.display = 'none';
  renderRuleTree();
}

async function confirmDeleteSections() {
  const checks = document.querySelectorAll('.section-check input:checked');
  if (checks.length === 0) {
    showToast('삭제할 섹션을 선택하세요.');
    return;
  }
  if (!confirm('선택한 ' + checks.length + '개 섹션을 삭제하시겠습니까?')) return;
  const indices = Array.from(checks).map(c => parseInt(c.value)).sort((a, b) => b - a);
  for (const si of indices) {
    const sec = ruleSections[si];
    if (!sec) continue;
    await fetch('/api/admin/rules/section/' + encodeURIComponent(sec.title), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updatedBy: localStorage.getItem('bsn_user_name') || '알 수 없음' })
    });
  }
  selectedSection = null;
  selectedItem = null;
  cancelDeleteMode();
  await loadRules();
  await loadDrafts();
  showEditorPlaceholder();
  showToast(indices.length + '개 섹션이 삭제되었습니다.');
}

async function syncMdFile() {
  const ta = document.getElementById('ruleEditTA');
  const taContent = ta ? ta.value.trim() : '';
  const secTitle = selectedSection !== null ? (ruleSections[selectedSection]?.title || null) : null;

  if (taContent && secTitle && selectedSection !== null) {
    const sec = ruleSections[selectedSection];
    const lines = ruleContent.split('\\n');
    const before = lines.slice(0, sec.startIdx).join('\\n');
    const after = lines.slice(sec.endIdx).join('\\n');
    ruleContent = before + (before ? '\\n' : '') + taContent + (after ? '\\n' : '') + after;
  }

  await fetch('/api/admin/rules/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: ruleContent })
  });
  const updatedBy = localStorage.getItem('bsn_user_name') || '관리자';
  await fetch('/api/admin/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: secTitle || '전체', itemNumber: 'all', action: '수정', content: taContent ? '섹션 저장' : 'MD 파일 저장', reason: '관리자 직접 편집', updatedBy: updatedBy })
  });
  window.cachedRulesContent = ruleContent;
  parseRuleSections();
  renderRuleTree();
  if (selectedSection !== null) showSectionEditor(selectedSection);
  await loadDrafts();
  showToast('✓ 내부규정.md 파일이 업데이트되었습니다');
}

// ─── 변경 이력 (drafts) ───
async function loadDrafts() {
  const res = await fetch('/api/admin/drafts');
  allDrafts = await res.json();
  renderDrafts();
}

function getActionBadge(action) {
  const map = {
    '수정': { bg: '#EEF2F9', color: '#2C4A7C', border: '#C5D3EC' },
    '추가': { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
    '삭제': { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
    '오류신고': { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  };
  const s = map[action] || { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
  return '<span style="display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:600;background:' + s.bg + ';color:' + s.color + ';border:1px solid ' + s.border + ';">' + esc(action || '수정') + '</span>';
}

function filterDrafts(action) {
  currentDraftFilter = action;
  document.querySelectorAll('.draft-filter-btn').forEach(b => {
    const isActive = b.dataset.action === action;
    b.style.background = isActive ? '#2C4A7C' : 'white';
    b.style.color = isActive ? 'white' : (b.dataset.action === '오류신고' ? '#C2410C' : 'var(--sub)');
    b.style.borderColor = isActive ? '#2C4A7C' : (b.dataset.action === '오류신고' ? '#FED7AA' : 'var(--border)');
  });
  renderDrafts();
}

function renderDrafts() {
  const filtered = currentDraftFilter === 'all'
    ? allDrafts.slice(0, 50)
    : allDrafts.filter(d => d.action === currentDraftFilter).slice(0, 50);
  const currentUserName = localStorage.getItem('bsn_user_name') || '';
  const canDelete = currentUserName === '이승진';
  document.getElementById('draftsBody').innerHTML = filtered.map(d => {
    const rawName = d.updatedBy || parseUpdatedBy(d.reason);
    const resolved = resolveUpdaterName(rawName);
    const nameDisplay = '<span style="font-weight:600;color:var(--text);font-size:13px;">' + esc(resolved) + '</span>';
    const deleteBtn = canDelete
      ? '<button class="btn-del" onclick="deleteDraft(\\'' + d.id + '\\')">삭제</button>'
      : '<button disabled style="border:1px solid #E5E5E5;color:#C0C0C0;background:#F9F9F9;border-radius:6px;padding:4px 10px;font-size:12px;cursor:not-allowed;">삭제</button>';
    return \`
    <tr>
      <td style="white-space:nowrap;font-size:12px;">\${formatDate(d.timestamp)}</td>
      <td>\${nameDisplay}</td>
      <td style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:4px;">\${esc(d.section)}</td>
      <td style="text-align:center;padding-left:2px;padding-right:2px;">\${getActionBadge(d.action)}</td>
      <td><textarea class="draft-textarea" rows="2" onblur="saveDraftContent('\${d.id}', this.value)">\${esc(d.content)}</textarea></td>
      <td style="text-align:center;">\${deleteBtn}</td>
    </tr>
  \`; }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px;">변경 이력이 없습니다</td></tr>';
}

function parseUpdatedBy(reason) {
  if (!reason) return '관리자';
  if (reason.includes('님 오류신고')) return reason.replace('님 오류신고', '');
  if (reason.includes('직접')) return '관리자';
  return reason.slice(0, 10) || '관리자';
}

async function saveDraftContent(id, content) {
  await fetch('/api/admin/drafts/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
}

async function deleteDraft(id) {
  if (!confirm('이 변경 이력을 삭제하시겠습니까?')) return;
  await fetch('/api/admin/drafts/' + id, { method: 'DELETE' });
  await loadDrafts();
  showToast('변경 이력이 삭제되었습니다.');
}

async function applyDrafts() {
  if (!confirm('대기 중인 모든 초안을 규정에 적용하시겠습니까?')) return;
  const res = await fetch('/api/admin/drafts/apply', { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    showToast('규정이 업데이트되었습니다! (' + data.applied + '건 적용)');
    await Promise.all([loadDrafts(), loadRules()]);
  } else {
    showToast('적용 중 오류가 발생했습니다.');
  }
}

// ═══ 명단 관리 ═══
let editingMemberNo = null;
let isAddingNew = false;
let teamFilter = null;

const DEPT_OPTIONS = ['빌딩','PENT','CARE','경영'];
const POS_OPTIONS = ['수습','중개사','매니저','팀장','실장','대리','과장','부장','이사','상무','대표','PD','사장','부사장'];
const LOCKED_POS = {94:'사장', 95:'부사장'};
const ROLE_OPTIONS = ['사용자','관리자'];

function makeSelect(options, selected, name) {
  return '<select data-field="' + name + '">' + options.map(o => '<option value="' + o + '"' + (o === selected ? ' selected' : '') + '>' + o + '</option>').join('') + '</select>';
}

function makeInput(value, name, placeholder) {
  return '<input type="text" data-field="' + name + '" value="' + (value || '').replace(/"/g, '&quot;') + '" placeholder="' + (placeholder || '') + '">';
}

async function loadMemberList() {
  const res = await fetch('/api/members');
  allMembers = await res.json();
  updateMemberStats();
  populateMemberFilters();
  renderMemberList();
}

function updateMemberStats() {
  const total = allMembers.length;
  const depts = {};
  allMembers.forEach(m => { depts[m.department] = (depts[m.department] || 0) + 1; });

  const cards = [
    { key: null, num: total, label: '전체 인원' },
    { key: 'dept:빌딩', num: depts['빌딩'] || 0, label: '빌딩' },
    { key: 'dept:PENT', num: depts['PENT'] || 0, label: 'PENT' },
    { key: 'dept:CARE', num: depts['CARE'] || 0, label: 'CARE' },
    { key: 'dept:경영', num: depts['경영'] || 0, label: '경영' },
  ];

  document.getElementById('memberStats').innerHTML = cards.map(c =>
    \`<div class="stat-card\${statFilter === c.key ? ' active' : ''}" onclick="filterByMemberStat(\${c.key === null ? 'null' : "'" + c.key + "'"})"><div class="stat-num">\${c.num}</div><div class="stat-label">\${c.label}</div></div>\`
  ).join('');
}

function filterByMemberStat(key) {
  statFilter = statFilter === key ? null : key;
  teamFilter = null;
  memberPage = 1;
  updateMemberStats();
  renderMemberList();
}

function filterByTeam(team) {
  teamFilter = teamFilter === team ? null : team;
  statFilter = null;
  memberPage = 1;
  updateMemberStats();
  renderMemberList();
}

function populateMemberFilters() {}

function filterMemberList() { memberPage = 1; renderMemberList(); }

function getFilteredMembers() {
  const search = document.getElementById('memberSearchInput').value.trim();
  const group = document.getElementById('memberGroupFilter').value;
  return allMembers.filter(m => {
    if (search && !m.name.includes(search)) return false;
    const leaderNames = ['문승환','박명한','윤상연','노현호'];
    if (group === '팀장' && m.position !== '팀장' && !leaderNames.includes(m.name)) return false;
    if (group === '팀원' && (m.department === '경영' || m.position === '팀장' || leaderNames.includes(m.name))) return false;
    if (statFilter) {
      const [type, val] = statFilter.split(':');
      if (type === 'dept' && m.department !== val) return false;
    }
    if (teamFilter && m.team !== teamFilter) return false;
    return true;
  }).sort((a, b) => {
    const pa = (a.joinDate || '').split('-').map(Number);
    const pb = (b.joinDate || '').split('-').map(Number);
    const ya = (pa[0] || 0) < 50 ? 2000 + (pa[0] || 0) : 1900 + (pa[0] || 0);
    const yb = (pb[0] || 0) < 50 ? 2000 + (pb[0] || 0) : 1900 + (pb[0] || 0);
    const da = new Date(ya, (pa[1] || 1) - 1, pa[2] || 1);
    const db = new Date(yb, (pb[1] || 1) - 1, pb[2] || 1);
    return da.getTime() - db.getTime();
  });
}

function getTeamOptions() {
  const teams = [...new Set(allMembers.map(m => m.team).filter(t => t && t !== '-'))].sort();
  return teams;
}

function makeTeamSelect(selected) {
  const teams = getTeamOptions();
  let opts = '<option value="">없음</option>';
  opts += teams.map(t => '<option value="' + t + '"' + (t === selected ? ' selected' : '') + '>' + t + '</option>').join('');
  return '<select data-field="team" style="margin-top:4px;">' + opts + '</select>';
}

function renderMemberRow(m, displayNo) {
  if (editingMemberNo === m.no) {
    return \`<tr class="editing" data-no="\${m.no}">
      <td>\${displayNo}</td>
      <td style="text-align:center;font-size:11px;color:var(--muted);">\${m.lastLoginAt ? formatDate(m.lastLoginAt) : '-'}</td>
      <td>\${makeInput(m.joinDate, 'joinDate', '25-01-02')}</td>
      <td>\${makeInput(m.name, 'name', '성명 *')}</td>
      <td>\${makeSelect(DEPT_OPTIONS, m.department, 'department')}\${makeTeamSelect(m.team)}</td>
      <td>\${LOCKED_POS[m.no] ? '<span style="font-size:13px;font-weight:500;color:var(--navy);">'+LOCKED_POS[m.no]+'</span><input type="hidden" data-field="position" value="'+LOCKED_POS[m.no]+'">' : makeSelect(POS_OPTIONS, m.position, 'position')}</td>
      <td>\${makeInput(m.phone, 'phone', '연락처 *')}</td>
      <td>\${makeInput(m.email, 'email', '이메일')}</td>
      <td>\${makeSelect(ROLE_OPTIONS, m.role || '사용자', 'role')}</td>
      <td><div class="inline-actions">
        <button class="btn btn-primary btn-sm" onclick="saveInlineEdit(\${m.no})">저장</button>
        <button class="btn btn-sm" onclick="cancelInlineEdit()">취소</button>
      </div></td>
    </tr>\`;
  }
  const teamHtml = m.team && m.team !== '-' ? '<div class="team-tag" onclick="filterByTeam(\\'' + esc(m.team).replace(/'/g, "\\\\'") + '\\')">' + esc(m.team) + '</div>' : '';
  return \`<tr>
    <td style="text-align:center;">\${displayNo}</td>
    <td style="text-align:center;font-size:11px;color:var(--muted);white-space:nowrap;">\${m.lastLoginAt ? formatDate(m.lastLoginAt) : '-'}</td>
    <td style="text-align:center;white-space:nowrap;font-size:12px;">\${esc(m.joinDate)}\${m.joinDate ? '<div class="tenure">' + calcTenure(m.joinDate) + '</div>' : ''}</td>
    <td style="text-align:center;font-weight:600;">\${esc(m.name)}</td>
    <td style="text-align:center;">\${esc(m.department)}\${teamHtml}</td>
    <td style="text-align:center;">\${esc(m.position)}</td>
    <td style="text-align:center;white-space:nowrap;font-size:12px;">\${esc(m.phone)}</td>
    <td style="text-align:center;font-size:12px;">\${esc(m.email)}</td>
    <td style="text-align:center;white-space:nowrap;"><span class="badge \${m.role === '관리자' ? 'badge-human' : 'badge-pending'}">\${m.role || '사용자'}</span></td>
    <td style="text-align:center;white-space:nowrap;">
      <button class="btn btn-sm" onclick="editMember(\${m.no})">수정</button>
      <button class="btn btn-danger btn-sm" onclick="removeMember(\${m.no}, '\${esc(m.name)}')">삭제</button>
    </td>
  </tr>\`;
}

function renderNewRow() {
  return \`<tr class="editing" data-no="new">
    <td style="color:var(--muted);">-</td>
    <td style="text-align:center;color:var(--muted);font-size:11px;">-</td>
    <td>\${makeInput('', 'joinDate', '25-01-02')}</td>
    <td>\${makeInput('', 'name', '성명 *')}</td>
    <td>\${makeSelect(DEPT_OPTIONS, '빌딩', 'department')}\${makeTeamSelect('')}</td>
    <td>\${makeSelect(POS_OPTIONS, '수습', 'position')}</td>
    <td>\${makeInput('', 'phone', '연락처 *')}</td>
    <td>\${makeInput('', 'email', '이메일')}</td>
    <td>\${makeSelect(ROLE_OPTIONS, '사용자', 'role')}</td>
    <td><div class="inline-actions">
      <button class="btn btn-primary btn-sm" onclick="saveNewMember()">저장</button>
      <button class="btn btn-sm" onclick="cancelInlineEdit()">취소</button>
    </div></td>
  </tr>\`;
}

function renderMemberList() {
  const filtered = getFilteredMembers();
  const totalPages = Math.ceil(filtered.length / MEMBER_PAGE_SIZE) || 1;
  if (memberPage > totalPages) memberPage = totalPages;
  const start = (memberPage - 1) * MEMBER_PAGE_SIZE;
  const page = filtered.slice(start, start + MEMBER_PAGE_SIZE);

  let html = '';
  if (isAddingNew) html += renderNewRow();
  html += page.map((m, i) => renderMemberRow(m, start + i + 1)).join('');
  document.getElementById('membersBody').innerHTML = html || '<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:40px;">명단이 없습니다</td></tr>';

  let pHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    pHtml += \`<button class="page-btn \${i === memberPage ? 'active' : ''}" onclick="goMemberPage(\${i})">\${i}</button>\`;
  }
  document.getElementById('memberPagination').innerHTML = pHtml;
}

function goMemberPage(p) { memberPage = p; renderMemberList(); }

function getRowData(tr) {
  const data = {};
  tr.querySelectorAll('input[data-field], select[data-field]').forEach(el => {
    data[el.dataset.field] = el.value.trim();
  });
  return data;
}

function addNewMemberRow() {
  isAddingNew = true;
  editingMemberNo = null;
  memberPage = 1;
  renderMemberList();
  setTimeout(() => {
    const row = document.querySelector('tr[data-no="new"] input[data-field="name"]');
    if (row) row.focus();
  }, 50);
}

function editMember(no) {
  isAddingNew = false;
  editingMemberNo = no;
  renderMemberList();
  setTimeout(() => {
    const row = document.querySelector('tr[data-no="' + no + '"] input[data-field="name"]');
    if (row) row.focus();
  }, 50);
}

async function saveInlineEdit(no) {
  const tr = document.querySelector('tr[data-no="' + no + '"]');
  if (!tr) return;
  const data = getRowData(tr);
  if (!data.name || !data.phone) { showToast('이름과 연락처는 필수입니다.'); return; }
  await fetch('/api/admin/members/' + no, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  editingMemberNo = null;
  showToast('멤버 정보가 수정되었습니다.');
  await loadMemberList();
}

async function saveNewMember() {
  const tr = document.querySelector('tr[data-no="new"]');
  if (!tr) return;
  const data = getRowData(tr);
  if (!data.name || !data.phone) { showToast('이름과 연락처는 필수입니다.'); return; }
  await fetch('/api/admin/members', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  isAddingNew = false;
  showToast('새 멤버가 추가되었습니다.');
  await loadMemberList();
}

function cancelInlineEdit() {
  editingMemberNo = null;
  isAddingNew = false;
  renderMemberList();
}

async function removeMember(no, name) {
  if (!confirm(name + ' 님을 명단에서 삭제하시겠습니까?')) return;
  await fetch('/api/admin/members/' + no, { method: 'DELETE' });
  showToast(name + ' 님이 삭제되었습니다.');
  await loadMemberList();
}

function exportMembersCSV() {
  const filtered = getFilteredMembers();
  const header = 'No,최근로그인,위촉일,성명,소속,소속팀,직책,연락처,이메일,권한\\n';
  const rows = filtered.map(m => \`\${m.no},"\${m.lastLoginAt || ''}","\${m.joinDate}","\${m.name}","\${m.department}","\${m.position}","\${m.team || ''}","\${m.phone}","\${m.email}","\${m.role || '사용자'}"\`).join('\\n');
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), header + rows], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bsn-members.csv';
  a.click();
}

// ─── 유틸 ───
function formatDate(iso) {
  const d = new Date(iso);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + '<br>' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function calcTenure(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return '';
  let y = parseInt(parts[0]), m = parseInt(parts[1]) - 1, d = parseInt(parts[2]);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return '';
  y += y < 50 ? 2000 : 1900;
  const start = new Date(y, m, d);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years < 0) return '';
  if (years === 0) return months + '개월';
  return years + '년 ' + months + '개월';
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

init();
</script>
</body>
</html>`;
}
