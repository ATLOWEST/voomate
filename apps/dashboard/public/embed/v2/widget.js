/* global CSSStyleSheet, DOMException, FormData, TextDecoder, URL, document, fetch, matchMedia, navigator, requestAnimationFrame, window */
import { createVoiceSphere } from './voice-sphere.js';

const stylesheet = new CSSStyleSheet();
stylesheet.replaceSync(`
  :host{--ink:#0a0a0a;--muted:#6f6f6f;--line:#e8e8e8;--paper:#fff;--soft:#f5f5f5;--audio-level:0;position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:2147483000;font-family:Geist,"Helvetica Neue",Arial,sans-serif;color:var(--ink);color-scheme:light;-webkit-font-smoothing:antialiased}
  *{box-sizing:border-box}
  button,input{font:inherit}
  button{-webkit-tap-highlight-color:transparent}
  .shell{position:relative;width:min(398px,calc(100vw - 32px));height:min(639px,calc(100dvh - 32px));pointer-events:none}
  .panel{position:absolute;right:0;bottom:0;width:100%;height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto auto auto auto;background:rgba(255,255,255,.975);border:1px solid rgba(10,10,10,.09);border-radius:24px;overflow:hidden;box-shadow:0 28px 84px rgba(22,20,18,.17),0 5px 18px rgba(22,20,18,.06),inset 0 1px 0 rgba(255,255,255,.96);backdrop-filter:blur(22px) saturate(1.08);opacity:0;visibility:hidden;pointer-events:none;transform:translate3d(0,36px,0) scale(.92);transform-origin:calc(100% - 30px) 100%;transition:opacity .38s cubic-bezier(.32,.72,0,1),visibility 0s linear .72s,transform .72s cubic-bezier(.32,.72,0,1)}
  .panel.is-open{opacity:1;visibility:visible;pointer-events:auto;transform:translate3d(0,0,0) scale(1);transition:opacity .42s cubic-bezier(.32,.72,0,1),visibility 0s,transform .78s cubic-bezier(.32,.72,0,1)}
  .launcher{position:absolute;right:0;bottom:0;width:61px;height:61px;display:grid;place-items:center;padding:0;border:1px solid rgba(255,255,255,.15);border-radius:50%;background:#090909;color:#fff;box-shadow:0 18px 46px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.14);opacity:0;visibility:hidden;pointer-events:none;transform:translate3d(18px,12px,0) scale(.72);transition:opacity .32s cubic-bezier(.32,.72,0,1),visibility 0s linear .62s,transform .62s cubic-bezier(.32,.72,0,1);cursor:pointer}
  .launcher.is-visible{opacity:1;visibility:visible;pointer-events:auto;transform:translate3d(0,0,0) scale(1);transition:opacity .34s cubic-bezier(.32,.72,0,1),visibility 0s,transform .7s cubic-bezier(.32,.72,0,1)}
  .launcher:hover{transform:translate3d(0,-3px,0) scale(1.03)}.launcher:active{transform:scale(.96)}
  .launcher-rings{position:absolute;inset:7px;border-radius:50%;overflow:hidden;background:radial-gradient(circle at 35% 27%,#fff 0 3%,#b9ceff 14%,#6777ff 31%,#131313 72%)}
  .launcher-rings::before,.launcher-rings::after{content:"";position:absolute;left:50%;top:50%;width:32px;height:12px;border:1px solid rgba(255,255,255,.55);border-radius:50%;transform:translate(-50%,-50%) rotate(calc(var(--audio-level) * 38deg));transition:transform .08s linear}
  .launcher-rings::after{width:12px;height:32px;transform:translate(-50%,-50%) rotate(calc(-1 * var(--audio-level) * 44deg))}
  .launcher[data-state="listening"] .launcher-rings,.launcher[data-state="speaking"] .launcher-rings{box-shadow:0 0 calc(12px + var(--audio-level) * 24px) rgba(92,112,255,.72)}
  .compact-island{position:absolute;right:0;bottom:0;width:min(319px,calc(100vw - 32px));min-height:72px;padding:1px;border-radius:24px;background:linear-gradient(118deg,#ff7259 0%,#d588ff 24%,#718cff 48%,#51c9c3 72%,#b4dc75 100%);background-size:240% 240%;box-shadow:0 20px 58px rgba(22,20,18,.15),0 4px 15px rgba(22,20,18,.07),0 0 0 1px rgba(255,255,255,.7);opacity:0;visibility:hidden;pointer-events:none;transform:translate3d(22px,18px,0) scale(.82);transform-origin:100% 100%;transition:opacity .3s cubic-bezier(.32,.72,0,1),visibility 0s linear .6s,transform .62s cubic-bezier(.32,.72,0,1),box-shadow .6s ease;animation:island-color-flow 9s cubic-bezier(.45,0,.55,1) infinite alternate;animation-play-state:paused}
  .compact-island.is-visible{opacity:1;visibility:visible;pointer-events:auto;transform:translate3d(0,0,0) scale(1);transition:opacity .36s cubic-bezier(.32,.72,0,1),visibility 0s,transform .7s cubic-bezier(.32,.72,0,1);animation-play-state:running}
  .compact-island[data-voice-active="true"]{box-shadow:0 22px 62px rgba(22,20,18,.17),0 5px 17px rgba(22,20,18,.08),0 0 0 1px rgba(255,255,255,.76)}
  .compact-core{min-height:70px;display:grid;grid-template-columns:minmax(0,1fr) 44px;align-items:center;padding:5px;border-radius:23px;background:rgba(252,252,252,.965);box-shadow:inset 0 1px 0 rgba(255,255,255,.98);backdrop-filter:blur(24px) saturate(1.12)}
  .compact-open{min-width:0;height:59px;display:grid;grid-template-columns:44px minmax(0,1fr) 32px;align-items:center;gap:9px;padding:6px 6px 6px 7px;border:0;border-radius:17px;background:transparent;color:#111;text-align:left;cursor:pointer;transition:background .24s cubic-bezier(.32,.72,0,1),transform .3s cubic-bezier(.32,.72,0,1)}
  .compact-open:hover{background:rgba(12,12,12,.045)}.compact-open:active{transform:scale(.985)}
  .compact-mark{position:relative;width:40px;height:40px;border-radius:14px;background:radial-gradient(circle at 35% 28%,#fff 0 4%,#a9bfff 16%,#6877f3 33%,#121212 72%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 7px 18px rgba(47,52,112,.16)}
  .compact-mark::before{content:"";position:absolute;inset:9px 6px;border:1px solid rgba(255,255,255,.64);border-radius:50%;transform:rotate(calc(var(--audio-level) * 34deg));transition:transform .08s cubic-bezier(.32,.72,0,1)}
  .compact-copy{min-width:0;display:grid;gap:4px}.compact-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14.5px;font-weight:670;line-height:1.1}.compact-status-row{min-width:0;display:flex;align-items:center;gap:7px}.compact-status{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#656565;font-size:11.5px;font-weight:560}.compact-activity{position:relative;width:28px;height:14px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:2px;color:#171717}.compact-activity i{display:block;width:3px;height:3px;border-radius:999px;background:currentColor;transform-origin:50% 50%;transition:height .16s ease,transform .16s ease,opacity .16s ease}.compact-island[data-state="ended"] .compact-activity i:nth-child(n+2){display:none}.compact-island[data-state="ended"] .compact-activity i:first-child{width:6px;height:6px;box-shadow:0 0 0 3px rgba(10,10,10,.065)}
  .compact-island[data-state="connecting"] .compact-activity i{position:absolute;width:13px;height:13px;border:1.5px solid #dedede;border-top-color:#222;background:transparent;animation:compact-spin 1.1s linear infinite}.compact-island[data-state="connecting"] .compact-activity i:nth-child(n+2){display:none}
  .compact-island[data-state="listening"] .compact-activity{align-items:center}.compact-island[data-state="listening"] .compact-activity i{width:2.5px;height:var(--bar-height,8px);border-radius:3px;transform:scaleY(calc(.48 + var(--audio-level) * 1.1));animation:compact-hearing 1.25s ease-in-out infinite}.compact-island[data-state="listening"] .compact-activity i:nth-child(1),.compact-island[data-state="listening"] .compact-activity i:nth-child(5){--bar-height:6px}.compact-island[data-state="listening"] .compact-activity i:nth-child(2),.compact-island[data-state="listening"] .compact-activity i:nth-child(4){--bar-height:11px;animation-delay:-.32s}.compact-island[data-state="listening"] .compact-activity i:nth-child(3){--bar-height:14px;animation-delay:-.58s}
  .compact-island[data-state="thinking"] .compact-activity i,.compact-island[data-state="speaking"] .compact-activity i{width:5px;height:5px;animation:compact-float 1.35s cubic-bezier(.45,0,.55,1) infinite}.compact-island[data-state="thinking"] .compact-activity i:nth-child(n+4),.compact-island[data-state="speaking"] .compact-activity i:nth-child(n+4){display:none}.compact-island[data-state="thinking"] .compact-activity i:nth-child(2),.compact-island[data-state="speaking"] .compact-activity i:nth-child(2){animation-delay:-.92s}.compact-island[data-state="thinking"] .compact-activity i:nth-child(3),.compact-island[data-state="speaking"] .compact-activity i:nth-child(3){animation-delay:-.48s}.compact-island[data-state="speaking"] .compact-activity{color:#5869ed}
  .compact-expand{width:29px;height:29px;display:grid;place-items:center;border-radius:50%;background:#efefef;color:#303030}.compact-expand .icon-svg{width:16px;height:16px;transform:rotate(180deg)}
  .compact-close,.compact-stop{width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:13px;cursor:pointer;transition:background .22s cubic-bezier(.32,.72,0,1),color .22s cubic-bezier(.32,.72,0,1),transform .28s cubic-bezier(.32,.72,0,1),box-shadow .28s ease}.compact-close{background:transparent;color:#686868}.compact-close:hover{background:#ececec;color:#111}.compact-close:active,.compact-stop:active{transform:scale(.92)}.compact-stop{display:none;border-radius:50%;background:#e72d35;color:#fff;box-shadow:0 8px 20px rgba(190,27,35,.24),inset 0 1px 0 rgba(255,255,255,.28)}.compact-stop::before{content:"";width:11px;height:11px;border-radius:3px;background:currentColor}.compact-stop:hover{background:#d9222b;box-shadow:0 10px 25px rgba(190,27,35,.32),0 0 0 5px rgba(231,45,53,.1),inset 0 1px 0 rgba(255,255,255,.3)}.compact-island[data-voice-active="true"] .compact-stop{display:grid}.compact-island[data-voice-active="true"] .compact-close{display:none}
  header{height:74px;display:flex;align-items:center;gap:12px;padding:12px 14px 12px 16px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.86)}
  .agent-mark{position:relative;width:36px;height:36px;flex:0 0 auto;border-radius:50%;background:#0b0b0b;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
  .agent-mark::before{content:"";position:absolute;width:18px;height:18px;left:8px;top:8px;border:1px solid rgba(255,255,255,.76);border-radius:50%;box-shadow:6px 0 0 -4px #9db8ff,-6px 0 0 -4px #fff}
  .identity{min-width:0;flex:1;display:grid;gap:3px}.name{font-size:14.5px;font-weight:670;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.presence{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:11.5px;font-weight:530}.presence::before{content:"";width:6px;height:6px;border-radius:50%;background:#1a1a1a;box-shadow:0 0 0 3px rgba(10,10,10,.07)}
  .header-actions{display:flex;align-items:center;gap:2px}.minimize,.header-close{width:38px;height:38px;display:grid;place-items:center;border:0;border-radius:11px;background:transparent;color:#4c4c4c;cursor:pointer;transition:background .22s cubic-bezier(.32,.72,0,1),color .22s cubic-bezier(.32,.72,0,1),transform .3s cubic-bezier(.32,.72,0,1)}.minimize:hover,.header-close:hover{background:var(--soft);color:#111}.minimize:hover{transform:translateY(2px)}.header-close:hover{transform:rotate(4deg)}.minimize:active,.header-close:active{transform:scale(.94)}
  .close-glyph{display:block;font-size:25px;font-weight:330;line-height:1;transform:translateY(-1px)}
  .icon-svg{width:19px;height:19px;display:block;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
  .messages{min-height:0;overflow:auto;overscroll-behavior:contain;padding:20px 16px 26px;display:flex;flex-direction:column;gap:16px;background:linear-gradient(180deg,#fff 0%,#fdfdfd 100%);scroll-behavior:smooth;transition:padding .52s cubic-bezier(.16,1,.3,1),opacity .3s cubic-bezier(.32,.72,0,1),transform .42s cubic-bezier(.16,1,.3,1);scrollbar-width:thin;scrollbar-color:#d9d9d9 transparent}
  .messages::-webkit-scrollbar{width:5px}.messages::-webkit-scrollbar-thumb{background:#d9d9d9;border-radius:10px}
  .message{font-size:15px;line-height:1.54;white-space:pre-wrap;overflow-wrap:anywhere;animation:message-in .46s cubic-bezier(.16,1,.3,1) both}.message-copy{min-width:0}
  .response-blocks{display:grid;gap:11px;white-space:normal}.response-text{margin:0;text-wrap:pretty}.response-list{display:grid;gap:7px;margin:0;padding-left:20px}.entity-card{display:grid;grid-template-columns:72px minmax(0,1fr);gap:12px;padding:11px;border:1px solid #e2e2e2;border-radius:8px;background:#fafafa;overflow:hidden}.entity-card.no-image{grid-template-columns:1fr}.entity-image{width:72px;height:72px;object-fit:cover;border-radius:6px;background:#eee}.entity-body{min-width:0;display:grid;align-content:start;gap:4px}.entity-kind{color:#777;font-size:9.5px;font-weight:700;text-transform:uppercase}.entity-title{font-size:14px;font-weight:680;line-height:1.3}.entity-subtitle{color:#666;font-size:12px;line-height:1.4}.entity-price{font-size:13px;font-weight:700}.entity-fields{display:flex;flex-wrap:wrap;gap:4px 8px;color:#555;font-size:11px}.entity-link{color:#111;font-size:12px;font-weight:650;text-decoration:underline;text-underline-offset:2px}
  .message.assistant{align-self:stretch;display:grid;grid-template-columns:20px minmax(0,1fr);gap:9px;padding-right:10px;color:#1a1a1a}.message.assistant::before{content:"";width:19px;height:19px;margin-top:1px;border-radius:50%;background:radial-gradient(circle at 37% 30%,#fff 0 4%,#9eb9ff 17%,#596cff 31%,#111 68%);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
  .message.visitor{max-width:84%;align-self:flex-end;padding:10px 14px;border-radius:16px 16px 4px 16px;background:#f0f0f0;color:#111}
  .message-meta{margin-top:5px;color:#7e7e7e;font-size:10.5px;font-weight:560}.message.pending .message-copy{position:relative;width:50px;height:29px;min-height:29px;border:1px solid #e9e9e9;border-radius:11px;background:#fafafa;overflow:hidden}.message.pending .message-copy::before{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 18%,rgba(255,255,255,.96) 48%,transparent 78%);transform:translateX(-110%);animation:pending-sheen 1.7s cubic-bezier(.45,0,.55,1) infinite}.message.pending .message-copy::after{content:"";position:absolute;left:14px;top:12px;width:22px;height:5px;background:radial-gradient(circle,#777 1.5px,transparent 1.8px) 0 0/7px 5px;animation:dots 1.15s steps(3) infinite}
  .message-feedback{grid-column:2;display:flex;gap:4px;margin-top:-4px}.feedback-button{width:24px;height:24px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:#929292;cursor:pointer;font-size:12px;transition:background .16s ease,color .16s ease,transform .16s ease}.feedback-button:hover{background:#efefef;color:#111;transform:translateY(-1px)}.feedback-button.selected{background:#111;color:#fff}.feedback-button:disabled{cursor:default;opacity:.7}
  .status{min-height:0;padding:0 16px;color:#6d6d6d;font-size:11px;line-height:1.4;transition:padding .2s ease}.status:not(:empty){padding-top:6px}.status[data-tone="error"]{color:#a22626}
  .attachments{display:flex;gap:8px;overflow-x:auto;padding:8px 12px 0;background:#fff}.attachments:empty{display:none}.preview{position:relative;display:grid;grid-template-columns:36px minmax(0,1fr);align-items:center;gap:7px;min-width:140px;max-width:175px;padding:4px 26px 4px 4px;border:1px solid var(--line);border-radius:12px;background:#fafafa;animation:message-in .35s cubic-bezier(.16,1,.3,1) both}.preview img{width:36px;height:36px;object-fit:cover;border-radius:8px;filter:saturate(.85)}.preview-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9.5px;color:#535353}.remove{position:absolute;right:4px;top:4px;width:21px;height:21px;display:grid;place-items:center;border:0;border-radius:50%;background:#ececec;color:#333;cursor:pointer;font:500 14px/1 inherit}
  .composer{margin:8px 10px 4px;min-height:56px;display:grid;grid-template-columns:40px minmax(0,1fr) 44px;align-items:center;gap:3px;padding:5px;border:1px solid #dedede;border-radius:24px;background:#f8f8f8;box-shadow:0 4px 16px rgba(0,0,0,.04),inset 0 1px 0 #fff;transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease}.composer:focus-within{border-color:#bcbcbc;box-shadow:0 6px 20px rgba(0,0,0,.06),0 0 0 3px rgba(0,0,0,.035)}.composer.busy{opacity:.72}
  .attach,.mic{width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:#111;cursor:pointer;transition:background .18s ease,transform .24s cubic-bezier(.34,1.56,.64,1),box-shadow .24s ease}.attach:hover{background:#e9e9e9;transform:rotate(7deg)}.mic{width:44px;height:44px;background:#0a0a0a;color:#fff}.mic:hover{transform:scale(1.055)}.mic:active,.attach:active{transform:scale(.92)}.mic.active{background:#e92d32;color:#fff;box-shadow:0 0 0 calc(4px + var(--audio-level) * 7px) rgba(233,45,50,.2),0 10px 24px rgba(185,25,30,.25);animation:stop-breathe 1.8s ease-in-out infinite}.mic .wave{display:flex;align-items:center;justify-content:center;gap:2px;height:16px}.mic .wave i{display:block;width:2px;border-radius:2px;background:currentColor;animation:wave-idle 1.5s ease-in-out infinite}.mic .wave i:nth-child(1),.mic .wave i:nth-child(5){height:5px}.mic .wave i:nth-child(2),.mic .wave i:nth-child(4){height:10px;animation-delay:-.2s}.mic .wave i:nth-child(3){height:15px;animation-delay:-.4s}.mic.active .wave i{animation-duration:.72s;transform:scaleY(calc(.55 + var(--audio-level) * .9));transition:transform .055s linear}
  input{min-width:0;width:100%;height:40px;padding:0 7px;border:0;outline:0;background:transparent;color:#101010;font-size:15px}input::placeholder{color:#8b8b8b}input:disabled{cursor:wait}
  .branding-footer{display:flex;align-items:center;justify-content:center;gap:6px;padding:3px 14px 10px;font-size:11.5px;color:#707070;line-height:1;user-select:none}
  .branding-footer a{color:#666;text-decoration:none;font-weight:500;transition:color .18s ease}
  .branding-footer a:hover{color:#111;text-decoration:underline}
  .branding-sep{color:#d0d0d0;font-size:11px}
  .powered-text{color:#767676;font-size:11.5px;font-weight:480}
  .branding-logo-wrap{display:inline-flex;align-items:center;gap:4.5px;color:#0a0a0a;text-decoration:none;transition:opacity .18s ease,transform .18s ease}
  .branding-logo-wrap:hover{opacity:.8;transform:translateY(-0.5px)}
  .branding-logo-icon{width:15px;height:15px;display:inline-block;object-fit:contain;vertical-align:middle;filter:drop-shadow(0 1px 2px rgba(0,0,0,.15))}
  .branding-text-logo{height:13.5px;width:auto;display:inline-block;object-fit:contain;vertical-align:middle;filter:contrast(1.15) brightness(1.02)}
  .branding-logo-text{font-family:Geist,"Helvetica Neue",Arial,sans-serif;font-weight:800;font-size:12.5px;letter-spacing:-0.035em;color:#0a0a0a}
  .voice-stage{position:relative;width:100%;height:0;min-height:0;z-index:1;display:grid;grid-template-rows:minmax(0,1fr) 24px;place-items:center;overflow:hidden;background:transparent;opacity:0;visibility:hidden;pointer-events:none;filter:blur(9px);transform:translate3d(0,34px,0) scale(.72);transform-origin:50% 100%;transition:height .58s cubic-bezier(.16,1,.3,1),opacity .22s ease,visibility 0s linear .5s,filter .36s ease,transform .62s cubic-bezier(.16,1,.3,1)}.voice-stage.active{height:260px;opacity:1;visibility:visible;filter:none;transform:translate3d(0,0,0) scale(1);transition:height .62s cubic-bezier(.16,1,.3,1),opacity .28s ease,visibility 0s,filter .42s ease,transform .68s cubic-bezier(.16,1,.3,1)}
  .voice-label{position:relative;z-index:2;align-self:start;text-align:center}.voice-title{font-size:10.5px;font-weight:620;letter-spacing:.018em;color:#585858;text-shadow:0 1px 14px rgba(255,255,255,.94)}.sphere-wrap{position:relative;width:250px;height:236px;display:grid;place-items:center;isolation:isolate}.sphere-wrap::before{content:"";position:absolute;inset:10%;z-index:-2;border-radius:50%;background:radial-gradient(circle,rgba(89,105,255,.12),rgba(122,75,255,.055) 38%,rgba(255,102,62,.025) 58%,transparent 72%);filter:blur(calc(12px + var(--audio-level) * 13px));transform:scale(calc(1 + var(--audio-level) * .09));transition:transform .06s linear,filter .06s linear}.sphere-wrap::after{content:"";position:absolute;left:21%;right:21%;bottom:7%;height:12%;z-index:-1;border-radius:50%;background:radial-gradient(ellipse,rgba(13,14,30,.18),rgba(51,57,130,.07) 45%,transparent 73%);filter:blur(11px);transform:scaleX(calc(.92 + var(--audio-level) * .12));transition:transform .06s linear}.voice-canvas{width:100%;height:100%;display:block;filter:drop-shadow(0 17px 25px rgba(25,29,75,.16)) saturate(1.04)}
  .panel.voice-active .presence{visibility:hidden}
  .panel.dragging{box-shadow:0 32px 90px rgba(0,0,0,.19),inset 0 0 0 2px #111}.panel.dragging .composer{transform:translateY(-3px)}
  .navigation-stage{position:absolute;inset:0;z-index:20;display:grid;place-items:center;padding:24px;background:rgba(255,255,255,.94);backdrop-filter:blur(18px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .2s ease,visibility 0s linear .25s}.navigation-stage.active{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .2s ease,visibility 0s}.navigation-state{display:grid;justify-items:center;gap:12px;max-width:240px;text-align:center}.navigation-spinner{width:34px;height:34px;border:2px solid #dedede;border-top-color:#111;border-radius:50%;animation:navigation-spin .75s linear infinite}.navigation-title{font-size:14.5px;font-weight:650}.navigation-detail{color:#717171;font-size:11.5px;line-height:1.5}.navigation-cancel{margin-top:3px;padding:6px 10px;border:0;background:transparent;color:#595959;font-size:11.5px;text-decoration:underline;cursor:pointer}
  .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
  .minimize:focus-visible,.header-close:focus-visible,.compact-open:focus-visible,.compact-close:focus-visible,.compact-stop:focus-visible,.launcher:focus-visible,.attach:focus-visible,.mic:focus-visible,.remove:focus-visible{outline:3px solid rgba(72,100,255,.3);outline-offset:3px}
  [hidden]{display:none!important}
  @keyframes message-in{from{opacity:0;transform:translateY(12px) scale(.985)}to{opacity:1;transform:none}}
  @keyframes dots{to{background-position:21px 0}}
  @keyframes pending-sheen{to{transform:translateX(110%)}}
  @keyframes island-color-flow{0%{background-position:0% 35%}50%{background-position:100% 65%}100%{background-position:15% 100%}}
  @keyframes compact-spin{to{transform:rotate(360deg)}}
  @keyframes compact-hearing{0%,100%{opacity:.58;filter:saturate(.8)}50%{opacity:1;filter:saturate(1.15)}}
  @keyframes compact-float{0%,100%{opacity:.42;transform:translateY(2px) scale(.84)}50%{opacity:1;transform:translateY(-3px) scale(1)}}
  @keyframes wave-idle{0%,100%{transform:scaleY(.62)}50%{transform:scaleY(1)}}
  @keyframes stop-breathe{0%,100%{transform:scale(1)}50%{transform:scale(calc(1 + var(--audio-level) * .035))}}
  @keyframes navigation-spin{to{transform:rotate(360deg)}}
  @media(max-width:520px){:host{right:0;bottom:0}.shell{width:100vw;height:100dvh}.panel{border:0;border-radius:0;transform-origin:100% 100%}.launcher{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom))}.compact-island{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));width:min(319px,calc(100vw - 24px))}.messages{padding-left:15px;padding-right:15px}.message{font-size:15px}.message.visitor{max-width:88%}.composer{margin-bottom:max(6px,env(safe-area-inset-bottom))}}
  @media(max-height:590px) and (min-width:521px){.shell{height:calc(100dvh - 24px)}.voice-stage.active{height:200px}.sphere-wrap{width:190px;height:180px}}
  @media(prefers-reduced-motion:reduce){.panel,.launcher,.compact-island,.message,.preview,.voice-stage,.navigation-stage{transition:none;animation:none}.messages{scroll-behavior:auto}.mic,.mic .wave i,.navigation-spinner,.message.pending .message-copy::before,.compact-activity i{animation:none}}
`);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgIcon(paths, viewBox = '0 0 24 24') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon-svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  for (const definition of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', definition.tag ?? 'path');
    for (const [name, value] of Object.entries(definition.attributes))
      path.setAttribute(name, value);
    svg.append(path);
  }
  return svg;
}

