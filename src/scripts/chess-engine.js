// ======================================================================
// MINI CHESS ENGINE (self-contained, no dependencies)
// 0x88 board representation
// ======================================================================
window.MiniChess = (function(){
'use strict';
var OFFSETS = {
  n:[-33,-31,-18,-14,14,18,31,33],
  b:[-17,-15,15,17],
  r:[-16,-1,1,16],
  q:[-17,-16,-15,-1,1,15,16,17],
  k:[-17,-16,-15,-1,1,15,16,17]
};
var FILES='abcdefgh';
function C(fen){ if(!(this instanceof C)) return new C(fen); this._b=new Array(128).fill(null); this._t='w'; this._c={K:false,Q:false,k:false,q:false}; this._ep=-1; this._hm=0; this._fm=1; this._kg={w:-1,b:-1}; this._hist=[]; this.load(fen||'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); }
C.prototype._v=function(s){return !(s&0x88);};
C.prototype._a2s=function(a){return ((parseInt(a[1])-1)<<4)|(a.charCodeAt(0)-97);};
C.prototype._s2a=function(s){return FILES[s&0xf]+((s>>4)+1);};
C.prototype._rf=function(s){return [s>>4,s&0xf];};

C.prototype.load=function(fen){
  var p=fen.split(/\s+/), rows=p[0].split('/');
  this._b=new Array(128).fill(null); this._hist=[];
  for(var r=7;r>=0;r--){var row=rows[7-r],f=0;for(var i=0;i<row.length;i++){var ch=row[i];if(ch>='1'&&ch<='8'){f+=parseInt(ch);}else{var color=ch===ch.toUpperCase()?'w':'b',type=ch.toLowerCase(),sq=(r<<4)|f;this._b[sq]={type:type,color:color};if(type==='k')this._kg[color]=sq;f++;}}}
  this._t=p[1]||'w';
  var cs=p[2]||'-';this._c={K:cs.indexOf('K')>=0,Q:cs.indexOf('Q')>=0,k:cs.indexOf('k')>=0,q:cs.indexOf('q')>=0};
  this._ep=(p[3]&&p[3]!=='-')?this._a2s(p[3]):-1;
  this._hm=parseInt(p[4])||0;this._fm=parseInt(p[5])||1;
  return true;
};

C.prototype.fen=function(){
  var s='';
  for(var r=7;r>=0;r--){var e=0;for(var f=0;f<8;f++){var pc=this._b[(r<<4)|f];if(!pc){e++;}else{if(e>0){s+=e;e=0;}s+=pc.color==='w'?pc.type.toUpperCase():pc.type;}}if(e>0)s+=e;if(r>0)s+='/';}
  s+=' '+this._t;
  var c='';if(this._c.K)c+='K';if(this._c.Q)c+='Q';if(this._c.k)c+='k';if(this._c.q)c+='q';
  s+=' '+(c||'-');
  s+=' '+(this._ep>=0?this._s2a(this._ep):'-');
  s+=' '+this._hm+' '+this._fm;
  return s;
};

C.prototype.reset=function(){this.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');};

C.prototype.get=function(sq){var i=this._a2s(sq);return this._b[i]?{type:this._b[i].type,color:this._b[i].color}:null;};
C.prototype.turn=function(){return this._t;};

C.prototype._attacked=function(sq,by){
  for(var j=0;j<8;j++){var t=sq+OFFSETS.n[j];if(this._v(t)){var p=this._b[t];if(p&&p.color===by&&p.type==='n')return true;}}
  for(var j=0;j<8;j++){var t=sq+OFFSETS.k[j];if(this._v(t)){var p=this._b[t];if(p&&p.color===by&&p.type==='k')return true;}}
  for(var j=0;j<4;j++){var d=OFFSETS.b[j],t=sq+d;while(this._v(t)){var p=this._b[t];if(p){if(p.color===by&&(p.type==='b'||p.type==='q'))return true;break;}t+=d;}}
  for(var j=0;j<4;j++){var d=OFFSETS.r[j],t=sq+d;while(this._v(t)){var p=this._b[t];if(p){if(p.color===by&&(p.type==='r'||p.type==='q'))return true;break;}t+=d;}}
  var po=by==='w'?[-15,-17]:[15,17];
  for(var j=0;j<2;j++){var t=sq+po[j];if(this._v(t)){var p=this._b[t];if(p&&p.color===by&&p.type==='p')return true;}}
  return false;
};

C.prototype._pseudo=function(sqFilter){
  var mvs=[],us=this._t,them=us==='w'?'b':'w';
  var s0=0,s1=128;
  if(sqFilter!==undefined){s0=sqFilter;s1=sqFilter+1;}
  for(var sq=s0;sq<s1;sq++){
    if(sq&0x88)continue;var p=this._b[sq];if(!p||p.color!==us)continue;
    if(p.type==='p'){
      var dir=us==='w'?16:-16,sr=us==='w'?1:6,pr=us==='w'?7:0;
      var to=sq+dir;
      if(this._v(to)&&!this._b[to]){
        if((to>>4)===pr){for(var pp of['q','r','b','n'])mvs.push({f:sq,t:to,p:'p',c:us,pr:pp,fl:'np'});}
        else{mvs.push({f:sq,t:to,p:'p',c:us,fl:'n'});
          if((sq>>4)===sr){var to2=sq+dir*2;if(this._v(to2)&&!this._b[to2])mvs.push({f:sq,t:to2,p:'p',c:us,fl:'b'});}
        }
      }
      for(var cd of[dir-1,dir+1]){var ct=sq+cd;if(!this._v(ct))continue;
        if(this._b[ct]&&this._b[ct].color===them){
          if((ct>>4)===pr){for(var pp of['q','r','b','n'])mvs.push({f:sq,t:ct,p:'p',c:us,cap:this._b[ct].type,pr:pp,fl:'cp'});}
          else mvs.push({f:sq,t:ct,p:'p',c:us,cap:this._b[ct].type,fl:'c'});
        }
        if(ct===this._ep)mvs.push({f:sq,t:ct,p:'p',c:us,cap:'p',fl:'e'});
      }
    } else {
      var offs=OFFSETS[p.type];
      for(var o of offs){var to=sq;while(true){to+=o;if(!this._v(to))break;var tg=this._b[to];
        if(tg){if(tg.color===them)mvs.push({f:sq,t:to,p:p.type,c:us,cap:tg.type,fl:'c'});break;}
        mvs.push({f:sq,t:to,p:p.type,c:us,fl:'n'});if(p.type==='n'||p.type==='k')break;}}
      if(p.type==='k'){
        if(us==='w'&&sq===4){
          if(this._c.K&&!this._b[5]&&!this._b[6]&&this._b[7]&&this._b[7].type==='r'&&this._b[7].color==='w')
            if(!this._attacked(4,them)&&!this._attacked(5,them)&&!this._attacked(6,them))mvs.push({f:4,t:6,p:'k',c:'w',fl:'k'});
          if(this._c.Q&&!this._b[3]&&!this._b[2]&&!this._b[1]&&this._b[0]&&this._b[0].type==='r'&&this._b[0].color==='w')
            if(!this._attacked(4,them)&&!this._attacked(3,them)&&!this._attacked(2,them))mvs.push({f:4,t:2,p:'k',c:'w',fl:'q'});
        }
        if(us==='b'&&sq===0x74){
          if(this._c.k&&!this._b[0x75]&&!this._b[0x76]&&this._b[0x77]&&this._b[0x77].type==='r'&&this._b[0x77].color==='b')
            if(!this._attacked(0x74,them)&&!this._attacked(0x75,them)&&!this._attacked(0x76,them))mvs.push({f:0x74,t:0x76,p:'k',c:'b',fl:'k'});
          if(this._c.q&&!this._b[0x73]&&!this._b[0x72]&&!this._b[0x71]&&this._b[0x70]&&this._b[0x70].type==='r'&&this._b[0x70].color==='b')
            if(!this._attacked(0x74,them)&&!this._attacked(0x73,them)&&!this._attacked(0x72,them))mvs.push({f:0x74,t:0x72,p:'k',c:'b',fl:'q'});
        }
      }
    }
  }
  return mvs;
};

C.prototype._isLegal=function(mv){
  var fp=this._b[mv.f],tp=this._b[mv.t],ep2=null,es=-1;
  this._b[mv.t]=mv.pr?{type:mv.pr,color:mv.c}:fp;this._b[mv.f]=null;
  if(mv.fl==='e'){es=mv.t+(mv.c==='w'?-16:16);ep2=this._b[es];this._b[es]=null;}
  var rf=-1,rt=-1,rp=null;
  if(mv.fl==='k'){if(mv.c==='w'){rf=7;rt=5;}else{rf=0x77;rt=0x75;}rp=this._b[rf];this._b[rt]=rp;this._b[rf]=null;}
  if(mv.fl==='q'){if(mv.c==='w'){rf=0;rt=3;}else{rf=0x70;rt=0x73;}rp=this._b[rf];this._b[rt]=rp;this._b[rf]=null;}
  var kp=mv.p==='k'?mv.t:this._kg[mv.c];
  var them=mv.c==='w'?'b':'w';
  var safe=!this._attacked(kp,them);
  this._b[mv.f]=fp;this._b[mv.t]=tp;
  if(es>=0)this._b[es]=ep2;
  if(rf>=0){this._b[rf]=rp;this._b[rt]=null;}
  return safe;
};

C.prototype._san=function(mv,all){
  if(mv.fl==='k')return 'O-O';
  if(mv.fl==='q')return 'O-O-O';
  var s='';
  if(mv.p!=='p'){
    s+=mv.p.toUpperCase();
    var amb=all.filter(function(m){return m.p===mv.p&&m.t===mv.t&&m.f!==mv.f&&m.fl!=='k'&&m.fl!=='q';});
    if(amb.length>0){
      var sf=amb.some(function(m){return (m.f&0xf)===(mv.f&0xf);});
      var sr=amb.some(function(m){return (m.f>>4)===(mv.f>>4);});
      if(!sf)s+=FILES[mv.f&0xf]; else if(!sr)s+=((mv.f>>4)+1); else s+=this._s2a(mv.f);
    }
  }
  var isCap=mv.cap!==undefined;
  if(isCap){if(mv.p==='p')s+=FILES[mv.f&0xf];s+='x';}
  s+=this._s2a(mv.t);
  if(mv.pr)s+='='+mv.pr.toUpperCase();
  return s;
};

C.prototype._legal=function(sqFilter){
  var ps=this._pseudo(sqFilter),me=this,leg=[];
  for(var i=0;i<ps.length;i++){if(me._isLegal(ps[i]))leg.push(ps[i]);}
  for(var i=0;i<leg.length;i++){leg[i]._san=me._san(leg[i],leg);}
  return leg;
};

C.prototype.moves=function(opts){
  opts=opts||{};
  var sqf=opts.square?this._a2s(opts.square):undefined;
  var leg=this._legal(sqf);
  if(opts.verbose)return leg.map(function(m){return{color:m.c,from:this._s2a(m.f),to:this._s2a(m.t),piece:m.p,captured:m.cap,promotion:m.pr,flags:m.fl,san:m._san};}.bind(this));
  return leg.map(function(m){return m._san;});
};

C.prototype.move=function(input){
  var mv;
  if(typeof input==='string'){
    var san=input.replace(/[+#!?=]/g,function(c){return c==='='?'=':'';});
    san=input.replace(/[+#!?]+$/g,'');
    var leg=this._legal();
    if(san==='O-O'||san==='0-0'){mv=leg.find(function(m){return m.fl==='k';});}
    else if(san==='O-O-O'||san==='0-0-0'){mv=leg.find(function(m){return m.fl==='q';});}
    else{
      var promo=null;
      if(san.indexOf('=')>=0){promo=san.charAt(san.indexOf('=')+1).toLowerCase();san=san.substring(0,san.indexOf('='));}
      var toA=san.slice(-2);san=san.slice(0,-2);san=san.replace('x','');
      var piece='p',ff=-1,fr=-1;
      if(san.length>0&&'NBRQK'.indexOf(san[0])>=0){piece=san[0].toLowerCase();san=san.slice(1);}
      if(san.length===1){if('abcdefgh'.indexOf(san)>=0)ff=san.charCodeAt(0)-97;else if('12345678'.indexOf(san)>=0)fr=parseInt(san)-1;}
      else if(san.length===2){ff=san.charCodeAt(0)-97;fr=parseInt(san[1])-1;}
      var toSq=this._a2s(toA);
      mv=leg.find(function(m){
        if(m.t!==toSq)return false;if(m.p!==piece)return false;
        if(promo&&m.pr!==promo)return false;if(!promo&&m.pr&&m.pr!=='q')return false;
        if(ff>=0&&(m.f&0xf)!==ff)return false;if(fr>=0&&(m.f>>4)!==fr)return false;
        return true;
      });
    }
  } else if(typeof input==='object'){
    var from=this._a2s(input.from),to=this._a2s(input.to),pr=input.promotion;
    var leg=this._legal();
    mv=leg.find(function(m){return m.f===from&&m.t===to&&(!pr||m.pr===pr);});
  }
  if(!mv)return null;
  this._hist.push({b:this._b.slice(),t:this._t,c:Object.assign({},this._c),ep:this._ep,hm:this._hm,fm:this._fm,kg:Object.assign({},this._kg),san:mv._san});
  this._b[mv.t]=mv.pr?{type:mv.pr,color:mv.c}:this._b[mv.f];this._b[mv.f]=null;
  if(mv.fl==='e'){this._b[mv.t+(mv.c==='w'?-16:16)]=null;}
  if(mv.fl==='k'){if(mv.c==='w'){this._b[5]=this._b[7];this._b[7]=null;}else{this._b[0x75]=this._b[0x77];this._b[0x77]=null;}}
  if(mv.fl==='q'){if(mv.c==='w'){this._b[3]=this._b[0];this._b[0]=null;}else{this._b[0x73]=this._b[0x70];this._b[0x70]=null;}}
  if(mv.p==='k')this._kg[mv.c]=mv.t;
  if(mv.p==='k'){if(mv.c==='w'){this._c.K=false;this._c.Q=false;}else{this._c.k=false;this._c.q=false;}}
  if(mv.p==='r'){if(mv.f===0)this._c.Q=false;if(mv.f===7)this._c.K=false;if(mv.f===0x70)this._c.q=false;if(mv.f===0x77)this._c.k=false;}
  if(mv.t===0)this._c.Q=false;if(mv.t===7)this._c.K=false;if(mv.t===0x70)this._c.q=false;if(mv.t===0x77)this._c.k=false;
  if(mv.p==='p'&&Math.abs(mv.t-mv.f)===32)this._ep=(mv.f+mv.t)/2;else this._ep=-1;
  if(mv.p==='p'||mv.cap)this._hm=0;else this._hm++;
  if(this._t==='b')this._fm++;
  this._t=this._t==='w'?'b':'w';
  var san=mv._san;
  if(this.in_check()){if(this._legal().length===0)san+='#';else san+='+';}
  var res={color:mv.c,from:this._s2a(mv.f),to:this._s2a(mv.t),piece:mv.p,captured:mv.cap,promotion:mv.pr,flags:mv.fl,san:san};
  this._hist[this._hist.length-1].san=san;
  return res;
};

C.prototype.undo=function(){
  if(!this._hist.length)return null;
  var h=this._hist.pop();
  this._b=h.b;this._t=h.t;this._c=h.c;this._ep=h.ep;this._hm=h.hm;this._fm=h.fm;this._kg=h.kg;
  return true;
};

C.prototype.in_check=function(){var them=this._t==='w'?'b':'w';return this._attacked(this._kg[this._t],them);};
C.prototype.in_checkmate=function(){return this.in_check()&&this._legal().length===0;};
C.prototype.in_stalemate=function(){return !this.in_check()&&this._legal().length===0;};
C.prototype.game_over=function(){return this._legal().length===0;};

C.prototype.history=function(opts){
  if(opts&&opts.verbose){
    var fens=[],cur=new C();
    var sans=this._hist.map(function(h){return h.san;});
    var res=[];
    for(var i=0;i<sans.length;i++){var r=cur.move(sans[i]);if(r)res.push(r);}
    return res;
  }
  return this._hist.map(function(h){return h.san;});
};

C.prototype.load_pgn=function(pgn){
  pgn=pgn.replace(/\{[^}]*\}/g,'').replace(/\([^)]*\)/g,'').replace(/\[[^\]]*\]/g,'');
  var tokens=pgn.trim().split(/\s+/).filter(function(t){return t&&!t.match(/^\d+\.+$/)&&t!=='1-0'&&t!=='0-1'&&t!=='1/2-1/2'&&t!=='*';});
  this.reset();
  for(var i=0;i<tokens.length;i++){
    var tok=tokens[i].replace(/^\d+\.+/,'');
    if(!tok)continue;
    var r=this.move(tok);
    if(!r)return false;
  }
  return true;
};

C.prototype.pgn=function(){
  var s='',h=this._hist;
  for(var i=0;i<h.length;i++){if(i%2===0)s+=(Math.floor(i/2)+1)+'. ';s+=h[i].san+' ';}
  return s.trim();
};

return C;
})();
