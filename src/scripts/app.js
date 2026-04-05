// ======================================================================
// APP STATE & LOGIC
// ======================================================================
var S = {
  chess: null, moves: [], idx: -1, flipped: false, selSq: null, legalSqs: [],
  lastMv: null, apiKey: '', rep: { white: [], black: [] }, selCol: 'white',
  tree: { children: {}, count: 0 }, sf: null,
  // Stats tree: each node = {children:{}, count:0, wins:0, draws:0, losses:0}
  statsTree: { children: {}, count: 0, wins: 0, draws: 0, losses: 0 },
  lichessUser: ''
};
var SYM = {wK:'♔',wQ:'♕',wR:'♖',wB:'♗',wN:'♘',wP:'♙',bK:'♚',bQ:'♛',bR:'♜',bB:'♝',bN:'♞',bP:'♟'};
var FL = 'abcdefgh'.split('');

function init(){
  S.chess = new MiniChess();
  render(); renderMoves(); updOp(); renderLbls(); renderRepLines(); renderExplorer(); initSF();
}

// ---- Board ----
function render(){
  var bd=document.getElementById('bd');bd.innerHTML='';
  var rr=S.flipped?[0,1,2,3,4,5,6,7]:[7,6,5,4,3,2,1,0];
  var ff=S.flipped?[7,6,5,4,3,2,1,0]:[0,1,2,3,4,5,6,7];
  for(var ri=0;ri<8;ri++){for(var fi=0;fi<8;fi++){
    var r=rr[ri],f=ff[fi],sq=FL[f]+(r+1),lt=(r+f)%2===1;
    var pc=S.chess.get(sq);
    var d=document.createElement('div');d.className='sq '+(lt?'l':'d');d.dataset.sq=sq;
    if(S.lastMv&&(S.lastMv.from===sq||S.lastMv.to===sq))d.classList.add('last');
    if(S.selSq===sq)d.classList.add('sel');
    if(S.legalSqs.indexOf(sq)>=0){if(pc&&pc.color!==S.chess.turn())d.classList.add('lc');else d.classList.add('lm');}
    if(S.chess.in_check()&&pc&&pc.type==='k'&&pc.color===S.chess.turn())d.classList.add('chk');
    if(pc){var sp=document.createElement('span');sp.className='pc';
      var k=(pc.color==='w'?'w':'b')+pc.type.toUpperCase();sp.textContent=SYM[k]||'?';
      sp.style.color=pc.color==='w'?'#fff':'#1a1a1a';
      sp.style.textShadow=pc.color==='w'?'0 1px 3px rgba(0,0,0,.7),0 0 8px rgba(0,0,0,.3)':'0 1px 2px rgba(255,255,255,.15)';
      d.appendChild(sp);}
    d.addEventListener('click',(function(s){return function(){clickSq(s);};})(sq));
    bd.appendChild(d);
  }}
}

function renderLbls(){
  var rc=document.getElementById('rC'),fr=document.getElementById('fR');rc.innerHTML='';fr.innerHTML='';
  var ranks=S.flipped?['1','2','3','4','5','6','7','8']:['8','7','6','5','4','3','2','1'];
  var files=S.flipped?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h'];
  ranks.forEach(function(r){var s=document.createElement('span');s.textContent=r;rc.appendChild(s);});
  files.forEach(function(f){var s=document.createElement('span');s.textContent=f;fr.appendChild(s);});
}