const chevronIcon = () => svgIcon([{ attributes: { d: 'm7 10 5 5 5-5' } }]);
const plusIcon = () =>
  svgIcon([{ attributes: { d: 'M12 5v14' } }, { attributes: { d: 'M5 12h14' } }]);

function waveIcon() {
  const wave = element('span', 'wave');
  wave.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 5; index += 1) wave.append(element('i'));
  return wave;
}

async function postJson(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    credentials: 'omit',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The assistant could not be reached.');
  return payload;
}

function compactText(value, maxLength) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function readUiManifest() {
  const node = document.querySelector('script[type="application/json"][data-voomate-ui-manifest]');
  const source = node?.textContent ?? '';
  if (!source || source.length > 32_000) return undefined;
  try {
    const parsed = JSON.parse(source);
    if (parsed?.version !== 1 || !Array.isArray(parsed.pages)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function readOperatingState() {
  const node = document.querySelector(
    'script[type="application/json"][data-voomate-operating-context]',
  );
  const source = node?.textContent ?? '';
  if (!source || source.length > 2_000) return undefined;
  try {
    const parsed = JSON.parse(source);
    const inventory = parsed?.agentInventory;
    if (parsed?.version !== 1 || !inventory) return undefined;
    const counts = ['total', 'active', 'draft', 'paused'].map((key) => inventory[key]);
    if (
      counts.some((value) => !Number.isInteger(value) || value < 0 || value > 10_000) ||
      inventory.active + inventory.draft + inventory.paused !== inventory.total
    ) {
      return undefined;
    }
    return {
      source: 'host_ui',
      agentInventory: {
        total: inventory.total,
        active: inventory.active,
        draft: inventory.draft,
        paused: inventory.paused,
      },
    };
  } catch {
    return undefined;
  }
}

function journeyStorageKey(publicKey) {
  return `voomate:v2:journey:${String(publicKey).slice(0, 80)}`;
}

function readJourney(publicKey) {
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(journeyStorageKey(publicKey)) ?? 'null',
    );
    if (!parsed || parsed.version !== 1) return {};
    return {
      conversationId: typeof parsed.conversationId === 'string' ? parsed.conversationId : undefined,
      continuationToken:
        typeof parsed.continuationToken === 'string' ? parsed.continuationToken : undefined,
      isOpen: parsed.isOpen !== false,
      viewMode: ['open', 'compact', 'closed'].includes(parsed.viewMode)
        ? parsed.viewMode
        : parsed.isOpen === false
          ? 'closed'
          : 'open',
      resumeVoice: parsed.resumeVoice === true,
    };
  } catch {
    return {};
  }
}

function writeJourney(publicKey, state) {
  try {
    window.sessionStorage.setItem(
      journeyStorageKey(publicKey),
      JSON.stringify({
        version: 1,
        conversationId: state.conversationId,
        continuationToken: state.continuationToken,
        isOpen: state.isOpen,
        viewMode: state.viewMode,
        resumeVoice: state.resumeVoice === true,
      }),
    );
  } catch {
    // Session continuity is best-effort in browsers that disable storage.
  }
}

function clearJourney(publicKey) {
  try {
    window.sessionStorage.removeItem(journeyStorageKey(publicKey));
  } catch {
    // No stored state exists when storage is unavailable.
  }
}

function getMerchantPrivacyUrl() {
  try {
    const hostPrivacyAnchor = document.querySelector(
      'a[href*="privacy"], a[href*="policies/privacy"]',
    );
    if (hostPrivacyAnchor && hostPrivacyAnchor.href) {
      return hostPrivacyAnchor.href;
    }
    return new URL('/privacy', window.location.origin).href;
  } catch {
    return '/privacy';
  }
}

function getVoomateLandingUrl() {
  try {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    return 'https://voomate.ai';
  } catch {
    return 'https://voomate.ai';
  }
}

function mobilePlatform() {
  const value =
    `${navigator.userAgentData?.platform ?? ''} ${navigator.platform ?? ''} ${navigator.userAgent ?? ''}`.toLowerCase();
  if (/iphone|ipad|ipod|ios/.test(value)) return 'ios';
  if (/android/.test(value)) return 'android';
  return 'web';
}

function portalScopeForUrl(value) {
  try {
    const [segment] = new URL(value, window.location.href).pathname.split('/').filter(Boolean);
    return ['admin', 'app', 'store', 'account'].includes(segment) ? `/${segment}` : '/';
  } catch {
    return '/';
  }
}

function activePortalScope() {
  const declared =
    document.documentElement.dataset.voomatePortalScope ||
    document.body?.dataset.voomatePortalScope;
  if (/^\/(?:[a-z0-9_-]+)?$/i.test(declared || '')) return declared;
  return portalScopeForUrl(window.location.href);
}

function activePortalRole(scope) {
  const declared =
    document.documentElement.dataset.voomateActiveRole || document.body?.dataset.voomateActiveRole;
  if (['super_admin', 'merchant_admin', 'end_user'].includes(declared)) return declared;
  if (scope === '/admin') return 'super_admin';
  if (scope === '/store' || scope === '/account') return 'end_user';
  return 'merchant_admin';
}

function collectPageContext() {
  const manifest = readUiManifest();
  const operatingState = readOperatingState();
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content');
  const headings = [
    ...document.querySelectorAll('main h1, main h2, [role="main"] h1, [role="main"] h2'),
  ]
    .map((node) => compactText(node.textContent, 160))
    .filter(Boolean)
    .slice(0, 12);
  const navigation = [];
  const portalScope = activePortalScope();
  const seen = new Set();
  const addNavigation = (label, value, pageDescription, aliases, facts, native) => {
    try {
      const url = new URL(value, window.location.href);
      if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol))
        return;
      const normalizedLabel = compactText(label, 120);
      if (!normalizedLabel || seen.has(url.href) || navigation.length >= 40) return;
      seen.add(url.href);
      navigation.push({
        label: normalizedLabel,
        url: url.href,
        portalScope: portalScopeForUrl(url.href),
        ...(pageDescription ? { description: compactText(pageDescription, 600) } : {}),
        ...(Array.isArray(aliases)
          ? {
              aliases: aliases
                .map((alias) => compactText(alias, 80))
                .filter(Boolean)
                .slice(0, 16),
            }
          : {}),
        ...(Array.isArray(facts)
          ? {
              facts: facts
                .map((fact) => compactText(fact, 300))
                .filter(Boolean)
                .slice(0, 24),
            }
          : {}),
        ...(native ? { native } : {}),
      });
    } catch {
      // Malformed host links are ignored; the widget must never repair or execute them.
    }
  };
  for (const page of manifest?.pages ?? []) {
    addNavigation(page.title, page.path, page.description, page.aliases, page.facts, page.native);
  }
  const semanticAnchors = document.querySelectorAll(
    'aside nav a[href], header nav a[href], [role="navigation"] a[href], [data-sidebar] a[href]',
  );
  const anchors = semanticAnchors.length ? semanticAnchors : document.querySelectorAll('a[href]');
  for (const anchor of anchors) {
    if (anchor.closest('voomate-widget')) continue;
    const anchorUrl = new URL(anchor.href, window.location.href);
    if (
      anchorUrl.hash &&
      anchorUrl.pathname === window.location.pathname &&
      anchorUrl.search === window.location.search
    ) {
      continue;
    }
    addNavigation(anchor.getAttribute('aria-label') || anchor.textContent, anchor.href);
  }
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const surface = (manifest?.pages ?? []).find(
    (page) => page.path === currentPath || page.path === window.location.pathname,
  );
  return {
    url: window.location.href,
    title: compactText(document.title, 200),
    description: compactText(description, 800),
    portalScope,
    activeRole: activePortalRole(portalScope),
    headings,
    navigation,
    ...(surface
      ? {
          surface: {
            id: compactText(surface.id, 64),
            title: compactText(surface.title, 120),
            description: compactText(surface.description, 600),
            ...(Array.isArray(surface.aliases)
              ? {
                  aliases: surface.aliases
                    .map((alias) => compactText(alias, 80))
                    .filter(Boolean)
                    .slice(0, 16),
                }
              : {}),
            ...(Array.isArray(surface.facts)
              ? {
                  facts: surface.facts
                    .map((fact) => compactText(fact, 300))
                    .filter(Boolean)
                    .slice(0, 24),
                }
              : {}),
          },
        }
      : {}),
    ...(manifest?.businessSummary
      ? { businessSummary: compactText(manifest.businessSummary, 1_200) }
      : {}),
    ...(operatingState ? { operatingState } : {}),
  };
}

