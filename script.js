(function(){
"use strict";

/* ============================ CHESS ENGINE ============================ */
function initialBoard(){
  const b = Array.from({length:8},()=>Array(8).fill(null));
  const back = ['R','N','B','Q','K','B','N','R'];
  for(let c=0;c<8;c++){ b[0][c]='b'+back[c]; b[1][c]='bP'; b[6][c]='wP'; b[7][c]='w'+back[c]; }
  return b;
}
function cloneBoard(b){ return b.map(row=>row.slice()); }
function pieceColor(p){ return p? p[0] : null; }
function pieceType(p){ return p? p[1] : null; }
function opp(c){ return c==='w'?'b':'w'; }
function inBounds(r,c){ return r>=0&&r<8&&c>=0&&c<8; }
function sqName(r,c){ return 'abcdefgh'[c] + (8-r); }

function pseudoMoves(state,r,c){
  const p = state.board[r][c]; if(!p) return [];
  const color = pieceColor(p), type = pieceType(p);
  const moves = [];
  const push = (tr,tc,flags)=>{ if(inBounds(tr,tc)) moves.push(Object.assign({from:{r,c},to:{r:tr,c:tc}},flags||{})); };

  if(type==='P'){
    const dir = color==='w'? -1 : 1;
    const startRow = color==='w'? 6 : 1;
    const promoRow = color==='w'? 0 : 7;
    if(inBounds(r+dir,c) && !state.board[r+dir][c]){
      push(r+dir,c,{promotion:(r+dir===promoRow)});
      if(r===startRow && !state.board[r+2*dir][c]) push(r+2*dir,c,{doubleStep:true});
    }
    for(const dc of [-1,1]){
      const tr=r+dir, tc=c+dc;
      if(!inBounds(tr,tc)) continue;
      const target = state.board[tr][tc];
      if(target && pieceColor(target)!==color) push(tr,tc,{capture:true, promotion:(tr===promoRow)});
      else if(state.enPassant && state.enPassant.r===tr && state.enPassant.c===tc) push(tr,tc,{capture:true, enPassant:true});
    }
  } else if(type==='N'){
    const d=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for(const [dr,dc] of d){ const tr=r+dr,tc=c+dc; if(inBounds(tr,tc)){ const t=state.board[tr][tc]; if(!t||pieceColor(t)!==color) push(tr,tc,{capture:!!t}); } }
  } else if(type==='B'||type==='R'||type==='Q'){
    let dirs=[];
    if(type==='B'||type==='Q') dirs=dirs.concat([[-1,-1],[-1,1],[1,-1],[1,1]]);
    if(type==='R'||type==='Q') dirs=dirs.concat([[-1,0],[1,0],[0,-1],[0,1]]);
    for(const [dr,dc] of dirs){
      let tr=r+dr, tc=c+dc;
      while(inBounds(tr,tc)){
        const t=state.board[tr][tc];
        if(!t) push(tr,tc,{});
        else { if(pieceColor(t)!==color) push(tr,tc,{capture:true}); break; }
        tr+=dr; tc+=dc;
      }
    }
  } else if(type==='K'){
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc) continue;
      const tr=r+dr,tc=c+dc;
      if(inBounds(tr,tc)){ const t=state.board[tr][tc]; if(!t||pieceColor(t)!==color) push(tr,tc,{capture:!!t}); }
    }
    const rights = state.castling, rank = color==='w'?7:0;
    if(r===rank && c===4){
      if(rights[color+'K'] && !state.board[rank][5] && !state.board[rank][6] && state.board[rank][7]===color+'R'){
        if(!isSquareAttacked(state.board,rank,4,opp(color)) && !isSquareAttacked(state.board,rank,5,opp(color)) && !isSquareAttacked(state.board,rank,6,opp(color)))
          push(rank,6,{castle:'K'});
      }
      if(rights[color+'Q'] && !state.board[rank][3] && !state.board[rank][2] && !state.board[rank][1] && state.board[rank][0]===color+'R'){
        if(!isSquareAttacked(state.board,rank,4,opp(color)) && !isSquareAttacked(state.board,rank,3,opp(color)) && !isSquareAttacked(state.board,rank,2,opp(color)))
          push(rank,2,{castle:'Q'});
      }
    }
  }
  return moves;
}