// ---- Click ----
function clickSq(sq){
  if(!S.chess)return;
  if(S.selSq===null){
    var p=S.chess.get(sq);
    if(p&&p.color===S.chess.turn()){
      S.selSq=sq;
      S.legalSqs=S.chess.moves({square:sq,verbose:true}).map(function(m){return m.to;});
      render();}
  }else{
    if(S.legalSqs.indexOf(sq)>=0){
      var p=S.chess.get(S.selSq),pr;
      if(p&&p.type==='p'){var rk=sq[1];if((p.color==='w'&&rk==='8')||(p.color==='b'&&rk==='1'))pr='q';}
      var mv=S.chess.move({from:S.selSq,to:sq,promotion:pr});
      if(mv){S.moves=S.moves.slice(0,S.idx+1);S.moves.push(mv);S.idx=S.moves.length-1;S.lastMv=mv;
        addTree(S.moves.slice(0,S.idx+1));S.selSq=null;S.legalSqs=[];render();renderMoves();updOp();renderExplorer();sfEval();}
    }else if(sq===S.selSq){S.selSq=null;S.legalSqs=[];render();}
    else{var p=S.chess.get(sq);
      if(p&&p.color===S.chess.turn()){S.selSq=sq;S.legalSqs=S.chess.moves({square:sq,verbose:true}).map(function(m){return m.to;});}
      else{S.selSq=null;S.legalSqs=[];}render();}
  }
}

// ---- Move list ----
function renderMoves(){
  var ml=document.getElementById('mL');
  if(!S.moves.length){ml.innerHTML='<div class="empty">Haz el primer movimiento en el tablero</div>';return;}
  var h='';
  for(var i=0;i<S.moves.length;i+=2){
    var n=Math.floor(i/2)+1,wm=S.moves[i],bm=S.moves[i+1];
    h+='<div class="mr"><span class="mn">'+n+'.</span><span class="ms'+(i===S.idx?' cur':'')+'" data-idx="'+i+'">'+wm.san+'</span>';
    if(bm)h+='<span class="ms'+(i+1===S.idx?' cur':'')+'" data-idx="'+(i+1)+'">'+bm.san+'</span>';
    h+='</div>';
  }
  ml.innerHTML=h;
  var c=ml.querySelector('.cur');if(c)c.scrollIntoView({block:'nearest'});
  // Re-bind clicks
  document.querySelectorAll('#mL .ms').forEach(function(el){
    el.addEventListener('click', function(){
      gotoM(parseInt(this.dataset.idx));
    });
  });
}

// ---- Navigation ----
function replayTo(idx){
  S.chess.reset();S.lastMv=null;
  for(var i=0;i<=idx;i++){S.chess.move(S.moves[i].san);if(i===idx)S.lastMv=S.moves[i];}
  S.idx=idx;S.selSq=null;S.legalSqs=[];render();renderMoves();updOp();renderExplorer();
}
function gotoM(i){replayTo(i);}
function nav(dir){
  if(dir==='start'){S.chess.reset();S.idx=-1;S.lastMv=null;S.selSq=null;S.legalSqs=[];render();renderMoves();updOp();renderExplorer();rstEv();}
  else if(dir==='back'){if(S.idx>0)replayTo(S.idx-1);else if(S.idx===0)nav('start');}
  else if(dir==='fwd'){if(S.idx<S.moves.length-1)replayTo(S.idx+1);}
  else if(dir==='end'){if(S.moves.length>0)replayTo(S.moves.length-1);}
}
function flipBoard(){S.flipped=!S.flipped;render();renderLbls();}
function resetBoard(){S.chess.reset();S.moves=[];S.idx=-1;S.lastMv=null;S.selSq=null;S.legalSqs=[];render();renderMoves();updOp();renderExplorer();rstEv();}
function rstEv(){document.getElementById('evF').style.height='50%';document.getElementById('evTop').textContent='0.0';document.getElementById('evBot').textContent='';}

// ---- FEN/PGN ----
function fenDialog(){
  var v=prompt('Pega un FEN o PGN:');if(!v)return;
  var tmp=new MiniChess();
  if(tmp.load_pgn(v.trim())){
    var hist=tmp.history({verbose:true});
    S.chess.reset();S.moves=[];
    for(var i=0;i<hist.length;i++){var r=S.chess.move(hist[i].san);if(r)S.moves.push(r);}
    S.idx=S.moves.length-1;S.lastMv=S.idx>=0?S.moves[S.idx]:null;toast('PGN cargado','ok');
  }else if(S.chess.load(v.trim())){S.moves=[];S.idx=-1;S.lastMv=null;toast('FEN cargado','ok');}
  else{toast('FEN/PGN inválido','err');return;}
  S.selSq=null;S.legalSqs=[];render();renderMoves();updOp();renderExplorer();
}