function resolveClientNavigation(commands, pageContext) {
  if (!Array.isArray(commands)) return undefined;
  const navigation = commands.find((command) => command?.type === 'navigate');
  if (!navigation) return undefined;
  try {
    const target = new URL(navigation.url, window.location.origin);
    if (portalScopeForUrl(target.href) !== pageContext.portalScope) return undefined;
    const advertised = pageContext.navigation.find((item) => {
      if (item.url === target.href) return true;
      try {
        return new URL(item.url, window.location.origin).pathname === target.pathname;
      } catch {
        return false;
      }
    });
    if (target.origin !== window.location.origin || !advertised) return undefined;
    const intent = ['web', 'open_app', 'install_app'].includes(navigation.intent)
      ? navigation.intent
      : 'web';
    const platform = mobilePlatform();
    if (intent === 'web' || platform === 'web') {
      return { command: navigation, destination: target.href, kind: 'web' };
    }
    const native = advertised.native?.[platform];
    if (!native || navigation.native?.[platform]?.url !== native.url) return undefined;
    if (intent === 'open_app') {
      return { command: navigation, destination: native.url, fallback: target.href, kind: 'app' };
    }
    if (
      !native.storeUrl ||
      navigation.native?.[platform]?.storeUrl !== native.storeUrl ||
      new URL(native.storeUrl).hostname !==
        (platform === 'ios' ? 'apps.apple.com' : 'play.google.com')
    ) {
      return undefined;
    }
    return { command: navigation, destination: native.storeUrl, kind: 'store' };
  } catch {
    // A response command is still untrusted at the browser boundary.
    return undefined;
  }
}