function isSquareAttacked(board,r,c,byColor){
  if(byColor==='w'){ for(const dc of [-1,1]){ const pr=r+1,pc=c+dc; if(inBounds(pr,pc) && board[pr][pc]==='wP') return true; } }
  else { for(const dc of [-1,1]){ const pr=r-1,pc=c+dc; if(inBounds(pr,pc) && board[pr][pc]==='bP') return true; } }
  const kn=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for(const [dr,dc] of kn){ const tr=r+dr,tc=c+dc; if(inBounds(tr,tc) && board[tr][tc]===byColor+'N') return true; }
  for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){ if(!dr&&!dc) continue; const tr=r+dr,tc=c+dc; if(inBounds(tr,tc) && board[tr][tc]===byColor+'K') return true; }
  for(const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]){
    let tr=r+dr,tc=c+dc;
    while(inBounds(tr,tc)){ const p=board[tr][tc]; if(p){ if(pieceColor(p)===byColor && (pieceType(p)==='B'||pieceType(p)==='Q')) return true; break; } tr+=dr; tc+=dc; }
  }
  for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
    let tr=r+dr,tc=c+dc;
    while(inBounds(tr,tc)){ const p=board[tr][tc]; if(p){ if(pieceColor(p)===byColor && (pieceType(p)==='R'||pieceType(p)==='Q')) return true; break; } tr+=dr; tc+=dc; }
  }
  return false;
}

function findKing(board,color){
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]===color+'K') return {r,c};
  return null;
}
function isInCheck(state,color){ const k=findKing(state.board,color); return k? isSquareAttacked(state.board,k.r,k.c,opp(color)) : false; }

function applyMove(state, move, promoChoice){
  const ns = { board: cloneBoard(state.board), castling: Object.assign({},state.castling), enPassant: null, turn: opp(state.turn) };
  const {from,to} = move;
  const p = ns.board[from.r][from.c];
  const color = pieceColor(p), type = pieceType(p);
  ns.board[from.r][from.c] = null;
  if(move.enPassant){ const capR = color==='w'? to.r+1 : to.r-1; ns.board[capR][to.c] = null; }
  if(move.castle){
    const rank = from.r;
    if(move.castle==='K'){ ns.board[rank][5]=ns.board[rank][7]; ns.board[rank][7]=null; }
    else { ns.board[rank][3]=ns.board[rank][0]; ns.board[rank][0]=null; }
  }
  ns.board[to.r][to.c] = move.promotion ? color+(promoChoice||'Q') : p;
  if(type==='K'){ ns.castling[color+'K']=false; ns.castling[color+'Q']=false; }
  if(type==='R'){
    const homeRank = color==='w'?7:0;
    if(from.r===homeRank && from.c===0) ns.castling[color+'Q']=false;
    if(from.r===homeRank && from.c===7) ns.castling[color+'K']=false;
  }
  if(to.r===0&&to.c===0) ns.castling.bQ=false;
  if(to.r===0&&to.c===7) ns.castling.bK=false;
  if(to.r===7&&to.c===0) ns.castling.wQ=false;
  if(to.r===7&&to.c===7) ns.castling.wK=false;
  if(move.doubleStep) ns.enPassant = { r:(from.r+to.r)/2, c:from.c };
  return ns;
}

function legalMoves(state,color){
  const all=[];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const p=state.board[r][c];
    if(p && pieceColor(p)===color){
      for(const m of pseudoMoves(state,r,c)){
        const ns = applyMove(state,m,'Q');
        if(!isInCheck(ns,color)) all.push(m);
      }
    }
  }
  return all;
}

/* ============================ APP STATE ============================ */
const SYMS = { wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙', bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟' };
const PROMO_PIECES = [['Q','♕'],['R','♖'],['B','♗'],['N','♘']];