// ---- Opening DB ----
var ODB=[
  ['e4 e5 Nf3 Nc6 Bb5','C60-C99','Apertura Española (Ruy López)'],
  ['e4 e5 Nf3 Nc6 Bc4','C50-C54','Apertura Italiana'],
  ['e4 e5 Nf3 Nf6','C42','Defensa Petrov'],
  ['e4 e5 f4','C30-C39','Gambito de Rey'],
  ['e4 e5 Nf3','C40','1.e4 e5 Nf3'],
  ['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6','B90','Siciliana Najdorf'],
  ['e4 c5 Nf3 d6','B80','Siciliana Scheveningen'],
  ['e4 c5 Nf3 Nc6','B40','Siciliana Paulsen'],
  ['e4 c5','B20-B99','Defensa Siciliana'],
  ['e4 e6 d4 d5','C00-C19','Defensa Francesa'],
  ['e4 e6','C00','Defensa Francesa'],
  ['e4 c6 d4 d5','B10-B19','Defensa Caro-Kann'],
  ['e4 c6','B10','Caro-Kann'],
  ['e4 d5','B01','Defensa Escandinava'],
  ['e4 Nf6','B02','Defensa Alekhine'],
  ['e4 d6','B07','Defensa Pirc'],
  ['e4 g6','B06','Defensa Moderna'],
  ['e4 e5','C20','Partida Abierta'],
  ['d4 d5 c4 e6 Nc3','D30','Gambito de Dama'],
  ['d4 d5 c4','D06','Gambito de Dama'],
  ['d4 d5','D00','Partida de Dama'],
  ['d4 Nf6 c4 g6 Nc3 d5','D70','Grünfeld'],
  ['d4 Nf6 c4 g6','E60','India de Rey'],
  ['d4 Nf6 c4 e6 Nf3 b6','E12','India de Dama'],
  ['d4 Nf6 c4 e6 Nc3 Bb4','E20','Nimzo-India'],
  ['d4 Nf6 c4 e6','E12','Aperturas Indias'],
  ['d4 Nf6','A45','Aperturas Indias'],
  ['d4 f5','A80','Holandesa'],
  ['c4 e5','A20','Inglesa (1…e5)'],
  ['c4','A10','Apertura Inglesa'],
  ['Nf3','A04','Apertura Reti'],
  ['e4','C00','1.e4'],
  ['d4','A40','1.d4'],
];
function updOp(){
  var hist=S.moves.slice(0,S.idx+1).map(function(m){return m.san;}).join(' ');
  var name='Posición personalizada',eco='';
  if(!hist){name='Posición inicial';eco='Mueve una pieza para comenzar';}
  else{for(var i=0;i<ODB.length;i++){if(hist.indexOf(ODB[i][0])===0){name=ODB[i][2];eco=ODB[i][1];break;}}}
  document.getElementById('opN').textContent=name;
  document.getElementById('opE').textContent=eco;
}