export async function mountWidget(host, config) {
  const root = host.shadowRoot;
  root.replaceChildren();
  root.adoptedStyleSheets = [stylesheet];

  const shell = element('div', 'shell');
  const launcher = element('button', 'launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open assistant');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.append(element('span', 'launcher-rings'));

  const panel = element('section', 'panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Business assistant');
  panel.setAttribute('aria-hidden', 'true');

  const header = element('header');
  const agentMark = element('span', 'agent-mark');
  agentMark.setAttribute('aria-hidden', 'true');
  const identity = element('div', 'identity');
  const name = element('div', 'name', 'Assistant');
  const presence = element('div', 'presence', 'Connecting securely');
  identity.append(name, presence);
  const minimize = element('button', 'minimize');
  minimize.type = 'button';
  minimize.setAttribute('aria-label', 'Minimize assistant');
  minimize.title = 'Minimize';
  minimize.append(chevronIcon());
  const headerClose = element('button', 'header-close');
  headerClose.type = 'button';
  headerClose.setAttribute('aria-label', 'Close assistant');
  headerClose.title = 'Close';
  const headerCloseGlyph = element('span', 'close-glyph', '×');
  headerCloseGlyph.setAttribute('aria-hidden', 'true');
  headerClose.append(headerCloseGlyph);
  const headerActions = element('div', 'header-actions');
  headerActions.append(minimize, headerClose);
  header.append(agentMark, identity, headerActions);

  const compactIsland = element('div', 'compact-island');
  compactIsland.setAttribute('role', 'group');
  compactIsland.setAttribute('aria-label', 'Minimized assistant');
  compactIsland.setAttribute('aria-hidden', 'true');
  compactIsland.dataset.state = 'ended';
  compactIsland.dataset.voiceActive = 'false';
  const compactCore = element('div', 'compact-core');
  const compactOpen = element('button', 'compact-open');
  compactOpen.type = 'button';
  compactOpen.setAttribute('aria-label', 'Expand assistant');
  compactOpen.title = 'Expand assistant';
  const compactMark = element('span', 'compact-mark');
  compactMark.setAttribute('aria-hidden', 'true');
  const compactCopy = element('span', 'compact-copy');
  const compactName = element('span', 'compact-name', 'Assistant');
  const compactStatus = element('span', 'compact-status', 'Connecting securely');
  compactStatus.setAttribute('role', 'status');
  compactStatus.setAttribute('aria-live', 'polite');
  const compactStatusRow = element('span', 'compact-status-row');
  const compactActivity = element('span', 'compact-activity');
  compactActivity.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 5; index += 1) compactActivity.append(element('i'));
  compactStatusRow.append(compactActivity, compactStatus);
  compactCopy.append(compactName, compactStatusRow);
  const compactExpand = element('span', 'compact-expand');
  compactExpand.setAttribute('aria-hidden', 'true');
  compactExpand.append(chevronIcon());
  compactOpen.append(compactMark, compactCopy, compactExpand);
  const compactClose = element('button', 'compact-close');
  compactClose.type = 'button';
  compactClose.setAttribute('aria-label', 'Close assistant');
  compactClose.title = 'Close';
  const compactCloseGlyph = element('span', 'close-glyph', '×');
  compactCloseGlyph.setAttribute('aria-hidden', 'true');
  compactClose.append(compactCloseGlyph);
  const compactStop = element('button', 'compact-stop');
  compactStop.type = 'button';
  compactStop.setAttribute('aria-label', 'Stop voice conversation');
  compactStop.setAttribute('aria-hidden', 'true');
  compactStop.title = 'Stop voice conversation';
  compactCore.append(compactOpen, compactClose, compactStop);
  compactIsland.append(compactCore);

  const messages = element('div', 'messages');
  messages.setAttribute('role', 'log');
  messages.setAttribute('aria-live', 'polite');
  messages.setAttribute('aria-relevant', 'additions text');

  const status = element('div', 'status');
  status.setAttribute('role', 'status');
  const attachments = element('div', 'attachments');
  attachments.setAttribute('aria-label', 'Selected image attachments');

  const voiceStage = element('div', 'voice-stage');
  voiceStage.setAttribute('role', 'group');
  voiceStage.setAttribute('aria-live', 'polite');
  voiceStage.setAttribute('aria-label', 'Voice conversation');
  const voiceLabel = element('div', 'voice-label');
  const voiceTitle = element('div', 'voice-title', 'Connecting securely');
  voiceLabel.append(voiceTitle);
  const sphereWrap = element('div', 'sphere-wrap');
  const voiceCanvas = element('canvas', 'voice-canvas');
  voiceCanvas.setAttribute('aria-hidden', 'true');
  sphereWrap.append(voiceCanvas);
  const audio = element('audio', 'sr');
  audio.autoplay = true;
  voiceStage.append(sphereWrap, voiceLabel, audio);

  const form = element('form', 'composer');
  const attach = element('button', 'attach');
  attach.type = 'button';
  attach.setAttribute('aria-label', 'Attach up to two images');
  attach.append(plusIcon());
  const fileInput = element('input', 'sr');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/webp';
  fileInput.multiple = true;
  const label = element('label', 'sr', 'Message');
  label.htmlFor = 'voomate-message';
  const input = element('input');
  input.id = 'voomate-message';
  input.name = 'message';
  input.autocomplete = 'off';
  input.placeholder = 'Ask anything';
  input.maxLength = 4000;
  input.disabled = true;
  const mic = element('button', 'mic');
  mic.type = 'button';
  mic.setAttribute('aria-label', 'Start voice conversation');
  mic.setAttribute('aria-pressed', 'false');
  mic.disabled = true;
  mic.append(waveIcon());
  attach.disabled = true;
  form.append(attach, fileInput, label, input, mic);

  const navigationStage = element('div', 'navigation-stage');
  navigationStage.setAttribute('role', 'status');
  navigationStage.setAttribute('aria-live', 'assertive');
  const navigationState = element('div', 'navigation-state');
  const navigationSpinner = element('span', 'navigation-spinner');
  navigationSpinner.setAttribute('aria-hidden', 'true');
  const navigationTitle = element('div', 'navigation-title', 'Opening page');
  const navigationDetail = element(
    'div',
    'navigation-detail',
    'Keeping this conversation active while the destination opens.',
  );
  const navigationCancel = element('button', 'navigation-cancel', 'Stay here');
  navigationCancel.type = 'button';
  navigationState.append(navigationSpinner, navigationTitle, navigationDetail, navigationCancel);
  navigationStage.append(navigationState);

  const branding = element('div', 'branding-footer');
  const privacyLink = element('a', 'privacy-link', 'Privacy');
  privacyLink.href = getMerchantPrivacyUrl();
  privacyLink.target = '_blank';
  privacyLink.rel = 'noopener noreferrer';
  privacyLink.title = 'Merchant Privacy Policy';
  privacyLink.addEventListener('click', () => {
    privacyLink.href = getMerchantPrivacyUrl();
  });

  const sep = element('span', 'branding-sep', '·');
  const poweredSpan = element('span', 'powered-text', 'Powered by');

  const brandLink = element('a', 'branding-logo-wrap');
  brandLink.href = getVoomateLandingUrl();
  brandLink.target = '_blank';
  brandLink.rel = 'noopener noreferrer';
  brandLink.title = 'Voomate — Voice & Web AI Agents';

  const logoImg = element('img', 'branding-logo-icon');
  logoImg.src = new URL('/voomate-logo.png', config.apiOrigin).href;
  logoImg.alt = '';
  logoImg.width = 15;
  logoImg.height = 15;

  const textLogoImg = element('img', 'branding-text-logo');
  textLogoImg.src = new URL('/voomate-text-logo.png', config.apiOrigin).href;
  textLogoImg.alt = 'Voomate';
  textLogoImg.height = 13;
  textLogoImg.onerror = () => {
    textLogoImg.style.display = 'none';
    const fallbackText = element('span', 'branding-logo-text', 'voomate');
    brandLink.append(fallbackText);
  };

  brandLink.append(logoImg, textLogoImg);

  branding.append(privacyLink, sep, poweredSpan, brandLink);

  panel.append(header, messages, voiceStage, status, attachments, form, branding, navigationStage);
  shell.append(launcher, compactIsland, panel);
  root.append(shell);

  const sphere = createVoiceSphere(voiceCanvas);
  const storedJourney = readJourney(config.publicKey);
  let resumeVoiceAfterReload = storedJourney.resumeVoice === true;
  let token;
  let tokenExpiresAt = 0;
  let continuationToken = storedJourney.continuationToken;
  let conversationId = storedJourney.conversationId;
  let voiceConfig;
  let voiceSession;
  let voiceStarting = false;
  let voiceStopping = false;
  let voiceRequestId = 0;
  let voiceUserNode;
  let voiceAssistantNode;
  let selectedFiles = [];
  let viewMode = storedJourney.viewMode ?? (storedJourney.isOpen === false ? 'closed' : 'open');
  let isOpen = viewMode === 'open';
  let navigationTimer;
  let navigationCompletionListener;
  let navigationShownAt = 0;
  const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const maxImageBytes = 5 * 1024 * 1024;

  const persistJourney = (resumeVoice = false) => {
    writeJourney(config.publicKey, {
      conversationId,
      continuationToken,
      isOpen,
      viewMode,
      resumeVoice,
    });
  };

  const refreshSession = async (force = false) => {
    if (!force && token && tokenExpiresAt - Date.now() > 2 * 60 * 1000) return;
    if (!continuationToken) throw new Error('The secure conversation session expired.');
    const refreshed = await postJson(`${config.apiOrigin}/api/web-agent/session`, {
      publicKey: config.publicKey,
      continuationToken,
      ...(conversationId ? { conversationId } : {}),
    });
    token = refreshed.session.token;
    tokenExpiresAt = Date.now() + Number(refreshed.session.expiresIn ?? 0) * 1000;
    continuationToken = refreshed.session.continuationToken;
    voiceConfig = refreshed.agent.voice;
    persistJourney(Boolean(voiceSession || voiceStarting));
  };

  const setViewMode = (nextMode) => {
    viewMode = ['open', 'compact', 'closed'].includes(nextMode) ? nextMode : 'closed';
    isOpen = viewMode === 'open';
    panel.classList.toggle('is-open', viewMode === 'open');
    compactIsland.classList.toggle('is-visible', viewMode === 'compact');
    launcher.classList.toggle('is-visible', viewMode === 'closed');
    panel.setAttribute('aria-hidden', String(viewMode !== 'open'));
    compactIsland.setAttribute('aria-hidden', String(viewMode !== 'compact'));
    compactOpen.setAttribute('aria-expanded', String(viewMode === 'open'));
    launcher.setAttribute('aria-expanded', String(viewMode === 'open'));
    host.dataset.voomateView = viewMode;
    persistJourney(Boolean(voiceSession || voiceStarting));
    sphere.setActive(isOpen && Boolean(voiceSession || voiceStarting));
    if (isOpen && matchMedia('(pointer:fine)').matches && !voiceSession && !voiceStarting) {
      window.setTimeout(() => input.focus(), 420);
    }
  };

  const addMessage = (role, text, options = {}) => {
    const node = element('div', `message ${role}${options.pending ? ' pending' : ''}`);
    const copy = element('div', 'message-copy', text);
    node.append(copy);
    if (options.meta) node.append(element('div', 'message-meta', options.meta));
    messages.append(node);
    messages.scrollTop = messages.scrollHeight;
    return node;
  };

  const setMessageText = (node, text) => {
    const copy = node.querySelector('.message-copy');
    if (copy) copy.textContent = text;
    node.classList.remove('pending');
    messages.scrollTop = messages.scrollHeight;
  };

  const renderPresentation = (node, presentation) => {
    if (presentation?.version !== 1 || !Array.isArray(presentation.blocks)) return;
    const copy = node.querySelector('.message-copy');
    if (!copy) return;
    const container = element('div', 'response-blocks');
    for (const block of presentation.blocks.slice(0, 12)) {
      if (block?.type === 'text' && typeof block.text === 'string') {
        container.append(element('p', 'response-text', block.text));
      } else if (block?.type === 'list' && Array.isArray(block.items)) {
        const list = element(block.style === 'number' ? 'ol' : 'ul', 'response-list');
        for (const item of block.items.slice(0, 8)) {
          if (typeof item === 'string') list.append(element('li', '', item));
        }
        if (list.children.length) container.append(list);
      } else if (block?.type === 'entity_card' && typeof block.title === 'string') {
        const card = element('article', `entity-card${block.imageUrl ? '' : ' no-image'}`);
        if (typeof block.imageUrl === 'string') {
          const image = element('img', 'entity-image');
          image.src = block.imageUrl;
          image.alt = '';
          image.loading = 'lazy';
          image.referrerPolicy = 'no-referrer';
          card.append(image);
        }
        const body = element('div', 'entity-body');
        body.append(element('div', 'entity-kind', block.entity || 'result'));
        body.append(element('div', 'entity-title', block.title));
        if (typeof block.subtitle === 'string')
          body.append(element('div', 'entity-subtitle', block.subtitle));
        if (typeof block.price === 'string')
          body.append(element('div', 'entity-price', block.price));
        if (Array.isArray(block.fields) && block.fields.length) {
          const fields = element('div', 'entity-fields');
          for (const field of block.fields.slice(0, 3)) {
            if (typeof field?.label === 'string' && typeof field.value === 'string') {
              fields.append(element('span', '', `${field.label}: ${field.value}`));
            }
          }
          body.append(fields);
        }
        if (typeof block.href === 'string') {
          const link = element('a', 'entity-link', 'View details');
          link.href = block.href;
          link.rel = 'noopener noreferrer';
          body.append(link);
        }
        card.append(body);
        container.append(card);
      }
    }
    if (container.children.length) copy.replaceChildren(container);
    node.classList.remove('pending');
    messages.scrollTop = messages.scrollHeight;
  };

  const addFeedback = (node, messageId) => {
    if (!messageId || !conversationId) return;
    const controls = element('div', 'message-feedback');
    controls.setAttribute('aria-label', 'Rate this answer');
    for (const [rating, labelText, glyph] of [
      ['helpful', 'Helpful', '↑'],
      ['unhelpful', 'Not helpful', '↓'],
    ]) {
      const button = element('button', 'feedback-button', glyph);
      button.type = 'button';
      button.setAttribute('aria-label', labelText);
      button.addEventListener('click', async () => {
        for (const child of controls.children) child.disabled = true;
        try {
          await postJson(
            `${config.apiOrigin}/api/web-agent/feedback`,
            { conversationId, messageId, rating },
            token,
          );
          for (const child of controls.children) child.classList.remove('selected');
          button.classList.add('selected');
        } catch {
          for (const child of controls.children) child.disabled = false;
        }
      });
      controls.append(button);
    }
    node.append(controls);
  };

  const setStatus = (message = '', tone = 'neutral') => {
    status.textContent = message;
    status.dataset.tone = tone;
  };

  const finishNavigation = (problem, immediate = false) => {
    if (navigationTimer) window.clearTimeout(navigationTimer);
    navigationTimer = undefined;
    if (navigationCompletionListener) {
      window.removeEventListener('voomate:navigation-complete', navigationCompletionListener);
      navigationCompletionListener = undefined;
    }
    const remaining = immediate ? 0 : Math.max(0, 360 - (Date.now() - navigationShownAt));
    if (remaining > 0) {
      navigationShownAt = 0;
      navigationTimer = window.setTimeout(() => finishNavigation(problem, true), remaining);
      return;
    }
    navigationStage.classList.remove('active');
    persistJourney(Boolean(voiceSession || voiceStarting));
    if (problem) setStatus(problem, 'error');
  };

  const executeClientCommands = (commands, pageContext) => {
    const resolved = resolveClientNavigation(commands, pageContext);
    if (!resolved) {
      if (Array.isArray(commands) && commands.some((command) => command?.type === 'navigate')) {
        setStatus('That destination could not be verified, so I kept you on this page.', 'error');
      }
      return;
    }
    const requestId = window.crypto.randomUUID();
    navigationTitle.textContent =
      resolved.kind === 'store'
        ? `Opening the app store for ${resolved.command.label}`
        : resolved.kind === 'app'
          ? `Opening ${resolved.command.label} in the app`
          : `Opening ${resolved.command.label}`;
    navigationDetail.textContent =
      resolved.kind === 'web'
        ? 'Keeping this conversation and voice state active while the page changes.'
        : 'Handing off securely to your operating system.';
    navigationStage.classList.add('active');
    navigationShownAt = Date.now();
    persistJourney(Boolean(voiceSession || voiceStarting));

    if (resolved.kind === 'web') {
      const request = new window.CustomEvent('voomate:navigation-request', {
        cancelable: true,
        detail: {
          requestId,
          url: resolved.destination,
          label: resolved.command.label,
          mode: 'push',
        },
      });
      navigationCompletionListener = (event) => {
        if (event.detail?.requestId !== requestId) return;
        window.setTimeout(() => {
          voiceSession?.updatePageContext(window.location.href, collectPageContext());
        }, 80);
        finishNavigation(event.detail?.ok === false ? 'The page could not be opened.' : undefined);
      };
      window.addEventListener('voomate:navigation-complete', navigationCompletionListener);
      const browserFallback = window.dispatchEvent(request);
      navigationTimer = window.setTimeout(
        () => {
          if (window.location.href === resolved.destination) finishNavigation();
          else if (browserFallback) window.location.assign(resolved.destination);
          else finishNavigation('The application did not complete the page change.');
        },
        browserFallback ? 500 : 8_000,
      );
      return;
    }

    navigationTimer = window.setTimeout(() => {
      window.location.assign(resolved.destination);
      if (resolved.kind === 'app' && resolved.fallback) {
        navigationTimer = window.setTimeout(() => {
          if (document.visibilityState === 'visible') window.location.assign(resolved.fallback);
        }, 1_500);
      }
    }, 450);
  };

  navigationCancel.addEventListener('click', () => finishNavigation(undefined, true));

  const setVoiceState = (state) => {
    sphere.setState(state);
    launcher.dataset.state = state;
    compactIsland.dataset.state = state;
    compactIsland.dataset.voiceActive = String(state !== 'ended');
    voiceStage.dataset.state = state;
    const labels = {
      connecting: 'Connecting securely',
      listening: 'I’m listening',
      thinking: `${name.textContent} is thinking`,
      speaking: `${name.textContent} is speaking`,
      ended: 'Voice ended',
    };
    const currentLabel = state === 'ended' ? 'Online for chat' : labels[state] || 'Voice mode';
    voiceTitle.textContent = labels[state] || 'Voice mode';
    presence.textContent = currentLabel;
    compactStatus.textContent = currentLabel;
    compactStop.setAttribute('aria-hidden', String(state === 'ended'));
    presence.setAttribute('aria-hidden', String(state !== 'ended'));
  };

  const stopVoice = async () => {
    if (voiceStopping) return;
    voiceStopping = true;
    voiceRequestId += 1;
    voiceStarting = false;
    const active = voiceSession;
    voiceSession = undefined;
    mic.classList.remove('active');
    mic.setAttribute('aria-pressed', 'false');
    mic.setAttribute('aria-label', 'Start voice conversation');
    voiceStage.classList.remove('active');
    panel.classList.remove('voice-active');
    shell.style.setProperty('--audio-level', '0');
    sphere.setActive(false);
    setVoiceState('ended');
    try {
      if (active) await active.disconnect().catch(() => undefined);
    } finally {
      voiceStopping = false;
      persistJourney(false);
      if (isOpen && matchMedia('(pointer:fine)').matches) input.focus();
    }
  };

  const renderAttachments = () => {
    attachments.replaceChildren();
    selectedFiles.forEach((file, index) => {
      const preview = element('div', 'preview');
      const image = element('img');
      const objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      image.alt = '';
      image.addEventListener('load', () => URL.revokeObjectURL(objectUrl), { once: true });
      const fileName = element('span', 'preview-name', file.name);
      const remove = element('button', 'remove', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.addEventListener('click', () => {
        selectedFiles = selectedFiles.filter((_, selectedIndex) => selectedIndex !== index);
        renderAttachments();
        setStatus(selectedFiles.length ? `${selectedFiles.length} of 2 images selected` : '');
      });
      preview.append(image, fileName, remove);
      attachments.append(preview);
    });
  };

  const selectImages = (files) => {
    const candidates = [...files];
    if (selectedFiles.length + candidates.length > 2) {
      setStatus('You can attach a maximum of 2 images per message.', 'error');
      return;
    }
    for (const file of candidates) {
      if (!allowedImageTypes.has(file.type)) {
        setStatus('Only JPG, PNG, and WebP images are allowed.', 'error');
        return;
      }
      if (file.size < 1 || file.size > maxImageBytes) {
        setStatus('Each image must be 5 MB or smaller.', 'error');
        return;
      }
    }
    selectedFiles = [...selectedFiles, ...candidates];
    setStatus(`${selectedFiles.length} of 2 images selected`);
    renderAttachments();
  };

  const uploadImages = async () => {
    if (selectedFiles.length === 0) return [];
    const signing = await postJson(
      `${config.apiOrigin}/api/web-agent/images/sign`,
      {
        conversationId,
        files: selectedFiles.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      },
      token,
    );
    if (signing.uploads.length !== selectedFiles.length) {
      throw new Error('The secure image upload could not be prepared.');
    }
    for (let index = 0; index < selectedFiles.length; index += 1) {
      const formData = new FormData();
      formData.append('cacheControl', '0');
      formData.append('', selectedFiles[index]);
      const upload = await fetch(signing.uploads[index].signedUrl, {
        method: 'PUT',
        headers: { 'x-upsert': 'false' },
        body: formData,
        credentials: 'omit',
      });
      if (!upload.ok) {
        const problem = await upload.json().catch(() => ({}));
        throw new Error(problem.message || 'An image upload failed.');
      }
    }
    const imageIds = signing.uploads.map((upload) => upload.id);
    await postJson(`${config.apiOrigin}/api/web-agent/images/finalize`, { imageIds }, token);
    return imageIds;
  };

  const streamMessage = async (message, imageIds, node) => {
    const pageContext = collectPageContext();
    await refreshSession();
    const requestTurn = () =>
      fetch(`${config.apiOrigin}/api/web-agent/messages/stream`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message,
          imageIds,
          conversationId,
          pageUrl: window.location.href,
          pageContext,
          channel: 'text',
        }),
        credentials: 'omit',
        cache: 'no-store',
      });
    let response = await requestTurn();
    if (response.status === 401 || response.status === 403) {
      await refreshSession(true);
      response = await requestTurn();
    }
    if (!response.ok || !response.body) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.error || 'The assistant could not be reached.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let answer = '';
    let messageId;
    let clientCommands = [];
    let presentation;
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line) continue;
        const event = JSON.parse(line);
        if (event.type === 'start') {
          conversationId = event.conversationId;
          persistJourney(Boolean(voiceSession || voiceStarting));
        }
        if (event.type === 'delta' && typeof event.text === 'string') {
          answer += event.text;
          setMessageText(node, answer);
        }
        if (event.type === 'done') {
          conversationId = event.conversationId ?? conversationId;
          messageId = event.messageId ?? messageId;
          clientCommands = Array.isArray(event.clientCommands) ? event.clientCommands : [];
          presentation = event.presentation;
          persistJourney(Boolean(voiceSession || voiceStarting));
          if (!answer && typeof event.message === 'string') {
            answer = event.message;
            setMessageText(node, answer);
          }
        }
        if (event.type === 'error') throw new Error(event.error);
      }
      if (done) break;
    }
    if (!answer) throw new Error('The assistant returned an empty response.');
    renderPresentation(node, presentation);
    addFeedback(node, messageId);
    executeClientCommands(clientCommands, pageContext);
  };

  const closeToLauncher = async () => {
    if (voiceSession || voiceStarting) await stopVoice();
    setViewMode('closed');
  };

  minimize.addEventListener('click', () => setViewMode('compact'));
  headerClose.addEventListener('click', () => void closeToLauncher());
  compactOpen.addEventListener('click', () => setViewMode('open'));
  compactClose.addEventListener('click', () => void closeToLauncher());
  compactStop.addEventListener('click', (event) => {
    event.stopPropagation();
    void stopVoice();
  });
  launcher.addEventListener('click', () => setViewMode('open'));
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setViewMode('compact');
  });
  attach.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files) selectImages(fileInput.files);
    fileInput.value = '';
  });
  panel.addEventListener('dragover', (event) => {
    event.preventDefault();
    panel.classList.add('dragging');
  });
  panel.addEventListener('dragleave', (event) => {
    if (!panel.contains(event.relatedTarget)) panel.classList.remove('dragging');
  });
  panel.addEventListener('drop', (event) => {
    event.preventDefault();
    panel.classList.remove('dragging');
    if (event.dataTransfer?.files) selectImages(event.dataTransfer.files);
  });

  requestAnimationFrame(() => setViewMode(viewMode));
  try {
    let session;
    try {
      session = await postJson(`${config.apiOrigin}/api/web-agent/session`, {
        publicKey: config.publicKey,
        ...(continuationToken ? { continuationToken } : {}),
        ...(conversationId ? { conversationId } : {}),
      });
    } catch (error) {
      if (!continuationToken) throw error;
      clearJourney(config.publicKey);
      continuationToken = undefined;
      conversationId = undefined;
      resumeVoiceAfterReload = false;
      session = await postJson(`${config.apiOrigin}/api/web-agent/session`, {
        publicKey: config.publicKey,
      });
    }
    token = session.session.token;
    tokenExpiresAt = Date.now() + Number(session.session.expiresIn ?? 0) * 1000;
    continuationToken = session.session.continuationToken;
    voiceConfig = session.agent.voice;
    name.textContent = session.agent.displayName;
    compactName.textContent = session.agent.displayName;
    presence.textContent = 'Online for chat';
    compactStatus.textContent = 'Online for chat';
    if (session.resumedConversation?.conversationId) {
      conversationId = session.resumedConversation.conversationId;
      for (const message of session.resumedConversation.messages ?? []) {
        if (message.role !== 'visitor' && message.role !== 'agent') continue;
        addMessage(message.role === 'visitor' ? 'visitor' : 'assistant', message.content);
      }
    } else {
      addMessage('assistant', session.agent.greeting);
    }
    persistJourney(resumeVoiceAfterReload);

    const micAvailable = Boolean(navigator.mediaDevices?.getUserMedia);
    if (!session.agent.voiceEnabled || !voiceConfig || !micAvailable) {
      mic.hidden = true;
      if (session.agent.voiceEnabled && !micAvailable) {
        presence.textContent = 'Chat available';
        compactStatus.textContent = 'Chat available';
      }
    }
  } catch (error) {
    presence.textContent = 'Unavailable';
    compactStatus.textContent = 'Unavailable';
    addMessage('assistant', error instanceof Error ? error.message : 'Assistant unavailable.');
    input.disabled = true;
    attach.disabled = true;
    mic.disabled = true;
    return;
  }

  const startVoice = async () => {
    if (!token || !voiceConfig || voiceSession || voiceStarting) return;
    const requestId = ++voiceRequestId;
    voiceStarting = true;
    voiceStage.classList.add('active');
    panel.classList.add('voice-active');
    mic.classList.add('active');
    mic.setAttribute('aria-pressed', 'true');
    mic.setAttribute('aria-label', 'Stop voice conversation');
    sphere.setActive(isOpen);
    setVoiceState('connecting');
    requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
    });
    try {
      const module = await import(`${config.apiOrigin}/embed/v2/voice-client.js`);
      const nextSession = await module.createVoiceSession({
        endpoint: voiceConfig.startUrl,
        sessionToken: token,
        conversationId,
        pageUrl: window.location.href,
        pageContext: collectPageContext(),
        audioElement: audio,
        onState: (state) => {
          if (state === 'ended') void stopVoice();
          else setVoiceState(state);
        },
        onAudioLevel: (source, level) => {
          const normalized = sphere.setLevel(source === 'user' ? 'user' : 'assistant', level);
          shell.style.setProperty('--audio-level', normalized.toFixed(3));
        },
        onAudioSpectrum: (source, spectrum) => {
          sphere.setSpectrum(source === 'user' ? 'user' : 'assistant', spectrum);
        },
        onUserTranscript: (text, final) => {
          if (!voiceUserNode) voiceUserNode = addMessage('visitor', text);
          else setMessageText(voiceUserNode, text);
          if (final) {
            voiceUserNode = undefined;
            voiceAssistantNode = undefined;
          }
        },
        onAssistantDelta: (text) => {
          if (!voiceAssistantNode) voiceAssistantNode = addMessage('assistant', '');
          const copy = voiceAssistantNode.querySelector('.message-copy');
          if (copy) copy.textContent += text;
          messages.scrollTop = messages.scrollHeight;
        },
        onConversationId: (value) => {
          conversationId = value;
          voiceAssistantNode = undefined;
          persistJourney(true);
        },
        onClientCommands: (commands) => {
          executeClientCommands(commands, collectPageContext());
        },
        onTranscriptRejected: () => {
          setStatus('I didn’t catch that clearly. Please say it again.');
          setVoiceState('listening');
        },
        onError: (message) => {
          setStatus(message, 'error');
          void stopVoice();
        },
      });
      if (requestId !== voiceRequestId) {
        await nextSession.disconnect().catch(() => undefined);
        return;
      }
      voiceSession = nextSession;
      sphere.setActive(isOpen);
    } catch (error) {
      if (requestId !== voiceRequestId) return;
      const blocked = error instanceof DOMException && error.name === 'NotAllowedError';
      setStatus(
        blocked
          ? 'Microphone permission was blocked. Chat is still available.'
          : 'Voice is temporarily unavailable. Chat is still available.',
        'error',
      );
      await stopVoice();
    } finally {
      if (requestId === voiceRequestId) voiceStarting = false;
    }
  };

  mic.addEventListener('click', () => {
    if (voiceSession || voiceStarting) void stopVoice();
    else void startVoice();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const typed = input.value.trim();
    const message =
      typed || (selectedFiles.length ? 'Please help me understand these images.' : '');
    if (!message || !token || form.classList.contains('busy')) return;
    if (voiceSession || voiceStarting) await stopVoice();
    form.classList.add('busy');
    input.disabled = true;
    attach.disabled = true;
    mic.disabled = true;
    setStatus(selectedFiles.length ? 'Securing and optimizing images' : '');
    compactStatus.textContent = selectedFiles.length
      ? 'Preparing images'
      : `${name.textContent} is thinking`;
    let assistantNode;
    let completed = false;
    try {
      const imageIds = await uploadImages();
      addMessage('visitor', typed || message, {
        meta: imageIds.length
          ? `${imageIds.length} image${imageIds.length > 1 ? 's' : ''} attached`
          : undefined,
      });
      input.value = '';
      selectedFiles = [];
      renderAttachments();
      setStatus('');
      compactStatus.textContent = `${name.textContent} is thinking`;
      assistantNode = addMessage('assistant', '', { pending: true });
      await streamMessage(message, imageIds, assistantNode);
      completed = true;
    } catch (error) {
      const text = error instanceof Error ? error.message : 'I could not complete that request.';
      if (assistantNode) setMessageText(assistantNode, text);
      else addMessage('assistant', text);
      setStatus(text, 'error');
      compactStatus.textContent = 'Needs attention';
    } finally {
      form.classList.remove('busy');
      input.disabled = false;
      attach.disabled = false;
      mic.disabled = false;
      if (completed) compactStatus.textContent = 'Online for chat';
      if (isOpen && matchMedia('(pointer:fine)').matches) input.focus();
    }
  });

  input.disabled = false;
  attach.disabled = false;
  mic.disabled = false;

  if (resumeVoiceAfterReload) {
    persistJourney(false);
    window.setTimeout(() => void startVoice(), 0);
  }
}