/* ---- 3-D SVG CHESS PIECES ---- */
const PIECE_SVG = {};
(function buildPieceSVGs(){
  const S = 45;
  function wrap(inner, light){
    const bodyFill = light?'url(#gLight)':'url(#gDark)';
    const bodyStroke = light?'#3a2c14':'#111';
    const hiFill = light?'rgba(255,250,235,0.55)':'rgba(255,255,255,0.12)';
    const baseFill = light?'#d4c5a0':'#2a1f14';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="100%" height="100%">
      <defs>
        <linearGradient id="gLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#faf3dc"/>
          <stop offset="50%" stop-color="#e8d9b0"/>
          <stop offset="100%" stop-color="#c4a97a"/>
        </linearGradient>
        <linearGradient id="gDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#5a4530"/>
          <stop offset="50%" stop-color="#3a2818"/>
          <stop offset="100%" stop-color="#1a0e06"/>
        </linearGradient>
        <linearGradient id="gBase" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${light?'#c4a97a':'#3a2818'}"/>
          <stop offset="100%" stop-color="${light?'#8a7048':'#0e0804'}"/>
        </linearGradient>
        <filter id="ds"><feDropShadow dx="0.6" dy="1.2" stdDeviation="1" flood-opacity="0.45"/></filter>
      </defs>
      <g filter="url(#ds)" stroke="${bodyStroke}" stroke-width="1.1" stroke-linejoin="round">
        ${inner.replace(/\{fill\}/g, bodyFill).replace(/\{hi\}/g, hiFill)}
      </g>
    </svg>`;
  }

  const king = `<path d="M14,38 Q14,35 22.5,35 Q31,35 31,38 L31,40 Q31,41 30,41 L15,41 Q14,41 14,40 Z" fill="url(#gBase)"/>
    <path d="M18,35 L18,20 Q18,14 22.5,11 Q27,14 27,20 L27,35 Z" fill="{fill}"/>
    <rect x="20" y="5" width="5" height="10" rx="1" fill="{fill}"/>
    <rect x="18" y="8" width="9" height="4" rx="1" fill="{fill}"/>
    <path d="M19,35 Q19,33 22.5,31 Q26,33 26,35" fill="none" stroke="${'{hi}'}" stroke-width="0.8"/>
    <ellipse cx="22.5" cy="18" rx="3" ry="4" fill="{hi}" opacity="0.3"/>`;

  const queen = `<path d="M13,38 Q13,35 22.5,35 Q32,35 32,38 L32,40 Q32,41 31,41 L14,41 Q13,41 13,40 Z" fill="url(#gBase)"/>
    <path d="M16,35 L16,22 Q16,16 22.5,12 Q29,16 29,22 L29,35 Z" fill="{fill}"/>
    <circle cx="22.5" cy="10" r="2.8" fill="{fill}"/>
    <circle cx="22.5" cy="10" r="1.5" fill="{hi}" opacity="0.4"/>
    <path d="M15,18 L18,22 L16,14 Z" fill="{fill}"/>
    <path d="M22.5,14 L22.5,22 L21,13 Z" fill="{fill}"/>
    <path d="M30,18 L27,22 L29,14 Z" fill="{fill}"/>
    <ellipse cx="22.5" cy="20" rx="3.5" ry="5" fill="{hi}" opacity="0.25"/>`;

  const rook = `<path d="M13,38 Q13,35 22.5,35 Q32,35 32,38 L32,40 Q32,41 31,41 L14,41 Q13,41 13,40 Z" fill="url(#gBase)"/>
    <rect x="17" y="18" width="11" height="17" rx="1" fill="{fill}"/>
    <rect x="14" y="10" width="17" height="9" rx="1.5" fill="{fill}"/>
    <rect x="14" y="6" width="3.5" height="5" fill="{fill}"/>
    <rect x="20.75" y="6" width="3.5" height="5" fill="{fill}"/>
    <rect x="27.5" y="6" width="3.5" height="5" fill="{fill}"/>
    <rect x="18" y="20" width="9" height="2" rx="0.5" fill="{hi}" opacity="0.3"/>`;

  const bishop = `<path d="M14,38 Q14,35 22.5,35 Q31,35 31,38 L31,40 Q31,41 30,41 L15,41 Q14,41 14,40 Z" fill="url(#gBase)"/>
    <path d="M17,35 L17,22 Q17,14 22.5,10 Q28,14 28,22 L28,35 Z" fill="{fill}"/>
    <circle cx="22.5" cy="8.5" r="2.2" fill="{fill}"/>
    <circle cx="22.5" cy="8.5" r="1" fill="{hi}" opacity="0.5"/>
    <path d="M20,18 Q22.5,20 25,18" fill="none" stroke="url(#gBase)" stroke-width="1.2"/>
    <ellipse cx="22.5" cy="19" rx="2.5" ry="5" fill="{hi}" opacity="0.2"/>`;

  const knight = `<path d="M14,38 Q14,35 22.5,35 Q31,35 31,38 L31,40 Q31,41 30,41 L15,41 Q14,41 14,40 Z" fill="url(#gBase)"/>
    <path d="M18,35 L17,24 Q17,18 20,14 L19,11 Q18,9 20,8 Q22,7 25,9 L30,16 Q31,18 30,22 L28,35 Z" fill="{fill}"/>
    <ellipse cx="21" cy="12" rx="1.5" ry="1.2" fill="${'{hi}'}" opacity="0.5"/>
    <circle cx="22" cy="14" r="1.3" fill="#111"/>
    <path d="M19,16 Q22,18 25,17" fill="none" stroke="#111" stroke-width="0.8"/>
    <ellipse cx="22" cy="22" rx="3" ry="6" fill="{hi}" opacity="0.15"/>`;

  const pawn = `<path d="M16,38 Q16,35 22.5,35 Q29,35 29,38 L29,40 Q29,41 28,41 L17,41 Q16,41 16,40 Z" fill="url(#gBase)"/>
    <path d="M19,35 L19,24 Q19,18 22.5,14 Q26,18 26,24 L26,35 Z" fill="{fill}"/>
    <circle cx="22.5" cy="12" r="3.8" fill="{fill}"/>
    <circle cx="22.5" cy="12" r="2.2" fill="{hi}" opacity="0.3"/>`;

  const pieces = {K:king, Q:queen, R:rook, B:bishop, N:knight, P:pawn};
  for(const [type, svg] of Object.entries(pieces)){
    PIECE_SVG['w'+type] = wrap(svg, true);
    PIECE_SVG['b'+type] = wrap(svg, false);
  }
})();

let roomCode = null;
let myRole = null; // 'w' or 'b'
let pollTimer = null;
let lastUpdatedAt = 0;
let selected = null; // {r,c}
let legalTargets = [];
let localState = null; // {board,castling,enPassant,turn}
let roomMeta = { status:'waiting', winner:null, lastMove:null, moveHistory:[] };
let pendingPromo = null;

function freshRoom(){
  return {
    board: initialBoard(),
    castling: { wK:true, wQ:true, bK:true, bQ:true },
    enPassant: null,
    turn: 'w',
    status: 'active',
    winner: null,
    lastMove: null,
    moveHistory: [],
    players: { white:true, black:false },
    updatedAt: Date.now()
  };
}

function currentStateObj(){
  return {
    board: localState.board,
    castling: localState.castling,
    enPassant: localState.enPassant,
    turn: localState.turn,
    status: roomMeta.status,
    winner: roomMeta.winner,
    lastMove: roomMeta.lastMove,
    moveHistory: roomMeta.moveHistory,
    players: roomMeta.players
  };
}

async function writeRoom(){
  const state = currentStateObj();
  try{
    const res = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomCode, state })
    });
    if(!res.ok){ console.error('write failed', res.status); return false; }
    const data = await res.json();
    lastUpdatedAt = data.updatedAt;
    return true;
  }catch(e){ console.error('write failed', e); return false; }
}

function applyIncomingRoom(room, updatedAt){
  localState = { board: room.board, castling: room.castling, enPassant: room.enPassant, turn: room.turn };
  roomMeta = { status: room.status, winner: room.winner, lastMove: room.lastMove, moveHistory: room.moveHistory||[], players: room.players };
  lastUpdatedAt = updatedAt;
  selected = null; legalTargets = [];
  render();
}

function startPolling(){
  stopSync();
  pollTimer = setInterval(async ()=>{
    try{
      const res = await fetch('/api/room?code=' + encodeURIComponent(roomCode));
      if(!res.ok) return;
      const data = await res.json();
      if(data.updatedAt !== lastUpdatedAt){
        applyIncomingRoom(data.state, data.updatedAt);
        onRoomUpdated(data.state);
      }
    }catch(e){ /* transient network error, try again next tick */ }
  }, 1200);
}
function stopSync(){
  if(pollTimer){ clearInterval(pollTimer); pollTimer = null; }
}

function onRoomUpdated(room){
  if(room.players && room.players.white && room.players.black){
    if(screenName()==='lobbyScreen') goTo('placeScreen');
  }
  if(room.status && room.status!=='active' && screenName()==='gameScreen'){
    showGameOver(room);
  }
}

/* ============================ SCREENS ============================ */
function screenName(){
  const active = document.querySelector('.screen.active');
  return active ? active.id : null;
}
function goTo(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ---- Home ---- */
const homeError = document.getElementById('homeError');
document.getElementById('showJoinBtn').addEventListener('click', ()=>{
  document.getElementById('joinBox').style.display='block';
});
document.getElementById('hostBtn').addEventListener('click', async ()=>{
  homeError.textContent='';
  const btn = document.getElementById('hostBtn');
  btn.disabled = true;
  roomCode = genCode();
  myRole = 'w';
  const room = freshRoom();
  localState = { board:room.board, castling:room.castling, enPassant:room.enPassant, turn:room.turn };
  roomMeta = { status:room.status, winner:room.winner, lastMove:room.lastMove, moveHistory:room.moveHistory, players:room.players };
  const ok = await writeRoom();
  if(!ok){
    homeError.textContent='Could not create room. Make sure the app is deployed to Vercel with Redis env vars set.';
    btn.disabled = false;
    roomCode = null; myRole = null; localState = null;
    return;
  }
  document.getElementById('lobbyCode').textContent = roomCode;
  document.getElementById('lobbyStatus').textContent = 'Waiting for opponent to join…';
  goTo('lobbyScreen');
  startPolling();
});
document.getElementById('joinBtn').addEventListener('click', async ()=>{
  homeError.textContent='';
  const code = document.getElementById('joinInput').value.trim().toUpperCase();
  if(code.length!==4){ homeError.textContent='Enter the 4-character code.'; return; }
  try{
    const getRes = await fetch('/api/room?code=' + encodeURIComponent(code));
    if(getRes.status===404){ homeError.textContent='Room not found. Make sure the host created the room on the same app URL.'; return; }
    if(!getRes.ok){ homeError.textContent='Server error ('+getRes.status+'). Try again.'; return; }
    const data = await getRes.json();
    const room = data.state;
    if(room.players.black){ homeError.textContent='That room is already full.'; return; }
    roomCode = code; myRole='b';
    room.players.black = true;
    localState = { board:room.board, castling:room.castling, enPassant:room.enPassant, turn:room.turn };
    roomMeta = { status:room.status, winner:room.winner, lastMove:room.lastMove, moveHistory:room.moveHistory, players:room.players };
    const postRes = await fetch('/api/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state: room })
    });
    if(!postRes.ok){ homeError.textContent='Could not join room. Try again.'; return; }
    const postData = await postRes.json();
    lastUpdatedAt = postData.updatedAt;
    startPolling();
    goTo('placeScreen');
  }catch(e){ homeError.textContent='Could not reach the server. Check your connection.'; }
});
document.getElementById('lobbyCancel').addEventListener('click', ()=>{
  stopSync();
  roomCode = null; myRole = null; localState = null; roomMeta = { status:'waiting', winner:null, lastMove:null, moveHistory:[] };
  document.getElementById('hostBtn').disabled = false;
  goTo('homeScreen');
});
function genCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s=''; for(let i=0;i<4;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}

/* ============================ AR PLACEMENT ============================ */
let camOn = false;
document.getElementById('enableCamBtn').addEventListener('click', async ()=>{
  const btn = document.getElementById('enableCamBtn');
  btn.textContent = 'Starting camera...';
  btn.disabled = true;
  try{
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      throw new Error('Camera API not supported in this browser');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment', width:{ideal:1280}, height:{ideal:720} }, audio:false });
    const video = document.getElementById('cam');
    video.srcObject = stream;
    await video.play();
    video.classList.add('on');
    camOn = true;
    btn.textContent = 'Camera on';
  }catch(e){
    console.warn('Camera error:', e.name, e.message);
    let msg = 'Camera unavailable';
    if(e.name==='NotAllowedError') msg = 'Camera permission denied — allow in browser settings';
    else if(e.name==='NotFoundError') msg = 'No camera found on this device';
    else if(e.name==='NotReadableError') msg = 'Camera is in use by another app';
    else if(e.message) msg = msg + ' ('+e.message+')';
    btn.textContent = msg;
  }
});

let ar = { x:0, y:0, scale:1, rot:0 };
const mount = document.getElementById('placeMount');
function applyMountTransform(){
  mount.style.transform = `translate3d(calc(-50% + ${ar.x}px), calc(-50% + ${ar.y}px), 0) scale(${ar.scale}) rotateZ(${ar.rot}deg)`;
}
applyMountTransform();

(function setupGestures(){
  const stage = document.getElementById('arStage');
  const pointers = new Map();
  let mode = null; // 'drag' | 'pinch'
  let start = {};
  stage.addEventListener('pointerdown', e=>{
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, {x:e.clientX,y:e.clientY});
    if(pointers.size===1){
      mode='drag'; start = { x:e.clientX, y:e.clientY, ox:ar.x, oy:ar.y };
    } else if(pointers.size===2){
      const pts = [...pointers.values()];
      start = {
        d: dist(pts[0],pts[1]), ang: angle(pts[0],pts[1]),
        oscale: ar.scale, orot: ar.rot
      };
      mode='pinch';
    }
  });
  stage.addEventListener('pointermove', e=>{
    if(!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, {x:e.clientX,y:e.clientY});
    if(mode==='drag' && pointers.size===1){
      ar.x = start.ox + (e.clientX-start.x);
      ar.y = start.oy + (e.clientY-start.y);
      applyMountTransform();
    } else if(mode==='pinch' && pointers.size===2){
      const pts=[...pointers.values()];
      const d = dist(pts[0],pts[1]), a = angle(pts[0],pts[1]);
      ar.scale = Math.max(0.5, Math.min(2.2, start.oscale * (d/start.d)));
      ar.rot = start.orot + (a-start.ang);
      applyMountTransform();
    }
  });
  function endPointer(e){
    pointers.delete(e.pointerId);
    if(pointers.size===0) mode=null;
    else if(pointers.size===1){
      const [only] = pointers.values();
      mode='drag'; start = { x:only.x, y:only.y, ox:ar.x, oy:ar.y };
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }
  function angle(a,b){ return Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI; }
})();

document.getElementById('lockBtn').addEventListener('click', ()=>{
  goTo('gameScreen');
  render();
});
document.getElementById('adjustBtn').addEventListener('click', ()=>{
  goTo('placeScreen');
});

/* ============================ RENDERING ============================ */
function buildEmptyGrid(gridEl){
  gridEl.innerHTML='';
  const cells = [];
  for(let i=0;i<64;i++){
    const d = document.createElement('div');
    d.className='sq';
    gridEl.appendChild(d);
    cells.push(d);
  }
  return cells;
}
const placeCells = buildEmptyGrid(document.getElementById('placeGrid'));
const playCells = buildEmptyGrid(document.getElementById('playGrid'));

function visualOrder(){
  const order = [];
  const flip = myRole==='b';
  for(let vr=0; vr<8; vr++){
    for(let vc=0; vc<8; vc++){
      const r = flip? 7-vr : vr;
      const c = flip? 7-vc : vc;
      order.push({r,c});
    }
  }
  return order;
}

function render(){
  if(!localState) { renderStatic(placeCells); renderStatic(playCells); return; }
  const order = visualOrder();
  const check = { w: isInCheck(localState,'w'), b: isInCheck(localState,'b') };
  const kingPos = { w: findKing(localState.board,'w'), b: findKing(localState.board,'b') };

  [placeCells, playCells].forEach(cells=>{
    order.forEach((pos,i)=>{
      const cell = cells[i];
      const {r,c} = pos;
      const isLight = (r+c)%2===0;
      cell.className = 'sq ' + (isLight?'light':'dark');
      cell.dataset.r = r; cell.dataset.c = c;
      const p = localState.board[r][c];
      cell.innerHTML = p ? `<span class="piece ${pieceColor(p)}">${PIECE_SVG[p]||''}</span>` : '';
      if(roomMeta.lastMove){
        const {from,to} = roomMeta.lastMove;
        if((from.r===r&&from.c===c)||(to.r===r&&to.c===c)) cell.classList.add('lastmove');
      }
      if(selected && selected.r===r && selected.c===c) cell.classList.add('selected');
      const lt = legalTargets.find(m=>m.to.r===r&&m.to.c===c);
      if(lt){ cell.classList.add('legal'); if(lt.capture) cell.classList.add('capture'); }
      if((check.w && kingPos.w && kingPos.w.r===r && kingPos.w.c===c) || (check.b && kingPos.b && kingPos.b.r===r && kingPos.b.c===c)){
        cell.classList.add('check');
      }
    });
  });

  const turnLabel = document.getElementById('turnLabel');
  const turnDot = document.getElementById('turnDot');
  turnLabel.textContent = (localState.turn==='w'?'White':'Black') + ' to move';
  turnDot.className = 'turn-dot' + (localState.turn==='b' ? ' b' : '');
  document.getElementById('roleTag').textContent = 'You are ' + (myRole==='w'?'White':'Black');

  const panel = document.getElementById('movesPanel');
  panel.innerHTML = roomMeta.moveHistory.map((m,i)=>`<div>${i+1}. ${m}</div>`).join('') || '<div>No moves yet</div>';
  panel.scrollTop = panel.scrollHeight;
}
function renderStatic(cells){
  const b = initialBoard();
  const order = (function(){ const o=[]; for(let r=0;r<8;r++) for(let c=0;c<8;c++) o.push({r,c}); return o; })();
  order.forEach((pos,i)=>{
    const cell = cells[i]; const {r,c}=pos;
    cell.className = 'sq ' + ((r+c)%2===0?'light':'dark');
    const p = b[r][c];
    cell.innerHTML = p? `<span class="piece ${pieceColor(p)}">${PIECE_SVG[p]||''}</span>` : '';
  });
}

/* ============================ INTERACTION ============================ */
document.getElementById('playGrid').addEventListener('click', onSquareClick);

async function onSquareClick(e){
  const cell = e.target.closest('.sq');
  if(!cell || !localState) return;
  if(roomMeta.status !== 'active') return;
  if(localState.turn !== myRole) return;
  const r = parseInt(cell.dataset.r,10), c = parseInt(cell.dataset.c,10);
  const piece = localState.board[r][c];

  if(selected){
    const move = legalTargets.find(m=>m.to.r===r && m.to.c===c);
    if(move){
      if(move.promotion){
        pendingPromo = move;
        openPromoModal();
        return;
      }
      await commitMove(move);
      return;
    }
  }
  if(piece && pieceColor(piece)===myRole){
    selected = {r,c};
    legalTargets = legalMoves(localState, myRole).filter(m=>m.from.r===r && m.from.c===c);
  } else {
    selected = null; legalTargets = [];
  }
  render();
}

function openPromoModal(){
  const row = document.getElementById('promoRow');
  row.innerHTML='';
  const color = myRole;
  PROMO_PIECES.forEach(([code])=>{
    const b = document.createElement('button');
    b.className='promo-btn';
    b.innerHTML = PIECE_SVG[color+code] || '';
    b.addEventListener('click', async ()=>{
      document.getElementById('promoModal').classList.remove('active');
      const move = pendingPromo; pendingPromo=null;
      await commitMove(move, code);
    });
    row.appendChild(b);
  });
  document.getElementById('promoModal').classList.add('active');
}

async function commitMove(move, promoChoice){
  const mover = localState.turn;
  const fromName = sqName(move.from.r,move.from.c), toName = sqName(move.to.r,move.to.c);
  const ns = applyMove(localState, move, promoChoice);
  localState = ns;
  selected=null; legalTargets=[];

  const nextColor = localState.turn;
  const nextMoves = legalMoves(localState, nextColor);
  const nextInCheck = isInCheck(localState, nextColor);
  if(nextMoves.length===0){
    roomMeta.status = nextInCheck ? 'checkmate' : 'stalemate';
    roomMeta.winner = nextInCheck ? mover : 'draw';
  } else {
    roomMeta.status = 'active'; roomMeta.winner = null;
  }
  roomMeta.lastMove = { from: move.from, to: move.to };
  const moveTxt = fromName + (move.capture?'x':'-') + toName + (promoChoice? '='+promoChoice : '');
  roomMeta.moveHistory = roomMeta.moveHistory.concat([moveTxt]);

  render();
  await writeRoom();
  if(roomMeta.status !== 'active') showGameOver({status:roomMeta.status, winner:roomMeta.winner});
}

document.getElementById('resignBtn').addEventListener('click', async ()=>{
  if(!confirm('Resign this game?')) return;
  roomMeta.status = 'resigned';
  roomMeta.winner = opp(myRole);
  await writeRoom();
  showGameOver({status:'resigned', winner:roomMeta.winner});
});

document.getElementById('movesToggle').addEventListener('click', ()=>{
  document.getElementById('movesPanel').classList.toggle('active');
});

/* ---- Game over ---- */
function showGameOver(room){
  const title = document.getElementById('overTitle');
  const text = document.getElementById('overText');
  if(room.status==='checkmate'){
    title.textContent='Checkmate';
    text.textContent=(room.winner==='w'?'White':'Black')+' wins the game.';
  } else if(room.status==='stalemate'){
    title.textContent='Stalemate';
    text.textContent='The game is a draw — no legal moves remain.';
  } else if(room.status==='resigned'){
    title.textContent='Game over';
    text.textContent=(room.winner==='w'?'White':'Black')+' wins by resignation.';
  } else {
    title.textContent='Game over';
    text.textContent='The game has ended.';
  }
  document.getElementById('overModal').classList.add('active');
}
document.getElementById('rematchBtn').addEventListener('click', async ()=>{
  document.getElementById('overModal').classList.remove('active');
  const fresh = freshRoom();
  fresh.players = { white:true, black:true };
  localState = { board:fresh.board, castling:fresh.castling, enPassant:fresh.enPassant, turn:fresh.turn };
  roomMeta = { status:fresh.status, winner:fresh.winner, lastMove:fresh.lastMove, moveHistory:fresh.moveHistory, players:fresh.players };
  await writeRoom();
  goTo('gameScreen');
  render();
});
document.getElementById('homeBtn').addEventListener('click', ()=>{
  document.getElementById('overModal').classList.remove('active');
  stopSync();
  roomCode=null; myRole=null; localState=null; roomMeta = { status:'waiting', winner:null, lastMove:null, moveHistory:[] };
  document.getElementById('hostBtn').disabled = false;
  goTo('homeScreen');
});

render();
})();