// ---- Tree ----
function addTree(mvArr){
  var n=S.tree;
  for(var i=0;i<mvArr.length;i++){var san=mvArr[i].san;if(!n.children[san])n.children[san]={move:san,children:{},count:0};n=n.children[san];n.count++;}
}
// Stats tree with win/draw/loss tracking
function addStatsTree(sanArr, result, userColor){
  // result: 'win', 'draw', 'loss' from user's perspective
  var n=S.statsTree;
  for(var i=0;i<sanArr.length;i++){
    var san=sanArr[i];
    if(!n.children[san]) n.children[san]={move:san,children:{},count:0,wins:0,draws:0,losses:0};
    n=n.children[san];
    n.count++;
    if(result==='win') n.wins++;
    else if(result==='draw') n.draws++;
    else n.losses++;
  }
}
// Get stats node for current position
function getStatsNode(){
  var hist=S.moves.slice(0,S.idx+1).map(function(m){return m.san;});
  var n=S.statsTree;
  for(var i=0;i<hist.length;i++){
    if(!n.children[hist[i]]) return null;
    n=n.children[hist[i]];
  }
  return n;
}
// Render explorer table
function renderExplorer(){
  var container=document.getElementById('explorerContent');
  var divider=document.getElementById('expDivider');
  var movesLabel=document.getElementById('movesLabel');
  var node=getStatsNode();

  if(!node || !Object.keys(node.children).length){
    if(S.statsTree.count===0){
      container.innerHTML='<div class="explorer-empty">Importa partidas desde Lichess para ver estadísticas de tus aperturas.</div>';
    } else {
      container.innerHTML='<div class="explorer-empty">Sin datos para esta posición.</div>';
    }
    divider.style.display=S.moves.length?'block':'none';
    movesLabel.style.display=S.moves.length?'block':'none';
    return;
  }

  var keys=Object.keys(node.children);
  // Sort by count descending
  keys.sort(function(a,b){return node.children[b].count - node.children[a].count;});

  var totalGames=0;
  keys.forEach(function(k){totalGames+=node.children[k].count;});

  var h='<div class="explorer-info" style="margin-bottom:8px">';
  h+='Mostrando movimientos jugados por <b>'+( S.lichessUser||'usuario')+'</b> en esta posición.';
  h+=' <b>'+totalGames+'</b> partida'+(totalGames!==1?'s':'')+' encontrada'+(totalGames!==1?'s':'')+'.</div>';

  h+='<table class="explorer-table"><thead><tr><th>Jugada</th><th>Partidas</th><th>Resultados</th></tr></thead><tbody>';

  for(var i=0;i<keys.length;i++){
    var k=keys[i], child=node.children[k];
    var w=child.wins, d=child.draws, l=child.losses, total=child.count;
    var wp=total?Math.round(w/total*100):0;
    var dp=total?Math.round(d/total*100):0;
    var lp=100-wp-dp;
    // Ensure at least 1% width for non-zero segments so they're visible
    var ww=w>0?Math.max(wp,3):0, dw=d>0?Math.max(dp,3):0, lw=l>0?Math.max(lp,3):0;
    var sumw=ww+dw+lw;if(sumw>100){var scale=100/sumw;ww=Math.round(ww*scale);dw=Math.round(dw*scale);lw=100-ww-dw;}

    h+='<tr class="explorer-row" data-move="'+k+'">';
    h+='<td><span class="exp-move">'+k+'</span></td>';
    h+='<td><span class="exp-games">'+total+'</span></td>';
    h+='<td><div class="result-bar">';
    if(w>0) h+='<span class="rw" style="width:'+ww+'%">'+(wp>=10?wp+'%':'')+'</span>';
    if(d>0) h+='<span class="rd" style="width:'+dw+'%">'+(dp>=10?dp+'%':'')+'</span>';
    if(l>0) h+='<span class="rb" style="width:'+lw+'%">'+(lp>=10?lp+'%':'')+'</span>';
    h+='</div></td>';
    h+='</tr>';
  }
  h+='</tbody></table>';

  // Legend
  h+='<div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--text-3)">';
  h+='<span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:10px;border-radius:2px;background:#e8e8e8"></span> Victoria</span>';
  h+='<span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:10px;border-radius:2px;background:#888"></span> Tablas</span>';
  h+='<span style="display:flex;align-items:center;gap:3px"><span style="width:10px;height:10px;border-radius:2px;background:#333;border:1px solid var(--border)"></span> Derrota</span>';
  h+='</div>';

  container.innerHTML=h;
  divider.style.display=S.moves.length?'block':'none';
  movesLabel.style.display=S.moves.length?'block':'none';

  // Re-bind explorer clicks
  document.querySelectorAll('.explorer-row').forEach(function(row){
    row.addEventListener('click', function(){
      explorerClick(this.dataset.move);
    });
  });
}
// Click a move in the explorer to play it on the board
function explorerClick(san){
  var mv=S.chess.move(san);
  if(mv){
    S.moves=S.moves.slice(0,S.idx+1);
    S.moves.push(mv);S.idx=S.moves.length-1;S.lastMv=mv;
    S.selSq=null;S.legalSqs=[];
    render();renderMoves();updOp();renderExplorer();sfEval();
  }
}
function renderTree(){
  var c=document.getElementById('treeC');
  if(!Object.keys(S.tree.children).length){c.innerHTML='<div class="empty">Sin datos. Agrega líneas o importa desde Lichess.</div>';return;}
  c.innerHTML=buildTreeHTML(S.tree,[]);
  // Re-bind tree clicks
  document.querySelectorAll('.tn-l').forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      loadTreeP(this.dataset.path);
    });
  });
}
function buildTreeHTML(node,path){
  var keys=Object.keys(node.children);if(!keys.length)return '';
  var h='<div class="tn-c">';
  for(var i=0;i<keys.length;i++){
    var k=keys[i],child=node.children[k],np=path.concat([k]);
    h+='<div class="tn"><span class="tn-l" data-path="'+np.join(',')+'">'
      +k+'</span><span class="tn-ct">'+child.count+'</span>'
      +buildTreeHTML(child,np)+'</div>';
  }
  return h+'</div>';
}
function loadTreeP(pathStr){
  var mvs=pathStr.split(',');
  S.chess.reset();S.moves=[];S.lastMv=null;
  for(var i=0;i<mvs.length;i++){var r=S.chess.move(mvs[i]);if(r)S.moves.push(r);}
  S.idx=S.moves.length-1;S.lastMv=S.idx>=0?S.moves[S.idx]:null;
  S.selSq=null;S.legalSqs=[];render();renderMoves();updOp();renderExplorer();swTById('moves');
}

