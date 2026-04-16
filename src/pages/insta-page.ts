export function generateInstaPageHTML(regionJson?: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>콘텐츠 생성 — BSN 어시스턴트</title>
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    :root{
      --navy:#2C4A7C;--navy-dark:#1E3560;--navy-light:#EEF2F9;--navy-border:#C5D3EC;
      --bg:#F8F6F1;--surface:#FFFFFF;--border:#E2E2E2;
      --text:#1A1A2E;--sub:#6B6B80;--muted:#9CA3AF;
      --radius:14px;--shadow:0 1px 4px rgba(0,0,0,0.07);
    }
    body{font-family:'Pretendard',-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased;}

    /* Navbar */
    nav{position:sticky;top:0;z-index:50;background:#ffffff;border-bottom:1px solid var(--border);font-family:'Inter',-apple-system,sans-serif;}
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

    main{max-width:680px;margin:0 auto;padding:32px 24px;}

    /* Header */
    .page-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
    .page-header h1{font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;color:var(--text);}
    .btn-study{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid var(--navy-border);border-radius:8px;background:var(--navy-light);color:var(--navy);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s;text-decoration:none;}
    .btn-study:hover{background:var(--navy);color:#fff;}
    .btn-study .badge{background:var(--navy);color:#fff;font-size:11px;padding:1px 7px;border-radius:10px;font-weight:700;}
    .btn-study:hover .badge{background:#fff;color:var(--navy);}

    /* Card */
    .card{background:var(--surface);border:1px solid rgba(44,74,124,0.06);border-radius:var(--radius);padding:24px;margin-bottom:16px;box-shadow:var(--shadow);}

    /* Input mode toggle */
    .mode-toggle{display:flex;background:var(--bg);border-radius:10px;padding:3px;margin-bottom:20px;border:1px solid var(--border);}
    .mode-btn{flex:1;padding:9px 0;text-align:center;font-size:14px;font-weight:500;border:none;background:none;border-radius:8px;cursor:pointer;color:var(--sub);font-family:inherit;transition:all 0.15s;}
    .mode-btn.active{background:var(--surface);color:var(--navy);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.08);}

    /* Input fields */
    .input-section{margin-bottom:20px;}
    .url-input{width:100%;padding:12px 14px;border:1px solid var(--border);border-radius:10px;font-size:14px;color:var(--text);font-family:inherit;background:var(--surface);outline:none;transition:border-color 0.15s;}
    .url-input:focus{border-color:var(--navy);}
    .input-hint{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5;}
    .text-input{width:100%;padding:14px;border:1px solid var(--border);border-radius:10px;font-size:14px;color:var(--text);font-family:inherit;background:var(--surface);outline:none;resize:vertical;min-height:120px;transition:border-color 0.15s;line-height:1.6;}
    .text-input:focus{border-color:var(--navy);}
    .input-guide{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.6;}
    .tpl-selector{margin-bottom:16px;}
    .tpl-label{font-size:13px;font-weight:500;color:#1A1A2E;margin-bottom:10px;}
    .tpl-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}
    .tpl-card{padding:14px 10px;border:1px solid var(--border);border-radius:10px;background:#fff;cursor:pointer;transition:all 0.15s;text-align:left;font-family:inherit;}
    .tpl-card:hover{border-color:var(--navy);}
    .tpl-card.active{border-color:var(--navy);background:rgba(44,74,124,0.04);}
    .tpl-card .tpl-badge{display:inline-block;font-size:9px;font-weight:600;letter-spacing:1px;color:var(--navy);background:rgba(44,74,124,0.08);padding:2px 6px;border-radius:3px;margin-bottom:6px;}
    .tpl-card .tpl-name{font-size:13px;font-weight:600;color:#1A1A2E;margin-bottom:2px;}
    .tpl-card .tpl-desc{font-size:10px;color:#A8A49C;line-height:1.4;}
    .tpl-examples{margin-top:14px;padding:12px 14px;background:#F7F6F3;border-radius:10px;font-size:12px;color:var(--muted);line-height:1.7;}
    .tpl-examples-title{font-size:11px;color:var(--navy);font-weight:600;margin-bottom:6px;letter-spacing:0.3px;}
    .tpl-suggest{margin-top:12px;margin-bottom:12px;}
    .tpl-suggest-title{font-size:11px;color:var(--navy);font-weight:600;letter-spacing:0.3px;}
    .tpl-suggest-items{display:flex;flex-direction:column;gap:6px;}
    .tpl-suggest-item{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fff;border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:border-color 0.15s;}
    .tpl-suggest-item:hover{border-color:var(--navy);}
    .tpl-suggest-item-text{font-size:12px;color:#1A1A2E;flex:1;padding-right:8px;line-height:1.45;}
    .tpl-suggest-item-btn{font-size:11px;color:var(--navy);font-weight:500;white-space:nowrap;padding:4px 10px;border:1px solid var(--navy);border-radius:6px;background:#fff;font-family:inherit;cursor:pointer;}
    .tpl-refresh{font-size:11px;color:var(--muted);cursor:pointer;margin-left:auto;background:none;border:none;font-family:inherit;}
    .tpl-suggest-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;}

    /* Generate button */
    .btn-generate{width:100%;padding:14px;border:none;border-radius:10px;background:var(--navy);color:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;}
    .btn-generate:hover{background:var(--navy-dark);}
    .btn-generate:disabled{background:#9ca3af;cursor:not-allowed;}
    .btn-generate.loading{position:relative;overflow:hidden;}
    .btn-generate.loading::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);animation:shimmer 1.5s infinite;}
    @keyframes shimmer{100%{left:100%;}}

    /* AI News section */
    /* News recommend */
    .news-item{padding:14px 0;border-bottom:1px solid rgba(44,74,124,0.06);display:flex;align-items:center;justify-content:space-between;gap:10px;}
    .news-item:last-child{border-bottom:none;}
    .news-item:hover{background:rgba(44,74,124,0.03);}
    .news-item-left{flex:1;min-width:0;}
    .news-item-title{font-size:13px;font-weight:600;color:#1A1A2E;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .news-item-title:hover{color:#2C4A7C;}
    .news-item-meta{font-size:11px;color:#A8A49C;margin-top:3px;display:flex;align-items:center;flex-wrap:wrap;gap:4px;}
    .news-tag{font-size:10px;background:#E6F1FB;color:#0C447C;padding:2px 7px;border-radius:4px;}
    .btn-news-gen{background:#2C4A7C;color:#FFF;border:none;border-radius:6px;font-size:11px;padding:5px 14px;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0;}
    .btn-news-gen:hover{opacity:0.85;}

    /* ─── Result View ─── */
    .result-view{display:none;}
    .result-view.active{display:block;}
    .input-view.active{display:block;}

    .back-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 0;border:none;background:none;color:var(--sub);font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;margin-bottom:16px;transition:color 0.15s;}
    .back-btn:hover{color:var(--navy);}
    .result-subtitle{font-size:13px;color:var(--muted);margin-bottom:20px;}

    /* Channel tabs */
    .channel-tabs{display:flex;gap:4px;margin-bottom:20px;border-bottom:2px solid var(--border);padding-bottom:0;}
    .channel-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px 12px;border:none;background:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500;color:var(--sub);position:relative;transition:color 0.15s;border-bottom:2px solid transparent;margin-bottom:-2px;}
    .channel-tab:hover{color:var(--text);}
    .channel-tab.active{font-weight:600;}
    .channel-tab .ch-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;font-weight:700;transition:transform 0.15s;}
    .channel-tab:hover .ch-icon{transform:scale(1.08);}
    .channel-tab[data-ch="insta"] .ch-icon{background:#E1306C;}
    .channel-tab[data-ch="short"] .ch-icon{background:#FF6D00;}
    .channel-tab[data-ch="youtube"] .ch-icon{background:#FF0000;}
    .channel-tab[data-ch="thread"] .ch-icon{background:#000000;}
    .channel-tab[data-ch="blog"] .ch-icon{background:#03C75A;}
    .channel-tab[data-ch="insta"].active{color:#E1306C;border-bottom-color:#E1306C;}
    .channel-tab[data-ch="short"].active{color:#FF6D00;border-bottom-color:#FF6D00;}
    .channel-tab[data-ch="youtube"].active{color:#FF0000;border-bottom-color:#FF0000;}
    .channel-tab[data-ch="thread"].active{color:#000000;border-bottom-color:#000000;}
    .channel-tab[data-ch="blog"].active{color:#03C75A;border-bottom-color:#03C75A;}

    .channel-panel{display:none;}
    .channel-panel.active{display:block;}

    /* Result sections */
    .section-label{font-size:12px;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;}
    .section-label .sub-label{font-size:11px;font-weight:500;color:var(--muted);text-transform:none;letter-spacing:0;}
    .result-textarea{width:100%;padding:14px;border:1px solid var(--border);border-radius:10px;font-size:14px;color:var(--text);font-family:inherit;background:var(--surface);outline:none;resize:vertical;min-height:100px;line-height:1.7;transition:border-color 0.15s;}
    .result-textarea:focus{border-color:var(--navy);}
    .result-block{margin-bottom:16px;}

    .btn-copy{padding:5px 14px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-weight:500;background:var(--surface);color:var(--sub);cursor:pointer;font-family:inherit;transition:all 0.15s;}
    .btn-copy:hover{border-color:var(--navy);color:var(--navy);}

    .two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
    @media(max-width:600px){.two-col{grid-template-columns:1fr;}}

    /* Card news preview */
    .card-preview-wrap{position:relative;margin-bottom:16px;}
    .card-preview{width:100%;aspect-ratio:1/1;background:var(--navy);border-radius:12px;overflow:hidden;position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:24px;color:#fff;}
    .card-preview img.card-bg{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;}
    .card-tag{display:none;}
    .card-watermark{position:absolute;top:16px;right:16px;font-family:'Poppins',sans-serif;font-size:13px;font-weight:800;opacity:0.4;z-index:1;}
    .card-period{position:absolute;top:16px;left:16px;font-family:'Poppins',-apple-system,sans-serif;font-size:12px;font-weight:500;opacity:0.6;z-index:2;letter-spacing:0.3px;line-height:1.35;text-align:left;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,0.15);}
    .card-period-secondary{display:block;font-size:10px;opacity:0.85;margin-top:2px;font-weight:400;}
    .card-source{position:absolute;bottom:16px;left:16px;font-family:'Poppins',-apple-system,sans-serif;font-size:10px;font-weight:400;opacity:0.5;z-index:2;letter-spacing:0.2px;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,0.15);}
    .card-main-text{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;font-size:18px;font-weight:800;line-height:1.6;padding:20px 10px;word-break:keep-all;white-space:pre-line;z-index:1;cursor:text;}
    .card-main-text[contenteditable="true"]:focus{outline:1px dashed rgba(255,255,255,0.4);outline-offset:4px;}
    .card-preview.style-light .card-tag[contenteditable="true"]:focus,
    .card-preview.style-light .card-main-text[contenteditable="true"]:focus{outline-color:rgba(0,0,0,0.2);}
    .card-slide-num{text-align:center;font-size:12px;font-weight:800;z-index:1;background:rgba(0,0,0,0.3);color:#fff;padding:2px 8px;border-radius:4px;display:inline-block;}
    .card-nav{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:2;}
    .card-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.5);cursor:pointer;border:none;padding:0;transition:background 0.15s;}
    .card-dot.active{background:#fff;}
    .card-actions{display:flex;gap:6px;position:absolute;bottom:16px;right:16px;z-index:2;}
    .btn-card-action{width:32px;height:32px;border-radius:6px;border:none;background:rgba(0,0,0,0.4);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;transition:background 0.15s;}
    .btn-card-action:hover{background:rgba(0,0,0,0.6);}
    .card-arrow{position:absolute;top:50%;transform:translateY(-50%);width:32px;height:32px;border-radius:50%;border:none;background:rgba(0,0,0,0.4);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:background 0.15s;z-index:2;padding:0;}
    .card-arrow:hover{background:rgba(0,0,0,0.6);}
    .card-arrow.left{left:10px;}
    .card-arrow.right{right:10px;}
    /* Image checkbox */
    .img-check-row{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
    .img-check-row input[type=checkbox]{width:16px;height:16px;accent-color:#2C4A7C;cursor:pointer;}
    .img-check-row label{font-size:13px;color:#3D3B36;cursor:pointer;}
    .img-check-row .check-hint{font-size:11px;color:#A8A49C;}
    /* Card image actions (hover) */
    .card-img-actions{position:absolute;bottom:50px;left:50%;transform:translateX(-50%);display:none;gap:6px;z-index:4;}
    .card-preview:hover .card-img-actions{display:flex;}
    .btn-img-act{padding:4px 10px;border:none;border-radius:5px;background:rgba(0,0,0,0.5);color:#fff;font-size:11px;cursor:pointer;font-family:inherit;white-space:nowrap;transition:background 0.15s;}
    .btn-img-act:hover{background:rgba(0,0,0,0.7);}
    /* Card spinner */
    .card-spinner{position:absolute;top:0;left:0;width:100%;height:100%;z-index:5;background:rgba(0,0,0,0.3);display:none;flex-direction:column;align-items:center;justify-content:center;border-radius:12px;gap:8px;}
    .card-spinner.active{display:flex;}
    .card-spinner .spin{width:32px;height:32px;border:3px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;}
    .card-spinner .spin-text{font-size:12px;color:#fff;}
    @keyframes spin{to{transform:rotate(360deg)}}
    /* Skeleton */
    .skeleton{position:absolute;top:0;left:0;width:100%;height:100%;z-index:3;background:linear-gradient(90deg,#e0e0e0 25%,#f0f0f0 50%,#e0e0e0 75%);background-size:200% 100%;animation:skeletonShimmer 1.5s infinite;border-radius:12px;display:none;}
    .skeleton.active{display:block;}
    @keyframes skeletonShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

    /* History */
    .history-section{margin-top:24px;}
    .history-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
    .history-label{font-size:14px;font-weight:600;color:var(--text);}
    .btn-clear-all{border:none;background:none;color:#A8A49C;font-size:11px;cursor:pointer;font-family:inherit;transition:color 0.15s;}
    .btn-clear-all:hover{color:#E24B4A;}
    .history-empty{text-align:center;color:var(--muted);font-size:13px;padding:24px 0;}
    .history-item{background:var(--surface);border:1px solid rgba(44,74,124,0.06);border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:background 0.15s;}
    .history-item:hover{background:rgba(44,74,124,0.03);}
    .history-left{flex:1;min-width:0;}
    .history-title{font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .history-meta{font-size:11px;color:var(--muted);margin-top:4px;}
.btn-history-del{width:36px;height:36px;border:none;background:none;color:#A8A49C;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:8px;transition:color 0.15s;}
    .btn-history-del:hover{color:#E24B4A;}
    .btn-history-more{display:block;width:100%;text-align:center;padding:12px 0;border:none;background:none;color:var(--navy);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:text-decoration 0.15s;}
    .btn-history-more:hover{text-decoration:underline;}
    /* Toast */
    .toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);background:rgba(44,74,124,0.9);color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;z-index:100;opacity:1;transition:opacity 0.4s;}
    .toast.fade{opacity:0;}

    /* Learn page */
    .tag-pill{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:500;background:var(--navy-light);color:var(--navy);margin:2px 3px 2px 0;}
    .learn-article{display:flex;align-items:flex-start;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(44,74,124,0.06);}
    .learn-article:last-child{border-bottom:none;}
    .learn-article-left{flex:1;min-width:0;}
    .learn-article-title{font-size:13px;font-weight:600;color:var(--text);cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .learn-article-title:hover{color:var(--navy);}
    .learn-article-meta{font-size:11px;color:var(--muted);margin-top:3px;}
    .learn-article-tags{margin-top:4px;}
    .stat-bar-wrap{margin:4px 0;}
    .stat-bar-label{display:flex;justify-content:space-between;font-size:11px;color:var(--sub);}
    .stat-bar{height:6px;background:#E2E2E2;border-radius:3px;overflow:hidden;margin-top:2px;}
    .stat-bar-fill{height:100%;background:var(--navy);border-radius:3px;transition:width 0.3s;}

    .learn-tab.active{color:var(--navy) !important;border-bottom-color:var(--navy) !important;font-weight:600 !important;}

    /* Kakao */

    /* ─── Transaction View ─── */
    .tx-view{display:none;}
    .tx-detail-panel{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;}
    html[data-view="tx"] #inputView{display:none !important;}
    html[data-view="tx"] #transactionView{display:block !important;}
    html[data-view="tx"] #navContent{background:transparent;color:var(--sub);font-weight:500;}
    html[data-view="tx"] #navTransaction{background:var(--navy-light);color:var(--navy);font-weight:600;}
    .tx-card{background:var(--surface);border:1px solid rgba(44,74,124,0.06);border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:var(--shadow);}
    .tx-fav-bar{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
    .tx-fav-chip{font-size:12px;padding:6px 12px;border-radius:8px;background:rgba(44,74,124,0.06);cursor:pointer;border:none;font-family:inherit;color:var(--text);display:flex;align-items:center;gap:4px;transition:background 0.15s;}
    .tx-fav-chip:hover{background:rgba(44,74,124,0.12);}
    .tx-fav-chip .fav-x{font-size:10px;color:var(--muted);margin-left:2px;cursor:pointer;}
    .tx-select-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;}
    .tx-select{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:13px;color:var(--text);font-family:inherit;background:var(--surface);outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236B6B80' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;}
    .tx-select:focus{border-color:var(--navy);}
    .tx-tag-bar{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0;}
    .tx-region-tag{font-size:12px;padding:5px 10px;border-radius:8px;border:1px solid rgba(44,74,124,0.15);display:inline-flex;align-items:center;gap:6px;background:var(--surface);}
    .tx-region-tag .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
    .tx-region-tag .tag-x{font-size:11px;color:var(--muted);cursor:pointer;padding:0 2px;}
    .tx-region-tag .tag-x:hover{color:#E24B4A;}
    .tx-add-region{font-size:12px;padding:5px 10px;border-radius:8px;border:1px dashed rgba(44,74,124,0.3);background:none;color:var(--navy);cursor:pointer;font-family:inherit;transition:border-color 0.15s;}
    .tx-add-region:hover{border-color:var(--navy);}
    .tx-period-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;}
    .tx-period-btn{padding:7px 14px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:12px;color:var(--sub);cursor:pointer;font-family:inherit;transition:all 0.15s;}
    .tx-period-btn.active{background:var(--navy);color:#fff;border-color:var(--navy);}
    .tx-period-btn:hover:not(.active){border-color:var(--navy);color:var(--navy);}
    .tx-custom-range{display:none;gap:12px;align-items:flex-start;margin-bottom:8px;}
    .tx-custom-range.active{display:flex;}
    .tx-ym-picker{flex:1;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--surface);}
    .tx-ym-header{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(44,74,124,0.04);}
    .tx-ym-header span{font-size:14px;font-weight:500;color:var(--text);}
    .tx-ym-nav{width:28px;height:28px;border:none;background:none;cursor:pointer;font-size:14px;color:var(--sub);border-radius:6px;display:flex;align-items:center;justify-content:center;}
    .tx-ym-nav:hover{background:rgba(44,74,124,0.08);color:var(--navy);}
    .tx-ym-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:8px;}
    .tx-ym-btn{padding:6px 0;border:none;border-radius:6px;background:none;font-size:12px;color:var(--text);cursor:pointer;font-family:inherit;transition:all 0.12s;}
    .tx-ym-btn:hover:not(.disabled):not(.selected){background:rgba(44,74,124,0.06);}
    .tx-ym-btn.selected{background:var(--navy);color:#fff;}
    .tx-ym-btn.disabled{color:var(--border);cursor:default;}
    .tx-ym-label{text-align:center;font-size:11px;color:var(--muted);margin-bottom:4px;}
    .tx-type-pill{font-size:11px;padding:4px 10px;border-radius:6px;background:rgba(44,74,124,0.06);color:var(--sub);display:inline-block;margin-bottom:8px;}
    .tx-query-btn{width:100%;padding:13px;border:none;border-radius:10px;background:var(--navy);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;}
    .tx-query-btn:hover{background:var(--navy-dark);}
    .tx-query-btn:disabled{background:#9ca3af;cursor:not-allowed;}
    .tx-rank-ctrl{display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;}
    .tx-rank-ctrl select{padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;font-family:inherit;background:var(--surface);color:var(--text);outline:none;}
    .tx-rank-ctrl .cl{font-size:12px;color:var(--muted);}
    .tx-stat-pills{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;}
    .tx-stat-pill{font-size:11px;padding:4px 10px;border-radius:99px;border:1px solid var(--border);background:var(--surface);cursor:pointer;color:var(--sub);transition:all 0.12s;font-family:inherit;}
    .tx-stat-pill.on{background:var(--navy-light);color:var(--navy);border-color:var(--navy-border);}
    .tx-period-info{font-size:11px;color:var(--muted);margin-bottom:14px;}
    .tx-rank-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;}
    @media(max-width:700px){.tx-rank-grid{grid-template-columns:repeat(3,1fr);}}
    @media(max-width:480px){.tx-rank-grid{grid-template-columns:repeat(2,1fr);}}
    .tx-rank-card{background:var(--surface);border:1px solid rgba(44,74,124,0.08);border-radius:12px;padding:12px;cursor:pointer;transition:all 0.12s;position:relative;}
    .tx-rank-card:hover{border-color:rgba(44,74,124,0.25);}
    .tx-rank-card:has(.tx-rank-check:hover){border-color:rgba(44,74,124,0.08);}
    .tx-rank-check:hover{border-color:var(--navy);background:var(--navy-light);transform:scale(1.15);transition:all 0.12s;}
    .tx-rank-check.on:hover{background:var(--navy-dark);border-color:var(--navy-dark);transform:scale(1.15);}
    .tx-rank-card.open{border-color:var(--navy);border-width:1.5px;}
    .tx-rank-num{font-size:11px;font-weight:600;color:var(--muted);margin-bottom:2px;}
    .tx-rank-num.r1{color:#BA7517;}.tx-rank-num.r2{color:#5F5E5A;}.tx-rank-num.r3{color:#993C1D;}
    .tx-rank-name{font-size:14px;font-weight:600;color:var(--text);margin-bottom:5px;}
    .tx-rank-val{font-size:16px;font-weight:600;color:var(--navy);}
    .tx-rank-sub{font-size:11px;color:var(--muted);margin-top:2px;}
    .tx-rank-change{font-size:11px;margin-top:2px;}
    .tx-rank-change.up{color:#0F6E56;}.tx-rank-change.dn{color:#E24B4A;}
    .tx-rank-check{position:absolute;top:8px;right:8px;width:16px;height:16px;border-radius:4px;border:1.5px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;color:transparent;transition:all 0.12s;}
    .tx-rank-check.on{background:var(--navy);border-color:var(--navy);color:#fff;}
    .tx-rank-detail{grid-column:1/-1;background:var(--bg);border:1px solid rgba(44,74,124,0.08);border-radius:12px;padding:20px;display:none;}
    .tx-rank-detail.open{display:block;}
    .tx-compare-float{position:sticky;bottom:16px;display:none;justify-content:center;padding:8px 0;z-index:10;}
    .tx-compare-float.show{display:flex;}
    .tx-compare-btn{padding:10px 24px;border:none;border-radius:10px;background:var(--navy);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}
    .tx-compare-btn:hover{background:var(--navy-dark);}
    .tx-compare-panel{grid-column:1/-1;background:var(--bg);border:1px solid rgba(44,74,124,0.08);border-radius:12px;padding:20px;margin-bottom:8px;}
    .tx-compare-table{width:100%;border-collapse:collapse;font-size:12px;}
    .tx-compare-table th,.tx-compare-table td{padding:8px 10px;border:0.5px solid var(--border);text-align:center;}
    .tx-compare-table th{background:var(--bg);font-size:11px;font-weight:600;color:var(--sub);}
    .tx-compare-table th:first-child{width:80px;text-align:left;}
    .tx-compare-table td:first-child{text-align:left;font-weight:500;color:var(--sub);font-size:11px;}
    .tx-loading{text-align:center;padding:40px 0;color:var(--muted);font-size:13px;}
    .tx-loading .spin{width:24px;height:24px;border:3px solid var(--border);border-top-color:var(--navy);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px;}
    .tx-skeleton-card{background:var(--surface);border:1px solid rgba(44,74,124,0.06);border-radius:12px;padding:14px;min-height:80px;}
    .tx-skeleton-line{background:linear-gradient(90deg,#F0EDE6 25%,#E8E4DC 50%,#F0EDE6 75%);background-size:200% 100%;border-radius:6px;animation:txShimmer 1.5s infinite;}
    @keyframes txShimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
    .tx-empty{text-align:center;padding:48px 0;}
    .tx-empty-icon{font-size:36px;margin-bottom:12px;}
    .tx-empty-text{font-size:14px;color:var(--text);margin-bottom:6px;}
    .tx-empty-sub{font-size:11px;color:var(--muted);}
    .tx-current-notice{font-size:11px;color:var(--muted);font-style:italic;margin-bottom:12px;}
    .tx-summary-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:14px;}
    .tx-summary-title{font-size:15px;font-weight:500;color:var(--text);}
    .tx-summary-period{font-size:11px;color:var(--muted);}
    .tx-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}
    .tx-stat-card{background:#F7F6F3;border-radius:8px;padding:12px;position:relative;cursor:pointer;transition:background 0.15s;}
    .tx-stat-card:hover{background:#EFEDE8;}
    .tx-stat-label{font-size:11px;color:var(--muted);margin-bottom:4px;}
    .tx-stat-value{font-size:22px;font-weight:400;color:#1A1A2E;}
    .tx-stat-change{font-size:11px;margin-top:2px;}
    .tx-stat-change.up{color:#1D9E75;}
    .tx-stat-change.down{color:#E24B4A;}
    .tx-stat-change.none{color:var(--muted);}
    .tx-stat-star{position:absolute;top:8px;right:8px;font-size:14px;color:var(--navy);cursor:pointer;background:none;border:none;padding:2px;}
    .tx-buyer-info{font-size:13px;line-height:2;margin-bottom:10px;}
    .tx-buyer-info .pct{font-weight:600;}
    .tx-buyer-info .cnt{font-size:11px;color:var(--muted);}
    .tx-pill-bar{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;}
    .tx-pill{font-size:10px;padding:3px 8px;border-radius:4px;}
    .tx-pill.use{background:#E6F1FB;color:#0C447C;}
    .tx-pill.cancel{background:#FCEBEB;color:#791F1F;}
    .tx-bar-section{margin-bottom:16px;}
    .tx-bar-section-title{font-size:12px;font-weight:500;color:#2C2C2C;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
    .tx-bar-section-title .tx-bar-icon{font-size:11px;opacity:0.6;}
    .tx-bar-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
    .tx-bar-label{font-size:11px;color:var(--text);min-width:80px;text-align:right;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .tx-bar-track{flex:1;height:20px;background:rgba(44,74,124,0.04);border-radius:4px;overflow:hidden;position:relative;}
    .tx-bar-fill{height:100%;border-radius:4px;transition:width 0.5s ease;min-width:2px;}
    .tx-highlight-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid rgba(44,74,124,0.06);}
    .tx-highlight-row:last-child{border-bottom:none;}
    .tx-hl-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;flex-shrink:0;}
    .tx-hl-badge.hi{color:#E24B4A;background:rgba(226,75,74,0.08);}
    .tx-hl-badge.lo{color:#3B7DD8;background:rgba(59,125,216,0.08);}
    .tx-hl-value{font-size:15px;font-weight:400;color:#1A1A2E;}
    .tx-hl-sub{font-size:11px;color:var(--muted);}
    .tx-bar-meta{font-size:10px;color:var(--muted);min-width:70px;flex-shrink:0;text-align:left;white-space:nowrap;}
    .tx-bar-meta strong{color:#1A1A2E;font-weight:400;}
    .tx-stats-toggle-btn{width:100%;padding:10px;border:1px dashed rgba(44,74,124,0.25);border-radius:10px;background:none;color:var(--navy);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px;}
    .tx-stats-toggle-btn:hover{background:rgba(44,74,124,0.04);border-color:var(--navy);}
    .tx-stats-toggle-btn .arrow{font-size:10px;transition:transform 0.2s;}
    .tx-stats-toggle-btn.open .arrow{transform:rotate(180deg);}
    .tx-stats-panel{max-height:0;overflow:hidden;transition:max-height 0.35s ease;}
    .tx-action-btn{width:100%;padding:9px;border:1px solid rgba(44,74,124,0.2);border-radius:8px;background:none;color:var(--navy);font-size:12px;cursor:pointer;font-family:inherit;transition:all 0.15s;}
    .tx-action-btn:hover{background:rgba(44,74,124,0.04);}
    .tx-all-stats-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;margin-bottom:4px;transition:background 0.15s;}
    .tx-all-stats-item.starred{background:rgba(44,74,124,0.04);border:0.5px solid rgba(44,74,124,0.15);}
    .tx-all-stats-star{font-size:16px;cursor:pointer;background:none;border:none;padding:0;flex-shrink:0;}
    .tx-all-stats-star.on{color:var(--navy);}
    .tx-all-stats-star.off{color:rgba(0,0,0,0.2);}
    .tx-all-stats-info{flex:1;min-width:0;}
    .tx-all-stats-name{font-size:13px;font-weight:500;color:var(--text);}
    .tx-all-stats-val{font-size:14px;color:var(--text);margin-top:1px;}
    .tx-all-stats-sub{font-size:10px;color:var(--muted);margin-top:1px;}
    .tx-table-wrap{border:0.5px solid var(--border);border-radius:8px;overflow:hidden;}
    .tx-table{width:100%;border-collapse:collapse;table-layout:fixed;}
    .tx-table th{background:#F7F6F3;padding:7px 10px;font-size:10px;font-weight:600;color:var(--sub);text-align:left;border-bottom:0.5px solid var(--border);}
    .tx-table th:nth-child(1){width:55px;}
    .tx-table th:nth-child(3){width:75px;text-align:right;}
    .tx-table th:nth-child(4){width:70px;text-align:right;}
    .tx-table td{padding:9px 10px;font-size:12px;border-top:0.5px solid rgba(0,0,0,0.04);}
    .tx-table td:nth-child(3){text-align:right;font-weight:500;white-space:nowrap;}
    .tx-table td:nth-child(4){text-align:right;font-size:11px;color:var(--muted);white-space:nowrap;}
    .tx-row-cancel{opacity:0.4;}
    .tx-row-cancel td:nth-child(3){text-decoration:line-through;}
    .tx-loc-main{font-size:12px;color:var(--text);}
    .tx-loc-sub{font-size:10px;color:var(--muted);margin-top:2px;}
    .tx-cancel-tag{font-size:10px;color:#E24B4A;}
    .tx-date-col{font-size:11px;color:var(--muted);}
    .tx-stack-bar{display:flex;height:22px;border-radius:4px;margin-bottom:8px;}
    .tx-stack-seg{height:100%;position:relative;transition:opacity 0.15s;min-width:1px;}
    .tx-stack-seg:first-child{border-radius:4px 0 0 4px;}
    .tx-stack-seg:last-child{border-radius:0 4px 4px 0;}
    .tx-stack-seg:only-child{border-radius:4px;}
    .tx-stack-seg:hover{opacity:0.8;}
    .tx-stack-pct{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:9px;font-weight:600;color:#fff;white-space:nowrap;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,0.3);}
    .tx-stack-legend{display:flex;flex-wrap:wrap;gap:3px 10px;}
    .tx-stack-legend-item{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text);}
    .tx-stack-legend-dot{width:8px;height:8px;border-radius:2px;flex-shrink:0;}
    .tx-stack-legend-item .s-cnt{color:var(--muted);font-size:10px;}
    .tx-hl-detail{flex:1;min-width:0;}
    .tx-hl-price{font-size:12px;font-weight:400;color:var(--muted);margin-left:6px;}
    .tx-more-btn{display:block;width:100%;text-align:center;padding:12px 0;border:none;background:none;color:var(--navy);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;}
    .tx-more-btn:hover{text-decoration:underline;}
    .tx-csv-btn{display:inline-block;margin-top:8px;border:none;background:none;color:var(--navy);font-size:12px;cursor:pointer;font-family:inherit;padding:0;}
    .tx-csv-btn:hover{text-decoration:underline;}
    .tx-hide-cancel{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--sub);}
    .tx-hide-cancel input{accent-color:var(--navy);width:14px;height:14px;}
    .tx-compare-table{width:100%;border-collapse:collapse;font-size:12px;}
    .tx-compare-table th,.tx-compare-table td{padding:8px 10px;border:0.5px solid var(--border);text-align:center;}
    .tx-compare-table th{background:#F7F6F3;font-size:11px;font-weight:600;color:var(--sub);}
    .tx-compare-table th:first-child{width:80px;text-align:left;}
    .tx-compare-table td:first-child{text-align:left;font-weight:500;color:var(--sub);font-size:11px;}
    .tx-insight-btn{padding:8px 16px;border:1px solid rgba(44,74,124,0.3);border-radius:8px;background:none;color:var(--navy);font-size:12px;cursor:pointer;font-family:inherit;transition:all 0.15s;}
    .tx-insight-btn:hover{background:rgba(44,74,124,0.04);}
    .tx-insight-text{font-size:12px;line-height:1.7;color:var(--text);margin-top:12px;white-space:pre-wrap;}
    .tx-bottom-btns{display:flex;gap:8px;margin-top:16px;}
    .tx-bottom-btns button{flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all 0.15s;}
    .tx-btn-outline{background:none;border:1px solid rgba(44,74,124,0.3);color:var(--navy);}
    .tx-btn-outline:hover{background:rgba(44,74,124,0.04);}
    .tx-btn-filled{background:var(--navy);border:none;color:#fff;}
    .tx-btn-filled:hover{background:var(--navy-dark);}
    .tx-report-modal{position:fixed;top:0;left:0;width:100%;height:100%;z-index:60;background:rgba(0,0,0,0.4);display:none;align-items:center;justify-content:center;}
    .tx-report-modal.active{display:flex;}
    .tx-report-content{background:#fff;border-radius:14px;max-width:600px;width:90%;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;padding:0;}
    .tx-report-header{padding:20px 24px;border-bottom:0.5px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:space-between;}
    .tx-report-header h3{font-size:16px;font-weight:600;margin:0;}
    .tx-report-body-wrap{flex:1;overflow-y:auto;padding:18px 24px;}
    .tx-report-period{font-size:12px;color:var(--muted);margin-bottom:14px;padding-bottom:12px;border-bottom:0.5px solid var(--border);letter-spacing:0.2px;}
    .tx-report-body{font-size:13px;line-height:1.8;color:var(--text);white-space:pre-wrap;word-break:break-word;}
    .tx-report-body a{color:var(--navy);text-decoration:underline;text-underline-offset:2px;}
    .tx-report-body a:hover{color:var(--navy-dark,#1a3259);}
    .tx-report-actions{display:flex;gap:8px;padding:16px 24px;border-top:0.5px solid var(--border);flex-shrink:0;background:#fff;}
    .tx-report-actions button{flex:1;padding:10px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;}
    .login-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(244,242,237,0.97);display:flex;align-items:center;justify-content:center;z-index:9999;}
    .login-box{background:#fff;border-radius:16px;padding:40px;max-width:360px;width:90%;box-shadow:0 4px 24px rgba(0,0,0,0.08);text-align:center;}
    .login-box h3{font-size:18px;font-weight:600;margin:0 0 8px;color:var(--text);}
    .login-box p{font-size:13px;color:var(--muted);margin:0 0 16px;line-height:1.5;}
    .login-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;border:1px solid var(--border);border-radius:10px;background:#fff;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;color:var(--text);transition:background 0.15s;}
    .login-btn:hover{background:var(--bg);}
    .login-btn img{width:18px;height:18px;}
    .login-error{display:none;font-size:12px;color:#E24B4A;margin-top:8px;}
  </style>
  <script>
    if (window.location.hash === '#transaction') {
      document.documentElement.setAttribute('data-view','tx');
    }
  </script>
</head>
<body>

<!-- 로그인 -->
<div class="login-overlay" id="instaLoginOverlay" style="display:none;">
  <div class="login-box">
    <h3>BSN Assistant</h3>
    <p>콘텐츠 생성 및 실거래가 조회를 위해<br>Google 계정으로 로그인하세요.</p>
    <button class="login-btn" id="instaGoogleBtn" onclick="doInstaLogin()">
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg">Google로 로그인
    </button>
    <div class="login-error" id="instaLoginError"></div>
  </div>
</div>

<!-- 접근 거부 -->
<div class="login-overlay" id="instaDeniedOverlay" style="display:none;">
  <div class="login-box">
    <div style="font-size:36px;margin-bottom:12px;">&#128683;</div>
    <h3>접근 권한 없음</h3>
    <p id="instaDeniedEmail" style="font-size:12px;color:var(--muted);margin-bottom:16px;"></p>
    <p>등록되지 않은 계정입니다.<br>관리자에게 명단 등록을 요청하세요.</p>
    <button class="login-btn" onclick="doLogout()" style="margin-top:16px;">다른 계정으로 로그인</button>
  </div>
</div>

<!-- 세션 만료 -->
<div class="login-overlay" id="instaKickedOverlay" style="display:none;">
  <div class="login-box">
    <div style="font-size:36px;margin-bottom:12px;">&#128274;</div>
    <h3>다른 기기에서 로그인됨</h3>
    <p style="font-size:13px;color:var(--muted);margin-top:8px;">동일 계정으로 다른 곳에서 로그인하여<br>현재 세션이 종료되었습니다.</p>
    <button class="login-btn" onclick="doLogout()" style="margin-top:16px;">다시 로그인</button>
  </div>
</div>

<nav>
  <div class="nav-inner">
    <a href="/" class="logo">
      <div class="logo-mark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg></div>
      <span class="logo-text">BSN <span>Assistant</span></span>
    </a>
    <div class="nav-links">
      <a href="javascript:void(0)" class="nav-link" id="navTransaction" onclick="showTransactionView()">실거래가</a>
      <a href="javascript:void(0)" class="nav-link active" id="navContent" onclick="showContentView()">콘텐츠 생성</a>
      <a href="/chatbot" class="nav-link">챗봇</a>
      <a href="/admin" class="nav-link">관리자</a>
    </div>
    <div class="nav-spacer"></div>
    <span id="navUserName" style="font-size:12px;color:#6B6B80;margin-right:8px;"></span>
    <button onclick="doLogout()" class="nav-btn">나가기</button>
  </div>
</nav>

<!-- ═══ INPUT VIEW ═══ -->
<main>
<div id="inputView" class="input-view active">
  <div class="page-header">
    <h1>콘텐츠 생성</h1>
    <button class="btn-study" onclick="showLearnView()">
      <span>&#128218; 학습</span>
      <span class="badge" id="studyBadge">0</span>
    </button>
  </div>

  <div class="card">
    <div class="tpl-selector">
      <div class="tpl-label">템플릿 선택</div>
      <div class="tpl-cards">
        <button class="tpl-card active" data-tpl="A" onclick="selectTemplate('A')">
          <span class="tpl-badge">A</span>
          <div class="tpl-name">거래 스토리</div>
          <div class="tpl-desc">특정 거래 한 건 심층 분석</div>
        </button>
        <button class="tpl-card" data-tpl="B" onclick="selectTemplate('B')">
          <span class="tpl-badge">B</span>
          <div class="tpl-name">데이터 비교</div>
          <div class="tpl-desc">두 대상 간 지표 대조</div>
        </button>
        <button class="tpl-card" data-tpl="C" onclick="selectTemplate('C')">
          <span class="tpl-badge">C</span>
          <div class="tpl-name">시장 브리핑</div>
          <div class="tpl-desc">월간/분기 + TOP N 랭킹</div>
        </button>
      </div>
      <div class="tpl-examples" id="tplExamples"></div>
    </div>

    <div class="tpl-suggest">
      <div class="tpl-suggest-header">
        <span class="tpl-suggest-title">추천 주제</span>
        <button class="tpl-refresh" onclick="refreshSuggestions()">다른 추천 보기</button>
      </div>
      <div class="tpl-suggest-items" id="tplSuggestItems"></div>
    </div>

    <div class="input-section">
      <textarea class="text-input" id="textInput" placeholder="위 추천 주제를 선택하거나 직접 입력하세요&#10;&#10;템플릿에 맞는 주제를 작성하면 더 정확한 콘텐츠가 생성됩니다."></textarea>
      <div class="input-guide">텍스트, 키워드, 기사 URL 모두 입력 가능 · URL 입력 시 기사를 자동 추출합니다</div>
    </div>

    <button class="btn-generate" id="generateBtn" onclick="doGenerate()">콘텐츠 생성하기</button>
  </div>

  <!-- AI News -->
  <div class="card" style="padding:20px;margin-top:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-size:15px;font-weight:500;color:#1A1A2E;">AI 뉴스 추천 <span id="newsCountBadge" style="font-size:11px;color:#A8A49C;font-weight:400;"></span></span>
      <button onclick="refreshNews()" style="border:none;background:none;color:#2C4A7C;font-size:12px;cursor:pointer;font-family:inherit;">새로고침</button>
    </div>
    <div style="font-size:11px;color:#A8A49C;margin-top:2px;margin-bottom:12px;">학습 데이터 기반으로 빌딩 매매 관련 최신 기사를 추천합니다</div>
    <div id="newsListWrap" style="border-top:1px solid rgba(44,74,124,0.06);"></div>
  </div>

  <!-- History -->
  <div class="history-section">
    <div class="history-header">
      <span class="history-label">최근 생성 기록</span>
      <button class="btn-clear-all" id="btnClearAll" style="display:none;" onclick="clearAllHistory()">전체 삭제</button>
    </div>
    <div id="historyList"></div>
    <button class="btn-history-more" id="btnHistoryMore" style="display:none;" onclick="toggleHistoryExpand()"></button>
  </div>
</div>

<!-- ═══ RESULT VIEW ═══ -->
<div id="resultView" class="result-view">
  <button class="back-btn" onclick="showInput()">&#8592; 뒤로가기</button>
  <h1 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:4px;">콘텐츠 생성</h1>
  <div class="result-subtitle">각 채널별 결과를 확인하고 수정하세요</div>

  <!-- Channel Tabs -->
  <div class="channel-tabs">
    <button class="channel-tab active" data-ch="insta" onclick="switchChannel('insta')">
      <div class="ch-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg></div>
      <span>인스타</span>
    </button>
    <button class="channel-tab" data-ch="short" onclick="switchChannel('short')">
      <div class="ch-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg></div>
      <span>숏폼</span>
    </button>
    <button class="channel-tab" data-ch="youtube" onclick="switchChannel('youtube')">
      <div class="ch-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2A29 29 0 0023 12a29 29 0 00-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg></div>
      <span>유튜브</span>
    </button>
    <button class="channel-tab" data-ch="thread" onclick="switchChannel('thread')">
      <div class="ch-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>
      <span>스레드</span>
    </button>
    <button class="channel-tab" data-ch="blog" onclick="switchChannel('blog')">
      <div class="ch-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>
      <span>블로그</span>
    </button>
  </div>

  <!-- ── Instagram Panel ── -->
  <div class="channel-panel active" id="panel-insta">
    <div class="card">
      <div class="section-label">카드뉴스 미리보기 <button id="btnAiImage" onclick="generateCardImages()" style="font-size:11px;padding:3px 10px;border:1px solid rgba(44,74,124,0.3);border-radius:6px;background:none;color:#2C4A7C;cursor:pointer;font-family:inherit;font-weight:500;display:none;">AI 이미지 생성</button></div>
      <div class="card-preview-wrap">
        <div class="card-preview" id="cardPreview">
          <div class="skeleton" id="cardSkeleton"></div>
          <img class="card-bg" id="cardBgImg" style="display:none;" alt="">
          <button class="card-arrow left" id="cardArrowLeft" onclick="goToSlide(currentSlide-1)" style="display:none;">&#8249;</button>
          <button class="card-arrow right" id="cardArrowRight" onclick="goToSlide(currentSlide+1)">&#8250;</button>
          <div class="card-tag" id="cardTag" contenteditable="true" spellcheck="false">문제 제기</div>
          <div class="card-watermark">BSN</div>
          <div class="card-period" id="cardPeriod" style="display:none;"></div>
          <div class="card-source" id="cardSource" style="display:none;">국토교통부 상업업무용 매매 실거래가</div>
          <div class="card-main-text" id="cardText" contenteditable="true" spellcheck="false">콘텐츠를 생성하면 여기에 카드뉴스가 표시됩니다</div>
          <div class="card-slide-num" id="cardSlideNum">1 / 7</div>
          <div class="card-nav" id="cardNav"></div>
          <div class="card-img-actions" id="cardImgActions"></div>
          <div class="card-spinner" id="cardSpinner"><div class="spin"></div><div class="spin-text">이미지 생성 중...</div></div>
          <div class="card-actions">
            <button class="btn-card-action" title="글자 축소" onclick="changeFontSize(-2)" style="font-size:11px;font-weight:700;">A-</button>
            <button class="btn-card-action" title="글자 확대" onclick="changeFontSize(2)" style="font-size:11px;font-weight:700;">A+</button>
            <button class="btn-card-action" title="전체 다운로드 (ZIP)" onclick="downloadAllCards()">&#8595;</button>
          </div>
          <input type="file" id="cardFileInput" accept="image/*" style="display:none;" onchange="handleCardUpload(event)">
        </div>
      </div>
    </div>

    <div class="card">
      <div class="result-block">
        <div class="section-label">캡션 + 해시태그 <button class="btn-copy" onclick="copyText('instaCaption')">복사</button></div>
        <textarea class="result-textarea" id="instaCaption" rows="5" placeholder="콘텐츠 생성 후 캡션과 해시태그가 표시됩니다"></textarea>
      </div>
    </div>
  </div>

  <!-- ── Short-form Panel ── -->
  <div class="channel-panel" id="panel-short">
    <div class="card" style="padding:20px;margin-bottom:12px;">
      <div class="result-block">
        <div class="section-label" style="flex-direction:column;align-items:flex-start;gap:2px;">
          <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
            <span style="color:#2C4A7C;">&#128249; 촬영용 스크립트</span>
            <button class="btn-copy" onclick="copyText('shortFilming')">복사</button>
          </div>
          <span style="font-size:10px;color:#A8A49C;font-weight:400;text-transform:none;letter-spacing:0;">촬영할 때 이것만 보세요</span>
        </div>
        <textarea class="result-textarea" id="shortFilming" rows="8" style="font-size:13.5px;line-height:1.8;" placeholder="촬영용 스크립트"></textarea>
      </div>
    </div>
    <div class="card" style="padding:20px;margin-bottom:12px;">
      <div class="result-block">
        <div class="section-label" style="flex-direction:column;align-items:flex-start;gap:2px;">
          <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
            <span style="color:#2C4A7C;">&#128241; 릴스 업로드용</span>
            <button class="btn-copy" onclick="copyText('shortReelsUpload')">전체 복사</button>
          </div>
          <span style="font-size:10px;color:#A8A49C;font-weight:400;text-transform:none;letter-spacing:0;">인스타 릴스에 그대로 붙여넣기</span>
        </div>
        <textarea class="result-textarea" id="shortReelsUpload" rows="6" style="font-size:13.5px;line-height:1.8;" placeholder="릴스 업로드용 캡션 + 해시태그"></textarea>
      </div>
    </div>
    <div class="card" style="padding:20px;margin-bottom:12px;">
      <div class="result-block">
        <div class="section-label" style="flex-direction:column;align-items:flex-start;gap:2px;">
          <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
            <span style="color:#2C4A7C;">&#128250; 쇼츠 업로드용</span>
            <button class="btn-copy" onclick="copyText('shortShortsUpload')">전체 복사</button>
          </div>
          <span style="font-size:10px;color:#A8A49C;font-weight:400;text-transform:none;letter-spacing:0;">유튜브 쇼츠에 그대로 붙여넣기</span>
        </div>
        <textarea class="result-textarea" id="shortShortsUpload" rows="6" style="font-size:13.5px;line-height:1.8;" placeholder="쇼츠 업로드용 제목 + 설명란"></textarea>
      </div>
    </div>
  </div>

  <!-- ── YouTube Panel ── -->
  <div class="channel-panel" id="panel-youtube">
    <div class="card">
      <div class="result-block">
        <div class="section-label">제목 <button class="btn-copy" onclick="copyText('ytTitle')">복사</button></div>
        <textarea class="result-textarea" id="ytTitle" rows="2" placeholder="콘텐츠 생성 후 제목이 표시됩니다"></textarea>
      </div>
      <div class="result-block">
        <div class="section-label">롱폼 스크립트 <button class="btn-copy" onclick="copyText('ytScript')">복사</button></div>
        <textarea class="result-textarea" id="ytScript" rows="8" placeholder="콘텐츠 생성 후 스크립트가 표시됩니다"></textarea>
      </div>
      <div class="result-block">
        <div class="section-label">설명란 + 태그 <button class="btn-copy" onclick="copyText('ytDesc')">복사</button></div>
        <textarea class="result-textarea" id="ytDesc" rows="4" placeholder="콘텐츠 생성 후 설명란과 태그가 표시됩니다"></textarea>
      </div>
    </div>
  </div>

  <!-- ── Thread Panel ── -->
  <div class="channel-panel" id="panel-thread">
    <div class="card">
      <div class="result-block">
        <div class="section-label">스레드 게시글 <button class="btn-copy" onclick="copyText('threadPost')">복사</button></div>
        <textarea class="result-textarea" id="threadPost" rows="8" placeholder="콘텐츠 생성 후 스레드 게시글이 표시됩니다"></textarea>
      </div>
    </div>
  </div>

  <!-- ── Blog Panel ── -->
  <div class="channel-panel" id="panel-blog">
    <div class="card">
      <div class="result-block">
        <div class="section-label">블로그 글 <span class="sub-label">SEO 키워드</span> <button class="btn-copy" onclick="copyText('blogPost')">복사</button></div>
        <textarea class="result-textarea" id="blogPost" rows="12" placeholder="콘텐츠 생성 후 블로그 글이 표시됩니다"></textarea>
      </div>
    </div>
  </div>
</div>

<!-- ═══ LEARN VIEW ═══ -->
<div id="learnView" style="display:none;">
  <button class="back-btn" onclick="hideLearnView()">&#8592; 뒤로가기</button>
  <h1 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:4px;">학습 자료 관리</h1>
  <div class="result-subtitle">기사와 자료를 추가할수록 콘텐츠 품질이 올라갑니다</div>

  <!-- URL 입력 -->
  <div class="card" style="margin-bottom:12px;">
    <div class="section-label" style="margin-bottom:10px;">기사 URL 추가</div>
    <textarea class="result-textarea" id="learnUrlInput" rows="5" style="font-size:13px;line-height:1.6;" placeholder="링크를 붙여넣으세요&#10;카톡에서 복사한 내용도 그대로 붙여넣기 가능&#10;(URL만 자동으로 추출됩니다)&#10;&#10;https://news.example.com/article1&#10;https://news.example.com/article2"></textarea>
    <div id="learnUrlCount" style="font-size:11px;color:#A8A49C;margin:6px 0;"></div>
    <div id="learnProgress" style="display:none;margin-bottom:8px;">
      <div style="height:4px;background:#E2E2E2;border-radius:2px;overflow:hidden;"><div id="learnProgressBar" style="height:100%;background:#2C4A7C;width:0%;transition:width 0.3s;"></div></div>
      <div id="learnProgressText" style="font-size:11px;color:#A8A49C;margin-top:4px;"></div>
    </div>
    <div id="learnResult" style="display:none;font-size:12px;padding:8px 12px;border-radius:8px;background:#EEF2F9;color:#2C4A7C;margin-bottom:8px;"></div>
    <button class="btn-generate" id="learnAddBtn" onclick="doLearnAdd()" style="margin-top:4px;">추가 및 분석하기</button>
  </div>

  <!-- PDF 업로드 -->
  <div class="card" style="margin-bottom:12px;">
    <div class="section-label" style="margin-bottom:4px;">PDF 자료 업로드</div>
    <div style="font-size:11px;color:#A8A49C;margin-bottom:10px;">부동산 리포트, 시장 분석 보고서 등 PDF 파일을 업로드하면 AI가 분석합니다</div>
    <div id="pdfDropZone" style="border:2px dashed rgba(44,74,124,0.2);border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:border-color 0.15s;" onclick="document.getElementById('pdfFileInput').click()">
      <div style="font-size:24px;margin-bottom:8px;">&#128196;</div>
      <div style="font-size:13px;color:#6B6B80;">PDF 파일을 드래그하거나 클릭하여 업로드</div>
    </div>
    <input type="file" id="pdfFileInput" accept=".pdf" multiple style="display:none;" onchange="handlePdfSelect(event)">
    <div id="pdfFileList" style="margin-top:8px;"></div>
    <div id="pdfProgress" style="display:none;margin:8px 0;">
      <div style="height:4px;background:#E2E2E2;border-radius:2px;overflow:hidden;"><div id="pdfProgressBar" style="height:100%;background:#2C4A7C;width:0%;transition:width 0.3s;"></div></div>
      <div id="pdfProgressText" style="font-size:11px;color:#A8A49C;margin-top:4px;"></div>
    </div>
    <div id="pdfResult" style="display:none;margin-top:8px;font-size:12px;line-height:1.6;"></div>
    <button class="btn-generate" id="pdfUploadBtn" onclick="doPdfUpload()" style="margin-top:8px;display:none;">분석하기</button>
  </div>

  <!-- 학습 현황 -->
  <div class="card" style="margin-bottom:12px;">
    <div id="learnStatsSection"></div>
  </div>

  <!-- 최근 학습 자료 리스트 -->
  <div class="card">
    <div class="section-label" style="margin-bottom:10px;">최근 학습 자료</div>
    <div style="display:flex;gap:0;border-bottom:1px solid #E2E2E2;margin-bottom:10px;">
      <button class="learn-tab active" data-tab="url" onclick="switchLearnTab('url')" style="flex:1;padding:8px 0;border:none;background:none;font-size:13px;font-weight:500;color:#A8A49C;cursor:pointer;border-bottom:2px solid transparent;font-family:inherit;">기사 링크</button>
      <button class="learn-tab" data-tab="pdf" onclick="switchLearnTab('pdf')" style="flex:1;padding:8px 0;border:none;background:none;font-size:13px;font-weight:500;color:#A8A49C;cursor:pointer;border-bottom:2px solid transparent;font-family:inherit;">PDF 파일</button>
    </div>
    <div id="learnArticleList"></div>
  </div>
</div>

<!-- ═══ TRANSACTION VIEW ═══ -->
<div id="transactionView" class="tx-view">
  <h1 style="font-family:'Poppins',sans-serif;font-size:22px;font-weight:700;margin-bottom:4px;">실거래가 분석</h1>
  <div class="result-subtitle">상업업무용 부동산(집합,지분거래 제외) 실거래 데이터 — 국토교통부 API</div>

  <div class="tx-card" id="txRankingSetup">
    <div class="tx-rank-ctrl">
      <span class="cl">지역</span>
      <select id="txRankSido" onchange="txOnRankSidoChange()">
        <option value="전국">전국</option>
      </select>
      <select id="txRankSgg" onchange="txOnRankSggChange()" style="display:none;">
        <option value="">전체</option>
      </select>
      <span class="cl" style="margin-left:8px;">기간</span>
      <select id="txRankPeriod" onchange="txOnRankPeriodChange()">
        <option value="ytd" selected>올해</option>
        <option value="3">3개월</option>
        <option value="6">6개월</option>
        <option value="12">1년</option>
        <option value="custom">직접 설정</option>
      </select>
      <button id="txRankCustomBtn" onclick="txLoadRanking()" style="display:none;padding:7px 16px;border:none;border-radius:8px;background:var(--navy);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">조회</button>
    </div>
    <div id="txRankCustomRange" style="display:none;margin-bottom:10px;display:none;gap:12px;align-items:flex-start;">
      <div style="flex:1;">
        <div style="text-align:center;font-size:11px;color:var(--muted);margin-bottom:4px;">시작</div>
        <div class="tx-ym-picker">
          <div class="tx-ym-header">
            <button class="tx-ym-nav" onclick="txRankYmNav('start',-1)">&#9664;</button>
            <span id="txRankStartYearLabel"></span>
            <button class="tx-ym-nav" onclick="txRankYmNav('start',1)">&#9654;</button>
          </div>
          <div class="tx-ym-grid" id="txRankStartGrid"></div>
        </div>
      </div>
      <span style="font-size:14px;color:var(--muted);margin-top:22px;">~</span>
      <div style="flex:1;">
        <div style="text-align:center;font-size:11px;color:var(--muted);margin-bottom:4px;">종료</div>
        <div class="tx-ym-picker">
          <div class="tx-ym-header">
            <button class="tx-ym-nav" onclick="txRankYmNav('end',-1)">&#9664;</button>
            <span id="txRankEndYearLabel"></span>
            <button class="tx-ym-nav" onclick="txRankYmNav('end',1)">&#9654;</button>
          </div>
          <div class="tx-ym-grid" id="txRankEndGrid"></div>
        </div>
      </div>
    </div>
    <div class="tx-stat-pills" id="txStatPills">
      <span class="tx-stat-pill on" data-sort="totalCount" onclick="txPickStat(this)">거래량</span>
      <span class="tx-stat-pill" data-sort="avgPrice" onclick="txPickStat(this)">평균 매매가</span>
      <span class="tx-stat-pill" data-sort="avgPricePerPyeong" onclick="txPickStat(this)">평당 매매가(토지)</span>
      <span class="tx-stat-pill" data-sort="avgPricePerArea" onclick="txPickStat(this)">평당 매매가(연면적)</span>
    </div>
  </div>

  <div class="tx-period-info" id="txRankPeriodInfo"></div>

  <div class="tx-loading" id="txRankLoading" style="display:none;">
    <div class="spin"></div>
    <div>랭킹 데이터를 불러오고 있습니다...</div>
  </div>

  <div class="tx-rank-grid" id="txRankGrid"></div>

  <div class="tx-compare-float" id="txCompareFloat">
    <button class="tx-compare-btn" onclick="txShowCompare()">선택 지역 비교 분석</button>
  </div>
</div>

<!-- 리포트 모달 -->
<div class="tx-report-modal" id="txReportModal">
  <div class="tx-report-content">
    <div class="tx-report-header">
      <h3>시장 리포트</h3>
      <button style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:#fff;font-size:16px;color:var(--sub);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background 0.15s;" onmouseover="this.style.background='#F7F6F3'" onmouseout="this.style.background='#fff'" onclick="document.getElementById('txReportModal').classList.remove('active')">&#10005;</button>
    </div>
    <div class="tx-report-body-wrap">
      <div id="txReportPeriod" class="tx-report-period" style="display:none;"></div>
      <div class="tx-report-body" id="txReportBody"></div>
    </div>
    <div class="tx-report-actions">
      <button class="tx-btn-outline" onclick="txCopyReport()">복사하기</button>
      <button class="tx-btn-filled" onclick="txReportToContent()">콘텐츠로 변환</button>
    </div>
  </div>
</div>

</main>

<!-- Kakao -->

<script>
var cfBaseUrl = '${process.env.FUNCTION_URL || ''}';
(function(){ var n=localStorage.getItem('bsn_user_name'); if(n) document.getElementById('navUserName').textContent=n; })();
// ─── Card news data ───
const CARD_TAGS = ['문제 제기','손해 인식','관점 전환','해결 방법','증거','결심','CTA'];
// ─── 템플릿 메타 데이터 + 추천 주제 풀 ───
// 주제 포맷: { text, region: { sido, sgg, dong? } } 또는 { text, region1, region2 }
// C 템플릿: rankBy 필드로 정렬 기준 지정
const TEMPLATE_META = {
  // A = 단일 지역·상권 분석 (구 또는 동 단위)
  A: {
    examples: [
      '한 지역·상권의 종합 분석',
      '거래량·평당가·법인 비율 등 12개 지표 조합',
      '구 내 순위·서울 내 위상 확인',
      '전년 동기 대비 변화 분석',
      '반기별 추이 확인'
    ],
    suggestions: [
      { text: '강남 상업용 빌딩 시장 현황', region: { sido: '서울특별시', sgg: '강남구' } },
      { text: '강남 법인 매수 비율과 의미', region: { sido: '서울특별시', sgg: '강남구' } },
      { text: '서초구 평균 매매가와 순위', region: { sido: '서울특별시', sgg: '서초구' } },
      { text: '송파구 거래량 흐름 분석', region: { sido: '서울특별시', sgg: '송파구' } },
      { text: '마포구 용도지역별 거래 분포', region: { sido: '서울특별시', sgg: '마포구' } },
      { text: '용산구 건축연도별 거래 구성', region: { sido: '서울특별시', sgg: '용산구' } },
      { text: '종로구 최고·최저 평당가 거래', region: { sido: '서울특별시', sgg: '종로구' } },
      { text: '영등포구 상업용 부동산 현황', region: { sido: '서울특별시', sgg: '영등포구' } },
      { text: '성동구 전년 대비 변화율', region: { sido: '서울특별시', sgg: '성동구' } },
      { text: '역삼동 시장 분석', region: { sido: '서울특별시', sgg: '강남구', dong: '역삼동' } },
      { text: '성수동 상권 현황', region: { sido: '서울특별시', sgg: '성동구', dong: '성수동' } },
      { text: '청담동 평당가 추이', region: { sido: '서울특별시', sgg: '강남구', dong: '청담동' } },
      { text: '삼성동 법인 매수 분석', region: { sido: '서울특별시', sgg: '강남구', dong: '삼성동' } },
      { text: '서초동 거래 구성', region: { sido: '서울특별시', sgg: '서초구', dong: '서초동' } },
      { text: '논현동 평균 매매가', region: { sido: '서울특별시', sgg: '강남구', dong: '논현동' } },
      { text: '한남동 용도지역 분석', region: { sido: '서울특별시', sgg: '용산구', dong: '한남동' } },
      { text: '이태원동 상업 빌딩', region: { sido: '서울특별시', sgg: '용산구', dong: '이태원동' } }
    ]
  },
  // B = 두 지역·상권 비교
  B: {
    examples: [
      '두 지역의 12개 지표 대조',
      '평당가·거래량·법인 비율 격차',
      '각 지역의 서울 내 상대적 위상',
      '전년 동기 변화 비교',
      '반기별 추이 병렬 분석'
    ],
    suggestions: [
      { text: '강남 vs 서초 거래 비교',
        region1: { sido: '서울특별시', sgg: '강남구' },
        region2: { sido: '서울특별시', sgg: '서초구' } },
      { text: '강남 vs 송파 평당가 격차',
        region1: { sido: '서울특별시', sgg: '강남구' },
        region2: { sido: '서울특별시', sgg: '송파구' } },
      { text: '마포 vs 용산 거래량 대조',
        region1: { sido: '서울특별시', sgg: '마포구' },
        region2: { sido: '서울특별시', sgg: '용산구' } },
      { text: '성동 vs 광진 시장 비교',
        region1: { sido: '서울특별시', sgg: '성동구' },
        region2: { sido: '서울특별시', sgg: '광진구' } },
      { text: '종로 vs 중구 오피스 비교',
        region1: { sido: '서울특별시', sgg: '종로구' },
        region2: { sido: '서울특별시', sgg: '중구' } },
      { text: '영등포 vs 마포 법인 비율',
        region1: { sido: '서울특별시', sgg: '영등포구' },
        region2: { sido: '서울특별시', sgg: '마포구' } },
      { text: '역삼동 vs 삼성동 평당가',
        region1: { sido: '서울특별시', sgg: '강남구', dong: '역삼동' },
        region2: { sido: '서울특별시', sgg: '강남구', dong: '삼성동' } },
      { text: '성수 vs 청담 거래 흐름',
        region1: { sido: '서울특별시', sgg: '성동구', dong: '성수동' },
        region2: { sido: '서울특별시', sgg: '강남구', dong: '청담동' } },
      { text: '한남동 vs 이태원동 시장',
        region1: { sido: '서울특별시', sgg: '용산구', dong: '한남동' },
        region2: { sido: '서울특별시', sgg: '용산구', dong: '이태원동' } },
      { text: '논현동 vs 신사동 거래 비교',
        region1: { sido: '서울특별시', sgg: '강남구', dong: '논현동' },
        region2: { sido: '서울특별시', sgg: '강남구', dong: '신사동' } },
      { text: '서초동 vs 반포동 평당가',
        region1: { sido: '서울특별시', sgg: '서초구', dong: '서초동' },
        region2: { sido: '서울특별시', sgg: '서초구', dong: '반포동' } },
      { text: '도곡동 vs 개포동 거래',
        region1: { sido: '서울특별시', sgg: '강남구', dong: '도곡동' },
        region2: { sido: '서울특별시', sgg: '강남구', dong: '개포동' } }
    ]
  },
  // C = 랭킹 전용
  C: {
    examples: [
      'TOP N 거래량 순위',
      'TOP N 평당가 순위',
      'TOP N 평균 매매가 순위',
      'TOP N 법인 매수 비율 순위',
      'TOP N 연면적 평당가 순위'
    ],
    suggestions: [
      { text: '서울 25개 구 거래량 TOP 10', region: { sido: '서울특별시' }, rankBy: 'totalCount' },
      { text: '서울 25개 구 평당가 TOP 10', region: { sido: '서울특별시' }, rankBy: 'avgPricePerPyeong' },
      { text: '서울 25개 구 평균 매매가 TOP 10', region: { sido: '서울특별시' }, rankBy: 'avgPrice' },
      { text: '서울 25개 구 법인 매수 비율 TOP 10', region: { sido: '서울특별시' }, rankBy: 'corpBuyerRatio' },
      { text: '서울 25개 구 연면적 평당가 TOP 10', region: { sido: '서울특별시' }, rankBy: 'avgPricePerArea' },
      { text: '강남 동별 거래량 TOP 5', region: { sido: '서울특별시', sgg: '강남구' }, rankBy: 'totalCount' },
      { text: '강남 동별 평당가 TOP 5', region: { sido: '서울특별시', sgg: '강남구' }, rankBy: 'avgPricePerPyeong' },
      { text: '강남 동별 평균 매매가 TOP 5', region: { sido: '서울특별시', sgg: '강남구' }, rankBy: 'avgPrice' },
      { text: '성동 동별 거래량 TOP 5', region: { sido: '서울특별시', sgg: '성동구' }, rankBy: 'totalCount' },
      { text: '성동 동별 평당가 TOP 5', region: { sido: '서울특별시', sgg: '성동구' }, rankBy: 'avgPricePerPyeong' },
      { text: '서초구 동별 거래량 TOP 5', region: { sido: '서울특별시', sgg: '서초구' }, rankBy: 'totalCount' },
      { text: '서초구 동별 평당가 TOP 5', region: { sido: '서울특별시', sgg: '서초구' }, rankBy: 'avgPricePerPyeong' },
      { text: '송파구 동별 거래량 TOP 5', region: { sido: '서울특별시', sgg: '송파구' }, rankBy: 'totalCount' },
      { text: '마포구 동별 거래량 TOP 5', region: { sido: '서울특별시', sgg: '마포구' }, rankBy: 'totalCount' },
      { text: '용산구 동별 평당가 TOP 5', region: { sido: '서울특별시', sgg: '용산구' }, rankBy: 'avgPricePerPyeong' }
    ]
  }
};

var currentTemplate = 'A';
var tplCurrentSuggestions = []; // 현재 표시 중 추천 주제 3개 (idx로 참조)
var pendingSuggestionMeta = null; // 클릭된 주제의 region 메타 (다음 생성 요청에 첨부)

function selectTemplate(tpl) {
  if (!TEMPLATE_META[tpl]) return;
  currentTemplate = tpl;
  document.querySelectorAll('.tpl-card').forEach(function(c) {
    c.classList.toggle('active', c.getAttribute('data-tpl') === tpl);
  });
  var meta = TEMPLATE_META[tpl];
  var exHtml = '<div class="tpl-examples-title">이 템플릿에 적합한 주제</div>';
  meta.examples.forEach(function(ex) {
    exHtml += '· ' + ex + '<br>';
  });
  var examplesEl = document.getElementById('tplExamples');
  if (examplesEl) examplesEl.innerHTML = exHtml;
  refreshSuggestions();
}

function refreshSuggestions() {
  var meta = TEMPLATE_META[currentTemplate];
  if (!meta) return;
  var pool = meta.suggestions.slice();
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  tplCurrentSuggestions = pool.slice(0, 3);
  var html = '';
  tplCurrentSuggestions.forEach(function(s, idx) {
    var textEsc = s.text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    html += '<div class="tpl-suggest-item" onclick="pickSuggestion(' + idx + ')">';
    html += '<div class="tpl-suggest-item-text">' + textEsc + '</div>';
    html += '<button class="tpl-suggest-item-btn" onclick="event.stopPropagation();pickSuggestionAndGenerate(' + idx + ')">생성</button>';
    html += '</div>';
  });
  var itemsEl = document.getElementById('tplSuggestItems');
  if (itemsEl) itemsEl.innerHTML = html;
}

function pickSuggestion(idx) {
  var s = tplCurrentSuggestions[idx];
  if (!s) return;
  var ta = document.getElementById('textInput');
  if (ta) { ta.value = s.text; ta.focus(); }
  pendingSuggestionMeta = s;
}

function pickSuggestionAndGenerate(idx) {
  var s = tplCurrentSuggestions[idx];
  if (!s) return;
  var ta = document.getElementById('textInput');
  if (ta) ta.value = s.text;
  pendingSuggestionMeta = s;
  doGenerate();
}
const CARD_STYLES = {
  dark:   { bg: '#1A1A1A', color: '#FFFFFF' },
  light:  { bg: '#F8F6F1', color: '#1A1A2E' },
  accent: { bg: '#2C4A7C', color: '#FFFFFF' },
  cta:    { bg: '#E1306C', color: '#FFFFFF' }
};
let currentSlide = 0;
let cardsData = [];
let cardImages = []; // base64 이미지 캐시 (7장)
let cardFontSizes = []; // 카드별 글자 크기 (기본 30px)
const DEFAULT_FONT_SIZE = 30;
const MIN_FONT_SIZE = 20;
const MAX_FONT_SIZE = 40;
let imageIdeas = []; // GPT가 생성한 이미지 아이디어
let currentTopic = '';
let currentRegion = ''; // GPT가 추출한 지역명
let isGeneratingImages = false;

// ─── 스타일별 오버레이 (CSS fallback 카드에 적용) ───
const OVERLAY_STYLES = {
  dark:   'linear-gradient(rgba(0,0,0,0.65),rgba(0,0,0,0.65))',
  light:  'linear-gradient(rgba(255,255,255,0.7),rgba(255,255,255,0.7))',
  accent: 'linear-gradient(rgba(44,74,124,0.7),rgba(44,74,124,0.7))',
  cta:    'linear-gradient(rgba(225,48,108,0.65),rgba(225,48,108,0.65))'
};

function initCardNav() {
  const nav = document.getElementById('cardNav');
  nav.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const dot = document.createElement('button');
    dot.className = 'card-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => goToSlide(i);
    nav.appendChild(dot);
  }
}

function goToSlide(idx) {
  currentSlide = idx;
  const preview = document.getElementById('cardPreview');
  const tag = document.getElementById('cardTag');
  const text = document.getElementById('cardText');
  const num = document.getElementById('cardSlideNum');
  const bgImg = document.getElementById('cardBgImg');
  const skeleton = document.getElementById('cardSkeleton');
  const periodEl = document.getElementById('cardPeriod');
  const sourceEl = document.getElementById('cardSource');

  // 스타일 클래스 초기화
  preview.className = 'card-preview';

  // 7장(CTA) 고정 디자인
  if (idx === 6 && cardsData.length > 0 && cardsData[idx]) {
    preview.style.background = '#0D0D9F';
    preview.style.color = '#FFFFFF';
    bgImg.style.display = 'none';
    skeleton.classList.remove('active');
    tag.style.display = 'none';
    document.querySelector('.card-watermark').style.display = 'none';
    if (periodEl) periodEl.style.display = 'none';
    if (sourceEl) sourceEl.style.display = 'none';
    text.textContent = cardsData[idx].title || '';
    text.style.display = '';
    text.style.fontSize = DEFAULT_FONT_SIZE + 'px';
    num.textContent = '<div style="font-size:30px;font-weight:900;letter-spacing:1px;color:#FFFFFF;">BSN.</div>';
    num.innerHTML = '<div style="font-size:30px;font-weight:900;letter-spacing:1px;color:#FFFFFF;">BSN.</div>';
    document.querySelectorAll('.card-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
    document.getElementById('cardArrowLeft').style.display = idx === 0 ? 'none' : 'flex';
    document.getElementById('cardArrowRight').style.display = 'none';
    renderCardImgActions(idx);
    return;
  }

  if (cardsData.length > 0 && cardsData[idx]) {
    const card = cardsData[idx];
    const s = CARD_STYLES[card.style] || CARD_STYLES.dark;
    const overlay = OVERLAY_STYLES[card.style] || OVERLAY_STYLES.dark;
    preview.style.color = s.color;
    if (card.style === 'light') preview.classList.add('style-light');

    // 태그/텍스트는 항상 표시 (인라인 편집 가능)
    tag.textContent = card.tag || CARD_TAGS[idx];
    text.textContent = card.title || '';
    tag.style.display = '';
    text.style.display = '';
    num.style.display = '';
    document.querySelector('.card-watermark').style.display = '';

    // 기간 배지 렌더링 (period 있고 빈 문자열 아닐 때만)
    var p = '';
    if (periodEl) {
      p = (card.period || '').trim();
      var ps = (card.periodSecondary || '').trim();
      if (p) {
        var html = escHtml(p);
        if (ps) {
          html += '<span class="card-period-secondary">vs ' + escHtml(ps) + '</span>';
        }
        periodEl.innerHTML = html;
        periodEl.style.display = '';
      } else {
        periodEl.style.display = 'none';
      }
    }

    // 출처 표시 (period가 있는 카드 = 통계 데이터 카드)
    if (sourceEl) {
      sourceEl.style.display = p ? '' : 'none';
    }

    if (cardImages[idx]) {
      // 이미지 + 오버레이 배경
      bgImg.src = 'data:image/png;base64,' + cardImages[idx];
      bgImg.style.display = 'block';
      // 2장 지도 카드는 밝은 오버레이 + 어두운 텍스트
      if (card._mapCard) {
        preview.style.background = 'linear-gradient(rgba(255,255,255,0.55),rgba(255,255,255,0.55)), #F8F6F1';
        preview.style.color = '#1A1A2E';
        preview.classList.add('style-light');
      } else {
        preview.style.background = overlay + ', ' + s.bg;
      }
      skeleton.classList.remove('active');
    } else {
      bgImg.style.display = 'none';
      preview.style.background = s.bg;
      if (isGeneratingImages) {
        skeleton.classList.add('active');
      } else {
        skeleton.classList.remove('active');
      }
    }
  } else {
    bgImg.style.display = 'none';
    skeleton.classList.remove('active');
    preview.style.background = '#2C4A7C';
    preview.style.color = '#FFFFFF';
    tag.style.display = '';
    text.style.display = '';
    num.style.display = '';
    document.querySelector('.card-watermark').style.display = '';
    tag.textContent = CARD_TAGS[idx];
    text.textContent = '콘텐츠를 생성하면 여기에 카드뉴스가 표시됩니다';
    if (periodEl) periodEl.style.display = 'none';
    if (sourceEl) sourceEl.style.display = 'none';
  }
  num.textContent = (idx + 1) + ' / 7';
  // 카드별 글자 크기 적용
  text.style.fontSize = (cardFontSizes[idx] || DEFAULT_FONT_SIZE) + 'px';
  document.querySelectorAll('.card-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  document.getElementById('cardArrowLeft').style.display = idx === 0 ? 'none' : 'flex';
  document.getElementById('cardArrowRight').style.display = idx >= 6 ? 'none' : 'flex';
  // 이미지 액션 버튼 렌더링
  renderCardImgActions(idx);
}

function renderCardImgActions(idx) {
  var el = document.getElementById('cardImgActions');
  if (!cardsData.length || !cardsData[idx] || idx === 6) { el.innerHTML = ''; return; }
  if (cardImages[idx]) {
    el.innerHTML = '<button class="btn-img-act" onclick="triggerCardUpload()">&#128247; 교체</button>' +
      '<button class="btn-img-act" onclick="generateSingleCardImage()">&#10024; 재생성</button>' +
      '<button class="btn-img-act" onclick="removeCardImage()">&#10005; 제거</button>';
  } else {
    el.innerHTML = '<button class="btn-img-act" onclick="triggerCardUpload()">&#128247; 업로드</button>' +
      '<button class="btn-img-act" onclick="generateSingleCardImage()">&#10024; AI 생성</button>';
  }
}

// ─── 글자 크기 조절 ───
function changeFontSize(delta) {
  if (currentSlide === 6) return; // 7장은 고정 크기
  if (!cardFontSizes[currentSlide]) cardFontSizes[currentSlide] = DEFAULT_FONT_SIZE;
  const newSize = cardFontSizes[currentSlide] + delta;
  if (newSize < MIN_FONT_SIZE || newSize > MAX_FONT_SIZE) return;
  cardFontSizes[currentSlide] = newSize;
  document.getElementById('cardText').style.fontSize = newSize + 'px';
}

// ─── 카드 이미지 업로드 ───
function triggerCardUpload() {
  document.getElementById('cardFileInput').click();
}

function handleCardUpload(e) {
  var file = e.target.files[0];
  if (!file) return;
  resizeImage(file, 1080).then(function(dataUrl) {
    var b64 = dataUrl.split(',')[1] || dataUrl;
    cardImages[currentSlide] = b64;
    if (cardsData[currentSlide]) cardsData[currentSlide]._mapCard = false;
    goToSlide(currentSlide);
  });
  e.target.value = '';
}

function resizeImage(file, size) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      var ctx = canvas.getContext('2d');
      var minDim = Math.min(img.width, img.height);
      var sx = (img.width - minDim) / 2;
      var sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = URL.createObjectURL(file);
  });
}

// ─── 카드 개별 AI 이미지 생성 ───
async function generateSingleCardImage() {
  if (!cardsData[currentSlide]) return;
  var spinner = document.getElementById('cardSpinner');
  spinner.classList.add('active');

  try {
    var idx = currentSlide;
    var card = cardsData[idx];
    var result = null;

    // 2장(인덱스 1): 카카오맵 우선
    if (idx === 1) {
      var mapRegion = extractRegionForMap(null, currentTopic);
      console.log('[카드 개별] 2장 카카오맵 시도:', mapRegion);
      result = await captureKakaoMap(mapRegion);
      if (result) {
        cardImages[idx] = result;
        if (cardsData[idx]) cardsData[idx]._mapCard = true;
        spinner.classList.remove('active');
        goToSlide(idx);
        return;
      }
    }

    // Gemini 생성
    console.log('[카드 개별] Gemini 생성:', idx + 1);
    var resp = await fetch((cfBaseUrl || '') + '/api/content/generate-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cardIndex: idx,
        topic: currentTopic,
        tag: card.tag || CARD_TAGS[idx],
        title: card.title || '',
        style: card.style || 'dark',
        imageIdea: imageIdeas[idx] || ''
      })
    });
    var data = await resp.json();
    if (data.success && data.imageBase64) {
      cardImages[idx] = data.imageBase64;
      if (cardsData[idx]) cardsData[idx]._mapCard = false;
    } else {
      showToast('이미지 생성에 실패했습니다');
    }
  } catch (e) {
    showToast('이미지 생성에 실패했습니다');
  }
  spinner.classList.remove('active');
  goToSlide(currentSlide);
}

// ─── 카드 이미지 제거 ───
function removeCardImage() {
  cardImages[currentSlide] = null;
  if (cardsData[currentSlide]) cardsData[currentSlide]._mapCard = false;
  goToSlide(currentSlide);
}

// ─── 지역명 추출 ───
function extractRegionForMap(result, inputTopic) {
  if (currentRegion) return currentRegion;
  if (result && result.region) return result.region;
  if (result && result.instagram && result.instagram.cards) {
    var allText = result.instagram.cards.map(function(c) { return c.title; }).join(' ');
    var patterns = ['성수동','강남역','강남구','한남동','이태원','여의도','홍대','압구정','청담동','을지로','종로','명동','신사동','서초구','서초동','삼성동','역삼동','잠실','마포구','마포','용산구','용산','건대','왕십리','송파구','영등포','광화문','논현동','성동구','뚝섬','연남동','중구'];
    for (var j = 0; j < patterns.length; j++) { if (allText.includes(patterns[j])) return patterns[j]; }
  }
  if (result && result.youtube && result.youtube.title) {
    var patterns2 = ['성수동','강남역','강남구','한남동','이태원','여의도','홍대','압구정','청담동','을지로','종로','명동','신사동','서초','삼성동','역삼동','잠실','마포','용산','건대','왕십리','송파','영등포','광화문','논현동','성동구'];
    for (var k = 0; k < patterns2.length; k++) { if (result.youtube.title.includes(patterns2[k])) return patterns2[k]; }
  }
  if (inputTopic && !inputTopic.startsWith('http')) return inputTopic;
  return '서울';
}

// ─── 카카오맵 서버 캡처 (puppeteer-core) ───
const mapImageCache = {};

async function captureKakaoMap(region) {
  if (mapImageCache[region]) { console.log('[카카오맵] 캐시 히트:', region); return mapImageCache[region]; }
  try {
    console.log('[카카오맵] 서버 캡처 요청:', region);
    const resp = await fetch('/api/content/capture-map', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region })
    });
    const data = await resp.json();
    if (data.error) { console.error('[카카오맵] 서버 에러:', data.error); return null; }
    if (data.imageBase64) {
      console.log('[카카오맵] 캡처 성공');
      mapImageCache[region] = data.imageBase64;
      return data.imageBase64;
    }
    return null;
  } catch (e) {
    console.error('[카카오맵] 요청 실패:', e);
    return null;
  }
}

// ─── 카드 이미지 순차 생성 ───
async function generateCardImages() {
  if (cardsData.length === 0) return;
  isGeneratingImages = true;
  cardImages = new Array(7).fill(null);
  goToSlide(0);
  var spinner = document.getElementById('cardSpinner');
  var aiBtn = document.getElementById('btnAiImage');
  if (aiBtn) { aiBtn.disabled = true; aiBtn.textContent = '이미지 생성 중...'; aiBtn.style.opacity = '0.5'; }

  for (var i = 0; i < cardsData.length && i < 7; i++) {
    if (i === 6) continue; // 7장은 고정 디자인, 이미지 생성 스킵
    var card = cardsData[i];
    if (currentSlide === i) spinner.classList.add('active');
    try {
      // 2장(인덱스 1): 카카오맵 우선
      if (i === 1) {
        var mapRegion = extractRegionForMap(null, currentTopic);
        var mapB64 = await captureKakaoMap(mapRegion);
        if (!mapB64) { await new Promise(function(r){setTimeout(r,2000)}); mapB64 = await captureKakaoMap(mapRegion); }
        if (mapB64) { cardImages[i] = mapB64; if (cardsData[i]) cardsData[i]._mapCard = true; if (currentSlide === i) { spinner.classList.remove('active'); goToSlide(i); } continue; }
      }
      var resp = await fetch((cfBaseUrl || '') + '/api/content/generate-card', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIndex: i, topic: currentTopic, tag: card.tag || CARD_TAGS[i], title: card.title || '', style: card.style || 'dark', imageIdea: imageIdeas[i] || '' })
      });
      var data = await resp.json();
      if (data.success && data.imageBase64) { cardImages[i] = data.imageBase64; }
    } catch (e) { console.warn('카드 ' + (i+1) + ' 이미지 실패'); }
    if (currentSlide === i) { spinner.classList.remove('active'); goToSlide(i); }
  }
  isGeneratingImages = false;
  spinner.classList.remove('active');
  goToSlide(currentSlide);
  if (aiBtn) { aiBtn.disabled = false; aiBtn.textContent = '재생성하기'; aiBtn.style.opacity = '1'; }
}

// ─── ZIP 다운로드 ───
async function downloadAllCards() {
  const available = cardImages.filter(Boolean);
  if (available.length === 0) { alert('다운로드할 카드 이미지가 없습니다. 이미지 생성이 완료된 후 시도해주세요.'); return; }

  // JSZip을 동적 로드
  if (!window.JSZip) {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    document.head.appendChild(s);
    await new Promise(r => s.onload = r);
  }

  const zip = new JSZip();
  cardImages.forEach((b64, i) => {
    if (b64) {
      zip.file('card_' + String(i + 1).padStart(2, '0') + '.png', b64, { base64: true });
    }
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  a.href = URL.createObjectURL(blob);
  a.download = 'BSN_' + encodeURIComponent((currentTopic || 'content').slice(0, 20)) + '_' + date + '.zip';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Mode switch (호환 래퍼) ───
function switchMode(mode) {
  // 통합 입력으로 변경됨 — 호환성 유지용
}

// ─── Channel switch ───
function switchChannel(ch) {
  document.querySelectorAll('.channel-tab').forEach(t => t.classList.toggle('active', t.dataset.ch === ch));
  document.querySelectorAll('.channel-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + ch));
}

// ─── Generate (API 연동) ───
async function doGenerate() {
  const btn = document.getElementById('generateBtn');
  const input = document.getElementById('textInput').value.trim();
  if (!input) { alert('입력 내용을 확인해 주세요.'); return; }

  // URL 자동 감지
  const urlMatch = input.match(/https?:\\/\\/[^\\s]+/);
  const mode = urlMatch ? 'url' : 'text';
  const sendInput = urlMatch ? urlMatch[0] : input;

  btn.disabled = true;
  btn.classList.add('loading');
  btn.textContent = '리서치 및 분석 중...';

  try {
    // 추천 주제에서 온 region 메타 첨부 (직접 입력 또는 URL 모드 시 null)
    var suggestionMeta = pendingSuggestionMeta;
    if (suggestionMeta && suggestionMeta.text !== input) {
      suggestionMeta = null;
    }
    if (mode === 'url') {
      suggestionMeta = null;
    }
    pendingSuggestionMeta = null;

    var requestBody = { mode: mode, input: sendInput, template: currentTemplate };
    if (suggestionMeta) {
      if (suggestionMeta.region) requestBody.region = suggestionMeta.region;
      if (suggestionMeta.region1) requestBody.region1 = suggestionMeta.region1;
      if (suggestionMeta.region2) requestBody.region2 = suggestionMeta.region2;
      if (suggestionMeta.rankBy) requestBody.rankBy = suggestionMeta.rankBy;
    }

    const resp = await fetch((cfBaseUrl || '') + '/api/content/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      throw new Error(data.error || '콘텐츠 생성에 실패했습니다.');
    }

    currentTopic = input;
    bindResults(data.result);
    saveHistory(mode, input, data.result);
    showResult();
  } catch (err) {
    alert(err.message || '잠시 후 다시 시도해주세요.');
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
    btn.textContent = '콘텐츠 생성하기';
  }
}

// ─── 객체를 문자열로 안전 변환 ───
function toDisplayText(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map(toDisplayText).join('\\n');
  if (typeof data === 'object') {
    return Object.entries(data).map(function(e) {
      return e[0] + ': ' + (typeof e[1] === 'object' ? JSON.stringify(e[1], null, 2) : e[1]);
    }).join('\\n');
  }
  return String(data);
}

// ─── Bind results to UI ───
function bindResults(r) {
  console.log('[bindResults] 전체 응답:', JSON.stringify(r).slice(0, 500));

  // Instagram cards
  cardsData = r.instagram?.cards || [];
  imageIdeas = r.imageIdeas || [];
  currentRegion = r.region || '';
  cardImages = new Array(7).fill(null);
  cardFontSizes = new Array(7).fill(DEFAULT_FONT_SIZE);
  currentSlide = 0;
  goToSlide(0);

  // AI 이미지 생성 버튼 표시
  var aiBtn = document.getElementById('btnAiImage');
  if (aiBtn) { aiBtn.style.display = 'inline-block'; aiBtn.textContent = 'AI 이미지 생성'; }

  // Instagram caption
  document.getElementById('instaCaption').value = toDisplayText(r.instagram?.caption);

  // Shortform (하위 호환: 기존 script/reelsTip/shortsTip → 새 filming/reelsUpload/shortsUpload)
  document.getElementById('shortFilming').value = toDisplayText(r.shortform?.filming || r.shortform?.script);
  document.getElementById('shortReelsUpload').value = toDisplayText(r.shortform?.reelsUpload || r.shortform?.reelsTip);
  document.getElementById('shortShortsUpload').value = toDisplayText(r.shortform?.shortsUpload || r.shortform?.shortsTip);

  // YouTube
  document.getElementById('ytTitle').value = toDisplayText(r.youtube?.title);
  document.getElementById('ytScript').value = toDisplayText(r.youtube?.script);
  document.getElementById('ytDesc').value = toDisplayText(r.youtube?.description);

  // Thread
  document.getElementById('threadPost').value = toDisplayText(r.thread?.post);

  // Blog
  document.getElementById('blogPost').value = toDisplayText(r.blog?.post);
}

// ─── History (localStorage) ───
const HISTORY_KEY = 'content_history';
let currentHistoryId = null;
let historyExpanded = false;

function getHistory() {
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(h) ? h : [];
  } catch { return []; }
}

function saveHistory(mode, input, result) {
  try {
    let history = getHistory();
    const title = (result.youtube?.title) || (result.instagram?.cards?.[0]?.title) || (input.startsWith('http') ? extractDomain(input) : input.slice(0, 30) + (input.length > 30 ? '...' : ''));
    // 이미지 데이터 제외한 result만 저장
    const safeResult = {
      instagram: { cards: result.instagram?.cards || [], caption: toDisplayText(result.instagram?.caption) },
      imageIdeas: result.imageIdeas || [],
      shortform: { filming: toDisplayText(result.shortform?.filming), reelsUpload: toDisplayText(result.shortform?.reelsUpload), shortsUpload: toDisplayText(result.shortform?.shortsUpload) },
      youtube: { title: toDisplayText(result.youtube?.title), script: toDisplayText(result.youtube?.script), description: toDisplayText(result.youtube?.description) },
      thread: { post: toDisplayText(result.thread?.post) },
      blog: { post: toDisplayText(result.blog?.post) }
    };
    const item = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      input, mode, title,
      result: safeResult,
      cardFontSizes: [...cardFontSizes],
      cardTitles: cardsData.map(c => c.title || ''),
      cardTags: cardsData.map(c => c.tag || ''),
      createdAt: new Date().toISOString()
    };
    history.unshift(item);
    if (history.length > 50) history = history.slice(0, 50);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
    catch { history = history.slice(0, 40); localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
    currentHistoryId = item.id;
  } catch { /* ignore */ }
}

function updateCurrentHistory() {
  if (!currentHistoryId) return;
  try {
    let history = getHistory();
    const idx = history.findIndex(h => h.id === currentHistoryId);
    if (idx === -1) return;
    // 수정된 카드 텍스트/태그/크기 저장
    history[idx].cardTitles = cardsData.map(c => c.title || '');
    history[idx].cardTags = cardsData.map(c => c.tag || '');
    history[idx].cardFontSizes = [...cardFontSizes];
    // textarea 내용도 저장 (키 호환 보장)
    var r = history[idx].result;
    if (!r.instagram) r.instagram = {};
    r.instagram.caption = document.getElementById('instaCaption').value;
    if (!r.shortform) r.shortform = {};
    r.shortform.filming = document.getElementById('shortFilming').value;
    r.shortform.reelsUpload = document.getElementById('shortReelsUpload').value;
    r.shortform.shortsUpload = document.getElementById('shortShortsUpload').value;
    if (!r.youtube) r.youtube = {};
    r.youtube.title = document.getElementById('ytTitle').value;
    r.youtube.script = document.getElementById('ytScript').value;
    r.youtube.description = document.getElementById('ytDesc').value;
    if (!r.thread) r.thread = {};
    r.thread.post = document.getElementById('threadPost').value;
    if (!r.blog) r.blog = {};
    r.blog.post = document.getElementById('blogPost').value;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* ignore */ }
}

function deleteHistory(id, e) {
  e.stopPropagation();
  if (!confirm('이 기록을 삭제할까요?')) return;
  try {
    let history = getHistory().filter(h => h.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistoryList();
  } catch { /* ignore */ }
}

function clearAllHistory() {
  if (!confirm('모든 생성 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.')) return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  renderHistoryList();
}

function extractDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url.slice(0, 30); }
}

function renderHistoryList() {
  const list = document.getElementById('historyList');
  const btnClear = document.getElementById('btnClearAll');
  const btnMore = document.getElementById('btnHistoryMore');
  const history = getHistory();

  if (history.length === 0) {
    list.innerHTML = '<div class="history-empty">아직 생성 기록이 없습니다</div>';
    btnClear.style.display = 'none';
    btnMore.style.display = 'none';
    return;
  }

  btnClear.style.display = history.length >= 2 ? '' : 'none';
  const limit = historyExpanded ? history.length : 5;
  const visible = history.slice(0, limit);

  list.innerHTML = visible.map(function(h) {
    const d = new Date(h.createdAt);
    const dateStr = d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0');
    const modeStr = h.mode === 'url' ? '기사 URL' : '직접 입력';
    return '<div class="history-item" onclick="loadHistory(' + "'" + h.id + "'" + ')">' +
      '<div class="history-left">' +
        '<div class="history-title">' + escHtml(getDisplayTitle(h)) + '</div>' +
        '<div class="history-meta">' + dateStr + ' \\u00b7 ' + modeStr + '</div>' +
      '</div>' +
      '<button class="btn-history-del" onclick="deleteHistory(' + "'" + h.id + "'" + ',event)" title="삭제">\\u00d7</button>' +
    '</div>';
  }).join('');

  if (history.length > 5) {
    btnMore.style.display = '';
    btnMore.textContent = historyExpanded ? '접기' : '이전 기록 ' + (history.length - 5) + '건 더보기';
  } else {
    btnMore.style.display = 'none';
  }
}

function toggleHistoryExpand() {
  historyExpanded = !historyExpanded;
  renderHistoryList();
}

function doLogout() {
  try { firebase.auth().signOut(); } catch(e) {}
  if (bsnChannel) bsnChannel.postMessage('logout');
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

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getDisplayTitle(item) {
  if (item.result?.youtube?.title) return item.result.youtube.title;
  if (item.result?.instagram?.cards?.[0]?.title) return item.result.instagram.cards[0].title;
  if (item.result?.insta?.cards?.[0]?.title) return item.result.insta.cards[0].title;
  if (item.title && !item.title.startsWith('http')) return item.title;
  if (item.input && !item.input.startsWith('http')) return item.input.substring(0, 30) + (item.input.length > 30 ? '...' : '');
  return '제목 없음';
}

function loadHistory(id) {
  const history = getHistory();
  const item = history.find(h => h.id === id);
  if (!item) return;

  currentHistoryId = id;
  currentTopic = item.input || '';

  // 카드 데이터 복원 (insta/instagram 키 호환)
  var ig = item.result?.instagram || item.result?.insta || {};
  const cards = ig.cards || [];
  cardsData = cards.map(function(c, i) {
    return {
      tag: (item.cardTags && item.cardTags[i]) || c.tag || '',
      title: (item.cardTitles && item.cardTitles[i]) || c.title || '',
      style: c.style || 'dark',
      period: c.period || '',
      periodSecondary: c.periodSecondary || ''
    };
  });
  imageIdeas = item.result?.imageIdeas || [];
  cardImages = new Array(7).fill(null);
  cardFontSizes = (item.cardFontSizes && item.cardFontSizes.length === 7) ? [...item.cardFontSizes] : new Array(7).fill(DEFAULT_FONT_SIZE);
  currentSlide = 0;
  goToSlide(0);

  // shortform/short 키 호환
  var sf = item.result?.shortform || item.result?.short || {};

  // textarea 바인딩
  document.getElementById('instaCaption').value = ig.caption || '';
  document.getElementById('shortFilming').value = sf.filming || sf.script || '';
  document.getElementById('shortReelsUpload').value = sf.reelsUpload || sf.reelsTip || '';
  document.getElementById('shortShortsUpload').value = sf.shortsUpload || sf.shortsTip || '';
  document.getElementById('ytTitle').value = item.result?.youtube?.title || '';
  document.getElementById('ytScript').value = item.result?.youtube?.script || '';
  document.getElementById('ytDesc').value = item.result?.youtube?.description || '';
  document.getElementById('threadPost').value = item.result?.thread?.post || item.result?.threads?.post || '';
  document.getElementById('blogPost').value = item.result?.blog?.post || '';

  showResult();
  showToast('저장된 기록을 불러왔습니다');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.classList.add('fade'); }, 1200);
  setTimeout(function() { t.remove(); }, 1600);
}

// ─── View toggle ───
function showResult() {
  document.getElementById('inputView').classList.remove('active');
  document.getElementById('inputView').style.display = 'none';
  document.getElementById('transactionView').style.display = 'none';
  document.getElementById('resultView').classList.add('active');
  document.getElementById('resultView').style.display = 'block';
  document.getElementById('navContent').classList.add('active');
  document.getElementById('navTransaction').classList.remove('active');
}

function showInput() {
  updateCurrentHistory(); // 수정 내용 저장
  document.getElementById('resultView').classList.remove('active');
  document.getElementById('resultView').style.display = 'none';
  document.getElementById('inputView').classList.add('active');
  document.getElementById('inputView').style.display = 'block';
  renderHistoryList(); // 갱신
}

// ─── Copy ───
function copyText(id) {
  const ta = document.getElementById(id);
  if (!ta || !ta.value.trim()) return;
  navigator.clipboard.writeText(ta.value).then(() => {
    const btn = ta.parentElement.querySelector('.btn-copy');
    const orig = btn.textContent;
    btn.textContent = '완료!';
    setTimeout(() => btn.textContent = orig, 1000);
  });
}

// ─── 인라인 편집: blur 시 cardsData에 반영 ───
document.getElementById('cardTag').addEventListener('blur', function() {
  if (cardsData[currentSlide]) {
    cardsData[currentSlide].tag = this.textContent.trim();
  }
});
document.getElementById('cardText').addEventListener('blur', function() {
  if (cardsData[currentSlide]) {
    cardsData[currentSlide].title = this.textContent.trim();
  }
});
// Enter 키로 줄바꿈 방지 (한 줄 편집)
document.getElementById('cardTag').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
});

// ─── 학습 자료 관리 ───
var selectedPdfFiles = [];

function showLearnView() {
  document.getElementById('inputView').style.display = 'none';
  document.getElementById('resultView').style.display = 'none';
  document.getElementById('transactionView').style.display = 'none';
  document.getElementById('learnView').style.display = 'block';
  document.getElementById('navContent').classList.add('active');
  document.getElementById('navTransaction').classList.remove('active');
  loadLearnData();
}

function hideLearnView() {
  document.getElementById('learnView').style.display = 'none';
  document.getElementById('inputView').style.display = 'block';
  updateStudyBadge();
  renderHistoryList();
}

async function loadLearnData() {
  try {
    var resp = await fetch('/api/learn/articles');
    var data = await resp.json();
    renderLearnStats(data);
    renderLearnArticles(data.articles || []);
    updateStudyBadge();
  } catch { /* ignore */ }
}

function updateStudyBadge() {
  fetch('/api/learn/articles').then(function(r) { return r.json(); }).then(function(d) {
    document.getElementById('studyBadge').textContent = d.total || 0;
  }).catch(function() {});
}

function renderLearnStats(data) {
  var el = document.getElementById('learnStatsSection');
  if (!data.total || data.total === 0) {
    el.innerHTML = '<div style="text-align:center;padding:24px 0;color:#A8A49C;">' +
      '<div style="font-size:24px;margin-bottom:8px;">&#128218;</div>' +
      '<div style="font-size:14px;font-weight:600;margin-bottom:4px;">아직 학습된 기사가 없습니다</div>' +
      '<div style="font-size:12px;">위에서 기사 URL을 추가하면 AI가 분석을 시작합니다</div></div>';
    return;
  }
  var urlC = data.urlCount || 0;
  var pdfC = data.pdfCount || 0;
  var html = '<div class="section-label" style="margin-bottom:10px;">학습 현황 <span style="font-size:11px;font-weight:400;color:#A8A49C;text-transform:none;letter-spacing:0;">총 ' + data.total + '개 자료 (기사 ' + urlC + '개 + PDF ' + pdfC + '개)</span></div>';
  var stats = (data.stats || []).slice(0, 8);
  html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">';
  stats.forEach(function(s) { html += '<span class="tag-pill">' + s.tag + ' ' + s.count + '</span>'; });
  html += '</div>';
  var top5 = (data.stats || []).slice(0, 5);
  top5.forEach(function(s) {
    html += '<div class="stat-bar-wrap"><div class="stat-bar-label"><span>' + s.tag + '</span><span>' + s.percentage + '%</span></div><div class="stat-bar"><div class="stat-bar-fill" style="width:' + s.percentage + '%"></div></div></div>';
  });
  el.innerHTML = html;
}

var learnArticlesCache = [];
var currentLearnTab = 'url';
var learnShowCount = 10;

function renderLearnArticles(articles) {
  learnArticlesCache = articles;
  learnShowCount = 10;
  renderLearnList();
}

function switchLearnTab(tab) {
  currentLearnTab = tab;
  learnShowCount = 10;
  document.querySelectorAll('.learn-tab').forEach(function(t) { t.classList.toggle('active', t.dataset.tab === tab); });
  renderLearnList();
}

function renderLearnList() {
  var el = document.getElementById('learnArticleList');
  var filtered = learnArticlesCache.filter(function(a) { return currentLearnTab === 'pdf' ? a.sourceType === 'pdf' : a.sourceType !== 'pdf'; });
  if (!filtered.length) {
    var msg = currentLearnTab === 'pdf' ? '학습된 PDF가 없습니다' : '학습된 기사가 없습니다';
    el.innerHTML = '<div style="text-align:center;color:#A8A49C;font-size:13px;padding:20px 0;">' + msg + '</div>';
    return;
  }
  var visible = filtered.slice(0, learnShowCount);
  var remaining = filtered.length - visible.length;
  var html = visible.map(function(a, idx) {
    var dateStr = (a.date || '').replace(/-/g, '.');
    return '<div style="padding:10px 0;border-bottom:1px solid rgba(44,74,124,0.06);">' +
      '<div style="display:flex;align-items:center;cursor:pointer;" onclick="toggleLearnDetail(' + "'" + a.id + "'" + ')">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:13px;font-weight:500;color:#1A1A2E;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escHtml(a.title || '') + '</div>' +
          '<div style="font-size:11px;color:#A8A49C;margin-top:2px;">' + dateStr + '</div>' +
        '</div>' +
        '<button class="btn-history-del" onclick="event.stopPropagation();doLearnDelete(' + "'" + a.id + "'" + ')" title="삭제" style="width:28px;height:28px;flex-shrink:0;margin-left:8px;">\\u00d7</button>' +
      '</div>' +
      '<div id="learnDetail_' + a.id + '" style="display:none;margin-top:8px;padding:10px 12px;background:#F8F6F1;border-radius:8px;font-size:12px;line-height:1.7;">' +
        '<div style="margin-bottom:4px;color:#2C4A7C;font-weight:600;">AI 분석 결과</div>' +
        '<div style="margin-bottom:4px;"><b>요약:</b> ' + escHtml(a.summary || '없음') + '</div>' +
        '<div style="margin-bottom:4px;"><b>지역:</b> ' + escHtml(a.region || '없음') + ' &middot; <b>톤:</b> ' + escHtml(a.tone || '없음') + '</div>' +
        (a.key_data && a.key_data.length ? '<div style="margin-bottom:4px;"><b>핵심 수치:</b> ' + a.key_data.map(escHtml).join(', ') + '</div>' : '') +
        (a.building_relevance ? '<div style="margin-bottom:4px;"><b>빌딩 매매 연관성:</b> ' + escHtml(a.building_relevance) + '</div>' : '') +
        (a.tags && a.tags.length ? '<div>' + a.tags.map(function(t){return '<span class="tag-pill">'+escHtml(t)+'</span>';}).join('') + '</div>' : '') +
        (a.sourceType === 'url' && a.url ? '<div style="margin-top:6px;"><a href="' + escHtml(a.url) + '" target="_blank" style="color:#2C4A7C;font-size:11px;">원본 기사 열기 &#8599;</a></div>' : '') +
      '</div>' +
    '</div>';
  }).join('');
  if (remaining > 0) {
    html += '<div style="text-align:center;padding:12px 0;"><button onclick="showMoreLearn()" style="border:none;background:none;color:#2C4A7C;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;">더보기 (' + remaining + '개)</button></div>';
  } else if (filtered.length > 10 && learnShowCount > 10) {
    html += '<div style="text-align:center;padding:12px 0;"><button onclick="collapseLearn()" style="border:none;background:none;color:#A8A49C;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;">접기</button></div>';
  }
  el.innerHTML = html;
}

function collapseLearn() {
  learnShowCount = 10;
  renderLearnList();
}

function showMoreLearn() {
  learnShowCount += 10;
  renderLearnList();
}

function toggleLearnDetail(id) {
  var el = document.getElementById('learnDetail_' + id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

// URL 추가
function extractUrls(text) {
  var re = /https?:\\/\\/[^\\s<>"{}|\\\\^\\x60\\[\\]]+/g;
  return Array.from(new Set(text.match(re) || []));
}

document.getElementById('learnUrlInput').addEventListener('input', function() {
  var urls = extractUrls(this.value);
  document.getElementById('learnUrlCount').textContent = urls.length > 0 ? urls.length + '개 링크 감지됨' : '';
});

async function doLearnAdd() {
  var urls = extractUrls(document.getElementById('learnUrlInput').value);
  if (urls.length === 0) { alert('유효한 URL이 없습니다.'); return; }
  var btn = document.getElementById('learnAddBtn');
  btn.disabled = true;
  btn.textContent = '분석 중...';
  document.getElementById('learnProgress').style.display = 'block';
  document.getElementById('learnResult').style.display = 'none';
  document.getElementById('learnResult').innerHTML = '';
  document.getElementById('learnProgressBar').style.width = '0%';
  document.getElementById('learnProgressText').textContent = '약 ' + urls.length + '개 기사 분석 중... (예상: 약 ' + (urls.length * 5) + '초)';

  // 부드러운 프로그레스 바
  var pct = 0;
  var interval = setInterval(function() {
    pct = Math.min(pct + 100 / (urls.length * 5), 90);
    document.getElementById('learnProgressBar').style.width = pct + '%';
  }, 1000);

  try {
    var resp = await fetch('/api/learn/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls }) });
    var data = await resp.json();
    clearInterval(interval);
    document.getElementById('learnProgressBar').style.width = '100%';
    var resultEl = document.getElementById('learnResult');
    var resultHtml = '';
    if (data.added > 0) resultHtml += '<div style="color:#166534;">' + data.added + '개 기사 학습 완료</div>';
    if (data.skipped > 0) resultHtml += '<div style="color:#C2410C;">이미 학습된 기사 ' + data.skipped + '개 (중복 스킵)</div>';
    if (data.failed > 0) resultHtml += '<div style="color:#E24B4A;">' + data.failed + '개 실패</div>';
    if (data.errors && data.errors.length) {
      resultHtml += data.errors.map(function(e) { return '<div style="color:#E24B4A;margin-top:2px;font-size:11px;">' + escHtml(e) + '</div>'; }).join('');
    }
    if (!resultHtml) resultHtml = '<div style="color:#A8A49C;">처리할 기사가 없습니다</div>';
    resultEl.innerHTML = resultHtml;
    resultEl.style.display = 'block';
    document.getElementById('learnUrlInput').value = '';
    document.getElementById('learnUrlCount').textContent = '';
    loadLearnData();
  } catch (e) {
    clearInterval(interval);
    alert('네트워크 연결을 확인해주세요.');
  }
  btn.disabled = false;
  btn.textContent = '추가 및 분석하기';
  setTimeout(function() { document.getElementById('learnProgress').style.display = 'none'; }, 2000);
}

// PDF 업로드
function handlePdfSelect(e) {
  selectedPdfFiles = Array.from(e.target.files).filter(function(f) { return f.size <= 30 * 1024 * 1024; });
  renderPdfFileList();
  e.target.value = '';
}

// 드래그앤드롭
(function() {
  var zone = document.getElementById('pdfDropZone');
  zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.style.borderColor = '#2C4A7C'; });
  zone.addEventListener('dragleave', function() { zone.style.borderColor = 'rgba(44,74,124,0.2)'; });
  zone.addEventListener('drop', function(e) {
    e.preventDefault(); zone.style.borderColor = 'rgba(44,74,124,0.2)';
    var files = Array.from(e.dataTransfer.files).filter(function(f) { return f.type === 'application/pdf' && f.size <= 10*1024*1024; });
    selectedPdfFiles = selectedPdfFiles.concat(files);
    renderPdfFileList();
  });
})();

function renderPdfFileList() {
  var el = document.getElementById('pdfFileList');
  document.getElementById('pdfUploadBtn').style.display = selectedPdfFiles.length > 0 ? 'flex' : 'none';
  if (!selectedPdfFiles.length) { el.innerHTML = ''; return; }
  el.innerHTML = selectedPdfFiles.map(function(f, i) {
    var size = (f.size / 1024 / 1024).toFixed(1) + 'MB';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;font-size:12px;">' +
      '<span>&#128196; ' + escHtml(f.name) + ' (' + size + ')</span>' +
      '<button style="border:none;background:none;color:#A8A49C;cursor:pointer;font-size:14px;" onclick="removePdfFile(' + i + ')">\\u00d7</button></div>';
  }).join('');
}

function removePdfFile(idx) {
  selectedPdfFiles.splice(idx, 1);
  renderPdfFileList();
}

async function doPdfUpload() {
  if (!selectedPdfFiles.length) return;
  var btn = document.getElementById('pdfUploadBtn');
  btn.disabled = true; btn.textContent = '분석 중...';
  document.getElementById('pdfProgress').style.display = 'block';
  document.getElementById('pdfResult').style.display = 'none';
  document.getElementById('pdfProgressBar').style.width = '0%';
  document.getElementById('pdfProgressText').textContent = selectedPdfFiles.length + '개 PDF 분석 중...';

  var pct = 0;
  var interval = setInterval(function() { pct = Math.min(pct + 100 / (selectedPdfFiles.length * 8), 90); document.getElementById('pdfProgressBar').style.width = pct + '%'; }, 1000);

  try {
    var fd = new FormData();
    selectedPdfFiles.forEach(function(f) { fd.append('files', f); });
    console.log('[PDF] 업로드 시작, 파일 수:', selectedPdfFiles.length);
    var resp = await fetch('/api/learn/upload-pdf', { method: 'POST', body: fd });
    console.log('[PDF] 응답 상태:', resp.status);
    var data = await resp.json();
    console.log('[PDF] 응답 데이터:', JSON.stringify(data).slice(0, 300));
    clearInterval(interval);
    document.getElementById('pdfProgressBar').style.width = '100%';
    var resultEl = document.getElementById('pdfResult');
    resultEl.style.display = 'block';
    var resultHtml = '';
    if (data.error) {
      resultHtml = '<div style="color:#E24B4A;">' + escHtml(data.error) + '</div>';
    } else {
      if (data.added > 0) resultHtml += '<div style="color:#166534;">' + data.added + '개 자료 분석 완료</div>';
      if (data.skipped > 0) resultHtml += '<div style="color:#C2410C;">이미 학습된 자료 ' + data.skipped + '개 (중복 스킵)</div>';
      if (data.errors && data.errors.length) {
        resultHtml += data.errors.map(function(e) { return '<div style="color:#E24B4A;margin-top:4px;">' + escHtml(e) + '</div>'; }).join('');
      }
    }
    resultEl.innerHTML = resultHtml;
    selectedPdfFiles = [];
    renderPdfFileList();
    loadLearnData();
  } catch (e) { clearInterval(interval); console.error('[PDF] 요청 실패:', e); alert('PDF 업로드에 실패했습니다: ' + (e.message || e)); }
  btn.disabled = false; btn.textContent = '분석하기';
  setTimeout(function() { document.getElementById('pdfProgress').style.display = 'none'; }, 2000);
}

// 삭제
function doLearnDelete(id) {
  if (!confirm('이 기사를 학습 목록에서 삭제할까요?')) return;
  fetch('/api/learn/articles/' + id, { method: 'DELETE' }).then(function() { loadLearnData(); });
}

// ─── AI 뉴스 추천 ───
var newsCache = { data: null, timestamp: 0 };

async function loadRecommendNews(force) {
  var wrap = document.getElementById('newsListWrap');
  if (!force && newsCache.data && Date.now() - newsCache.timestamp < 30 * 60 * 1000) {
    renderNewsList(newsCache.data);
    return;
  }
  wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#A8A49C;font-size:13px;"><div style="width:20px;height:20px;border:2px solid #E2E2E2;border-top-color:#2C4A7C;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 8px;"></div>추천 기사를 찾고 있습니다...</div>';
  try {
    var resp = await fetch('/api/content/recommend-news');
    var data = await resp.json();
    if (data.error && (!data.articles || !data.articles.length)) {
      wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#A8A49C;font-size:13px;">' + escHtml(data.error) + '</div>';
      return;
    }
    newsCache = { data: data.articles || [], timestamp: Date.now() };
    renderNewsList(newsCache.data);
  } catch {
    wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#A8A49C;font-size:13px;">추천 기사를 불러올 수 없습니다 <button onclick="loadRecommendNews(true)" style="border:none;background:none;color:#2C4A7C;cursor:pointer;font-family:inherit;font-size:12px;margin-left:6px;">다시 시도</button></div>';
  }
}

var newsShowCount = 10;

function renderNewsList(articles) {
  var wrap = document.getElementById('newsListWrap');
  if (!articles || !articles.length) {
    wrap.innerHTML = '<div style="text-align:center;padding:20px;color:#A8A49C;font-size:13px;">최근 7일간 관련 기사를 찾지 못했습니다</div>';
    return;
  }
  var total = articles.length;
  var badge = document.getElementById('newsCountBadge');
  if (badge) badge.textContent = total + '건';
  var show = Math.min(newsShowCount, total);
  var html = '';
  for (var i = 0; i < show; i++) {
    var a = articles[i];
    var tags = (a.matchedTags || []).map(function(t) { return '<span class="news-tag">' + escHtml(t) + '</span>'; }).join('');
    html += '<div class="news-item">' +
      '<div class="news-item-left">' +
        '<div class="news-item-title" onclick="window.open(' + "'" + escHtml(a.url) + "'" + ',' + "'" + '_blank' + "'" + ')">' + escHtml(a.title) + '</div>' +
        '<div class="news-item-meta"><span>' + escHtml(a.source) + ' \\u00b7 ' + escHtml(a.date) + '</span>' + tags + '</div>' +
      '</div>' +
      '<button class="btn-news-gen" onclick="generateFromNews(' + "'" + escHtml(a.url) + "'" + ')">생성</button>' +
    '</div>';
  }
  // 더보기 / 숨기기 버튼
  if (total > 10) {
    html += '<div style="display:flex;justify-content:center;gap:12px;padding:10px 0;">';
    if (show < total) {
      var remaining = total - show;
      html += '<button onclick="newsShowMore()" style="border:none;background:none;color:#2C4A7C;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;">더보기 (' + remaining + '건)</button>';
    }
    if (show > 10) {
      html += '<button onclick="newsShowLess()" style="border:none;background:none;color:#A8A49C;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;">숨기기</button>';
    }
    html += '</div>';
  }
  wrap.innerHTML = html;
}

function newsShowMore() {
  newsShowCount += 10;
  if (newsCache.data) renderNewsList(newsCache.data);
}

function newsShowLess() {
  newsShowCount = 10;
  if (newsCache.data) renderNewsList(newsCache.data);
}

function refreshNews() {
  newsCache = { data: null, timestamp: 0 };
  loadRecommendNews(true);
}

function generateFromNews(url) {
  window.scrollTo(0, 0);
  document.getElementById('textInput').value = url;
  doGenerate();
}

// ═══════════════════════════════════════════
// ─── TRANSACTION VIEW ───
// ═══════════════════════════════════════════
var txRegionData = ${regionJson || 'null'};
var txSelectedRegions = []; // [{sido,sgg,sggCd,dong,sggNm}]
var txPeriodMonths = 6;
var txCustomMode = false;
var txQueryResults = null;
var txInsightCache = null;
// 랭킹 상세 카드별 리포트 캐시 (key: ranking 배열 idx, value: 리포트 텍스트)
var txDetailReportCache = {};
var txReportCache = null;
var txHideCancelled = true;
var txShowAllRows = false;
var txStatsPanelOpen = false;
var TX_COLORS = ['#85B7EB','#5DCAA5','#F0997B'];
var TX_STAT_KEYS = ['거래량','평균 매매가','평당 매매가','연면적 평당가','법인 매수 비율','법인 매도 비율','건축연도별','용도지역별','동별 거래량','동별 평균 매매가','최고 평당가 거래','최저 평당가 거래'];

function txGetStarred() {
  try { return JSON.parse(localStorage.getItem('bsn_starred_stats') || '["거래량","평균 매매가","평당 매매가","연면적 평당가"]'); } catch(e) { return ['거래량','평균 매매가','평당 매매가','연면적 평당가']; }
}
function txSetStarred(arr) { localStorage.setItem('bsn_starred_stats', JSON.stringify(arr)); }

function txGetFavorites() {
  try { return JSON.parse(localStorage.getItem('bsn_favorite_regions') || '[]'); } catch(e) { return []; }
}
function txSetFavorites(arr) { localStorage.setItem('bsn_favorite_regions', JSON.stringify(arr)); }

function showContentView() {
  var alreadyActive = document.getElementById('navContent').classList.contains('active')
    && document.getElementById('inputView').style.display !== 'none'
    && document.getElementById('transactionView').style.display === 'none';
  if (alreadyActive) {
    window.location.href = '/insta';
    return;
  }
  document.documentElement.removeAttribute('data-view');
  if (window.location.hash) history.replaceState(null, '', '/insta');
  document.getElementById('transactionView').style.display = 'none';
  document.getElementById('inputView').style.display = 'block';
  document.getElementById('navContent').classList.add('active');
  document.getElementById('navTransaction').classList.remove('active');
  window.scrollTo(0, 0);
}

function showTransactionView() {
  var alreadyActive = document.getElementById('navTransaction').classList.contains('active')
    && document.getElementById('transactionView').style.display === 'block';
  if (alreadyActive) {
    window.location.href = '/insta#transaction';
    window.location.reload();
    return;
  }
  document.documentElement.setAttribute('data-view','tx');
  if (window.location.hash !== '#transaction') history.replaceState(null, '', '/insta#transaction');
  document.getElementById('inputView').style.display = 'none';
  document.getElementById('resultView').style.display = 'none';
  document.getElementById('learnView').style.display = 'none';
  document.getElementById('transactionView').style.display = 'block';
  document.getElementById('navContent').classList.remove('active');
  document.getElementById('navTransaction').classList.add('active');
  window.scrollTo(0, 0);
  if (!txRankingLoaded) {
    txInitRankSelectors();
    txLoadRanking();
  }
}

function hideTransactionView() {
  showContentView();
}

async function txLoadRegions() {
  try {
    var resp = await fetch('/api/regions');
    txRegionData = await resp.json();
    txInitSelectors();
  } catch(e) { console.error('지역 데이터 로드 실패', e); }
}

function txInitSelectors() {
  var sels = document.querySelectorAll('.tx-region-selector');
  sels.forEach(function(sel) {
    var sidoSel = sel.querySelectorAll('.tx-select')[0];
    sidoSel.innerHTML = '<option value="">시/도 선택</option>';
    Object.keys(txRegionData).forEach(function(sido) {
      sidoSel.innerHTML += '<option value="' + sido + '">' + sido + '</option>';
    });
  });
  txInitCustomRange();
}

var txStartYear = 0, txStartMon = 0, txEndYear = 0, txEndMon = 0;
var txMinYear = 2020;

function txInitCustomRange() {
  if (!document.getElementById('txStartGrid')) return;
  var now = new Date();
  txEndYear = now.getFullYear();
  txEndMon = now.getMonth() + 1;
  txStartYear = txEndYear;
  txStartMon = txEndMon - 5;
  if (txStartMon <= 0) { txStartYear--; txStartMon += 12; }
  txRenderYmPicker('start');
  txRenderYmPicker('end');
}

function txRenderYmPicker(type) {
  var year = type === 'start' ? txStartYear : txEndYear;
  var mon = type === 'start' ? txStartMon : txEndMon;
  var now = new Date();
  var curY = now.getFullYear();
  var curM = now.getMonth() + 1;
  document.getElementById(type === 'start' ? 'txStartYearLabel' : 'txEndYearLabel').textContent = year + '년';
  var grid = document.getElementById(type === 'start' ? 'txStartGrid' : 'txEndGrid');
  var html = '';
  for (var m = 1; m <= 12; m++) {
    var isFuture = (year > curY) || (year === curY && m > curM);
    var isTooOld = year < txMinYear;
    var isSelected = (m === mon);
    var cls = 'tx-ym-btn';
    if (isSelected) cls += ' selected';
    if (isFuture || isTooOld) cls += ' disabled';
    html += '<button class="' + cls + '"' + (isFuture || isTooOld ? '' : ' onclick="txYmSelect(&quot;' + type + '&quot;,' + m + ')"') + '>' + m + '월</button>';
  }
  grid.innerHTML = html;
}

function txYmNav(type, dir) {
  if (type === 'start') {
    txStartYear += dir;
    if (txStartYear < txMinYear) txStartYear = txMinYear;
    if (txStartYear > new Date().getFullYear()) txStartYear = new Date().getFullYear();
  } else {
    txEndYear += dir;
    if (txEndYear < txMinYear) txEndYear = txMinYear;
    if (txEndYear > new Date().getFullYear()) txEndYear = new Date().getFullYear();
  }
  txRenderYmPicker(type);
}

function txYmSelect(type, m) {
  if (type === 'start') { txStartMon = m; }
  else { txEndMon = m; }
  txRenderYmPicker(type);
}

function txGetCustomStart() {
  return txStartYear + String(txStartMon).padStart(2, '0');
}

function txGetCustomEnd() {
  return txEndYear + String(txEndMon).padStart(2, '0');
}

function txGetCustomStartText() {
  return txStartYear + '.' + String(txStartMon).padStart(2, '0');
}

function txGetCustomEndText() {
  return txEndYear + '.' + String(txEndMon).padStart(2, '0');
}

function txOnSidoChange(sel, idx) {
  var container = sel.closest('.tx-region-selector');
  var sggSel = container.querySelectorAll('.tx-select')[1];
  var dongSel = container.querySelectorAll('.tx-select')[2];
  sggSel.innerHTML = '<option value="">시/군/구 선택</option>'; sggSel.disabled = true;
  dongSel.innerHTML = '<option value="">읍/면/동 (전체)</option>'; dongSel.disabled = true;
  var sido = sel.value;
  if (!sido || !txRegionData[sido]) return;
  Object.keys(txRegionData[sido]).forEach(function(sgg) {
    sggSel.innerHTML += '<option value="' + sgg + '">' + sgg + '</option>';
  });
  sggSel.disabled = false;
}

function txOnSggChange(sel, idx) {
  var container = sel.closest('.tx-region-selector');
  var sidoSel = container.querySelectorAll('.tx-select')[0];
  var dongSel = container.querySelectorAll('.tx-select')[2];
  dongSel.innerHTML = '<option value="">읍/면/동 (전체)</option>'; dongSel.disabled = true;
  var sido = sidoSel.value, sgg = sel.value;
  if (!sido || !sgg || !txRegionData[sido] || !txRegionData[sido][sgg]) return;
  var info = txRegionData[sido][sgg];
  if (info.dongs && info.dongs.length) {
    info.dongs.forEach(function(d) { dongSel.innerHTML += '<option value="' + d + '">' + d + '</option>'; });
    dongSel.disabled = false;
  }
  // 자동 태그 추가
  txUpdateSelectedRegions();
}

function txOnDongChange(sel, idx) {
  txUpdateSelectedRegions();
}

function txUpdateSelectedRegions() {
  txSelectedRegions = [];
  document.querySelectorAll('.tx-region-selector').forEach(function(container) {
    var sels = container.querySelectorAll('.tx-select');
    var sido = sels[0].value, sgg = sels[1].value, dong = sels[2] ? sels[2].value : '';
    if (sido && sgg && txRegionData[sido] && txRegionData[sido][sgg]) {
      txSelectedRegions.push({ sido: sido, sgg: sgg, sggCd: txRegionData[sido][sgg].code, dong: dong, sggNm: sgg });
    }
  });
  txRenderTags();
  txUpdateQueryBtn();
}

function txRenderTags() {
  var bar = document.getElementById('txTagBar');
  var html = '';
  txSelectedRegions.forEach(function(r, i) {
    var label = r.sido.replace(/특별시|광역시|특별자치시|특별자치도/g, '') + ' ' + r.sgg + (r.dong ? ' ' + r.dong : '');
    html += '<span class="tx-region-tag"><span class="dot" style="background:' + TX_COLORS[i] + '"></span>' + escHtml(label);
    if (txSelectedRegions.length > 1) html += ' <span class="tag-x" onclick="txRemoveRegion(' + i + ')">\\u00d7</span>';
    html += '</span>';
  });
  if (txSelectedRegions.length < 3) {
    html += '<button class="tx-add-region" onclick="txAddRegionSelector()">+ 비교 지역</button>';
  }
  bar.innerHTML = html;
}

function txAddRegionSelector() {
  if (txSelectedRegions.length >= 3) return;
  var wrap = document.getElementById('txRegionSelectors');
  var idx = wrap.querySelectorAll('.tx-region-selector').length;
  var div = document.createElement('div');
  div.className = 'tx-region-selector';
  div.setAttribute('data-idx', idx);
  div.style.marginTop = '8px';
  div.innerHTML = '<div class="tx-select-row"><select class="tx-select" onchange="txOnSidoChange(this,' + idx + ')"><option value="">시/도 선택</option></select><select class="tx-select" onchange="txOnSggChange(this,' + idx + ')" disabled><option value="">시/군/구 선택</option></select></div><div class="tx-select-row" style="grid-template-columns:1fr;"><select class="tx-select" onchange="txOnDongChange(this,' + idx + ')" disabled><option value="">읍/면/동 (전체)</option></select></div>';
  wrap.appendChild(div);
  // 시도 옵션 채우기
  var sidoSel = div.querySelectorAll('.tx-select')[0];
  Object.keys(txRegionData).forEach(function(sido) {
    sidoSel.innerHTML += '<option value="' + sido + '">' + sido + '</option>';
  });
}

function txRemoveRegion(idx) {
  if (txSelectedRegions.length <= 1) return;
  var wrap = document.getElementById('txRegionSelectors');
  var sels = wrap.querySelectorAll('.tx-region-selector');
  if (sels[idx]) sels[idx].remove();
  txUpdateSelectedRegions();
}

function txSetPeriod(m, btn) {
  document.querySelectorAll('.tx-period-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  if (m === 0) {
    txCustomMode = true;
    document.getElementById('txCustomRange').classList.add('active');
  } else {
    txCustomMode = false;
    txPeriodMonths = m;
    document.getElementById('txCustomRange').classList.remove('active');
  }
  txUpdateQueryBtn();
}

function txUpdateQueryBtn() {
  var btn = document.getElementById('txQueryBtn');
  btn.disabled = txSelectedRegions.length === 0;
  btn.textContent = txSelectedRegions.length >= 2 ? '비교 조회하기' : '조회하기';
}

function txRenderFavorites() {
  var favs = txGetFavorites();
  var bar = document.getElementById('txFavBar');
  if (!favs.length) { bar.innerHTML = ''; return; }
  var html = '';
  favs.forEach(function(f, i) {
    html += '<button class="tx-fav-chip" onclick="txLoadFavorite(' + i + ')">&#9733; ' + escHtml(f.label) + '<span class="fav-x" onclick="event.stopPropagation();txRemoveFavorite(' + i + ')">\\u00d7</span></button>';
  });
  html += '<button class="tx-fav-chip" onclick="txAddFavorite()">+ 추가</button>';
  bar.innerHTML = html;
}

function txAddFavorite() {
  if (!txSelectedRegions.length) { showToast('지역을 먼저 선택하세요'); return; }
  var favs = txGetFavorites();
  var r = txSelectedRegions[0];
  var label = r.sgg + (r.dong ? ' ' + r.dong : '');
  if (favs.some(function(f) { return f.label === label; })) { showToast('이미 즐겨찾기에 있습니다'); return; }
  favs.push({ label: label, sido: r.sido, sgg: r.sgg, dong: r.dong, sggCd: r.sggCd });
  txSetFavorites(favs);
  txRenderFavorites();
  showToast('즐겨찾기에 추가했습니다');
}

function txRemoveFavorite(idx) {
  var favs = txGetFavorites();
  favs.splice(idx, 1);
  txSetFavorites(favs);
  txRenderFavorites();
}

function txLoadFavorite(idx) {
  var favs = txGetFavorites();
  var f = favs[idx];
  if (!f || !txRegionData) return;
  // 셀렉터 초기화
  var wrap = document.getElementById('txRegionSelectors');
  wrap.innerHTML = '<div class="tx-region-selector" data-idx="0"><div class="tx-select-row"><select class="tx-select" onchange="txOnSidoChange(this,0)"><option value="">시/도 선택</option></select><select class="tx-select" onchange="txOnSggChange(this,0)" disabled><option value="">시/군/구 선택</option></select></div><div class="tx-select-row" style="grid-template-columns:1fr;"><select class="tx-select" onchange="txOnDongChange(this,0)" disabled><option value="">읍/면/동 (전체)</option></select></div></div>';
  txInitSelectors();
  var container = wrap.querySelector('.tx-region-selector');
  var sels = container.querySelectorAll('.tx-select');
  sels[0].value = f.sido;
  txOnSidoChange(sels[0], 0);
  sels[1].value = f.sgg;
  txOnSggChange(sels[1], 0);
  if (f.dong) sels[2].value = f.dong;
  txUpdateSelectedRegions();
  txDoQuery();
}

// ─── 조회 실행 ───
async function txDoQuery() {
  if (!txSelectedRegions.length) return;
  txInsightCache = null; txReportCache = null; txDetailReportCache = {}; txShowAllRows = false;
  var btn = document.getElementById('txQueryBtn');
  btn.disabled = true; btn.innerHTML = '<div class="spin" style="width:16px;height:16px;border-width:2px;"></div> 조회 중...';
  document.getElementById('txResultArea').style.display = 'block';
  document.getElementById('txLoading').style.display = 'block';
  document.getElementById('txEmpty').style.display = 'none';
  document.getElementById('txSummaries').innerHTML = '';
  document.getElementById('txCompareArea').style.display = 'none';
  document.getElementById('txAllStatsArea').style.display = 'none';
  document.getElementById('txListArea').style.display = 'none';
  document.getElementById('txBottomBtns').style.display = 'none';

  var regions = txSelectedRegions.map(function(r) { return r.sggCd; }).join(',');
  var dong = txSelectedRegions[0].dong || '';
  var url = '/api/transaction/query?regions=' + regions;
  if (txCustomMode) {
    url += '&startMonth=' + txGetCustomStart() + '&endMonth=' + txGetCustomEnd();
  } else {
    url += '&months=' + txPeriodMonths;
  }
  if (dong) url += '&dong=' + encodeURIComponent(dong);

  try {
    var resp = await fetch(url);
    var data = await resp.json();
    btn.disabled = false; btn.innerHTML = txSelectedRegions.length >= 2 ? '비교 조회하기' : '조회하기';
    document.getElementById('txLoading').style.display = 'none';

    if (!data.results || !data.results.length || data.results.every(function(r) { return r.transactions.length === 0; })) {
      document.getElementById('txEmpty').style.display = 'block';
      return;
    }

    txQueryResults = data.results;

    // 지역명 보정 (dong 포함)
    txQueryResults.forEach(function(r, i) {
      if (txSelectedRegions[i]) {
        r.displayName = txSelectedRegions[i].sgg + (txSelectedRegions[i].dong ? ' ' + txSelectedRegions[i].dong : '');
      } else {
        r.displayName = r.sggNm;
      }
    });

    txRenderSummaries();
    if (txQueryResults.length >= 2) txRenderCompare();
    txRenderAllStats();
    txRenderList();
    document.getElementById('txBottomBtns').style.display = 'flex';
  } catch(e) {
    console.error('[실거래가 조회 오류]', e);
    btn.disabled = false; btn.innerHTML = '조회하기';
    document.getElementById('txLoading').style.display = 'none';
    showToast('조회 중 오류가 발생했습니다');
  }
}

function txFormatPrice(amount) {
  if (amount >= 10000) {
    var eok = Math.round(amount / 1000) / 10;
    return (eok % 1 === 0 ? eok.toFixed(0) : eok.toFixed(1)) + '억';
  }
  return Math.round(amount).toLocaleString() + '만원';
}

function txFormatPP(pp) {
  if (pp >= 10000) {
    var eok = Math.round(pp / 1000) / 10;
    return (eok % 1 === 0 ? eok.toFixed(0) : eok.toFixed(1)) + '억';
  }
  return Math.round(pp).toLocaleString() + '만';
}

function toP(m2) {
  if (!m2 || m2 <= 0) return '';
  var p = Math.round(m2 / 3.3058 * 10) / 10;
  return '(' + (p % 1 === 0 ? p.toFixed(0) : p.toFixed(1)) + '평)';
}

function txShade(idx, total) {
  var dR=30,dG=58,dB=95,lR=163,lG=203,lB=232;
  var t = total <= 1 ? 0 : idx / (total - 1);
  return 'rgb('+Math.round(dR+(lR-dR)*t)+','+Math.round(dG+(lG-dG)*t)+','+Math.round(dB+(lB-dB)*t)+')';
}

function txGetPeriodLabel() {
  if (txCustomMode) {
    return txGetCustomStartText() + ' ~ ' + txGetCustomEndText();
  }
  var now = new Date();
  var from = new Date(now.getFullYear(), now.getMonth() - txPeriodMonths + 1, 1);
  return from.getFullYear() + '.' + String(from.getMonth() + 1).padStart(2, '0') + ' ~ ' + now.getFullYear() + '.' + String(now.getMonth() + 1).padStart(2, '0');
}

function txGetPrevPeriodLabel() {
  var now = new Date();
  if (txCustomMode) {
    var sv = txGetCustomStart();
    var ev = txGetCustomEnd();
    var sy = parseInt(sv.substring(0,4)), sm = parseInt(sv.substring(4,6)) - 1;
    var ey = parseInt(ev.substring(0,4)), em = parseInt(ev.substring(4,6)) - 1;
    var span = (ey - sy) * 12 + (em - sm) + 1;
    var pf = new Date(sy, sm - span, 1);
    var pt = new Date(sy, sm - 1, 1);
    return pf.getFullYear() + '.' + String(pf.getMonth()+1).padStart(2,'0') + '~' + pt.getFullYear() + '.' + String(pt.getMonth()+1).padStart(2,'0');
  }
  var pFrom = new Date(now.getFullYear(), now.getMonth() - txPeriodMonths * 2 + 1, 1);
  var pTo = new Date(now.getFullYear(), now.getMonth() - txPeriodMonths, 1);
  return pFrom.getFullYear() + '.' + String(pFrom.getMonth()+1).padStart(2,'0') + '~' + pTo.getFullYear() + '.' + String(pTo.getMonth()+1).padStart(2,'0');
}

// ─── 거래 요약 렌더링 ───
function txRenderSummaries() {
  var wrap = document.getElementById('txSummaries');
  var html = '';
  var starred = txGetStarred();

  txQueryResults.forEach(function(r) {
    var s = r.stats;
    html += '<div class="tx-card">';
    // 당월 안내
    if (s.isCurrentMonthIncluded) html += '<div class="tx-current-notice">이 달의 데이터는 신고 진행 중이므로 변동될 수 있습니다</div>';
    html += '<div class="tx-summary-header"><div class="tx-summary-title">' + escHtml(r.displayName) + ' 거래 요약</div><div class="tx-summary-period">' + txGetPeriodLabel() + '</div></div>';

    // 핵심 통계 카드 4개
    html += '<div class="tx-stat-grid">';
    var statItems = txBuildStatItems(s);
    starred.forEach(function(key) {
      var item = statItems.find(function(si) { return si.key === key; });
      if (!item) return;
      html += '<div class="tx-stat-card"><div class="tx-stat-label">' + item.label + '</div><div class="tx-stat-value">' + item.value + '</div>';
      html += '<div class="tx-stat-change ' + item.changeClass + '">' + item.changeText + '</div>';
      html += '<button class="tx-stat-star" title="핵심 카드에서 제거" onclick="txToggleStar(&quot;' + item.key + '&quot;)">&#9733;</button></div>';
    });
    html += '</div>';

    // ─── 매수/매도 비율 (세그먼트 바) ───
    var buyTotal = s.buyer.corp.count + s.buyer.personal.count;
    var selTotal = s.seller.corp.count + s.seller.personal.count;
    if (buyTotal > 0 || selTotal > 0) {
      html += '<div class="tx-bar-section"><div class="tx-bar-section-title"><span class="tx-bar-icon">&#9632;</span> 매수/매도 비율</div>';
      if (buyTotal > 0) {
        var bcp = Math.round(s.buyer.corp.count/buyTotal*100); var bpp = 100-bcp;
        var bC0 = txShade(0,2); var bC1 = txShade(1,2);
        html += '<div style="font-size:11px;color:var(--muted);margin-bottom:3px;">매수</div><div class="tx-stack-bar">';
        html += '<div class="tx-stack-seg" style="width:'+bcp+'%;background:'+bC0+';"><span class="tx-stack-pct">'+bcp+'%</span></div>';
        html += '<div class="tx-stack-seg" style="width:'+bpp+'%;background:'+bC1+';"><span class="tx-stack-pct">'+bpp+'%</span></div></div>';
        html += '<div class="tx-stack-legend"><div class="tx-stack-legend-item"><span class="tx-stack-legend-dot" style="background:'+bC0+';"></span>법인 '+bcp+'% <span class="s-cnt">('+s.buyer.corp.count+'건)</span></div>';
        html += '<div class="tx-stack-legend-item"><span class="tx-stack-legend-dot" style="background:'+bC1+';"></span>개인 '+bpp+'% <span class="s-cnt">('+s.buyer.personal.count+'건)</span></div></div>';
      }
      if (selTotal > 0) {
        var scp = Math.round(s.seller.corp.count/selTotal*100); var spp = 100-scp;
        var sC0 = txShade(0,2); var sC1 = txShade(1,2);
        html += '<div style="font-size:11px;color:var(--muted);margin:10px 0 3px;">매도</div><div class="tx-stack-bar">';
        html += '<div class="tx-stack-seg" style="width:'+scp+'%;background:'+sC0+';"><span class="tx-stack-pct">'+scp+'%</span></div>';
        html += '<div class="tx-stack-seg" style="width:'+spp+'%;background:'+sC1+';"><span class="tx-stack-pct">'+spp+'%</span></div></div>';
        html += '<div class="tx-stack-legend"><div class="tx-stack-legend-item"><span class="tx-stack-legend-dot" style="background:'+sC0+';"></span>법인 '+scp+'% <span class="s-cnt">('+s.seller.corp.count+'건)</span></div>';
        html += '<div class="tx-stack-legend-item"><span class="tx-stack-legend-dot" style="background:'+sC1+';"></span>개인 '+spp+'% <span class="s-cnt">('+s.seller.personal.count+'건)</span></div></div>';
      }
      html += '</div>';
    }

    // ─── 건물용도별 (세그먼트 바) ───
    var TX_USE_SHOW = ['제1종근린생활','제2종근린생활','업무','숙박','교육연구','의료'];
    var useAll = Object.entries(s.byUse).sort(function(a,b){return b[1]-a[1];});
    var useShown = [];
    var useOtherSum = 0;
    for (var _u=0; _u<useAll.length; _u++) {
      if (TX_USE_SHOW.indexOf(useAll[_u][0]) >= 0) {
        useShown.push([useAll[_u][0], useAll[_u][1]]);
      } else {
        useOtherSum += useAll[_u][1];
      }
    }
    if (useOtherSum > 0) useShown.push(['기타', useOtherSum]);
    useShown.sort(function(a,b){return b[1]-a[1];});
    if (useShown.length && s.totalCount > 0) {
      html += '<div class="tx-bar-section"><div class="tx-bar-section-title"><span class="tx-bar-icon">&#9632;</span> 건물용도별</div><div class="tx-stack-bar">';
      for (var ui=0; ui<useShown.length; ui++) {
        var upct = useShown[ui][1]/s.totalCount*100;
        html += '<div class="tx-stack-seg" style="width:'+upct+'%;background:'+txShade(ui,useShown.length)+';">';
        if (upct>=6) html += '<span class="tx-stack-pct">'+Math.round(upct)+'%</span>';
        html += '</div>';
      }
      html += '</div><div class="tx-stack-legend">';
      for (var ul=0; ul<useShown.length; ul++) {
        html += '<div class="tx-stack-legend-item"><span class="tx-stack-legend-dot" style="background:'+txShade(ul,useShown.length)+';"></span>'+useShown[ul][0]+' '+Math.round(useShown[ul][1]/s.totalCount*100)+'% <span class="s-cnt">('+useShown[ul][1]+'건)</span></div>';
      }
      html += '</div></div>';
    }

    // ─── 용도지역별 (세그먼트 바) ───
    var TX_LAND_SHOW = ['제1종전용주거','제1종일반주거','제2종일반주거','제3종일반주거','준주거','중심상업','일반상업','준공업'];
    var landAll = Object.entries(s.byLandUse).sort(function(a,b){return b[1]-a[1];});
    var landShown = [];
    var landOtherSum = 0;
    for (var _l=0; _l<landAll.length; _l++) {
      if (TX_LAND_SHOW.indexOf(landAll[_l][0]) >= 0) {
        landShown.push([landAll[_l][0], landAll[_l][1]]);
      } else {
        landOtherSum += landAll[_l][1];
      }
    }
    if (landOtherSum > 0) landShown.push(['기타', landOtherSum]);
    landShown.sort(function(a,b){return b[1]-a[1];});
    if (landShown.length && s.totalCount > 0) {
      html += '<div class="tx-bar-section"><div class="tx-bar-section-title"><span class="tx-bar-icon">&#9632;</span> 용도지역별</div><div class="tx-stack-bar">';
      for (var li=0; li<landShown.length; li++) {
        var lpct = landShown[li][1]/s.totalCount*100;
        html += '<div class="tx-stack-seg" style="width:'+lpct+'%;background:'+txShade(li,landShown.length)+';">';
        if (lpct>=6) html += '<span class="tx-stack-pct">'+Math.round(lpct)+'%</span>';
        html += '</div>';
      }
      html += '</div><div class="tx-stack-legend">';
      for (var ll=0; ll<landShown.length; ll++) {
        html += '<div class="tx-stack-legend-item"><span class="tx-stack-legend-dot" style="background:'+txShade(ll,landShown.length)+';"></span>'+landShown[ll][0]+' '+Math.round(landShown[ll][1]/s.totalCount*100)+'% <span class="s-cnt">('+landShown[ll][1]+'건)</span></div>';
      }
      html += '</div></div>';
    }

    // ─── 동별 거래량 바 그래프 (상위 10개) ───
    var dongEntries = Object.entries(s.byDong).sort(function(a,b){return b[1].count-a[1].count;}).slice(0, 10);
    if (dongEntries.length) {
      var dongMax = dongEntries[0][1].count;
      html += '<div class="tx-bar-section"><div class="tx-bar-section-title"><span class="tx-bar-icon">&#9632;</span> 동별 거래량 <span style="font-weight:400;font-size:11px;color:var(--muted);">상위 ' + Math.min(10, Object.keys(s.byDong).length) + '개</span></div>';
      dongEntries.forEach(function(e,i) {
        var pct = s.totalCount > 0 ? Math.round(e[1].count / s.totalCount * 100) : 0;
        var barW = dongMax > 0 ? Math.round(e[1].count / dongMax * 100) : 0;
        html += '<div class="tx-bar-row"><div class="tx-bar-label">' + e[0] + '</div><div class="tx-bar-track"><div class="tx-bar-fill" style="width:' + barW + '%;background:' + txShade(i,dongEntries.length) + ';"></div></div><div class="tx-bar-meta"><strong>' + pct + '%</strong> (' + e[1].count + '건)</div></div>';
      });
      html += '</div>';
    }

    // ─── 동별 평균 평당가 바 그래프 (상위 10개) ───
    var dongPriceEntries = Object.entries(s.byDong).filter(function(e){return e[1].ppCount>0;}).map(function(e){return [e[0], Math.round(e[1].totalPP/e[1].ppCount)];}).sort(function(a,b){return b[1]-a[1];}).slice(0, 10);
    if (dongPriceEntries.length) {
      var dongPMax = dongPriceEntries[0][1];
      html += '<div class="tx-bar-section"><div class="tx-bar-section-title"><span class="tx-bar-icon">&#9632;</span> 동별 평균 평당가 <span style="font-weight:400;font-size:11px;color:var(--muted);">상위 ' + dongPriceEntries.length + '개</span></div>';
      dongPriceEntries.forEach(function(e,i) {
        var barW = dongPMax > 0 ? Math.round(e[1] / dongPMax * 100) : 0;
        html += '<div class="tx-bar-row"><div class="tx-bar-label">' + e[0] + '</div><div class="tx-bar-track"><div class="tx-bar-fill" style="width:' + barW + '%;background:' + txShade(i,dongPriceEntries.length) + ';"></div></div><div class="tx-bar-meta"><strong>' + txFormatPP(e[1]) + '</strong>/평</div></div>';
      });
      html += '</div>';
    }

    // ─── 건축연도별 바 그래프 (상위 5개) ───
    var yearEntries = Object.entries(s.byBuildYear).filter(function(e){return e[1]>0;}).sort(function(a,b){return b[1]-a[1];}).slice(0, 5);
    if (yearEntries.length) {
      var yearMax = yearEntries[0][1];
      html += '<div class="tx-bar-section"><div class="tx-bar-section-title"><span class="tx-bar-icon">&#9632;</span> 건축연도별 <span style="font-weight:400;font-size:11px;color:var(--muted);">상위 ' + yearEntries.length + '개</span></div>';
      yearEntries.forEach(function(e,i) {
        var pct = s.totalCount > 0 ? Math.round(e[1] / s.totalCount * 100) : 0;
        var barW = yearMax > 0 ? Math.round(e[1] / yearMax * 100) : 0;
        html += '<div class="tx-bar-row"><div class="tx-bar-label">' + e[0] + '</div><div class="tx-bar-track"><div class="tx-bar-fill" style="width:' + barW + '%;background:' + txShade(i,yearEntries.length) + ';"></div></div><div class="tx-bar-meta"><strong>' + pct + '%</strong> (' + e[1] + '건)</div></div>';
      });
      html += '</div>';
    }

    // ─── 최고/최저 평당가 (상세 정보) ───
    if (s.highest || s.lowest) {
      html += '<div class="tx-bar-section"><div class="tx-bar-section-title"><span class="tx-bar-icon">&#9632;</span> 평당가 최고/최저</div>';
      if (s.highest) {
        html += '<div class="tx-highlight-row"><span class="tx-hl-badge hi">최고</span><div class="tx-hl-detail"><div class="tx-hl-value">' + txFormatPP(s.highest.pricePerPyeong) + '/평 <span class="tx-hl-price">' + txFormatPrice(s.highest.deal_amount) + '</span></div>';
        html += '<div class="tx-hl-sub">' + escHtml((s.highest.umd_nm||'') + ' ' + (s.highest.jibun||'')) + ' · ' + escHtml(s.highest.land_use||'') + '</div>';
        html += '<div class="tx-hl-sub">대지 ' + (s.highest.plottage_ar||0) + '㎡' + toP(s.highest.plottage_ar) + '</div><div class="tx-hl-sub">연면적 ' + (s.highest.building_ar||0) + '㎡' + toP(s.highest.building_ar) + ' · ' + (s.highest.build_year||'') + '년</div></div></div>';
      }
      if (s.lowest) {
        html += '<div class="tx-highlight-row"><span class="tx-hl-badge lo">최저</span><div class="tx-hl-detail"><div class="tx-hl-value">' + txFormatPP(s.lowest.pricePerPyeong) + '/평 <span class="tx-hl-price">' + txFormatPrice(s.lowest.deal_amount) + '</span></div>';
        html += '<div class="tx-hl-sub">' + escHtml((s.lowest.umd_nm||'') + ' ' + (s.lowest.jibun||'')) + ' · ' + escHtml(s.lowest.land_use||'') + '</div>';
        html += '<div class="tx-hl-sub">대지 ' + (s.lowest.plottage_ar||0) + '㎡' + toP(s.lowest.plottage_ar) + '</div><div class="tx-hl-sub">연면적 ' + (s.lowest.building_ar||0) + '㎡' + toP(s.lowest.building_ar) + ' · ' + (s.lowest.build_year||'') + '년</div></div></div>';
      }
      html += '</div>';
    }

    // 콘텐츠 생성 버튼
    html += '<button class="tx-action-btn" onclick="txToContent()">이 데이터로 콘텐츠 생성하기</button>';
    html += '</div>';
  });
  wrap.innerHTML = html;
}

function txBuildStatItems(s) {
  var chVol = s.prevPeriodChange.volume;
  var chPri = s.prevPeriodChange.price;
  var chAvg = s.prevPeriodChange.avgPrice || 0;
  var chArea = s.prevPeriodChange.area || 0;
  var prevLabel = txGetPrevPeriodLabel();
  var prevPrefix = '전기(' + prevLabel + ') ';
  return [
    { key: '거래량', label: '거래량', value: s.totalCount + '건', changeText: chVol !== 0 ? prevPrefix + (chVol > 0 ? '+' : '') + chVol + '%' : prevPrefix + '-', changeClass: chVol > 0 ? 'up' : chVol < 0 ? 'down' : 'none' },
    { key: '평균 매매가', label: '평균 매매가', value: txFormatPrice(s.avgPrice), changeText: chAvg !== 0 ? prevPrefix + (chAvg > 0 ? '+' : '') + chAvg + '%' : prevPrefix + '-', changeClass: chAvg > 0 ? 'up' : chAvg < 0 ? 'down' : 'none' },
    { key: '평당 매매가', label: '평당 매매가 (토지)', value: txFormatPP(s.avgPricePerPyeong), changeText: chPri !== 0 ? prevPrefix + (chPri > 0 ? '+' : '') + chPri + '%' : prevPrefix + '-', changeClass: chPri > 0 ? 'up' : chPri < 0 ? 'down' : 'none' },
    { key: '연면적 평당가', label: '연면적 평당가', value: txFormatPP(s.avgPricePerArea), changeText: chArea !== 0 ? prevPrefix + (chArea > 0 ? '+' : '') + chArea + '%' : prevPrefix + '-', changeClass: chArea > 0 ? 'up' : chArea < 0 ? 'down' : 'none' },
    { key: '법인 매수 비율', label: '법인 매수 비율', value: s.buyer.corp.ratio + '%', changeText: s.buyer.corp.count + '건', changeClass: 'none' },
    { key: '법인 매도 비율', label: '법인 매도 비율', value: s.seller.corp.ratio + '%', changeText: s.seller.corp.count + '건', changeClass: 'none' },
    { key: '동별 거래량', label: '동별 거래량', value: Object.keys(s.byDong).length + '개 동', changeText: Object.entries(s.byDong).sort(function(a,b){return b[1].count-a[1].count;}).slice(0,2).map(function(e){return e[0]+' '+e[1].count+'건';}).join(', '), changeClass: 'none' },
    { key: '동별 평균 매매가', label: '동별 평균 매매가', value: Object.keys(s.byDong).length + '개 동', changeText: Object.entries(s.byDong).filter(function(e){return e[1].ppCount>0;}).sort(function(a,b){return (b[1].totalPP/b[1].ppCount)-(a[1].totalPP/a[1].ppCount);}).slice(0,2).map(function(e){return e[0]+' '+txFormatPP(e[1].totalPP/e[1].ppCount);}).join(', '), changeClass: 'none' },
    { key: '건축연도별', label: '건축연도별', value: Object.entries(s.byBuildYear).sort(function(a,b){return b[1]-a[1];})[0][0] + ' 최다', changeText: Object.entries(s.byBuildYear).filter(function(e){return e[1]>0;}).map(function(e){return e[0]+' '+e[1]+'건';}).join(', '), changeClass: 'none' },
    { key: '용도지역별', label: '용도지역별', value: Object.entries(s.byLandUse).sort(function(a,b){return b[1]-a[1];})[0] ? Object.entries(s.byLandUse).sort(function(a,b){return b[1]-a[1];})[0][0] : '-', changeText: Object.entries(s.byLandUse).filter(function(e){return e[1]>0;}).slice(0,3).map(function(e){return e[0]+' '+e[1]+'건';}).join(', '), changeClass: 'none' },
    { key: '최고 평당가 거래', label: '최고 평당가', value: s.highest ? txFormatPP(s.highest.pricePerPyeong) + '/평' : '-', changeText: s.highest ? (s.highest.umd_nm||'') + ' ' + txFormatPrice(s.highest.deal_amount) : '-', changeClass: 'none' },
    { key: '최저 평당가 거래', label: '최저 평당가', value: s.lowest ? txFormatPP(s.lowest.pricePerPyeong) + '/평' : '-', changeText: s.lowest ? (s.lowest.umd_nm||'') + ' ' + txFormatPrice(s.lowest.deal_amount) : '-', changeClass: 'none' }
  ];
}

function txToggleStar(key) {
  var starred = txGetStarred();
  var idx = starred.indexOf(key);
  if (idx >= 0) {
    if (starred.length <= 1) { alert('최소 1개는 핵심 카드로 유지해야 합니다'); return; }
    starred.splice(idx, 1);
  } else {
    if (starred.length >= 4) { alert('핵심 카드는 최대 4개까지 설정 가능합니다'); return; }
    starred.push(key);
  }
  txSetStarred(starred);
  txRenderSummaries();
  txRenderAllStats();
}

// ─── 비교 테이블 ───
function txRenderCompare() {
  if (!txQueryResults || txQueryResults.length < 2) return;
  var area = document.getElementById('txCompareArea');
  area.style.display = 'block';
  var html = '<div class="tx-card"><div style="font-size:14px;font-weight:500;margin-bottom:12px;">지역 비교</div>';
  html += '<div style="overflow-x:auto;"><table class="tx-compare-table"><thead><tr><th></th>';
  txQueryResults.forEach(function(r, i) {
    html += '<th><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + TX_COLORS[i] + ';margin-right:4px;"></span>' + escHtml(r.displayName) + '</th>';
  });
  html += '</tr></thead><tbody>';
  var rows = [
    { label: '거래건수', fn: function(s) { return s.totalCount + '건'; }},
    { label: '평균 매매가', fn: function(s) { return txFormatPrice(s.avgPrice); }},
    { label: '평당 매매가', fn: function(s) { return txFormatPP(s.avgPricePerPyeong); }},
    { label: '전기 대비<br><span style="font-size:9px;font-weight:400;color:var(--muted);">' + txGetPrevPeriodLabel() + '</span>', fn: function(s) { var v = s.prevPeriodChange.price; return v > 0 ? '<span style="color:#1D9E75">+' + v + '%</span>' : v < 0 ? '<span style="color:#E24B4A">' + v + '%</span>' : '-'; }},
    { label: '법인 매수', fn: function(s) { return s.buyer.corp.ratio + '% <span style="font-size:10px;color:var(--muted)">(' + s.buyer.corp.count + '건)</span>'; }},
    { label: '법인 매도', fn: function(s) { return s.seller.corp.ratio + '% <span style="font-size:10px;color:var(--muted)">(' + s.seller.corp.count + '건)</span>'; }}
  ];
  rows.forEach(function(row) {
    html += '<tr><td>' + row.label + '</td>';
    txQueryResults.forEach(function(r) { html += '<td>' + row.fn(r.stats) + '</td>'; });
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  // AI 인사이트
  html += '<div style="margin-top:12px;"><button class="tx-insight-btn" id="txInsightBtn" onclick="txGetInsight()">AI 분석 보기</button><div class="tx-insight-text" id="txInsightText" style="display:none;"></div></div>';
  html += '</div>';
  area.innerHTML = html;
}

async function txGetInsight() {
  if (txInsightCache) {
    document.getElementById('txInsightText').style.display = 'block';
    document.getElementById('txInsightText').textContent = txInsightCache;
    return;
  }
  var btn = document.getElementById('txInsightBtn');
  btn.disabled = true; btn.textContent = '분석 중...';
  try {
    var resp = await fetch('/api/transaction/insight', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regions: txQueryResults })
    });
    var data = await resp.json();
    txInsightCache = data.insight || '';
    var el = document.getElementById('txInsightText');
    el.style.display = 'block';
    el.textContent = txInsightCache;
    btn.textContent = 'AI 분석 보기';
    btn.disabled = false;
  } catch(e) {
    btn.textContent = 'AI 분석 보기'; btn.disabled = false;
    showToast('AI 분석 중 오류가 발생했습니다');
  }
}

// ─── 전체 통계 목록 (토글형) ───
function txRenderAllStats() {
  if (!txQueryResults || !txQueryResults.length) return;
  var area = document.getElementById('txAllStatsArea');
  area.style.display = 'block';
  var s = txQueryResults[0].stats;
  var starred = txGetStarred();
  var items = txBuildStatItems(s);

  var html = '<button class="tx-stats-toggle-btn" id="txStatsToggleBtn" onclick="txToggleStatsPanel()"><span>&#9733; 핵심 카드 설정</span><span class="arrow">&#9660;</span></button>';
  html += '<div class="tx-stats-panel" id="txStatsPanel">';
  html += '<div class="tx-card" style="margin-top:8px;"><div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px;"><span style="font-size:13px;font-weight:500;color:var(--sub);">표시할 핵심 카드를 선택하세요</span><span style="font-size:11px;color:var(--muted);">최대 4개</span></div>';
  items.forEach(function(item) {
    var isStar = starred.indexOf(item.key) >= 0;
    html += '<div class="tx-all-stats-item' + (isStar ? ' starred' : '') + '">';
    html += '<button class="tx-all-stats-star ' + (isStar ? 'on' : 'off') + '" onclick="txToggleStar(&quot;' + item.key + '&quot;)">' + (isStar ? '&#9733;' : '&#9734;') + '</button>';
    html += '<div class="tx-all-stats-info"><div class="tx-all-stats-name">' + item.label + '</div><div class="tx-all-stats-val">' + item.value + ' <span class="tx-stat-change ' + item.changeClass + '" style="font-size:11px;">' + item.changeText + '</span></div>';
    html += '</div></div>';
  });
  html += '</div></div>';
  area.innerHTML = html;
  // 패널 열림 상태 복원
  if (txStatsPanelOpen) {
    var panel = document.getElementById('txStatsPanel');
    var btn = document.getElementById('txStatsToggleBtn');
    if (panel && btn) {
      panel.style.maxHeight = panel.scrollHeight + 'px';
      btn.classList.add('open');
    }
  }
}

function txToggleStatsPanel() {
  var panel = document.getElementById('txStatsPanel');
  var btn = document.getElementById('txStatsToggleBtn');
  if (txStatsPanelOpen) {
    panel.style.maxHeight = '0px';
    btn.classList.remove('open');
    txStatsPanelOpen = false;
  } else {
    panel.style.maxHeight = panel.scrollHeight + 'px';
    btn.classList.add('open');
    txStatsPanelOpen = true;
  }
}

// ─── 거래 리스트 ───
function txRenderList() {
  if (!txQueryResults || !txQueryResults.length) return;
  var area = document.getElementById('txListArea');
  area.style.display = 'block';
  var r = txQueryResults[0];
  var txs = r.transactions.slice().sort(function(a, b) {
    var da = (a.deal_year||'') + String(a.deal_month||'').padStart(2,'0') + String(a.deal_day||'').padStart(2,'0');
    var db = (b.deal_year||'') + String(b.deal_month||'').padStart(2,'0') + String(b.deal_day||'').padStart(2,'0');
    return db.localeCompare(da);
  });

  var filtered = txHideCancelled ? txs.filter(function(t) { return !t.cdeal_day || t.cdeal_day.trim() === ''; }) : txs;
  var totalFiltered = filtered.length;
  var showCount = txShowAllRows ? filtered.length : Math.min(10, filtered.length);
  var visible = filtered.slice(0, showCount);

  var html = '<div class="tx-card">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"><div><span style="font-size:14px;font-weight:500;">최근 거래 내역</span> <span style="font-size:11px;color:var(--muted);">' + totalFiltered + '건</span></div>';
  html += '<label class="tx-hide-cancel"><input type="checkbox" ' + (txHideCancelled ? 'checked' : '') + ' onchange="txToggleCancel(this.checked)"> 해제 건 제외</label></div>';

  html += '<div class="tx-table-wrap"><table class="tx-table"><thead><tr><th>거래일</th><th>위치·용도·면적</th><th>매매가</th><th>평당가</th></tr></thead><tbody>';

  visible.forEach(function(t) {
    var isCancelled = t.cdeal_day && t.cdeal_day.trim() !== '';
    var pp = t.plottage_ar > 0 ? Math.round(t.deal_amount / t.plottage_ar * 3.3058) : 0;

    html += '<tr class="' + (isCancelled ? 'tx-row-cancel' : '') + '">';
    html += '<td class="tx-date-col">' + String(t.deal_month||'').padStart(2,'0') + '.' + String(t.deal_day||'').padStart(2,'0') + '</td>';
    html += '<td><div class="tx-loc-main">' + escHtml((t.umd_nm||'') + (t.jibun ? ' ' + t.jibun : ''));
    html += '</div><div class="tx-loc-sub">' + escHtml(t.building_use||'') + ' · 대지 ' + (t.plottage_ar||0) + '\\u33A1' + toP(t.plottage_ar) + ' · ' + (t.building_ar||0) + '\\u33A1' + toP(t.building_ar) + ' · ' + (t.build_year||'') + '년</div></td>';
    html += '<td>' + (isCancelled ? '<s>' + txFormatPrice(t.deal_amount) + '</s>' : txFormatPrice(t.deal_amount)) + '</td>';
    html += '<td>' + (isCancelled ? '<span class="tx-cancel-tag">해제</span>' : (pp > 0 ? txFormatPP(pp) : '-')) + '</td>';
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  if (totalFiltered > 10 && !txShowAllRows) {
    html += '<button class="tx-more-btn" onclick="txShowMore()">거래 내역 더보기 (' + (totalFiltered - 10) + '건 더)</button>';
  }

  html += '<button class="tx-csv-btn" onclick="txDownloadCsv()">CSV 다운로드</button>';
  html += '</div>';
  area.innerHTML = html;
}

function txToggleCancel(checked) {
  txHideCancelled = checked;
  txShowAllRows = false;
  txRenderList();
}

function txShowMore() {
  txShowAllRows = true;
  txRenderList();
}

function txDownloadCsv() {
  if (!txQueryResults || !txQueryResults.length) return;
  var r = txQueryResults[0];
  var txs = txHideCancelled ? r.transactions.filter(function(t) { return !t.cdeal_day || t.cdeal_day.trim() === ''; }) : r.transactions;
  var header = '거래일,법정동,지번,건물용도,연면적(㎡),대지면적(㎡),거래금액(만원),평당매매가(만원),연면적평당가(만원),건축연도,매수자,매도자,용도지역,해제여부';
  var rows = txs.map(function(t) {
    var pp = t.plottage_ar > 0 ? Math.round(t.deal_amount / t.plottage_ar * 3.3058) : '';
    var ap = t.building_ar > 0 ? Math.round(t.deal_amount / t.building_ar * 3.3058) : '';
    var cancelled = t.cdeal_day && t.cdeal_day.trim() !== '' ? 'Y' : 'N';
    return [t.deal_year+'.'+String(t.deal_month).padStart(2,'0')+'.'+String(t.deal_day).padStart(2,'0'), t.umd_nm||'', t.jibun||'', t.building_use||'', t.building_ar||'', t.plottage_ar||'', t.deal_amount, pp, ap, t.build_year||'', t.buyer_gbn||'', t.sler_gbn||'', t.land_use||'', cancelled].join(',');
  });

  var csv = '\\uFEFF' + header + '\\n' + rows.join('\\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '실거래가_' + r.displayName + '_' + txGetPeriodLabel().replace(/\\s/g, '') + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── 콘텐츠 생성 연동 ───
function txToContent() {
  if (!txQueryResults || !txQueryResults.length) return;
  var r = txQueryResults[0];
  var s = r.stats;
  var text = r.displayName + ' 실거래 데이터 기반 콘텐츠:\\n';
  text += '기간: ' + txGetPeriodLabel() + '\\n';
  text += '거래 ' + s.totalCount + '건, 평균 매매가 ' + txFormatPrice(s.avgPrice) + ', 평당 ' + txFormatPP(s.avgPricePerPyeong) + '\\n';
  text += '법인 매수 ' + s.buyer.corp.ratio + '%, 전기 대비 거래량 ' + (s.prevPeriodChange.volume > 0 ? '+' : '') + s.prevPeriodChange.volume + '%\\n';
  text += '이 데이터를 바탕으로 빌딩 매매 시장 분석 콘텐츠를 작성해줘';

  showContentView();
  switchMode('text');
  document.getElementById('textInput').value = text;
  doGenerate();
}

// ─── 리포트 생성 ───
function txLinkifyReport(text) {
  var escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  var lines = escaped.split('\\n');
  var processed = lines.map(function(line) {
    var m = line.match(/(https?:\\/\\/[^\\s]+)/);
    if (!m) return line;
    var url = m[1];
    var urlStart = m.index;
    var before = line.substring(0, urlStart);
    var after = line.substring(urlStart + url.length);
    var cleanUrl = url.replace(/[.,;:)\\]\\s]+$/, '');
    var urlTail = url.substring(cleanUrl.length);
    var title = before.replace(/[\\s:\\-—–]+$/, '').trim();
    var leadingWhitespace = before.match(/^(\\s*)/)[1];
    var linkHtml = '<a href="' + cleanUrl + '" target="_blank" rel="noopener noreferrer">' + (title || cleanUrl) + '</a>';
    return leadingWhitespace + linkHtml + urlTail + after;
  });
  return processed.join('\\n');
}

function txShowReport(reportText) {
  var periodEl = document.getElementById('txReportPeriod');
  if (txRankingData && txRankingData.period) {
    var ps = txRankingData.period.start, pe = txRankingData.period.end;
    if (parseInt(ps) > parseInt(pe)) { var t = ps; ps = pe; pe = t; }
    var label = ps.substring(0,4) + '.' + ps.substring(4) + ' ~ ' + pe.substring(0,4) + '.' + pe.substring(4);
    periodEl.textContent = '분석 기간: ' + label;
    periodEl.style.display = 'block';
  } else {
    periodEl.style.display = 'none';
  }
  document.getElementById('txReportBody').innerHTML = txLinkifyReport(reportText);
  document.getElementById('txReportModal').classList.add('active');
}

async function txGenerateReport() {
  if (!txQueryResults) return;
  if (txReportCache) {
    txShowReport(txReportCache);
    return;
  }
  var btn = document.querySelector('.tx-btn-filled');
  btn.disabled = true; btn.textContent = '생성 중...';
  try {
    var body = { regions: txQueryResults };
    if (txRankingData) {
      body.period = txRankingData.period;
      body.prevPeriod = txRankingData.prevPeriod;
    }
    var resp = await fetch('/api/transaction/report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    var data = await resp.json();
    txReportCache = data.report || '';
    txShowReport(txReportCache);
    btn.textContent = '리포트 생성하기'; btn.disabled = false;
  } catch(e) {
    btn.textContent = '리포트 생성하기'; btn.disabled = false;
    showToast('리포트 생성 중 오류가 발생했습니다');
  }
}

function txCopyReport() {
  var text = txReportCache || document.getElementById('txReportBody').textContent;
  navigator.clipboard.writeText(text).then(function() { showToast('복사 완료'); });
}

function txReportToContent() {
  document.getElementById('txReportModal').classList.remove('active');
  showContentView();
  switchMode('text');
  document.getElementById('textInput').value = txReportCache || document.getElementById('txReportBody').textContent || '';
  doGenerate();
}

// ─── Auth ───
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
      document.getElementById('instaKickedOverlay').style.display = 'flex';
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

async function initInstaAuth() {
  var hasLocal = localStorage.getItem('bsn_user_name') && localStorage.getItem('bsn_user_id');

  if (!hasLocal) {
    document.getElementById('instaLoginOverlay').style.display = 'flex';
    return false;
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
    document.getElementById('instaLoginOverlay').style.display = 'flex';
    return false;
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
          document.getElementById('instaKickedOverlay').style.display = 'flex';
          return false;
        }
        doLogout();
        return false;
      }
    }
  } catch(e) {}

  document.getElementById('instaLoginOverlay').style.display = 'none';
  return true;
}

async function doInstaLogin() {
  var errEl = document.getElementById('instaLoginError');
  errEl.style.display = 'none';
  var btn = document.getElementById('instaGoogleBtn');
  btn.disabled = true; btn.textContent = '로그인 중...';
  try {
    var configRes = await fetch('/api/auth/config');
    var config = await configRes.json();
    if (!firebase.apps.length) firebase.initializeApp(config);
    var auth = firebase.auth();
    var provider = new firebase.auth.GoogleAuthProvider();
    var result = await auth.signInWithPopup(provider);
    var idToken = await result.user.getIdToken();

    var res = await fetch('/api/auth/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({idToken:idToken}) });
    var data = await res.json();

    if (!res.ok || !data.user) {
      document.getElementById('instaLoginOverlay').style.display = 'none';
      document.getElementById('instaDeniedEmail').textContent = data.email || result.user.email || '';
      document.getElementById('instaDeniedOverlay').style.display = 'flex';
      btn.disabled = false; btn.textContent = 'Google로 로그인';
      return;
    }

    localStorage.setItem('bsn_user_name', data.user.name || result.user.displayName || '');
    localStorage.setItem('bsn_user_id', data.user.uid);
    localStorage.setItem('bsn_user_role', data.user.role);
    localStorage.setItem('bsn_user_email', data.user.email);
    localStorage.setItem('bsn_user_picture', data.user.picture || '');
    localStorage.setItem('bsn_firebase_token', idToken);
    localStorage.setItem('bsn_session_id', data.user.sessionId || '');
    sessionStorage.setItem('bsn_session_active', 'true');

    document.getElementById('instaLoginOverlay').style.display = 'none';
    initCardNav();
    renderHistoryList();
    updateStudyBadge();
    loadRecommendNews(false);
    selectTemplate('A');
    if (window.location.hash === '#content') showContentView(); else showTransactionView();
  } catch(e) {
    errEl.textContent = '로그인 중 오류가 발생했습니다';
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Google로 로그인';
  }
}

// ─── 랭킹 시스템 ───
var txRankingData = null;
var txRankingLoaded = false;
var txRankSortBy = 'totalCount';
var txRankChecked = [];
var txRankOpenId = null;
var txDetailShowAll = false;
var txReportCache = {};
var txInsightCache = {};

function txInitRankSelectors() {
  if (!txRegionData) return;
  var sidoSel = document.getElementById('txRankSido');
  sidoSel.innerHTML = '<option value="전국">전국</option>';
  Object.keys(txRegionData).forEach(function(sido) {
    sidoSel.innerHTML += '<option value="' + sido + '"' + (sido === '서울특별시' ? ' selected' : '') + '>' + sido + '</option>';
  });
  txOnRankSidoChange();
}

function txOnRankSidoChange() {
  var sido = document.getElementById('txRankSido').value;
  var sggSel = document.getElementById('txRankSgg');
  if (sido === '전국' || !txRegionData || !txRegionData[sido]) {
    sggSel.style.display = 'none';
  } else {
    sggSel.style.display = '';
    sggSel.innerHTML = '<option value="">전체</option>';
    Object.keys(txRegionData[sido]).forEach(function(sgg) {
      sggSel.innerHTML += '<option value="' + sgg + '">' + sgg + '</option>';
    });
  }
  txLoadRanking();
}

function txOnRankSggChange() {
  txLoadRanking();
}

function txPickStat(el) {
  document.querySelectorAll('.tx-stat-pill').forEach(function(p) { p.classList.remove('on'); });
  el.classList.add('on');
  txRankSortBy = el.dataset.sort;
  txLoadRanking();
}

var txRankStartYear = 0, txRankStartMon = 0, txRankEndYear = 0, txRankEndMon = 0;
var txRankCustomMode = false;

function txOnRankPeriodChange() {
  var val = document.getElementById('txRankPeriod').value;
  var customEl = document.getElementById('txRankCustomRange');
  var customBtn = document.getElementById('txRankCustomBtn');
  if (val === 'custom') {
    txRankCustomMode = true;
    customEl.style.display = 'flex';
    customBtn.style.display = '';
    if (!txRankStartYear) txRankInitCustom();
    txRankRenderPicker('start');
    txRankRenderPicker('end');
  } else {
    txRankCustomMode = false;
    customEl.style.display = 'none';
    customBtn.style.display = 'none';
    txLoadRanking();
  }
}

function txRankInitCustom() {
  var now = new Date();
  txRankEndYear = now.getFullYear();
  txRankEndMon = now.getMonth() + 1;
  txRankStartYear = txRankEndYear;
  txRankStartMon = txRankEndMon - 5;
  if (txRankStartMon <= 0) { txRankStartYear--; txRankStartMon += 12; }
}

function txRankRenderPicker(type) {
  var year = type === 'start' ? txRankStartYear : txRankEndYear;
  var mon = type === 'start' ? txRankStartMon : txRankEndMon;
  var now = new Date();
  var curY = now.getFullYear();
  var curM = now.getMonth() + 1;
  document.getElementById(type === 'start' ? 'txRankStartYearLabel' : 'txRankEndYearLabel').textContent = year + '년';
  var grid = document.getElementById(type === 'start' ? 'txRankStartGrid' : 'txRankEndGrid');
  var html = '';
  for (var m = 1; m <= 12; m++) {
    var isFuture = (year > curY) || (year === curY && m > curM);
    var isSelected = (m === mon);
    var cls = 'tx-ym-btn';
    if (isSelected) cls += ' selected';
    if (isFuture) cls += ' disabled';
    html += '<button class="' + cls + '"' + (isFuture ? '' : ' onclick="txRankYmSelect(\\'' + type + '\\',' + m + ')"') + '>' + m + '월</button>';
  }
  grid.innerHTML = html;
}

function txRankYmNav(type, dir) {
  var maxY = new Date().getFullYear();
  if (type === 'start') {
    txRankStartYear += dir;
    if (txRankStartYear < 2020) txRankStartYear = 2020;
    if (txRankStartYear > maxY) txRankStartYear = maxY;
  } else {
    txRankEndYear += dir;
    if (txRankEndYear < 2020) txRankEndYear = 2020;
    if (txRankEndYear > maxY) txRankEndYear = maxY;
  }
  txRankRenderPicker(type);
}

function txRankYmSelect(type, m) {
  if (type === 'start') txRankStartMon = m;
  else txRankEndMon = m;
  txRankRenderPicker(type);
}

async function txLoadRanking() {
  var sido = document.getElementById('txRankSido').value;
  var sgg = document.getElementById('txRankSgg').value;
  var months = document.getElementById('txRankPeriod').value;
  var loading = document.getElementById('txRankLoading');
  var grid = document.getElementById('txRankGrid');

  txRankChecked = [];
  txRankOpenId = null;
  txUpdateCompareFloat();

  // sessionStorage 캐시 확인
  var cacheKey = 'txRank_' + sido + '_' + (sgg || 'all') + '_' + months + '_' + txRankSortBy;
  try {
    var cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed && parsed._ts && (Date.now() - parsed._ts) < 3600000) {
        txRankingData = parsed;
        txRankingLoaded = true;
        loading.style.display = 'none';
        var pl = parsed.period || {};
        var pvl = parsed.prevPeriod || {};
        // 항상 빠른 날짜 → 늦은 날짜 순서로 표시
        var periodLabel = '';
        var prevLabel = '';
        if (pl.start) {
          var ps = pl.start, pe = pl.end;
          if (parseInt(ps) > parseInt(pe)) { var t = ps; ps = pe; pe = t; }
          periodLabel = ps.substring(0,4) + '.' + ps.substring(4) + ' ~ ' + pe.substring(0,4) + '.' + pe.substring(4);
        }
        if (pvl.start) {
          var pps = pvl.start, ppe = pvl.end;
          if (parseInt(pps) > parseInt(ppe)) { var tt = pps; pps = ppe; ppe = tt; }
          prevLabel = pps.substring(0,4) + '.' + pps.substring(4) + ' ~ ' + ppe.substring(0,4) + '.' + ppe.substring(4);
        }
        document.getElementById('txRankPeriodInfo').textContent = periodLabel + ' 기준 / 전년 동기(' + prevLabel + ') 대비 / 상업업무용 부동산';
        try {
          txRenderRankingGrid();
          console.log('[랭킹] sessionStorage 캐시 사용:', cacheKey);
        } catch(cacheErr) {
          console.error('[랭킹] 캐시 렌더링 에러:', cacheErr.message, cacheErr.stack);
          sessionStorage.removeItem(cacheKey);
        }
        return;
      }
    }
  } catch(e) {}

  // 스켈레톤 UI 표시
  loading.style.display = 'none';
  var skHtml = '';
  for (var si = 0; si < 10; si++) {
    skHtml += '<div class="tx-skeleton-card"><div class="tx-skeleton-line" style="width:30%;height:14px;margin-bottom:10px;"></div><div class="tx-skeleton-line" style="width:60%;height:20px;margin-bottom:8px;"></div><div class="tx-skeleton-line" style="width:45%;height:12px;"></div></div>';
  }
  grid.innerHTML = skHtml;

  try {
    var url = '/api/transaction/ranking?sido=' + encodeURIComponent(sido) + '&sortBy=' + txRankSortBy;
    if (txRankCustomMode) {
      url += '&startMonth=' + txRankStartYear + String(txRankStartMon).padStart(2,'0');
      url += '&endMonth=' + txRankEndYear + String(txRankEndMon).padStart(2,'0');
    } else if (months === 'ytd') {
      var nowY = new Date();
      url += '&startMonth=' + nowY.getFullYear() + '01';
      url += '&endMonth=' + nowY.getFullYear() + String(nowY.getMonth() + 1).padStart(2,'0');
    } else {
      url += '&months=' + months;
    }
    if (sgg) url += '&sgg=' + encodeURIComponent(sgg);
    var resp = await fetch(url);
    console.log('[랭킹] fetch status:', resp.status);
    var data = await resp.json();
    console.log('[랭킹] 데이터:', data.type, data.ranking ? data.ranking.length + '건' : 'ranking 없음');
    txRankingData = data;
    txRankingLoaded = true;

    // sessionStorage 캐시 저장
    try { data._ts = Date.now(); sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch(e) {}

    var pl = data.period || {};
    var pvl = data.prevPeriod || {};
    // 항상 빠른 날짜 → 늦은 날짜 순서로 표시
    var periodLabel = '';
    var prevLabel = '';
    if (pl.start) {
      var ps = pl.start, pe = pl.end;
      if (parseInt(ps) > parseInt(pe)) { var t = ps; ps = pe; pe = t; }
      periodLabel = ps.substring(0,4) + '.' + ps.substring(4) + ' ~ ' + pe.substring(0,4) + '.' + pe.substring(4);
    }
    if (pvl.start) {
      var pps = pvl.start, ppe = pvl.end;
      if (parseInt(pps) > parseInt(ppe)) { var tt = pps; pps = ppe; ppe = tt; }
      prevLabel = pps.substring(0,4) + '.' + pps.substring(4) + ' ~ ' + ppe.substring(0,4) + '.' + ppe.substring(4);
    }
    document.getElementById('txRankPeriodInfo').textContent = periodLabel + ' 기준 / 전년 동기(' + prevLabel + ') 대비 / 상업업무용 부동산';

    console.log('[랭킹] 렌더링 시작, ranking 수:', txRankingData.ranking ? txRankingData.ranking.length : 'null');
    try {
      txRenderRankingGrid();
      console.log('[랭킹] 렌더링 완료');
      console.log('[랭킹] grid innerHTML 길이:', grid.innerHTML.length);
      console.log('[랭킹] grid 첫 200자:', grid.innerHTML.substring(0, 200));
      console.log('[랭킹] transactionView display:', document.getElementById('transactionView').style.display);
      console.log('[랭킹] transactionView computed:', window.getComputedStyle(document.getElementById('transactionView')).display);
    } catch(renderErr) {
      console.error('[랭킹] 렌더링 에러:', renderErr.message, renderErr.stack);
      grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);">렌더링 오류: ' + renderErr.message + '</div>';
    }
  } catch(e) {
    console.error('[랭킹] fetch 에러:', e.message);
    grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted);">랭킹 데이터를 불러오지 못했습니다.</div>';
  }
}

function txGetRankMainValue(stats) {
  if (txRankSortBy === 'avgPrice') return txFormatPrice(stats.avgPrice);
  if (txRankSortBy === 'avgPricePerPyeong') return txFormatPP(stats.avgPricePerPyeong) + '/평';
  if (txRankSortBy === 'avgPricePerArea') return txFormatPP(stats.avgPricePerArea) + '/평';
  return stats.totalCount + '건';
}

function txGetRankSubValue(stats) {
  if (txRankSortBy === 'totalCount') return '평당 ' + txFormatPP(stats.avgPricePerPyeong);
  if (txRankSortBy === 'avgPrice') return stats.totalCount + '건 거래';
  if (txRankSortBy === 'avgPricePerPyeong') return stats.totalCount + '건 거래';
  return stats.totalCount + '건 거래';
}

function txGetRankChange(stats) {
  if (!stats.prevPeriodChange.hasPrev) return { text: '전년 데이터 없음', cls: '' };
  var ch;
  if (txRankSortBy === 'avgPrice') ch = stats.prevPeriodChange.avgPrice;
  else if (txRankSortBy === 'avgPricePerPyeong') ch = stats.prevPeriodChange.price;
  else if (txRankSortBy === 'avgPricePerArea') ch = stats.prevPeriodChange.area;
  else ch = stats.prevPeriodChange.volume;
  if (ch === undefined) return { text: '전년대비 -', cls: '' };
  if (ch === 0) return { text: '전년대비 0%', cls: '' };
  return { text: '전년대비 ' + (ch > 0 ? '+' : '') + ch + '%', cls: ch > 0 ? 'up' : 'dn' };
}

function txRenderRankingGrid() {
  if (!txRankingData || !txRankingData.ranking) return;
  var grid = document.getElementById('txRankGrid');
  var ranking = txRankingData.ranking;

  // 현재 열 수 계산 (CSS 미디어 쿼리와 동일한 기준)
  var cols = 5;
  var vw = window.innerWidth;
  if (vw <= 480) cols = 2;
  else if (vw <= 700) cols = 3;

  // 열린 카드가 속한 행 계산
  var openRow = txRankOpenId !== null ? Math.floor(txRankOpenId / cols) : -1;

  var html = '';
  ranking.forEach(function(item, idx) {
    var rankNum = idx + 1;
    var rankCls = rankNum === 1 ? 'r1' : rankNum === 2 ? 'r2' : rankNum === 3 ? 'r3' : '';
    var mainVal = txGetRankMainValue(item.stats);
    var subVal = txGetRankSubValue(item.stats);
    var change = txGetRankChange(item.stats);
    var isChecked = txRankChecked.indexOf(idx) >= 0;
    var isOpen = txRankOpenId === idx;

    html += '<div class="tx-rank-card' + (isOpen ? ' open' : '') + '" data-idx="' + idx + '" onclick="txOnRankCardClick(' + idx + ')">';
    html += '<div class="tx-rank-check' + (isChecked ? ' on' : '') + '" onclick="txOnRankCheck(event,' + idx + ');">' + (isChecked ? '&#10003;' : '') + '</div>';
    html += '<div class="tx-rank-num ' + rankCls + '">' + rankNum + '위</div>';
    html += '<div class="tx-rank-name">' + escHtml(item.name) + '</div>';
    html += '<div class="tx-rank-val">' + mainVal + '</div>';
    html += '<div class="tx-rank-sub">' + subVal + '</div>';
    html += '<div class="tx-rank-change ' + change.cls + '">' + change.text + '</div>';
    html += '</div>';

    // 행의 마지막 카드이거나 전체 마지막 카드일 때 상세 패널 삽입
    var currentRow = Math.floor(idx / cols);
    var isRowEnd = (idx + 1) % cols === 0 || idx === ranking.length - 1;
    if (isRowEnd && currentRow === openRow) {
      html += '<div class="tx-rank-detail open" id="txRankDetail_' + txRankOpenId + '">';
      html += '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;">상세 분석 로딩 중...</div>';
      html += '</div>';
    }
  });

  grid.innerHTML = html;

  if (txRankOpenId !== null) {
    txRenderDetailPanel(txRankOpenId);
  }
}

function txOnRankCardClick(idx) {
  if (txRankOpenId === idx) {
    txRankOpenId = null;
  } else {
    txRankOpenId = idx;
    txDetailShowAll = false;
  }
  txRenderRankingGrid();
}

function txOnRankCheck(e, idx) {
  e.stopPropagation();
  var pos = txRankChecked.indexOf(idx);
  if (pos >= 0) {
    txRankChecked.splice(pos, 1);
  } else {
    if (txRankChecked.length >= 5) { alert('최대 5개까지 비교할 수 있습니다'); return; }
    txRankChecked.push(idx);
  }
  txRenderRankingGrid();
  txUpdateCompareFloat();
}

function txUpdateCompareFloat() {
  var el = document.getElementById('txCompareFloat');
  if (txRankChecked.length >= 2) {
    el.classList.add('show');
    document.querySelector('.tx-compare-btn').textContent = txRankChecked.length + '개 지역 비교 분석';
  } else {
    el.classList.remove('show');
  }
}

function txRenderDetailPanel(idx) {
  var panel = document.getElementById('txRankDetail_' + idx);
  if (!panel || !txRankingData) return;
  var item = txRankingData.ranking[idx];
  if (!item || !item.stats) { panel.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);">데이터 없음</div>'; return; }
  var s = item.stats;
  var html = '';

  // 헤더
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">';
  html += '<div style="font-size:15px;font-weight:600;color:var(--text);">' + escHtml(item.name) + ' 상세 분석</div>';
  html += '<button onclick="event.stopPropagation();txRankOpenId=null;txRenderRankingGrid();" style="border:none;background:none;cursor:pointer;font-size:16px;color:var(--sub);padding:4px 8px;border-radius:6px;" onmouseover="this.style.background=\\'rgba(0,0,0,.05)\\'" onmouseout="this.style.background=\\'none\\'">&#10005;</button>';
  html += '</div>';

  // 핵심 통계 4개
  var chVol = s.prevPeriodChange.volume || 0;
  var chAvg = s.prevPeriodChange.avgPrice || 0;
  var chPP = s.prevPeriodChange.price || 0;
  var chArea = s.prevPeriodChange.area || 0;
  html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px;">';
  var hasPrev = s.prevPeriodChange.hasPrev;
  html += txDetailStatBox('거래량', s.totalCount + '건', chVol, hasPrev);
  html += txDetailStatBox('평균 매매가', txFormatPrice(s.avgPrice), chAvg, hasPrev);
  html += txDetailStatBox('평당 매매가(토지)', txFormatPP(s.avgPricePerPyeong), chPP, hasPrev);
  html += txDetailStatBox('평당 매매가(연면적)', txFormatPP(s.avgPricePerArea), chArea, hasPrev);
  html += '</div>';

  // ─── ROW 1: 매수/매도 비율 | 건물용도별 + 용도지역별 ───
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">';

  // 좌: 매수/매도
  html += '<div style="background:var(--surface);border-radius:8px;padding:12px 14px;">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px;">매수/매도 비율</div>';
  var buyTotal = s.buyer.corp.count + s.buyer.personal.count;
  var selTotal = s.seller.corp.count + s.seller.personal.count;
  if (buyTotal > 0) {
    var bcp = Math.round(s.buyer.corp.count/buyTotal*100); var bpp = 100-bcp;
    var bC0 = txShade(0,2); var bC1 = txShade(1,2);
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="width:28px;text-align:right;font-size:12px;font-weight:500;color:var(--text);">매수</span>';
    html += '<div style="flex:1;height:24px;border-radius:4px;display:flex;overflow:hidden;">';
    html += '<div style="width:'+bcp+'%;background:'+bC0+';position:relative;"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:500;color:#fff;">'+bcp+'%</span></div>';
    html += '<div style="width:'+bpp+'%;background:'+bC1+';position:relative;"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:500;color:#fff;">'+bpp+'%</span></div>';
    html += '</div></div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-bottom:10px;"><span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:var(--text);"><span style="width:8px;height:8px;border-radius:2px;background:'+bC0+';"></span>법인 '+bcp+'% <span style="color:var(--sub);font-size:11px;">('+s.buyer.corp.count+'건)</span></span>';
    html += '<span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:var(--text);"><span style="width:8px;height:8px;border-radius:2px;background:'+bC1+';"></span>개인 '+bpp+'% <span style="color:var(--sub);font-size:11px;">('+s.buyer.personal.count+'건)</span></span></div>';
  }
  if (selTotal > 0) {
    var scp = Math.round(s.seller.corp.count/selTotal*100); var spp2 = 100-scp;
    var sC0 = txShade(0,2); var sC1 = txShade(1,2);
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;"><span style="width:28px;text-align:right;font-size:12px;font-weight:500;color:var(--text);">매도</span>';
    html += '<div style="flex:1;height:24px;border-radius:4px;display:flex;overflow:hidden;">';
    html += '<div style="width:'+scp+'%;background:'+sC0+';position:relative;"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:500;color:#fff;">'+scp+'%</span></div>';
    html += '<div style="width:'+spp2+'%;background:'+sC1+';position:relative;"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:500;color:#fff;">'+spp2+'%</span></div>';
    html += '</div></div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:4px 12px;"><span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:var(--text);"><span style="width:8px;height:8px;border-radius:2px;background:'+sC0+';"></span>법인 '+scp+'% <span style="color:var(--sub);font-size:11px;">('+s.seller.corp.count+'건)</span></span>';
    html += '<span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:var(--text);"><span style="width:8px;height:8px;border-radius:2px;background:'+sC1+';"></span>개인 '+spp2+'% <span style="color:var(--sub);font-size:11px;">('+s.seller.personal.count+'건)</span></span></div>';
  }
  html += '</div>';

  // 우: 건물용도별 + 용도지역별
  html += '<div style="background:var(--surface);border-radius:8px;padding:12px 14px;">';
  var TX_USE_SHOW = ['제1종근린생활','제2종근린생활','업무','숙박','교육연구','의료'];
  var useAll = Object.entries(s.byUse).sort(function(a,b){return b[1]-a[1];});
  var useShown = []; var useOtherSum = 0;
  for (var _u=0;_u<useAll.length;_u++) { if (TX_USE_SHOW.indexOf(useAll[_u][0])>=0) useShown.push([useAll[_u][0],useAll[_u][1]]); else useOtherSum+=useAll[_u][1]; }
  if (useOtherSum>0) useShown.push(['기타',useOtherSum]);
  useShown.sort(function(a,b){return b[1]-a[1];});
  if (useShown.length && s.totalCount>0) {
    html += '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:6px;">건물용도별</div>';
    html += '<div style="height:24px;border-radius:4px;display:flex;overflow:hidden;margin-bottom:6px;">';
    for (var ui=0;ui<useShown.length;ui++) { var upct=useShown[ui][1]/s.totalCount*100; html+='<div style="width:'+upct+'%;background:'+txShade(ui,useShown.length)+';position:relative;">'; if(upct>=8) html+='<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:500;color:#fff;">'+Math.round(upct)+'%</span>'; html+='</div>'; }
    html += '</div><div style="display:flex;flex-wrap:wrap;gap:4px 12px;margin-bottom:12px;">';
    for (var ul=0;ul<useShown.length;ul++) { html+='<span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:var(--text);"><span style="width:8px;height:8px;border-radius:2px;background:'+txShade(ul,useShown.length)+';"></span>'+useShown[ul][0]+' '+Math.round(useShown[ul][1]/s.totalCount*100)+'%</span>'; }
    html += '</div>';
  }
  var TX_LAND_SHOW = ['제1종전용주거','제1종일반주거','제2종일반주거','제3종일반주거','준주거','중심상업','일반상업','준공업'];
  var landAll = Object.entries(s.byLandUse).sort(function(a,b){return b[1]-a[1];});
  var landShown = []; var landOtherSum = 0;
  for (var _l=0;_l<landAll.length;_l++) { if (TX_LAND_SHOW.indexOf(landAll[_l][0])>=0) landShown.push([landAll[_l][0],landAll[_l][1]]); else landOtherSum+=landAll[_l][1]; }
  if (landOtherSum>0) landShown.push(['기타',landOtherSum]);
  landShown.sort(function(a,b){return b[1]-a[1];});
  if (landShown.length && s.totalCount>0) {
    html += '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:6px;">용도지역별</div>';
    html += '<div style="height:24px;border-radius:4px;display:flex;overflow:hidden;margin-bottom:6px;">';
    for (var li=0;li<landShown.length;li++) { var lpct=landShown[li][1]/s.totalCount*100; html+='<div style="width:'+lpct+'%;background:'+txShade(li,landShown.length)+';position:relative;">'; if(lpct>=8) html+='<span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:11px;font-weight:500;color:#fff;">'+Math.round(lpct)+'%</span>'; html+='</div>'; }
    html += '</div><div style="display:flex;flex-wrap:wrap;gap:4px 12px;">';
    for (var ll=0;ll<landShown.length;ll++) { html+='<span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:var(--text);"><span style="width:8px;height:8px;border-radius:2px;background:'+txShade(ll,landShown.length)+';"></span>'+landShown[ll][0]+' '+Math.round(landShown[ll][1]/s.totalCount*100)+'%</span>'; }
    html += '</div>';
  }
  html += '</div>';
  html += '</div>';

  // ─── ROW 2: 동별 거래량 | 동별 평당가 ───
  var dongEntries = Object.entries(s.byDong).sort(function(a,b){return b[1].count-a[1].count;});
  var dongPriceEntries = Object.entries(s.byDong).filter(function(e){return e[1].ppCount>0;}).map(function(e){return [e[0],Math.round(e[1].totalPP/e[1].ppCount)];}).sort(function(a,b){return b[1]-a[1];});
  if (dongEntries.length || dongPriceEntries.length) {
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">';
    if (dongEntries.length) {
      var dongMax = dongEntries[0][1].count;
      html += '<div style="background:var(--surface);border-radius:8px;padding:12px 14px;">';
      html += '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px;">동별 거래량 <span style="font-weight:400;font-size:11px;color:var(--sub);">'+dongEntries.length+'개 동</span></div>';
      dongEntries.forEach(function(e,i) {
        var pct = s.totalCount>0 ? Math.round(e[1].count/s.totalCount*100) : 0;
        var barW = dongMax>0 ? Math.round(e[1].count/dongMax*100) : 0;
        html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
        html += '<span style="width:48px;text-align:right;font-size:12px;font-weight:500;color:var(--text);flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+e[0]+'</span>';
        html += '<div style="flex:1;height:18px;background:rgba(30,58,95,0.06);border-radius:4px;overflow:hidden;"><div style="height:100%;width:'+barW+'%;background:'+txShade(i,dongEntries.length)+';border-radius:4px;min-width:2px;"></div></div>';
        html += '<span style="font-size:12px;font-weight:500;color:var(--text);flex-shrink:0;min-width:60px;">'+pct+'% ('+e[1].count+'건)</span>';
        html += '</div>';
      });
      html += '</div>';
    }
    if (dongPriceEntries.length) {
      var dongPMax = dongPriceEntries[0][1];
      html += '<div style="background:var(--surface);border-radius:8px;padding:12px 14px;">';
      html += '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px;">동별 평균 평당가 <span style="font-weight:400;font-size:11px;color:var(--sub);">'+dongPriceEntries.length+'개 동</span></div>';
      dongPriceEntries.forEach(function(e,i) {
        var barW = dongPMax>0 ? Math.round(e[1]/dongPMax*100) : 0;
        html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
        html += '<span style="width:48px;text-align:right;font-size:12px;font-weight:500;color:var(--text);flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+e[0]+'</span>';
        html += '<div style="flex:1;height:18px;background:rgba(30,58,95,0.06);border-radius:4px;overflow:hidden;"><div style="height:100%;width:'+barW+'%;background:'+txShade(i,dongPriceEntries.length)+';border-radius:4px;min-width:2px;"></div></div>';
        html += '<span style="font-size:12px;font-weight:500;color:var(--text);flex-shrink:0;min-width:60px;">'+txFormatPP(e[1])+'/평</span>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
  }

  // ─── ROW 3: 건축연도별 | 최고/최저 평당가 ───
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">';
  var yearEntries = Object.entries(s.byBuildYear).filter(function(e){return e[1]>0;}).sort(function(a,b){return b[1]-a[1];});
  html += '<div style="background:var(--surface);border-radius:8px;padding:12px 14px;">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px;">건축연도별</div>';
  if (yearEntries.length) {
    var yearMax = yearEntries[0][1];
    yearEntries.forEach(function(e,i) {
      var pct = s.totalCount>0 ? Math.round(e[1]/s.totalCount*100) : 0;
      var barW = yearMax>0 ? Math.max(Math.round(e[1]/yearMax*100), 25) : 25;
      html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
      html += '<div style="flex:1;height:22px;background:rgba(30,58,95,0.06);border-radius:4px;overflow:hidden;position:relative;"><div style="height:100%;width:'+barW+'%;background:'+txShade(i,yearEntries.length)+';border-radius:4px;min-width:2px;display:flex;align-items:center;padding-left:8px;"><span style="font-size:11px;font-weight:500;color:#fff;white-space:nowrap;">'+e[0]+'</span></div></div>';
      html += '<span style="font-size:12px;font-weight:500;color:var(--text);flex-shrink:0;min-width:60px;">'+pct+'% ('+e[1]+'건)</span>';
      html += '</div>';
    });
  } else { html += '<div style="font-size:12px;color:var(--sub);">데이터 없음</div>'; }
  html += '</div>';

  html += '<div style="background:var(--surface);border-radius:8px;padding:12px 14px;">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px;">평당가 최고/최저</div>';
  if (s.highest) {
    html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:0.5px solid var(--border);">';
    html += '<span style="font-size:11px;font-weight:500;padding:2px 6px;border-radius:4px;background:rgba(30,58,95,0.08);color:#1E3A5F;flex-shrink:0;">최고</span>';
    html += '<div style="flex:1;line-height:1.5;"><div style="font-size:12px;font-weight:500;color:var(--text);">'+txFormatPP(s.highest.pricePerPyeong)+'/평 <span style="font-weight:400;color:var(--sub);">'+txFormatPrice(s.highest.deal_amount)+'</span></div>';
    html += '<div style="font-size:11px;color:var(--sub);">'+escHtml((s.highest.umd_nm||'')+' '+(s.highest.jibun||''))+' · '+escHtml(s.highest.land_use||'')+'</div>';
    html += '<div style="font-size:11px;color:var(--sub);">대지 '+(s.highest.plottage_ar||0)+'\u33A1'+toP(s.highest.plottage_ar)+'</div><div style="font-size:11px;color:var(--sub);">연면적 '+(s.highest.building_ar||0)+'\u33A1'+toP(s.highest.building_ar)+' · '+(s.highest.build_year||'')+'년</div></div></div>';
  }
  if (s.lowest) {
    html += '<div style="display:flex;align-items:flex-start;gap:8px;padding:6px 0;">';
    html += '<span style="font-size:11px;font-weight:500;padding:2px 6px;border-radius:4px;background:rgba(226,75,74,0.08);color:#C02020;flex-shrink:0;">최저</span>';
    html += '<div style="flex:1;line-height:1.5;"><div style="font-size:12px;font-weight:500;color:var(--text);">'+txFormatPP(s.lowest.pricePerPyeong)+'/평 <span style="font-weight:400;color:var(--sub);">'+txFormatPrice(s.lowest.deal_amount)+'</span></div>';
    html += '<div style="font-size:11px;color:var(--sub);">'+escHtml((s.lowest.umd_nm||'')+' '+(s.lowest.jibun||''))+' · '+escHtml(s.lowest.land_use||'')+'</div>';
    html += '<div style="font-size:11px;color:var(--sub);">대지 '+(s.lowest.plottage_ar||0)+'\u33A1'+toP(s.lowest.plottage_ar)+'</div><div style="font-size:11px;color:var(--sub);">연면적 '+(s.lowest.building_ar||0)+'\u33A1'+toP(s.lowest.building_ar)+' · '+(s.lowest.build_year||'')+'년</div></div></div>';
  }
  if (!s.highest && !s.lowest) html += '<div style="font-size:12px;color:var(--sub);">데이터 없음</div>';
  html += '</div>';
  html += '</div>';

  // ─── 거래 리스트 ───
  if (item.transactions && item.transactions.length > 0) {
    var txs = item.transactions.slice().sort(function(a,b){
      var da=(a.deal_year||'')+String(a.deal_month||'').padStart(2,'0')+String(a.deal_day||'').padStart(2,'0');
      var db=(b.deal_year||'')+String(b.deal_month||'').padStart(2,'0')+String(b.deal_day||'').padStart(2,'0');
      return db.localeCompare(da);
    });
    var validTxs = txs.filter(function(t){return !t.cdeal_day||t.cdeal_day.trim()==='';});
    var showTxs = validTxs.slice(0, txDetailShowAll ? validTxs.length : 10);
    html += '<div style="background:var(--surface);border-radius:8px;padding:12px 14px;margin-bottom:12px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px;">거래 내역 <span style="font-weight:400;font-size:11px;color:var(--sub);">'+validTxs.length+'건</span></div>';
    html += '<div class="tx-table-wrap"><table class="tx-table"><thead><tr><th>거래일</th><th>위치·용도·면적</th><th>매매가</th><th>평당가</th></tr></thead><tbody>';
    showTxs.forEach(function(t) {
      var pp = t.plottage_ar>0 ? Math.round(t.deal_amount/t.plottage_ar*3.3058) : 0;
      html += '<tr><td class="tx-date-col">'+String(t.deal_month||'').padStart(2,'0')+'.'+String(t.deal_day||'').padStart(2,'0')+'</td>';
      html += '<td><div class="tx-loc-main">'+escHtml((t.umd_nm||'')+(t.jibun?' '+t.jibun:''))+'</div>';
      html += '<div class="tx-loc-sub">'+escHtml(t.building_use||'')+' · 대지 '+(t.plottage_ar||0)+'\u33A1'+toP(t.plottage_ar)+' · '+(t.building_ar||0)+'\u33A1'+toP(t.building_ar)+' · '+(t.build_year||'')+'년</div></td>';
      html += '<td>'+txFormatPrice(t.deal_amount)+'</td>';
      html += '<td>'+(pp>0?txFormatPP(pp):'-')+'</td></tr>';
    });
    html += '</tbody></table></div>';
    if (validTxs.length>10 && !txDetailShowAll) {
      html += '<button onclick="event.stopPropagation();txDetailShowAll=true;txRenderDetailPanel('+idx+');" style="display:block;width:100%;padding:8px;margin-top:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:12px;font-weight:500;color:var(--text);cursor:pointer;font-family:inherit;">거래 내역 더보기 ('+( validTxs.length-10)+'건 더)</button>';
    }
    html += '</div>';
  }

  // 하단 버튼
  html += '<div style="display:flex;gap:8px;margin-top:4px;">';
  html += '<button onclick="event.stopPropagation();txDetailContent('+idx+');" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:12px;font-weight:500;color:var(--text);cursor:pointer;font-family:inherit;">콘텐츠 생성</button>';
  if (txDetailReportCache[idx]) {
    html += '<button onclick="event.stopPropagation();txDetailReportShow('+idx+');" style="flex:1;padding:10px;border:1px solid #1E3A5F;border-radius:8px;background:#fff;color:#1E3A5F;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">리포트 보기</button>';
    html += '<button onclick="event.stopPropagation();txDetailReport('+idx+', true);" style="padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:11px;color:var(--sub);cursor:pointer;font-family:inherit;white-space:nowrap;">다시 생성</button>';
  } else {
    html += '<button onclick="event.stopPropagation();txDetailReport('+idx+');" style="flex:1;padding:10px;border:none;border-radius:8px;background:#1E3A5F;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">리포트 생성</button>';
  }
  html += '</div>';

  panel.innerHTML = html;
}

function txDetailStatBox(label, value, change, hasPrev) {
  var chText = !hasPrev ? '전년 데이터 없음' : change === 0 ? '전년대비 0%' : '전년대비 ' + (change > 0 ? '+' : '') + change + '%';
  var chCls = !hasPrev ? 'color:var(--sub)' : change > 0 ? 'color:#0F6E56' : change < 0 ? 'color:#E24B4A' : 'color:var(--sub)';
  return '<div style="background:var(--surface);border-radius:8px;padding:10px 12px;border:1px solid rgba(44,74,124,0.06);">' +
    '<div style="font-size:11px;color:var(--text);font-weight:500;margin-bottom:2px;">' + label + '</div>' +
    '<div style="font-size:15px;font-weight:600;color:var(--text);">' + value + '</div>' +
    '<div style="font-size:11px;margin-top:1px;font-weight:500;' + chCls + ';">' + chText + '</div>' +
    '</div>';
}

async function txDetailReport(idx, forceRegen) {
  var item = txRankingData.ranking[idx];
  if (!item) return;
  if (!forceRegen && txDetailReportCache[idx]) {
    txReportCache = txDetailReportCache[idx];
    txShowReport(txDetailReportCache[idx]);
    return;
  }
  var btn = event.target;
  var origText = btn.textContent;
  btn.disabled = true; btn.textContent = '생성 중...';
  try {
    var resp = await fetch('/api/transaction/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regions: [{ sggNm: item.name, stats: item.stats }],
        period: txRankingData.period,
        prevPeriod: txRankingData.prevPeriod
      })
    });
    var data = await resp.json();
    if (data.report) {
      txDetailReportCache[idx] = data.report;
      txReportCache = data.report;
      txShowReport(data.report);
      if (typeof txRenderRankingGrid === 'function') txRenderRankingGrid();
    }
  } catch(e) {
    alert('리포트 생성 중 오류가 발생했습니다');
  }
  btn.disabled = false; btn.textContent = origText;
}

function txDetailReportShow(idx) {
  if (!txDetailReportCache[idx]) return;
  txReportCache = txDetailReportCache[idx];
  txShowReport(txDetailReportCache[idx]);
}

function txDetailContent(idx) {
  var item = txRankingData.ranking[idx];
  if (!item) return;
  var s = item.stats;
  var text = item.name + ' 상업업무용 부동산 실거래 분석\\n';
  text += '거래 ' + s.totalCount + '건, 평균 매매가 ' + txFormatPrice(s.avgPrice) + ', 평당(토지) ' + txFormatPP(s.avgPricePerPyeong) + '\\n';
  text += '전년대비 거래량 ' + (s.prevPeriodChange.volume > 0 ? '+' : '') + s.prevPeriodChange.volume + '%, 가격 ' + (s.prevPeriodChange.price > 0 ? '+' : '') + s.prevPeriodChange.price + '%\\n';
  text += '법인 매수 ' + s.buyer.corp.ratio + '%, 법인 매도 ' + s.seller.corp.ratio + '%\\n';
  if (s.highest) text += '최고 평당가: ' + txFormatPP(s.highest.pricePerPyeong) + '/평 (' + (s.highest.umd_nm||'') + ')\\n';
  if (s.lowest) text += '최저 평당가: ' + txFormatPP(s.lowest.pricePerPyeong) + '/평 (' + (s.lowest.umd_nm||'') + ')\\n';
  text += '이 데이터를 바탕으로 빌딩 매매 시장 분석 콘텐츠를 작성해줘';

  showContentView();
  switchMode('text');
  document.getElementById('textInput').value = text;
  doGenerate();
}

function txCompareContent() {
  var items = txRankChecked.map(function(i) { return txRankingData.ranking[i]; }).filter(Boolean);
  if (!items.length) return;
  var text = items.map(function(item) { return item.name; }).join(' vs ') + ' 상업업무용 부동산 비교 분석\\n\\n';
  items.forEach(function(item) {
    var s = item.stats;
    text += '[' + item.name + '] 거래 ' + s.totalCount + '건, 평균 ' + txFormatPrice(s.avgPrice) + ', 평당(토지) ' + txFormatPP(s.avgPricePerPyeong);
    text += ', 전년대비 거래량 ' + (s.prevPeriodChange.volume > 0 ? '+' : '') + s.prevPeriodChange.volume + '%\\n';
  });
  text += '\\n이 데이터를 바탕으로 지역 비교 분석 콘텐츠를 작성해줘';

  showContentView();
  switchMode('text');
  document.getElementById('textInput').value = text;
  doGenerate();
}

function txShowCompare() {
  if (txRankChecked.length < 2 || !txRankingData) return;
  var items = txRankChecked.map(function(i) { return txRankingData.ranking[i]; }).filter(Boolean);
  if (items.length < 2) return;

  var existing = document.getElementById('txComparePanel');
  if (existing) { existing.remove(); txRenderRankingGrid(); return; }

  var html = '<div class="tx-compare-panel" id="txComparePanel">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">';
  html += '<div style="font-size:15px;font-weight:600;color:var(--text);">비교 분석</div>';
  html += '<button onclick="document.getElementById(\\'txComparePanel\\').remove();" style="border:none;background:none;cursor:pointer;font-size:16px;color:var(--muted);padding:4px 8px;border-radius:6px;">&#10005;</button>';
  html += '</div>';

  html += '<div style="overflow-x:auto;"><table class="tx-compare-table"><thead><tr><th></th>';
  items.forEach(function(item) { html += '<th>' + escHtml(item.name) + '</th>'; });
  html += '</tr></thead><tbody>';

  var rows = [
    { label: '거래건수', fn: function(s) { var v = s.prevPeriodChange.volume; var ch = v !== 0 ? '<div style="font-size:10px;margin-top:2px;' + (v > 0 ? 'color:#0F6E56' : 'color:#E24B4A') + ';">전년대비 ' + (v > 0 ? '+' : '') + v + '%</div>' : ''; return '<div style="font-weight:500;color:var(--text);">' + s.totalCount + '건</div>' + ch; }},
    { label: '평균 매매가', fn: function(s) { var v = s.prevPeriodChange.avgPrice || 0; var ch = v !== 0 ? '<div style="font-size:10px;margin-top:2px;' + (v > 0 ? 'color:#0F6E56' : 'color:#E24B4A') + ';">전년대비 ' + (v > 0 ? '+' : '') + v + '%</div>' : ''; return '<div style="font-weight:500;color:var(--text);">' + txFormatPrice(s.avgPrice) + '</div>' + ch; }},
    { label: '평당 매매가<br><span style="font-size:10px;font-weight:400;color:var(--muted);">(토지)</span>', fn: function(s) { var v = s.prevPeriodChange.price; var ch = v !== 0 ? '<div style="font-size:10px;margin-top:2px;' + (v > 0 ? 'color:#0F6E56' : 'color:#E24B4A') + ';">전년대비 ' + (v > 0 ? '+' : '') + v + '%</div>' : ''; return '<div style="font-weight:500;color:var(--text);">' + txFormatPP(s.avgPricePerPyeong) + '</div>' + ch; }},
    { label: '평당 매매가<br><span style="font-size:10px;font-weight:400;color:var(--muted);">(연면적)</span>', fn: function(s) { var v = s.prevPeriodChange.area || 0; var ch = v !== 0 ? '<div style="font-size:10px;margin-top:2px;' + (v > 0 ? 'color:#0F6E56' : 'color:#E24B4A') + ';">전년대비 ' + (v > 0 ? '+' : '') + v + '%</div>' : ''; return '<div style="font-weight:500;color:var(--text);">' + txFormatPP(s.avgPricePerArea) + '</div>' + ch; }},
    { label: '매수 명의', fn: function(s) { return '<div style="font-weight:500;color:var(--text);">법인 ' + s.buyer.corp.ratio + '% · 개인 ' + s.buyer.personal.ratio + '%</div><div style="font-size:10px;color:var(--muted);margin-top:2px;">(' + s.buyer.corp.count + '건 · ' + s.buyer.personal.count + '건)</div>'; }},
    { label: '매도 명의', fn: function(s) { return '<div style="font-weight:500;color:var(--text);">법인 ' + s.seller.corp.ratio + '% · 개인 ' + s.seller.personal.ratio + '%</div><div style="font-size:10px;color:var(--muted);margin-top:2px;">(' + s.seller.corp.count + '건 · ' + s.seller.personal.count + '건)</div>'; }}
  ];

  rows.forEach(function(row) {
    html += '<tr><td>' + row.label + '</td>';
    items.forEach(function(item) { html += '<td>' + row.fn(item.stats) + '</td>'; });
    html += '</tr>';
  });
  html += '</tbody></table></div>';

  // AI 분석 (자동 로드)
  html += '<div style="margin-top:12px;padding:12px 14px;background:var(--surface);border-radius:8px;">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:8px;">AI 분석</div>';
  html += '<div id="txRankInsightText" style="font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;">분석 중...</div>';
  html += '</div>';

  // 하단 버튼
  html += '<div style="display:flex;gap:8px;margin-top:12px;">';
  html += '<button onclick="txCompareContent();" style="flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);font-size:12px;font-weight:500;color:var(--text);cursor:pointer;font-family:inherit;">콘텐츠 생성</button>';
  html += '</div>';
  html += '</div>';

  var grid = document.getElementById('txRankGrid');
  grid.insertAdjacentHTML('afterbegin', html);

  // AI 분석 자동 실행
  txRankGetInsight();
}

async function txRankGetInsight() {
  var items = txRankChecked.map(function(i) { return txRankingData.ranking[i]; }).filter(Boolean);
  if (!items.length) return;
  var cacheKey = items.map(function(item) { return item.name; }).sort().join('_') + '_' + (document.getElementById('txRankPeriod').value || 'ytd');
  var el = document.getElementById('txRankInsightText');
  if (!el) return;

  // 캐시 확인
  if (txInsightCache[cacheKey]) {
    el.innerHTML = txInsightCache[cacheKey] + '<div style="margin-top:8px;text-align:right;"><button onclick="delete txInsightCache[\\'' + cacheKey.replace(/'/g, "\\\\'") + '\\'];txRankGetInsight();" style="padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface);font-size:11px;color:var(--sub);cursor:pointer;font-family:inherit;">다시 분석</button></div>';
    return;
  }

  el.textContent = '분석 중...';
  try {
    var resp = await fetch('/api/transaction/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regions: items.map(function(item) { return { sggNm: item.name, stats: item.stats, transactions: (item.transactions || []).slice(0, 20) }; }) })
    });
    var data = await resp.json();
    var result = data.insight || '분석 결과를 불러오지 못했습니다.';
    txInsightCache[cacheKey] = result;
    el.innerHTML = result + '<div style="margin-top:8px;text-align:right;"><button onclick="delete txInsightCache[\\'' + cacheKey.replace(/'/g, "\\\\'") + '\\'];txRankGetInsight();" style="padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface);font-size:11px;color:var(--sub);cursor:pointer;font-family:inherit;">다시 분석</button></div>';
  } catch(e) {
    el.textContent = '분석 중 오류가 발생했습니다.';
  }
}

// ─── Init ───
(async function() {
  var authed = await initInstaAuth();
  if (authed) {
    initCardNav();
    renderHistoryList();
    updateStudyBadge();
    loadRecommendNews(false);
    selectTemplate('A');

    // 기존 깨진 캐시 제거
    try { Object.keys(sessionStorage).forEach(function(k) { if (k.startsWith('txRank_')) sessionStorage.removeItem(k); }); } catch(e) {}
    var hash = window.location.hash;
    if (hash === '#transaction') {
      showTransactionView();
    }
    // 페이지 이동 시 hash 체크 보강 (챗봇/관리자에서 진입 시)
    setTimeout(function() {
      if (window.location.hash === '#transaction' && document.getElementById('transactionView').style.display !== 'block') {
        showTransactionView();
      }
    }, 200);
  }
})();
</script>

</body>
</html>`;
}