// ---- Repertoire ----
function addLine(){
  var mvs=S.moves.slice(0,S.idx+1);if(!mvs.length){toast('Realiza al menos un movimiento','err');return;}
  var def=document.getElementById('opN').textContent;
  var name=prompt('Nombre:',def)||def;
  S.rep[S.selCol].push({id:Date.now(),name:name,moves:mvs.map(function(m){return m.san;}).join(' '),arr:mvs.map(function(m){return m.san;}),color:S.selCol});
  addTree(mvs);renderRepLines();toast('"'+name+'" agregada','ok');
}
function renderRepLines(){
  var lines=S.rep[S.selCol];document.getElementById('lC').textContent=lines.length;
  var c=document.getElementById('rL');
  if(!lines.length){c.innerHTML='<div class="empty">Sin líneas. Juega en el tablero y presiona "+ Agregar línea".</div>';return;}
  c.innerHTML=lines.map(function(l,i){
    return '<div class="rl" data-idx="'+i+'"><div class="li"><div class="ln">'+l.name+'</div><div class="lm">'+l.moves+'</div></div><span class="ld" data-del-idx="'+i+'">✕</span></div>';
  }).join('');

  // Re-bind line clicks
  document.querySelectorAll('#rL .rl').forEach(function(el){
    el.addEventListener('click', function(){
      loadLn(parseInt(this.dataset.idx));
    });
  });

  // Re-bind delete clicks
  document.querySelectorAll('#rL .ld').forEach(function(el){
    el.addEventListener('click', function(e){
      e.stopPropagation();
      delLn(parseInt(this.dataset.delIdx));
    });
  });
}
function loadLn(i){
  var l=S.rep[S.selCol][i];if(!l)return;
  S.chess.reset();S.moves=[];S.lastMv=null;
  for(var j=0;j<l.arr.length;j++){var r=S.chess.move(l.arr[j]);if(r)S.moves.push(r);}
  S.idx=S.moves.length-1;S.lastMv=S.idx>=0?S.moves[S.idx]:null;S.selSq=null;S.legalSqs=[];render();renderMoves();updOp();renderExplorer();
}
function delLn(i){if(!confirm('¿Eliminar?'))return;S.rep[S.selCol].splice(i,1);renderRepLines();toast('Eliminada');}
function selC(c,btn){S.selCol=c;document.querySelectorAll('.color-btn').forEach(function(b){b.classList.remove('on');});btn.classList.add('on');renderRepLines();}
function expRep(){
  var b=new Blob([JSON.stringify(S.rep,null,2)],{type:'application/json'});
  var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='repertorio.json';a.click();toast('Exportado','ok');
}
function impRep(e){
  var f=e.target.files[0];if(!f)return;
  var rd=new FileReader();rd.onload=function(ev){try{var d=JSON.parse(ev.target.result);if(d.white&&d.black){S.rep=d;renderRepLines();toast('Importado','ok');}else toast('Formato inválido','err');}catch(x){toast('Error','err');}};rd.readAsText(f);
}

// ---- Lichess ----
async function impLic(){
  var user=document.getElementById('lcU').value.trim();if(!user){toast('Ingresa usuario','err');return;}
  var max=document.getElementById('lcM').value,col=document.getElementById('lcC').value,rated=document.getElementById('lcR').value;
  var st=document.getElementById('iS'),pb=document.getElementById('pB'),pf=document.getElementById('pF');
  pb.style.display='block';pf.style.width='8%';st.textContent='Conectando con Lichess…';
  try{
    var url='https://lichess.org/api/games/user/'+user+'?max='+max+'&opening=true&clocks=false&evals=false';
    if(rated==='true')url+='&rated=true';
    var res=await fetch(url,{headers:{'Accept':'application/x-ndjson'}});
    if(!res.ok)throw new Error(res.status===404?'Usuario no encontrado':'HTTP '+res.status);
    pf.style.width='30%';st.textContent='Procesando…';
    var text=await res.text();
    var games=text.trim().split('\n').filter(function(l){return l.trim();}).map(function(l){try{return JSON.parse(l);}catch(x){return null;}}).filter(Boolean);
    var proc=0,aw=0,ab=0;
    S.lichessUser=user;
    // Reset stats tree for fresh import
    S.statsTree={children:{},count:0,wins:0,draws:0,losses:0};
    for(var g of games){
      if(!g.moves)continue;
      var isW=(g.players&&g.players.white&&g.players.white.user&&g.players.white.user.name||'').toLowerCase()===user.toLowerCase();
      var isB=(g.players&&g.players.black&&g.players.black.user&&g.players.black.user.name||'').toLowerCase()===user.toLowerCase();
      if(!isW&&!isB)continue;var gc=isW?'white':'black';
      if(col==='white'&&gc!=='white')continue;if(col==='black'&&gc!=='black')continue;
      // Determine game result from user's perspective
      var gameResult='draw';
      if(g.winner){
        if((g.winner==='white'&&gc==='white')||(g.winner==='black'&&gc==='black')) gameResult='win';
        else gameResult='loss';
      }
      var raw=g.moves.split(' ').slice(0,20),tmp=new MiniChess(),sarr=[];
      for(var m of raw){if(!m||['1-0','0-1','1/2-1/2','*'].includes(m))break;var r=tmp.move(m);if(r)sarr.push(r.san);else break;}
      if(sarr.length<3)continue;
      // Always add to stats tree (including duplicates for accurate stats)
      addStatsTree(sarr, gameResult, gc);
      var ls=sarr.join(' ');
      if(!S.rep[gc].some(function(l){return l.moves===ls;})){
        S.rep[gc].push({id:Date.now()+Math.random(),name:g.opening&&g.opening.name||'Importada',moves:ls,arr:sarr,color:gc,from:'lichess'});
        gc==='white'?aw++:ab++;
        var nd=S.tree;for(var san of sarr){if(!nd.children[san])nd.children[san]={move:san,children:{},count:0};nd=nd.children[san];nd.count++;}
      }
      proc++;pf.style.width=(30+(proc/games.length)*60)+'%';
    }
    pf.style.width='100%';st.innerHTML='<span style="color:var(--green)">✓</span> '+proc+' partidas · Nuevas: <b>'+aw+'</b> blancas, <b>'+ab+'</b> negras';
    renderRepLines();renderExplorer();toast(proc+' partidas importadas','ok');
  }catch(err){st.textContent='✕ '+err.message;pf.style.width='0%';toast(err.message,'err');}
}

// ---- Claude AI ----
async function callAI(prompt,sys){
  var key=S.apiKey||document.getElementById('apiK').value.trim();
  if(!key){toast('Ingresa tu API key','err');swTById('ai');return null;}
  try{
    var r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:1200,system:sys||'Eres un entrenador de ajedrez experto. Responde siempre en español con formato claro.',messages:[{role:'user',content:prompt}]})});
    if(!r.ok){var e=await r.json();throw new Error(e.error&&e.error.message||'HTTP '+r.status);}
    var d=await r.json();return d.content[0].text;
  }catch(e){toast('Error API: '+e.message,'err');return null;}
}

async function analyzePos(){
  var hist=S.moves.slice(0,S.idx+1).map(function(m){return m.san;}).join(' ');
  var fen=S.chess.fen(),turn=S.chess.turn()==='w'?'Blancas':'Negras',op=document.getElementById('opN').textContent;
  var el=document.getElementById('aiA');el.textContent='Analizando…';el.classList.add('loading');swTById('ai');
  var r=await callAI('Analiza esta posición:\nApertura: '+op+'\nMovimientos: '+(hist||'(inicio)')+'\nFEN: '+fen+'\nTurno: '+turn+'\n\nProporciona:\n1. Evaluación general\n2. Planes e ideas principales\n3. Amenazas\n4. 2-3 movimientos candidatos\n5. Consejo estratégico\n\nSé concreto.');
  el.classList.remove('loading');el.textContent=r||'Error. Verifica tu API key.';
}

async function detectGaps(){
  var wl=S.rep.white.map(function(l){return l.moves;}).join('\n')||'(vacío)';
  var bl=S.rep.black.map(function(l){return l.moves;}).join('\n')||'(vacío)';
  var el=document.getElementById('aiG');el.textContent='Detectando…';el.classList.add('loading');
  var r=await callAI('Detecta lagunas en este repertorio:\n\nBLANCAS:\n'+wl+'\n\nNEGRAS:\n'+bl+'\n\nIdentifica variantes críticas no cubiertas, respuestas populares del oponente sin preparar, y prioridades.');
  el.classList.remove('loading');el.textContent=r||'Error.';
}

async function recLines(){
  var wl=S.rep.white.map(function(l){return l.moves;}).join('\n')||'(vacío)';
  var bl=S.rep.black.map(function(l){return l.moves;}).join('\n')||'(vacío)';
  var el=document.getElementById('aiR');el.textContent='Generando…';el.classList.add('loading');
  var r=await callAI('Recomienda 3-5 líneas nuevas para este repertorio:\n\nBLANCAS:\n'+wl+'\n\nNEGRAS:\n'+bl+'\n\nPara cada: movimientos, nombre, por qué es buena. Si vacío, sugiere un repertorio completo para 1200-1600 Elo.');
  el.classList.remove('loading');el.textContent=r||'Error.';
}

// ---- Stockfish ----
function initSF(){
  try{fetch('https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.js').then(function(r){return r.text();}).then(function(code){
    var url=URL.createObjectURL(new Blob([code],{type:'application/javascript'}));
    S.sf=new Worker(url);S.sf.onmessage=function(e){handleSF(e.data);};
    S.sf.postMessage('uci');S.sf.postMessage('isready');
  }).catch(function(){});}catch(e){}
}
function handleSF(msg){
  if(msg.indexOf('info')===0&&msg.indexOf('score cp')>=0){
    var m=msg.match(/score cp (-?\d+)/);if(m){var s=parseInt(m[1])/100;if(S.chess.turn()==='b')s=-s;setEv(s);}
  }else if(msg.indexOf('score mate')>=0){
    var m=msg.match(/score mate (-?\d+)/);if(m)setEv(parseInt(m[1])>0?15:-15);
  }
}
function setEv(score){
  var pct=Math.max(5,Math.min(95,50+score*4));
  document.getElementById('evF').style.height=pct+'%';
  var label=Math.abs(score)>12?(score>0?'#+':'#-'):((score>0?'+':'')+score.toFixed(1));
  document.getElementById('evTop').textContent=score<=0?label:'';
  document.getElementById('evBot').textContent=score>0?label:'';
}
function sfEval(){if(!S.sf)return;S.sf.postMessage('stop');S.sf.postMessage('position fen '+S.chess.fen());S.sf.postMessage('go movetime 800');}

// ---- UI ----
function swT(btn){
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('on');});
  document.querySelectorAll('.tab-pane').forEach(function(p){p.classList.remove('on');});
  btn.classList.add('on');document.getElementById('tp-'+btn.dataset.t).classList.add('on');
  if(btn.dataset.t==='tree')setTimeout(renderTree,30);
  if(btn.dataset.t==='rep')renderRepLines();
}
function swTById(n){var btn=document.querySelector('.tab-btn[data-t="'+n+'"]');if(btn)swT(btn);}
function toast(msg,type){var t=document.createElement('div');t.className='toast'+(type?' '+type:'');t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove();},3100);}

// ── Event Bindings (replaces inline onclick) ──
document.addEventListener('DOMContentLoaded', function() {
  // Header buttons
  document.getElementById('btnFlip').addEventListener('click', flipBoard);
  document.getElementById('btnNew').addEventListener('click', resetBoard);
  document.getElementById('btnFen').addEventListener('click', fenDialog);
  document.getElementById('btnAnalyze').addEventListener('click', analyzePos);

  // Nav buttons
  document.getElementById('navStart').addEventListener('click', function(){ nav('start'); });
  document.getElementById('navBack').addEventListener('click', function(){ nav('back'); });
  document.getElementById('navFwd').addEventListener('click', function(){ nav('fwd'); });
  document.getElementById('navEnd').addEventListener('click', function(){ nav('end'); });
  document.getElementById('navAnalyze').addEventListener('click', analyzePos);

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ swT(btn); });
  });

  // Repertoire
  document.getElementById('selWhite').addEventListener('click', function(){ selC('white', this); });
  document.getElementById('selBlack').addEventListener('click', function(){ selC('black', this); });
  document.getElementById('addLineBtn').addEventListener('click', addLine);
  document.getElementById('expRepBtn').addEventListener('click', expRep);
  document.getElementById('impRepBtn').addEventListener('click', function(){ document.getElementById('rF').click(); });
  document.getElementById('rF').addEventListener('change', impRep);

  // AI
  document.getElementById('apiK').addEventListener('input', function(){ S.apiKey = this.value; });
  document.getElementById('analyzeBtn').addEventListener('click', analyzePos);
  document.getElementById('gapsBtn').addEventListener('click', detectGaps);
  document.getElementById('recBtn').addEventListener('click', recLines);

  // Lichess
  document.getElementById('importLicBtn').addEventListener('click', impLic);

  // Keyboard
  document.addEventListener('keydown', function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA') return;
    if(e.key==='ArrowLeft'){e.preventDefault();nav('back');}
    if(e.key==='ArrowRight'){e.preventDefault();nav('fwd');}
    if(e.key==='ArrowUp'){e.preventDefault();nav('start');}
    if(e.key==='ArrowDown'){e.preventDefault();nav('end');}
    if(e.key==='f'||e.key==='F') flipBoard();
  });

  init();
});
