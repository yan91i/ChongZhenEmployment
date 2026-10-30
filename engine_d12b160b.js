// ============================
// GAME STATE
// ============================
let G = {
  screen:'title',
  charId:null,
  stats:{caibo:0,wentao:0,lizheng:0,wulue:0,tizhi:0},
  attitudes:{shengjuan:50,zhongguan:30,yanlu:50,minwang:50,shishen:50},
  tags:[],
  currentEvent:0,
  rankIndex:0,
  turn:1,
  age:20,
  lastFanshiTurn:-99,
  soundOn:true,
  branch:null,
  branchIndex:undefined,
  lastBranchChoice:null,
  inPrison:false,
  prisonIndex:0,
  emperorDead:false,
  _lastChoice:null,
  _resolvedChoice:null
};

// Helper: resolve the correct branch event, swapping in rush variant if conditions met
function getBranchEvent(branch, idx){
  if(branch==='zhongchen'&&idx===2&&G.tags.includes('倾巢北上')&&G.tags.includes('轻装急进')){
    return E5_8_ZHONG_RUSH;
  }
  return BRANCH_EVENTS[branch]&&BRANCH_EVENTS[branch][idx]||null;
}

// ============================
// AUDIO
// ============================
let bgmAudio=null;
function initAudio(){
  if(bgmAudio)return;
  try{
    bgmAudio=new Audio('bgm.mp3');
    bgmAudio.loop=true;
    bgmAudio.volume=0.4;
    bgmAudio.preload='auto';
  }catch(e){bgmAudio=null}
}
function toggleSound(){
  G.soundOn=!G.soundOn;
  updateSoundBtns();
  try{
    initAudio();
    if(G.soundOn&&bgmAudio){bgmAudio.play().catch(()=>{})}
    else if(bgmAudio){bgmAudio.pause()}
  }catch(e){}
}
function updateSoundBtns(){
  document.querySelectorAll('#soundToggle,#soundToggle2').forEach(b=>{
    b.textContent=G.soundOn?'音乐：开':'音乐：关';
    b.style.color=G.soundOn?'var(--gold)':'';
    b.style.borderColor=G.soundOn?'rgba(197,165,90,0.3)':'';
  });
}

// Auto-start music on first user interaction (browsers require gesture for autoplay)
document.addEventListener('click',function _autoPlay(){
  if(G.soundOn){initAudio();if(bgmAudio)bgmAudio.play().catch(()=>{});}
  updateSoundBtns();
  document.removeEventListener('click',_autoPlay);
},{once:true});

// ============================
// SCREEN MANAGEMENT
// ============================
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  G.screen=id.replace('-screen','');
  window.scrollTo(0,0);
  if(id==='game-screen'){
    var layout=document.querySelector('.game-layout');
    var btn=document.getElementById('drawerToggle');
    if(layout&&btn){
      layout.classList.add('drawer-open');
      btn.querySelector('.drawer-toggle-arrow').textContent='▼';
    }
  }
}
function goToSelect(){showScreen('select-screen');renderCharSelect();}

// ============================
// CHARACTER SELECT
// ============================
function renderCharSelect(){
  const grid=document.getElementById('charGrid');
  var statKeys=['caibo','wentao','lizheng','wulue','tizhi'];
  // Only show open characters (index 0 for now); locked ones are hidden
  var openChars=[0];
  grid.innerHTML=openChars.map(i=>{
    var c=CHARACTERS[i];
    var statHTML=statKeys.map(k=>`
      <div class="char-stat-row">
        <span class="char-stat-label">${STAT_LABELS[k]}</span>
        <div class="char-stat-bar"><div class="char-stat-fill" style="width:${c.stats[k]}%;"></div></div>
        <span class="char-stat-val">${c.stats[k]}</span>
      </div>
    `).join('');
    return `
      <div class="char-card fade-in">
        <div class="char-card-rank">${c.rank}</div>
        <div class="char-card-name">${c.name}</div>
        <div class="char-card-subtitle">${c.subtitle}</div>
        <div class="char-card-route">${c.route}</div>
        <div class="char-card-desc">${c.desc}</div>
        ${statHTML}
        <button class="char-card-btn" onclick="selectChar(${i})">选 此 出 身</button>
      </div>
    `;
  }).join('');
}

function selectChar(idx){
  const c=CHARACTERS[idx];
  G.charId=c.id;
  G.stats={...c.stats};
  G.attitudes={shengjuan:50,zhongguan:30,yanlu:50,minwang:50,shishen:[30,75,45,55][idx]};
  G.tags=[];G.currentEvent=0;G.rankIndex=idx===1?1:idx===2?2:0;G.turn=1;G.lastFanshiTurn=-99;
  G.branch=null;G.branchIndex=undefined;G.lastBranchChoice=null;
  G.inPrison=false;G.prisonIndex=0;G.emperorDead=false;
  G._lastChoice=null;G._resolvedChoice=null;G.age=20;
  showScreen('game-screen');
  updateTopbar();renderPanels();renderEvent();
}

// ============================
// UI RENDERING
// ============================
function updateTopbar(){
  document.getElementById('topbarRank').textContent=RANKS[G.rankIndex]||RANKS[0];
  var ev=null;
  if(G.branch&&G.branchIndex!==undefined&&BRANCH_EVENTS[G.branch]){
    ev=getBranchEvent(G.branch,G.branchIndex);
  }else if(G.currentEvent<EVENTS.length){
    ev=EVENTS[G.currentEvent];
  }
  if(ev){
    var s=ev.stage;
    // Remove middle section: "第X卷 · 章节名 · 崇祯X年" → "第X卷 · 崇祯X年"
    var parts=s.split(' · ');
    if(parts.length===3) s=parts[0]+' · '+parts[2];
    document.getElementById('topbarTurn').textContent=s;
  }else{
    document.getElementById('topbarTurn').textContent='终卷';
  }
}
// Parse requireFn string into human-readable condition label
function parseRequireFnLabel(fn){
  var nameMap={caibo:'财帛',wentao:'文韬',lizheng:'理政',wulue:'武略',tizhi:'体质',
    shengjuan:'圣眷',zhongguan:'中官',yanlu:'清议',shishen:'士绅',minwang:'民望'};
  // Split by && first, then handle || within each group
  var andParts=fn.split(/&&/);
  var result=[];
  for(var i=0;i<andParts.length;i++){
    var chunk=andParts[i];
    var orParts=chunk.split(/\|\|/);
    var orLabels=[];
    for(var j=0;j<orParts.length;j++){
      var p=orParts[j];
      var sm=p.match(/G\.(stats|attitudes)\.(\w+)\s*(>=|>|<=|<|===|==)\s*(\d+)/);
      if(sm){
        var name=nameMap[sm[2]]||sm[2];
        var op=sm[3].replace('===','=').replace('==','=');
        orLabels.push(name+op+sm[4]);
        continue;
      }
      var tm=p.match(/(!?)G\.tags\.includes\(["']([^"']+)["']\)/);
      if(tm){
        orLabels.push(tm[1]?'未曾'+tm[2]:'拥有"'+tm[2]+'"标签');
      }
    }
    if(orLabels.length>1) result.push(orLabels.join(' 或 '));
    else if(orLabels.length===1) result.push(orLabels[0]);
  }
  return result.length?result.join(' 且 '):'';
}
function numberToChinese(n){
  const d=['','一','二','三','四','五','六','七','八','九','十'];
  if(n<=10)return d[n];if(n<20)return '十'+d[n-10];return d[Math.floor(n/10)]+'十'+(n%10?d[n%10]:'');
}
function renderPanels(){renderStats();renderAttitudes();renderTags();renderPlayerInfo();}
function renderStats(){
  const p=document.getElementById('statsPanel');
  const keys=['caibo','wentao','lizheng','wulue','tizhi'];
  p.innerHTML=keys.map(k=>{
    const v=Math.max(0,Math.min(100,G.stats[k]));
    return `<div class="stat-item">
      <span class="stat-name">${STAT_LABELS[k]}</span>
      <div class="stat-bar-wrap"><div class="stat-bar-inner" style="width:${v}%"></div></div>
      <span class="stat-val">${v}</span>
    </div>`;
  }).join('');
}
function attColor(v,alpha){
  // v:0-100. 0=deep red(180,30,20), 50=burnt orange(210,120,30), 100=bright gold(220,190,60)
  const t=v/100;
  const r=Math.round(180+30*t);
  const g=Math.round(30+160*t);
  const b=Math.round(20+40*t);
  return `rgba(${r},${g},${b},${alpha})`;
}
function renderAttitudes(){
  const p=document.getElementById('attitudesPanel');
  p.innerHTML=ATT_KEYS.map((k,i)=>{
    const v=Math.max(0,Math.min(100,G.attitudes[k]));
    const isLocked=G.emperorDead&&(k==='shengjuan'||k==='zhongguan');
    const t=getTier(v);
    if(isLocked){
      return `<div class="attitude-item attitude-locked">
        <div class="attitude-header">
          <span class="attitude-name">${ATT_LABELS[i]}</span>
          <span class="attitude-tier tier-locked">——</span>
        </div>
        <div class="attitude-bar"><div class="attitude-fill" style="width:${v}%;background:#333"></div></div>
        <div class="attitude-val">${v}/100</div>
      </div>`;
    }
    return `<div class="attitude-item">
      <div class="attitude-header">
        <span class="attitude-name">${ATT_LABELS[i]}</span>
        <span class="attitude-tier tier-${t}">${TIER_NAMES[t]}</span>
      </div>
      <div class="attitude-bar"><div class="attitude-fill" style="width:${v}%;background:linear-gradient(90deg,${attColor(v,0.9)},${attColor(v,0.6)})"></div></div>
      <div class="attitude-val">${v}/100</div>
    </div>`;
  }).join('');
}
function renderTags(){
  const p=document.getElementById('tagsPanel');
  if(!G.tags.length){p.innerHTML='<span style="font-size:0.7rem;color:rgba(245,230,200,0.2)">暂无标签</span>';return}
  const count={};G.tags.forEach(t=>{count[t]=(count[t]||0)+1});
  p.innerHTML=Object.entries(count).map(([t,c])=>`<span class="tag-stamp">${t}${c>1?' ×'+c:''}</span>`).join('');
}
function getReputation(){
  if(G.currentEvent===0) return '默默无闻';
  const a=G.attitudes,s=G.stats,tags=G.tags;
  const tc={};tags.forEach(t=>{tc[t]=(tc[t]||0)+1});
  const totalTags=tags.length;
  // Tier 1: Extreme reputations (high thresholds)
  if(a.shengjuan>=72&&a.minwang>=58&&s.lizheng>=50) return '社稷之臣';
  if(a.shengjuan>=72&&a.yanlu>=58&&(tc['保民']||0)>=2) return '忠臣';
  if(s.lizheng>=60&&s.caibo>=50&&a.shengjuan>=50) return '能臣';
  if(a.shengjuan>=60&&a.minwang<40&&(tc['伤民']||0)>=2) return '酷吏';
  if((tc['借绅']||0)>=2&&s.caibo>=60) return '奸臣';
  if(a.shishen>=72&&(tc['借绅']||0)>=2) return '绅权代言';
  if((tc['地方坐大']||0)>=2&&(tc['擅权']||0)>=1) return '枭雄';
  if(a.yanlu>=72&&s.wentao>=60) return '清流';
  if(a.minwang>=72&&a.shengjuan<40) return '民望之士';
  if((tc['冒死']||0)>=2) return '赌命之徒';
  if((tc['自污']||0)>=1&&(tc['欠账']||0)>=1) return '老油条';
  // Tier 2: Moderate reputations (lower thresholds)
  if(a.shengjuan>=58&&a.yanlu>=50&&s.lizheng>=40) return '持衡能臣';
  if(a.shengjuan>=58&&a.minwang>=50) return '循吏';
  if(a.yanlu>=58&&s.wentao>=45) return '翰墨清客';
  if((tc['保民']||0)>=2&&a.minwang>=50) return '恤民良牧';
  if((tc['借绅']||0)>=1&&s.caibo>=45) return '长袖善舞';
  if(a.shishen<25&&(tc['豪右结怨']||0)>=2) return '孤臣';
  if((tc['伤民']||0)>=1&&a.shengjuan>=50) return '虎狼之吏';
  if(a.shengjuan>=58&&a.minwang<30) return '鹰犬';
  if((tc['地方坐大']||0)>=1) return '拥兵自重';
  if((tc['欠账']||0)>=2) return '寅吃卯粮';
  if((tc['冒死']||0)>=1) return '铤而走险';
  // Tier 3: Neutral mid-game labels
  if(totalTags>=4){
    const pos=(tc['保民']||0)+(tc['借绅']||0)+(tc['地方坐大']||0);
    const neg=(tc['伤民']||0)+(tc['擅权']||0)+(tc['冒死']||0);
    if(Math.abs(pos-neg)<=1) return '不粘锅';
  }
  if(a.shengjuan>=40&&a.shengjuan<=60&&a.minwang>=40&&a.minwang<=60) return '持重守中';
  if(G.currentEvent>=24) return '尸位素餐';
  if(G.currentEvent>=12) return '庸臣';
  return '初入宦海';
}
function renderPlayerInfo(){
  const p=document.getElementById('playerInfoPanel');
  if(!p)return;
  const ch=CHARACTERS.find(c=>c.id===G.charId);
  const origin=ch?ch.name+'（'+ch.subtitle+'）':'—';
  const czYear=(G.branch&&G.branchIndex!==undefined)?((getBranchEvent(G.branch,G.branchIndex)||{}).year||17):(G.currentEvent<EVENTS.length?EVENTS[G.currentEvent].year:17);
  const age=G.age+(czYear-1);
  const rep=getReputation();
  p.innerHTML=`
    <div class="player-info-row"><span class="player-info-label">出身</span><span class="player-info-val">${origin}</span></div>
    <div class="player-info-row"><span class="player-info-label">年龄</span><span class="player-info-val">${age} 岁</span></div>
    <div class="player-info-row"><span class="player-info-label">时评</span><span class="player-info-val reputation">${rep}</span></div>`;
}

// ============================
// DICE ROLL MECHANICS
// ============================
function parseDiceEligibility(ch){
  if(!ch.hidden) return {eligible:false};
  if(ch.require){
    var val;
    if(ch.require.stat in G.stats) val=G.stats[ch.require.stat];
    else if(ch.require.stat in G.attitudes) val=G.attitudes[ch.require.stat];
    else return {eligible:false};
    if(val>=ch.require.min) return {eligible:false};
    return {eligible:true, gap:ch.require.min-val};
  }
  if(ch.requireFn){
    try{if(eval(ch.requireFn)) return {eligible:false};}catch(e){}
    var isOr=ch.requireFn.includes('||');
    var separator=isOr?'||':'&&';
    var conditions=ch.requireFn.split(separator).map(function(s){return s.trim()});
    var gaps=[];
    var hasTagFail=false;
    for(var i=0;i<conditions.length;i++){
      var cond=conditions[i];
      if(cond.includes('G.tags')){
        try{if(!eval(cond)) hasTagFail=true;}catch(e){hasTagFail=true;}
        continue;
      }
      var match=cond.match(/G\.(stats|attitudes)\.(\w+)\s*>=\s*(\d+)/);
      if(match){
        var type=match[1],key=match[2],min=parseInt(match[3]);
        var current=type==='stats'?G.stats[key]:G.attitudes[key];
        if(current<min) gaps.push(min-current);
      }
    }
    if(isOr){
      if(gaps.length>0) return {eligible:true, gap:Math.min.apply(null,gaps)};
      return {eligible:false};
    }else{
      if(hasTagFail) return {eligible:false};
      if(gaps.length>0) return {eligible:true, gap:Math.max.apply(null,gaps)};
      return {eligible:false};
    }
  }
  return {eligible:false};
}
function calcDiceThreshold(gap){
  var filled='<span class="diff-dot-filled">●</span>';
  var empty='<span class="diff-dot-empty">○</span>';
  if(gap<=5) return {min:2, dots:'难度：'+filled+empty+empty+empty+empty, label:'几无悬念'};
  if(gap<=15) return {min:3, dots:'难度：'+filled+filled+empty+empty+empty, label:'尚有把握'};
  if(gap<=25) return {min:4, dots:'难度：'+filled+filled+filled+empty+empty, label:'胜负难料'};
  if(gap<=35) return {min:5, dots:'难度：'+filled+filled+filled+filled+empty, label:'九死一生'};
  return {min:6, dots:'难度：'+filled+filled+filled+filled+filled, label:'天命难违'};
}
var DICE_NUMERALS=['一','二','三','四','五','六'];

// ============================
// EVENT RENDERING
// ============================
function renderEvent(){
  var ev;
  if(G.inPrison){
    if(G.prisonIndex>=PRISON_EVENTS.length){
      // Prison chain complete, exit prison and continue to Act 5
      G.inPrison=false;G.prisonIndex=0;
      G.currentEvent++;
      if(G.currentEvent>=EVENTS.length){determineEnding();return}
      ev=EVENTS[G.currentEvent];
    }else{
      ev=PRISON_EVENTS[G.prisonIndex];
    }
  }else if(G.branch&&G.branchIndex!==undefined){
    if(!BRANCH_EVENTS[G.branch]||G.branchIndex>=BRANCH_EVENTS[G.branch].length){determineEnding();return}
    ev=getBranchEvent(G.branch,G.branchIndex);
  }else{
    if(G.currentEvent>=EVENTS.length){determineEnding();return}
    ev=EVENTS[G.currentEvent];
  }
  const panel=document.getElementById('eventPanel');
  let oldRank=G.rankIndex;
  // Show stage transition at the start of each new act
  const actStarts={12:'第二卷 · 风雨如晦',24:'第三卷 · 夹缝求存',36:'第四卷 · 山河欲裂',48:'第五卷 · 末路抉择'};
  const actSubs={12:'局势骤变，步步惊心',24:'四面围堵，喘息愈难',36:'外敌入寇，山河欲裂',48:'天下崩塌，末路抉择'};
  // Show prison transition on first prison event
  if(!G._skipTransition&&G.inPrison&&G.prisonIndex===0){
    showStageTransition('诏狱事件链','身陷囹圄，生死未卜',()=>_renderEventInner(ev,panel,oldRank));
  // Show branch transition on first branch event
  }else if(!G._skipTransition&&G.branch&&G.branchIndex===0){
    showStageTransition('终卷 · 尘埃渐落','大厦将倾，尘埃渐落',()=>_renderEventInner(ev,panel,oldRank));
  }else if(!G._skipTransition&&!G.branch&&actStarts[G.currentEvent]){
    showStageTransition(actStarts[G.currentEvent],actSubs[G.currentEvent],()=>_renderEventInner(ev,panel,oldRank));
  }else{
    _renderEventInner(ev,panel,oldRank);
  }
  updateTopbar();renderPanels();autoSave();
}
function showStageTransition(title,sub,cb){
  const ov=document.createElement('div');ov.className='stage-overlay';
  ov.innerHTML=`<div class="stage-overlay-title" style="${titleFontStyle(title)}">${title}</div><div class="stage-overlay-sub">${sub}</div>`;
  document.body.appendChild(ov);
  setTimeout(()=>{ov.style.opacity='0';ov.style.transition='opacity 0.8s';setTimeout(()=>{ov.remove();if(cb)cb()},800)},2200);
}
function showRankUp(newRank){
  const t=document.createElement('div');t.className='rank-up-toast';
  t.innerHTML=`<div class="rank-label">升 迁</div><div class="rank-new">${newRank}</div>`;
  document.body.appendChild(t);setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity 0.5s';setTimeout(()=>t.remove(),500)},2500);
}
function _renderEventInner(ev,panel,oldRank){
  if(G.rankIndex!==oldRank)showRankUp(RANKS[G.rankIndex]);
  const choicesHTML=ev.choices.map((ch,ci)=>{
    // Support requireRank, requireFn, and require formats
    let locked=false;
    let lockLabels=[];
    let hardLocked=false; // resource or rank lock — no dice allowed
    // Check resource sufficiency: if a negative stat effect would bring the stat below 0, lock the choice
    if(ch.effects){
      for(const[ek,eVal]of Object.entries(ch.effects)){
        if(ek in G.stats && eVal<0 && G.stats[ek]+eVal<0){
          locked=true;hardLocked=true;
          lockLabels.push((STAT_LABELS[ek]||ek)+'不足');
        }
      }
    }
    // Check rank requirement (applies to any choice, hidden or not)
    if(ch.requireRank!=null && G.rankIndex<ch.requireRank){
      locked=true;hardLocked=true;
      lockLabels.push('官职需达 '+RANKS[ch.requireRank]);
    }
    // Check hidden choices' stat/attitude requirements
    if(ch.hidden){
      if(ch.requireFn){
        try{if(!eval(ch.requireFn)){locked=true;lockLabels.push(ch.requireLabel||parseRequireFnLabel(ch.requireFn)||'条件未达成')}}catch(e){locked=true;lockLabels.push(ch.requireLabel||parseRequireFnLabel(ch.requireFn)||'条件未达成')}
      }else if(ch.require){
        if(G.stats[ch.require.stat]<ch.require.min){locked=true;lockLabels.push(ch.require.label||'条件未达成')}
      }
    }
    let lockLabel=lockLabels.join('；');
    if(locked){
      // Check if this hidden choice is eligible for a dice roll
      if(!hardLocked && ch.hidden && ch.failEffects){
        const diceCheck=parseDiceEligibility(ch);
        if(diceCheck.eligible){
          const thresh=calcDiceThreshold(diceCheck.gap);
          var reqLabel=lockLabel.split('；').map(function(s){return s.startsWith('需')?s:'需'+s}).join('；');
          return `<div class="choice-btn risky">
            <div class="choice-title">${ch.title}</div>
            <div class="choice-desc">${ch.desc}</div>
            <div class="choice-risk-info">
              <span class="risk-requirement">${reqLabel}</span>
              <span class="risk-difficulty">${thresh.dots}</span>
              <button class="dice-trigger-btn" onclick="attemptRiskyChoice(${ci})">勉力一试</button>
            </div>
          </div>`;
        }
      }
      const isHiddenLock=ch.hidden&&(lockLabels.some(l=>l!=='财帛不足'&&l!=='文韬不足'&&l!=='理政不足'&&l!=='武略不足'&&l!=='体质不足'));
      if(isHiddenLock){
        return `<div class="choice-btn locked">
          <div class="choice-title">${ch.title.split('"')[0]}……"</div>
          <div class="choice-lock-info">需要 ${lockLabel} 方可解锁</div>
        </div>`;
      }
      return `<div class="choice-btn locked">
        <div class="choice-title">${ch.title}</div>
        <div class="choice-desc">${ch.desc}</div>
        <div class="choice-lock-info">${lockLabel}</div>
      </div>`;
    }
    // Show "已达到" hint for unlocked hidden choices
    if(ch.hidden){
      let reqText='';
      if(ch.require){
        const sLabel=STAT_LABELS[ch.require.stat]||ch.require.stat;
        reqText=sLabel+'≥'+ch.require.min+' 已达到';
      }else if(ch.requireLabel){
        reqText=ch.requireLabel+' 已达到';
      }
      if(reqText){
        return `<button class="choice-btn unlocked-hidden" onclick="makeChoice(${ci})">
          <div class="choice-title">${ch.title}</div>
          <div class="choice-desc">${ch.desc}</div>
          <div class="choice-unlocked-hint">${reqText}</div>
        </button>`;
      }
    }
    return `<button class="choice-btn" onclick="makeChoice(${ci})">
      <div class="choice-title">${ch.title}</div>
      <div class="choice-desc">${ch.desc}</div>
    </button>`;
  }).join('');

  panel.innerHTML=`
    <div class="event-stage">${ev.stage}</div>
    <div class="event-title fade-in" style="${titleFontStyle(ev.title)}">${ev.title}</div>
    <div class="speaker-box fade-in" style="animation-delay:0.1s">
      <div class="speaker-header">
        <div class="speaker-avatar">${ev.speaker.name.charAt(0)}</div>
        <div class="speaker-meta">
          <div class="speaker-name">${ev.speaker.name}</div>
          <div class="speaker-tags">
            <span class="speaker-role">${ev.speaker.role}</span>
            <span class="speaker-faction">${ev.speaker.faction}</span>
          </div>
        </div>
      </div>
      <div class="speaker-bubble">
        <div class="speaker-line">${ev.speakerLine}</div>
      </div>
    </div>
    <div class="event-narrative fade-in" style="animation-delay:0.2s">${typeof ev.narrativeFn==='function'?ev.narrativeFn():ev.narrative}</div>
    <div class="event-focus fade-in" style="animation-delay:0.4s">${ev.focusLine}</div>
    <div class="choices-container fade-in" style="animation-delay:0.5s" id="choicesArea">${choicesHTML}</div>
    <div id="resultArea"></div>
  `;
  // If a choice was already resolved (e.g. page refresh), replay the result display
  if(G._resolvedChoice) replayChoiceResult();
}

// ============================
// CHOICE & RESULT
// ============================
function makeChoice(ci){
  resolveChoice(ci,false,false);
}

// Re-display a previously resolved choice result (no effect re-application)
function replayChoiceResult(){
  var rc=G._resolvedChoice;
  if(!rc)return;
  var ev;
  if(G.inPrison&&PRISON_EVENTS[G.prisonIndex]) ev=PRISON_EVENTS[G.prisonIndex];
  else if(G.branch&&G.branchIndex!==undefined&&BRANCH_EVENTS[G.branch]) ev=getBranchEvent(G.branch,G.branchIndex);
  else ev=EVENTS[G.currentEvent];
  if(!ev||!ev.choices||!ev.choices[rc.ci])return;
  var ch=ev.choices[rc.ci];
  var comment,tags;
  if(rc.isDice&&!rc.useFail){comment=ch.diceWinComment||ch.comment;tags=ch.diceWinTags||ch.tags;}
  else if(rc.useFail){comment=ch.failComment||ch.comment;tags=ch.failTags||ch.tags;}
  else{comment=ch.comment;tags=ch.tags;}
  G._lastChoice=ch;
  // Hide choices, show result (display only, no stat changes)
  var choicesArea=document.getElementById('choicesArea');
  if(choicesArea) choicesArea.style.display='none';
  var tagsHTML=tags.map(function(t){return '<span class="result-tag">'+t+'</span>'}).join('');
  var resultTitle=rc.useFail?'铩 羽 而 归':(rc.isDice?'险 中 求 胜':'结 算');
  var btnLabel=ch.endingKey?'揭 开 终 局':(ch.branch?'踏 入 支 线':(G.branch&&G.branchIndex!==undefined?((G.branchIndex>=BRANCH_EVENTS[G.branch].length-1)?'揭 开 终 局':'继 续'):(G.currentEvent<EVENTS.length-1?'继 续':'揭 开 终 局')));
  document.getElementById('resultArea').innerHTML=
    '<div class="chosen-choice"><div class="chosen-choice-title">'+ch.title+'</div><div class="chosen-choice-desc">'+ch.desc+'</div></div>'+
    '<div class="result-panel"><div class="result-title">'+resultTitle+'</div>'+
    '<div class="result-tags">'+tagsHTML+'</div>'+
    '<div class="result-comment">'+(comment||'')+'</div>'+
    '<button class="next-event-btn" onclick="advanceAfterChoice()">'+btnLabel+'</button></div>';
}

function resolveChoice(ci,useFail,isDice){
  var ev;
  if(G.inPrison&&PRISON_EVENTS[G.prisonIndex]){
    ev=PRISON_EVENTS[G.prisonIndex];
  }else if(G.branch&&G.branchIndex!==undefined&&BRANCH_EVENTS[G.branch]){
    ev=getBranchEvent(G.branch,G.branchIndex);
  }else{
    ev=EVENTS[G.currentEvent];
  }
  const ch=ev.choices[ci];
  var effects,comment,tags;
  if(isDice&&!useFail){
    // Dice success: use diceWinEffects (3 positive stats only)
    effects=ch.diceWinEffects||ch.effects;
    comment=ch.diceWinComment||ch.comment;
    tags=ch.diceWinTags||ch.tags;
  }else if(useFail){
    // Dice failure: use failEffects (3 negative stats only)
    effects=ch.failEffects||ch.effects;
    comment=ch.failComment||ch.comment;
    tags=ch.failTags||ch.tags;
  }else{
    // Normal choice (stat met directly)
    effects=ch.effects;
    comment=ch.comment;
    tags=ch.tags;
  }
  // Apply effects
  const changes=[];
  for(const[k,v]of Object.entries(effects)){
    if(k in G.stats){
      G.stats[k]=Math.max(0,Math.min(100,G.stats[k]+v));
      changes.push({label:STAT_LABELS[k],val:v});
    }else if(k in G.attitudes){
      // Skip locked attitudes (emperor dead → 圣眷 and 中官 frozen)
      if(G.emperorDead&&(k==='shengjuan'||k==='zhongguan'))continue;
      G.attitudes[k]=Math.max(0,Math.min(100,G.attitudes[k]+v));
      const idx=ATT_KEYS.indexOf(k);
      changes.push({label:ATT_LABELS[idx],val:v});
    }
  }
  tags.forEach(t=>G.tags.push(t));
  // After 甲申国变 (emperor's death), freeze 圣眷 and 中官 at current values
  if(ev.emperorDead&&!G.emperorDead){
    G.emperorDead=true;
  }
  // Store the chosen choice for branch/ending/transfer handling
  G._lastChoice=ch;
  // Handle rank promotion only on success
  if(!useFail&&ch.rankUp!=null&&ch.rankUp>G.rankIndex){
    G.rankIndex=ch.rankUp;
    changes.push({label:'升迁至 '+RANKS[ch.rankUp],val:0,isRankUp:true});
  }
  G.turn++;

  // Check bad endings
  const bad=checkBadEnding();
  if(bad){showBadEnding(bad);return}

  // Hide choices, show result
  document.getElementById('choicesArea').style.display='none';
  const changesHTML=changes.map(c=>{
    if(c.isRankUp)return `<span class="result-change-item positive">${c.label}</span>`;
    return `<span class="result-change-item ${c.val>0?'positive':'negative'}">${c.label} ${c.val>0?'+':''}${c.val}</span>`;
  }).join('');
  // Show rank up toast if promoted
  if(!useFail&&ch.rankUp!=null)showRankUp(RANKS[G.rankIndex]);
  const tagsHTML=tags.map(t=>`<span class="result-tag">${t}</span>`).join('');
  document.getElementById('resultArea').innerHTML=`
    <div class="chosen-choice">
      <div class="chosen-choice-title">${ch.title}</div>
      <div class="chosen-choice-desc">${ch.desc}</div>
    </div>
    <div class="result-panel">
      <div class="result-title">${useFail?'铩 羽 而 归':(isDice?'险 中 求 胜':'结 算')}</div>
      <div class="result-changes">${changesHTML}</div>
      <div class="result-tags">${tagsHTML}</div>
      <div class="result-comment">${comment||''}</div>
      <button class="next-event-btn" onclick="advanceAfterChoice()">${ch.endingKey?'揭 开 终 局':(ch.branch?'踏 入 支 线':(G.branch&&G.branchIndex!==undefined?((G.branchIndex>=BRANCH_EVENTS[G.branch].length-1)?'揭 开 终 局':'继 续'):(G.currentEvent<EVENTS.length-1?'继 续':'揭 开 终 局')))}</button>
    </div>
  `;
  renderPanels();
  // Track resolved choice for refresh persistence
  G._resolvedChoice={ci:ci,useFail:useFail,isDice:isDice};
  autoSave();
}

function attemptRiskyChoice(ci){
  var ev;
  if(G.branch&&G.branchIndex!==undefined&&BRANCH_EVENTS[G.branch]){
    ev=getBranchEvent(G.branch,G.branchIndex);
  }else{
    ev=EVENTS[G.currentEvent];
  }
  const ch=ev.choices[ci];
  const diceCheck=parseDiceEligibility(ch);
  if(!diceCheck.eligible) return;
  const thresh=calcDiceThreshold(diceCheck.gap);
  var reqText=ch.requireLabel||ch.require&&ch.require.label||(ch.requireFn&&parseRequireFnLabel(ch.requireFn))||'条件未达成';
  if(!reqText.startsWith('需')) reqText='需'+reqText;

  // Create overlay
  const ov=document.createElement('div');
  ov.className='dice-overlay';
  ov.innerHTML=`
    <div class="dice-panel">
      <div class="dice-title">勉 力 一 试</div>
      <div class="dice-info">
        <div class="dice-requirement">${reqText}</div>
        <div class="dice-difficulty">${thresh.dots}</div>
        <div class="dice-threshold">需投出 <strong>${DICE_NUMERALS[thresh.min-1]}</strong>（${thresh.min}）或以上</div>
      </div>
      <div class="dice-face" id="diceValue">？</div>
      <div class="dice-hint">点 击 骰 子 开 始</div>
      <div class="dice-ink-splash" id="diceSplash"></div>
      <div id="diceResultArea"></div>
    </div>
  `;
  document.body.appendChild(ov);

  var rolled=false;
  var diceFace=document.getElementById('diceValue');
  diceFace.addEventListener('click',function(){
    if(rolled) return;
    rolled=true;
    diceFace.classList.add('rolling');
    document.querySelector('.dice-hint').textContent='';

    // Rolling animation
    var rollCount=0;
    var rollMax=18;
    var rollInterval=setInterval(function(){
      diceFace.textContent=DICE_NUMERALS[Math.floor(Math.random()*6)];
      rollCount++;
      if(rollCount>=rollMax){
        clearInterval(rollInterval);
        // Slow down phase
        var slowCount=0;
        var slowMax=5;
        var slowInterval=setInterval(function(){
          diceFace.textContent=DICE_NUMERALS[Math.floor(Math.random()*6)];
          slowCount++;
          if(slowCount>=slowMax){
            clearInterval(slowInterval);
            // Final result
            var result=Math.floor(Math.random()*6)+1;
            diceFace.classList.remove('rolling');
            diceFace.textContent=DICE_NUMERALS[result-1];
            var success=result>=thresh.min;

            // Ink splash effect
            var splash=document.getElementById('diceSplash');
            splash.classList.add('show',success?'success-splash':'failure-splash');

            // Style the dice face
            diceFace.style.color=success?'#C5A55A':'#8B4513';
            diceFace.style.borderColor=success?'rgba(197,165,90,0.5)':'rgba(139,69,19,0.4)';
            diceFace.style.boxShadow=success?'0 0 25px rgba(197,165,90,0.3)':'0 0 25px rgba(139,69,19,0.2)';
            diceFace.style.cursor='default';

            // Show result text and confirm button
            var resultArea=document.getElementById('diceResultArea');
            resultArea.innerHTML=`
              <div class="dice-result ${success?'success':'failure'}">
                ${success?'天 命 所 归 —— 成 功':'力 有 不 逮 —— 失 败'}
              </div>
              <button class="dice-confirm-btn" id="diceConfirmBtn">确 认</button>
            `;
            document.getElementById('diceConfirmBtn').addEventListener('click',function(){
              ov.style.opacity='0';
              ov.style.transition='opacity 0.3s';
              setTimeout(function(){
                ov.remove();
                resolveChoice(ci,!success,true);
              },300);
            });
          }
        },200);
      }
    },80);
  });
}

function checkBadEnding(){
  const inAct5Plus = G.currentEvent>=48 || G.branch;
  for(const k of ATT_KEYS){
    if(G.attitudes[k]<=0){
      // After Act 5, shengjuan and zhongguan reaching 0 no longer cause bad endings
      if(inAct5Plus && (k==='shengjuan' || k==='zhongguan')) continue;
      return k;
    }
  }
  if(G.stats.tizhi<=0)return 'tizhi';
  return null;
}

function checkAttitudeMax(onDone){
  // No backlash events in Act 5 or branch events
  if(G.currentEvent>=48||G.branch){onDone();return}
  // Global cooldown: at least 5 turns between backlash events
  if(typeof G.lastFanshiTurn==='number'&&G.turn-G.lastFanshiTurn<5){onDone();return}
  let maxedKey=null;
  for(const k of ATT_KEYS){
    if(G.attitudes[k]>=100){maxedKey=k;break}
  }
  if(!maxedKey){onDone();return}

  // Find the lowest OTHER attitude (the faction raising the backlash)
  let lowestKey=null, lowestVal=Infinity;
  for(const k of ATT_KEYS){
    if(k===maxedKey)continue;
    if(G.attitudes[k]<lowestVal){lowestVal=G.attitudes[k];lowestKey=k}
  }

  const eventKey=maxedKey+'_'+lowestKey;
  const fe=FANSHI_EVENTS[eventKey];
  if(!fe){onDone();return}

  // Mark this turn as having a backlash event (start cooldown)
  G.lastFanshiTurn=G.turn;

  const maxedIdx=ATT_KEYS.indexOf(maxedKey);
  const maxedLabel=ATT_LABELS[maxedIdx];
  const lowestIdx=ATT_KEYS.indexOf(lowestKey);
  const lowestLabel=ATT_LABELS[lowestIdx];

  // Render fanshi event in the event panel
  const panel=document.getElementById('eventPanel');
  panel.innerHTML=`
    <div class="event-stage">反噬事件</div>
    <div class="event-title fade-in" style="color:var(--red-light);${titleFontStyle(fe.title)}">${fe.title}</div>
    <div class="speaker-box fade-in" style="animation-delay:0.1s">
      <div class="speaker-header">
        <div class="speaker-avatar">${fe.speaker.charAt(0)}</div>
        <div class="speaker-meta">
          <div class="speaker-name">${fe.speaker}</div>
          <div class="speaker-tags">
            <span class="speaker-role">反噬</span>
            <span class="speaker-faction">${maxedLabel}满值 · ${lowestLabel}最低</span>
          </div>
        </div>
      </div>
      <div class="speaker-bubble">
        <div class="speaker-line">${fe.speakerLine}</div>
      </div>
    </div>
    <div class="event-narrative fade-in" style="animation-delay:0.2s">${fe.narrative}</div>
    <div class="event-focus fade-in" style="animation-delay:0.4s">${fe.focusLine}</div>
    <div class="choices-container fade-in" style="animation-delay:0.5s" id="fanshiChoicesArea">
      ${G.stats.caibo>=8?`<button class="choice-btn" onclick="resolveFanshi('${maxedKey}','${lowestKey}','pay')">
        <div class="choice-title">${fe.choiceA.title}</div>
        <div class="choice-desc">${fe.choiceA.desc}</div>
      </button>`:`<div class="choice-btn locked">
        <div class="choice-title">${fe.choiceA.title}</div>
        <div class="choice-desc">${fe.choiceA.desc}</div>
        <div class="choice-lock-info">财帛不足（需要 8）</div>
      </div>`}
      <button class="choice-btn" onclick="resolveFanshi('${maxedKey}','${lowestKey}','exploit')">
        <div class="choice-title">【挪借周旋】从${maxedLabel}一方挪用资源，安抚${lowestLabel}。</div>
        <div class="choice-desc">将${maxedLabel}方面积攒的人情和资源抽调一部分，转交给${lowestLabel}方以平息不满。虽能暂时止血，但会损害与${maxedLabel}一方的关系。</div>
      </button>
      <button class="choice-btn" onclick="resolveFanshi('${maxedKey}','${lowestKey}','refuse')">
        <div class="choice-title">${fe.choiceB.title}</div>
        <div class="choice-desc">${fe.choiceB.desc}</div>
      </button>
    </div>
    <div id="fanshiResultArea"></div>
  `;
  // Store callback for after resolution
  window._fanshiOnDone=onDone;
}

function resolveFanshi(maxedKey,lowestKey,action){
  const maxedIdx=ATT_KEYS.indexOf(maxedKey);
  const maxedLabel=ATT_LABELS[maxedIdx];
  const lowestIdx=ATT_KEYS.indexOf(lowestKey);
  const lowestLabel=ATT_LABELS[lowestIdx];
  document.getElementById('fanshiChoicesArea').style.display='none';
  let resultHTML='';
  if(action==='pay'){
    // Choice 1: Pay money, 财帛-8
    G.stats.caibo=Math.max(0,G.stats.caibo-8);
    resultHTML=`
      <div class="result-panel">
        <div class="result-title">花钱消灾</div>
        <div class="result-changes">
          <span class="result-change-item negative">财帛 -8</span>
        </div>
        <div class="result-comment">银子撒出去，嘴就闭上了。大明朝最硬的道理，从来不在圣贤书里。</div>
        <button class="next-event-btn" onclick="finishFanshi()">继 续</button>
      </div>`;
    renderPanels();
  }else if(action==='exploit'){
    // Choice 2: Exploit the maxed attitude to appease the lowest
    G.attitudes[maxedKey]=Math.max(0,G.attitudes[maxedKey]-15);
    G.attitudes[lowestKey]=Math.min(100,G.attitudes[lowestKey]+5);
    resultHTML=`
      <div class="result-panel">
        <div class="result-title">挪借周旋</div>
        <div class="result-changes">
          <span class="result-change-item negative">${maxedLabel} -15</span>
          <span class="result-change-item positive">${lowestLabel} +5</span>
        </div>
        <div class="result-comment">拆东墙补西墙，古来权术不外如是。只是被拆的那面墙，迟早要记这笔账。</div>
        <button class="next-event-btn" onclick="finishFanshi()">继 续</button>
      </div>`;
    renderPanels();
  }else{
    // Choice 3: Don't compromise, backlash source attitude -8
    G.attitudes[lowestKey]=Math.max(0,G.attitudes[lowestKey]-8);
    resultHTML=`
      <div class="result-panel">
        <div class="result-title">寸步不让</div>
        <div class="result-changes">
          <span class="result-change-item negative">${lowestLabel} -8</span>
        </div>
        <div class="result-comment">硬骨头不好啃，但啃不动的人，迟早会被人连骨头一起埋。</div>
        <button class="next-event-btn" onclick="finishFanshi()">继 续</button>
      </div>`;
    renderPanels();
  }
  document.getElementById('fanshiResultArea').innerHTML=resultHTML;
}

function finishFanshi(){
  // After fanshi resolution, check if the penalty caused a bad ending
  const bad=checkBadEnding();
  if(bad){showBadEnding(bad);return}
  if(window._fanshiOnDone){window._fanshiOnDone();window._fanshiOnDone=null}
}

function advanceAfterChoice(){
  G._resolvedChoice=null;
  var ch=G._lastChoice;
  // Handle endingKey — show ending directly
  if(ch&&ch.endingKey){
    var ending=ENDINGS[ch.endingKey];
    if(ending){showEnding(ending);return}
  }
  // Handle prison entry (e4_12 "下狱待勘")
  if(ch&&ch.prison&&!G.inPrison){
    G.inPrison=true;
    G.prisonIndex=0;
    G._lastChoice=null;
    renderEvent();
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  // Handle prisonRankDown (认罪换命 - 平级留用以观后效，不再降级)
  if(ch&&ch.prisonRankDown){
    // 平级留用：不改变品级，仅文案体现处分
  }
  // Handle branch transfer (e.g. zhongchen->xinghuo)
  if(ch&&ch.transferBranch){
    G.branch=ch.transferBranch;
    G.branchIndex=ch.transferIndex||0;
    G._lastChoice=null;
    renderEvent();
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  // Handle branch choice — entering a branch from e5_5
  if(ch&&ch.branch&&!G.branch){
    G.branch=ch.branch;
    G.branchIndex=0;
    // Track choice ID for hidden requirement in zhongchen 5-9
    if(ch.title&&ch.title.indexOf('收拢残兵')>=0) G.lastBranchChoice='collect_remnants';
    G._lastChoice=null;
    renderEvent();
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  // Track certain choice identifiers for cross-event requirements
  if(ch&&ch.title&&ch.title.indexOf('收拢残兵')>=0) G.lastBranchChoice='collect_remnants';
  G._lastChoice=null;
  // Check for attitude max (反噬) before advancing to next event
  checkAttitudeMax(function(){
    nextEvent();
  });
}

function nextEvent(){
  // Check if we're in prison chain
  if(G.inPrison){
    G.prisonIndex++;
    if(G.prisonIndex>=PRISON_EVENTS.length){
      // Prison chain complete, exit and continue to next main event (Act 5)
      G.inPrison=false;G.prisonIndex=0;
      G.currentEvent++;
      if(G.currentEvent>=EVENTS.length){determineEnding();return}
    }
    renderEvent();
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  // Check if we're in a branch
  if(G.branch&&G.branchIndex!==undefined){
    G.branchIndex++;
    if(!BRANCH_EVENTS[G.branch]||G.branchIndex>=BRANCH_EVENTS[G.branch].length){
      determineEnding();
      return;
    }
    renderEvent();
    window.scrollTo({top:0,behavior:'smooth'});
    return;
  }
  G.currentEvent++;
  if(G.currentEvent>=EVENTS.length){determineEnding();return}
  renderEvent();
  window.scrollTo({top:0,behavior:'smooth'});
}

// ============================
// ENDING DETERMINATION
// ============================
function determineEnding(){
  // If in a branch with isEnding events, the endingKey on choices handles it
  // This is a fallback for reaching the end of a branch without a chosen endingKey
  if(G.branch){
    var fallbackMap={
      zhongchen:'dumu_nandu',
      xiaoxiong:'dongnan_tietong',
      bifan:'bishan_jianshou',
      xinghuo:'xinhuo_guming'
    };
    var key=fallbackMap[G.branch]||'dumu_nandu';
    if(ENDINGS[key]){showEnding(ENDINGS[key]);return}
  }
  // Legacy fallback for non-branch games
  const tagCount=t=>G.tags.filter(x=>x===t).length;
  const sj=G.attitudes.shengjuan;
  const mw=G.attitudes.minwang;
  const wl=G.stats.wulue;
  const zuo=tagCount('地方坐大');
  const baomin=tagCount('保民');
  const jieshen=tagCount('借绅');
  // Check for special endings first
  if(wl>=60&&sj>=50)return showEnding(ENDINGS.hujia_nandu);
  if(wl<40&&mw>=55)return showEnding(ENDINGS.buyi_guitian);
  if(G.stats.lizheng>=55&&G.stats.caibo>=45&&zuo>=2)return showEnding(ENDINGS.luanshi_dutu);
  let scores={dumunanzhj:0,dongnanhubao:0,bishangliangshan:0,xinjinhuochuan:0};
  scores.dumunanzhj=sj*2+G.attitudes.yanlu-zuo*15;
  scores.dongnanhubao=G.stats.lizheng+G.stats.caibo+zuo*20+jieshen*10-sj+G.attitudes.shishen*0.5;
  scores.bishangliangshan=mw*2+baomin*15+(100-sj);
  scores.xinjinhuochuan=G.stats.lizheng+wl+sj+mw-Math.abs(sj-mw)*2;
  const lastTags=G.tags.slice(-3);
  if(lastTags.includes('冒死')&&!lastTags.includes('地方坐大')&&!lastTags.includes('擅权'))scores.dumunanzhj+=60;
  if(lastTags.includes('地方坐大')&&lastTags.includes('借绅'))scores.dongnanhubao+=60;
  if(lastTags.includes('擅权')&&lastTags.includes('保民'))scores.bishangliangshan+=60;
  if(sj>40&&mw>40&&G.stats.lizheng>40&&wl>30)scores.xinjinhuochuan+=40;
  let best=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
  showEnding(ENDINGS[best]);
}

function showEnding(e){
  showScreen('ending-screen');
  const statsHTML=Object.entries(STAT_LABELS).map(([k,l])=>`<span class="ending-stat">${l} ${G.stats[k]}</span>`).join('')+
    ATT_KEYS.map((k,i)=>`<span class="ending-stat">${ATT_LABELS[i]} ${G.attitudes[k]}</span>`).join('');
  document.getElementById('endingContent').innerHTML=`
    <div class="fade-in-up" style="display:flex;flex-direction:column;align-items:center;width:100%">
      <div class="ending-badge">${e.badge}</div>
      <div class="ending-title" style="${titleFontStyle(e.title)}">${e.title}</div>
      <div class="ending-emotion">${e.emotion}</div>
      <div class="ending-narrative">${e.narrative.split('\n').map(p=>p?`<p style="margin-bottom:12px">${p}</p>`:'').join('')}</div>
      <div class="ending-comment">
        <div class="ending-comment-text">${e.comment}</div>
      </div>
      <div class="ending-stats" style="margin-top:24px">${statsHTML}</div>
      <button class="ending-replay-btn" onclick="endingRestart()">重 新 来 过</button>
    </div>
  `;
}

// Check if Ma Shan Zheng covers all characters in a title string.
// Returns an inline font-family style if fallback is needed, or empty string if OK.
// If the font hasn't loaded yet, returns '' to let CSS handle it naturally
// (font-display:swap will show serif temporarily, then swap to Ma Shan Zheng).
// Only forces serif fallback when the font IS loaded but specific characters are missing.
var _fontCheckCtx=null;
var _serifStack="'Noto Serif SC','Songti SC','STSong','SimSun',serif";
var _mszLoaded=false;
function titleFontStyle(text){
  if(!text)return '';
  if(!_mszLoaded){
    if(document.fonts&&document.fonts.check('48px "Ma Shan Zheng"')){
      _mszLoaded=true;
    }else{
      return 'font-family:'+_serifStack;
    }
  }
  var clean=text.replace(/[·\s\u00a0]/g,'');
  if(!clean)return '';
  if(!_fontCheckCtx) _fontCheckCtx=document.createElement('canvas').getContext('2d');
  var ctx=_fontCheckCtx;
  var size='48px ';
  // Use monospace as a baseline that is guaranteed to differ from Ma Shan Zheng
  for(var i=0;i<clean.length;i++){
    var ch=clean[i];
    ctx.font=size+'"Ma Shan Zheng",monospace';
    var wMSZ=ctx.measureText(ch).width;
    ctx.font=size+'monospace';
    var wMono=ctx.measureText(ch).width;
    // If widths match, Ma Shan Zheng lacks this glyph → fall back to serif for entire title
    if(Math.abs(wMSZ-wMono)<0.5) return 'font-family:'+_serifStack;
  }
  return '';
}
function endingRestart(){
  sessionStorage.removeItem('czAutoSave');
  // Keep localStorage auto-save so it remains visible in title screen load modal
  location.reload();
}

function showBadEnding(key){
  let resolvedKey=key;
  if(key==='tizhi'){
    if(G.inPrison){
      resolvedKey='tizhi_prison';
    }else if(G.branch==='zhongchen'||G.branch==='xinghuo'){
      resolvedKey='tizhi_war';
    }else if(G.branch==='bifan'){
      resolvedKey='tizhi_rebel';
    }else if(G.branch==='xiaoxiong'){
      resolvedKey='tizhi_warlord';
    }else if(G.currentEvent>=48){
      resolvedKey='tizhi_war';
    }
  }
  const e=BAD_ENDINGS[resolvedKey]||BAD_ENDINGS[key];
  showScreen('ending-screen');
  const statsHTML=Object.entries(STAT_LABELS).map(([k,l])=>{
    const val=G.stats[k];
    const isZero=(k===key&&val<=0);
    return `<span class="ending-stat${isZero?' ending-stat-zero':''}">${l} ${val}</span>`;
  }).join('')+
    ATT_KEYS.map((k,i)=>{
      const val=G.attitudes[k];
      const isZero=(k===key&&val<=0);
      return `<span class="ending-stat${isZero?' ending-stat-zero':''}">${ATT_LABELS[i]} ${val}</span>`;
    }).join('');
  document.getElementById('endingContent').innerHTML=`
    <div class="fade-in-up" style="display:flex;flex-direction:column;align-items:center;width:100%">
      <div class="ending-badge" style="color:var(--red-light)">${e.badge}</div>
      <div class="ending-title" style="color:var(--red-light);${titleFontStyle(e.title)}">${e.title}</div>
      <div class="ending-emotion">${e.emotion}</div>
      <div class="ending-narrative">${e.narrative.split('\n').map(p=>p?`<p style="margin-bottom:12px">${p}</p>`:'').join('')}</div>
      <div class="ending-comment">
        <div class="ending-comment-text">${e.comment}</div>
      </div>
      <div class="ending-stats" style="margin-top:24px">${statsHTML}</div>
      <button class="ending-replay-btn" onclick="endingRestart()">重 新 来 过</button>
    </div>
  `;
}
// (Save/Load moved to modal system below)
// ============================
// MODAL SYSTEM
// ============================
function showModal(html,cls){
  let m=document.getElementById('gameModal');
  m.querySelector('.modal-body').innerHTML=html;
  m.className='game-modal active'+(cls?' '+cls:'');
}
function closeModal(){
  document.getElementById('gameModal').classList.remove('active');
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

// ============================
// RANK TREE (仕途表) — 四条仕途线，按品秩横向对齐
// ============================
const CAREER_PATHS = {
  '地方线':{label:'地方线',char:'寒门',ranks:[
    {rank:'正七品',title:'知县'},{rank:'正六品',title:'通判'},
    {rank:'从五品',title:'知州'},{rank:'正五品',title:'知府'},
    {rank:'从四品',title:'按察佥事'},{rank:'正三品',title:'按察使'},
    {rank:'从二品',title:'布政使'},{rank:'正二品',title:'巡抚'},
    {rank:'从一品',title:'总督'},
  ]},
  '户部线':{label:'户部线',char:'缙绅',ranks:[
    {rank:'从六品',title:'户部主事'},{rank:'从五品',title:'员外郎'},
    {rank:'正五品',title:'郎中'},{rank:'正四品',title:'太仆寺少卿'},
    {rank:'正三品',title:'户部侍郎'},{rank:'正二品',title:'户部尚书'},
    {rank:'从一品',title:'太子少保'},{rank:'正一品',title:'大学士'},
  ]},
  '边务线':{label:'边务线',char:'没落世家',ranks:[
    {rank:'正六品',title:'百户'},{rank:'正五品',title:'千户'},
    {rank:'从四品',title:'守备'},{rank:'正三品',title:'指挥使'},
    {rank:'从二品',title:'都指挥同知'},{rank:'正二品',title:'副总兵'},
    {rank:'从一品',title:'总兵'},{rank:'正一品',title:'左都督'},
  ]},
  '言路线':{label:'言路线',char:'诗文清望',ranks:[
    {rank:'从七品',title:'给事中'},{rank:'正七品',title:'监察御史'},
    {rank:'正五品',title:'佥都御史'},{rank:'正四品',title:'太常寺少卿'},
    {rank:'正三品',title:'副都御史'},{rank:'正二品',title:'都御史'},
    {rank:'从一品',title:'左都御史'},{rank:'正一品',title:'大学士'},
  ]}
};
const PATH_ORDER=['地方线','户部线','边务线','言路线'];
// Master rank scale, highest first
const ALL_RANKS_ORDER=[
  '正一品','从一品','正二品','从二品','正三品','从三品',
  '正四品','从四品','正五品','从五品','正六品','从六品',
  '正七品','从七品'
];

function getPlayerRoute(){
  if(!G||!G.charId)return null;
  const ch=CHARACTERS.find(c=>c.id===G.charId);
  return ch?ch.route:null;
}

function showRankTree(){
  const playerRoute=getPlayerRoute();
  const curRankStr=G?(RANKS[G.rankIndex]||RANKS[0]):'';
  const curTitle=curRankStr.split('·')[1]||'';

  // Build lookup: path -> rank -> entry
  const pathMap={};
  PATH_ORDER.forEach(key=>{
    const map={};
    CAREER_PATHS[key].ranks.forEach(r=>{map[r.rank]=r});
    pathMap[key]=map;
  });

  // Collect only ranks that appear in at least one path
  const usedRanks=ALL_RANKS_ORDER.filter(r=>
    PATH_ORDER.some(k=>pathMap[k][r])
  );

  // For the player's active path, find the index of the current position
  let playerPathRanks=[];
  let playerCurIdx=-1;
  if(playerRoute){
    playerPathRanks=CAREER_PATHS[playerRoute].ranks;
    playerCurIdx=playerPathRanks.findIndex(r=>r.title===curTitle);
    if(playerCurIdx<0){
      // fallback: match by rank prefix
      const curPin=curRankStr.split('·')[0]||'';
      playerCurIdx=playerPathRanks.findIndex(r=>r.rank===curPin);
    }
  }

  let html='<div class="rank-tree-title">明 末 仕 途 表</div>';
  html+='<div class="rank-tree-sub">大明官制四途品秩一览 · 同品秩横向对齐</div>';
  html+='<table class="rank-tree-table"><thead><tr>';
  html+='<th></th>';
  PATH_ORDER.forEach(key=>{
    const p=CAREER_PATHS[key];
    const isActive=key===playerRoute;
    html+='<th class="'+(isActive?'active-col':'')+'">'+p.label+'<span class="rch-char">'+p.char+'</span></th>';
  });
  html+='</tr></thead><tbody>';

  usedRanks.forEach(rankLevel=>{
    html+='<tr>';
    html+='<td class="rt-rank-label">'+rankLevel+'</td>';
    PATH_ORDER.forEach(key=>{
      const entry=pathMap[key][rankLevel];
      if(!entry){
        html+='<td class="rank-tree-cell empty"></td>';
        return;
      }
      const isActive=key===playerRoute;
      let cls='rank-tree-cell';
      if(isActive){
        const idx=playerPathRanks.indexOf(entry);
        if(idx>=0){
          if(idx===playerCurIdx) cls+=' current';
          else if(idx<playerCurIdx) cls+=' reached';
          else cls+=' on-path';
        }
      }
      html+='<td class="'+cls+'"><div class="rtc-title">'+entry.title+'</div></td>';
    });
    html+='</tr>';
  });

  html+='</tbody></table>';
  html+='<div class="rank-tree-legend">';
  html+='<span><span class="leg-dot lg-cur"></span>当前官阶</span>';
  html+='<span><span class="leg-dot lg-done"></span>已历官阶</span>';
  html+='<span><span class="leg-dot lg-path"></span>本途未达</span>';
  html+='<span><span class="leg-dot lg-lock"></span>他途官阶</span>';
  html+='</div>';
  html+='<button class="modal-close-btn" style="margin-top:16px" onclick="closeModal()">关 闭</button>';
  showModal(html,'rank-tree');
}

// ============================
// SAVE / LOAD (3 slots)
// ============================
function getSaves(){
  try{return JSON.parse(localStorage.getItem('czSaves'))||{}}catch(e){return{}}
}
function writeSaves(saves){localStorage.setItem('czSaves',JSON.stringify(saves))}

function slotSummary(slot){
  try{
  if(!slot||!slot.data) return null;
  const d=slot.data;
  const ch=CHARACTERS.find(c=>c.id===d.charId);
  const rank=RANKS[d.rankIndex]||RANKS[0];
  // Determine event title based on current state: prison > branch > main events
  var evTitle='—';
  if(d.inPrison&&typeof d.prisonIndex==='number'&&typeof PRISON_EVENTS!=='undefined'&&PRISON_EVENTS[d.prisonIndex]){
    evTitle=PRISON_EVENTS[d.prisonIndex].title;
  }else if(d.branch&&d.branchIndex!==undefined&&BRANCH_EVENTS&&BRANCH_EVENTS[d.branch]&&BRANCH_EVENTS[d.branch][d.branchIndex]){
    if(d.branch==='zhongchen'&&d.branchIndex===2&&d.tags&&d.tags.includes('倾巢北上')&&d.tags.includes('轻装急进')){
      evTitle=E5_8_ZHONG_RUSH.title;
    }else{
      evTitle=BRANCH_EVENTS[d.branch][d.branchIndex].title;
    }
  }else if(d.currentEvent<EVENTS.length){
    evTitle=EVENTS[d.currentEvent].title;
  }else{
    evTitle='终局';
  }
  return {
    charName:ch?ch.name:'—',
    rank:rank,
    eventTitle:evTitle,
    turn:d.turn||1,
    date:slot.date
  };
  }catch(e){console.error('slotSummary error:',e);return null}
}

function fmtDate(iso){
  if(!iso)return '—';
  const d=new Date(iso);
  const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'/'+p(d.getMonth()+1)+'/'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());
}

function saveGame(){
  if(!G.charId){showToast('请先开始游戏');return}
  const saves=getSaves();
  let html='<div class="modal-title">存 档</div><div class="modal-hint">惊堂木暂歇，把这满朝的明枪暗箭封入卷宗。</div><div class="save-slots">';
  // Auto-save slot (read-only)
  var autoSlot=getAutoSaveSlot();
  if(autoSlot){
    var ai=slotSummary(autoSlot);
    if(ai){
      html+='<div class="save-slot filled auto-save-slot readonly">';
      html+='<div class="slot-header"><span class="slot-num">自 动 存 档</span><span class="slot-auto-tag">自动</span></div>';
      html+='<div class="slot-info"><span class="slot-char">'+ai.charName+'</span><span class="slot-rank">'+ai.rank+'</span></div>';
      html+='<div class="slot-event"><span>'+ai.eventTitle+' · 第'+ai.turn+'回</span><span class="slot-date">'+fmtDate(ai.date)+'</span></div>';
      html+='</div>';
    }
  }
  for(let i=1;i<=5;i++){
    const s=saves['slot'+i];
    const info=s?slotSummary(s):null;
    if(info){
      html+=`<button type="button" class="save-slot filled" onclick="confirmSave(${i})">
        <div class="slot-header"><span class="slot-num">卷宗${['一','二','三','四','五'][i-1]}</span></div>
        <div class="slot-info"><span class="slot-char">${info.charName}</span><span class="slot-rank">${info.rank}</span></div>
        <div class="slot-event"><span>${info.eventTitle} · 第${info.turn}回</span><span class="slot-date">${fmtDate(info.date)}</span></div>
      </button>`;
    }else{
      html+=`<button type="button" class="save-slot empty" onclick="doSave(${i})">
        <div class="slot-header"><span class="slot-num">卷宗${['一','二','三','四','五'][i-1]}</span></div>
        <div class="slot-empty-text">— 空 —</div>
      </button>`;
    }
  }
  html+='</div><div class="modal-btn-row"><button class="modal-close-btn" onclick="closeModal()">返 回</button><button class="modal-close-btn restart" onclick="confirmRestart()">重 新 开 局</button></div>';
  showModal(html);
}

function confirmSave(i){
  const saves=getSaves();
  const s=saves['slot'+i];
  const info=slotSummary(s);
  showModal(`
    <div class="modal-title">覆 盖 存 档</div>
    <div class="modal-hint">卷宗${['一','二','三','四','五'][i-1]}已有记录：${info.charName} · ${info.eventTitle}<br>确定覆盖？旧档将不可恢复。</div>
    <div class="modal-actions">
      <button class="modal-action-btn confirm" onclick="doSave(${i})">覆 盖</button>
      <button class="modal-action-btn cancel" onclick="saveGame()">取 消</button>
    </div>
  `);
}

function doSave(i){
  try{
    const saves=getSaves();
    saves['slot'+i]={data:{...G,stats:{...G.stats},attitudes:{...G.attitudes},tags:[...(G.tags||[])]},date:new Date().toISOString()};
    writeSaves(saves);
    showModal(`
      <div class="modal-title">存 档 完 成</div>
      <div class="modal-hint">大明的一天又平安地对付过去了。</div>
      <button class="modal-close-btn" onclick="closeModal()">返 回</button>
    `);
  }catch(e){
    console.error('Save failed:',e);
    showToast('存档失败：'+e.message);
  }
}

function loadGame(){
  const saves=getSaves();
  var autoSlot=getAutoSaveSlot();
  const hasAny=saves.slot1||saves.slot2||saves.slot3||saves.slot4||saves.slot5||autoSlot;
  let html='<div class="modal-title">读 档</div><div class="modal-hint">拂去案牍上的浮尘，重整衣冠迎接考验。</div>';
  if(!hasAny){
    html+='<div class="save-slots"><div class="slot-empty-msg">尚无存档记录。</div></div>';
  }else{
    html+='<div class="save-slots">';
    // Auto-save slot (clickable)
    if(autoSlot){
      var ai=slotSummary(autoSlot);
      if(ai){
        html+='<button type="button" class="save-slot filled auto-save-slot" onclick="confirmLoadAuto()">';
        html+='<div class="slot-header"><span class="slot-num">自 动 存 档</span><span class="slot-auto-tag">自动</span></div>';
        html+='<div class="slot-info"><span class="slot-char">'+ai.charName+'</span><span class="slot-rank">'+ai.rank+'</span></div>';
        html+='<div class="slot-event"><span>'+ai.eventTitle+' · 第'+ai.turn+'回</span><span class="slot-date">'+fmtDate(ai.date)+'</span></div>';
        html+='</button>';
      }
    }
    for(let i=1;i<=5;i++){
      const s=saves['slot'+i];
      const info=s?slotSummary(s):null;
      if(info){
        html+=`<button type="button" class="save-slot filled" onclick="confirmLoad(${i})">
          <div class="slot-header"><span class="slot-num">卷宗${['一','二','三','四','五'][i-1]}</span></div>
          <div class="slot-info"><span class="slot-char">${info.charName}</span><span class="slot-rank">${info.rank}</span></div>
          <div class="slot-event"><span>${info.eventTitle} · 第${info.turn}回</span><span class="slot-date">${fmtDate(info.date)}</span></div>
          <span class="slot-delete" onclick="event.stopPropagation();confirmDelete(${i})">删</span>
        </button>`;
      }else{
        html+=`<div class="save-slot empty disabled">
          <div class="slot-header"><span class="slot-num">卷宗${['一','二','三','四','五'][i-1]}</span></div>
          <div class="slot-empty-text">— 空 —</div>
        </div>`;
      }
    }
    html+='</div>';
  }
  html+='<div class="modal-btn-row"><button class="modal-close-btn" onclick="closeModal()">返 回</button><button class="modal-close-btn restart" onclick="confirmRestart()">重 新 开 局</button></div>';
  showModal(html);
}

function confirmLoad(i){
  const saves=getSaves();
  const info=slotSummary(saves['slot'+i]);
  showModal(`
    <div class="modal-title">读 取 存 档</div>
    <div class="modal-hint">读取卷宗${['一','二','三','四','五'][i-1]}：${info.charName} · ${info.eventTitle}<br>当前未存档的进度将丢失。</div>
    <div class="modal-actions">
      <button class="modal-action-btn confirm" onclick="doLoad(${i})">读 取</button>
      <button class="modal-action-btn cancel" onclick="loadGame()">取 消</button>
    </div>
  `);
}

function doLoad(i){
  try{
    const saves=getSaves();
    const slot=saves['slot'+i];
    if(!slot||!slot.data){closeModal();showToast('存档数据异常');return}
    G=JSON.parse(JSON.stringify(slot.data));
    // Ensure required fields exist (backward compatibility)
    if(!G.tags)G.tags=[];
    if(typeof G.lastFanshiTurn!=='number')G.lastFanshiTurn=-99;
    if(!G.attitudes.shishen)G.attitudes.shishen=30;
    if(typeof G.inPrison!=='boolean')G.inPrison=false;
    if(typeof G.prisonIndex!=='number')G.prisonIndex=0;
    if(typeof G.age!=='number')G.age=20;
    if(G.branch===undefined)G.branch=null;
    if(G.branchIndex===null)G.branchIndex=undefined;
    if(G.lastBranchChoice===undefined)G.lastBranchChoice=null;
    if(G._lastChoice===undefined)G._lastChoice=null;
    if(typeof G.turn!=='number')G.turn=1;
    if(typeof G.rankIndex!=='number')G.rankIndex=0;
    if(!G.stats)G.stats={caibo:0,wentao:0,lizheng:0,wulue:0,tizhi:0};
    if(!G.attitudes)G.attitudes={shengjuan:50,zhongguan:30,yanlu:50,minwang:50,shishen:50};
    if(typeof G.soundOn!=='boolean')G.soundOn=true;
    if(typeof G.emperorDead!=='boolean')G.emperorDead=false;
    closeModal();
    showScreen('game-screen');updateTopbar();renderPanels();
    G._skipTransition=true;renderEvent();G._skipTransition=false;
    showToast('已读取卷宗'+['一','二','三','四','五'][i-1]);
  }catch(e){
    console.error('Load failed:',e);
    showToast('读档失败：'+e.message);
  }
}

function confirmDelete(i){
  showModal(`
    <div class="modal-title">删 除 存 档</div>
    <div class="modal-hint">确定删除卷宗${['一','二','三','四','五'][i-1]}？此操作不可恢复。</div>
    <div class="modal-actions">
      <button class="modal-action-btn confirm" onclick="doDelete(${i})">删 除</button>
      <button class="modal-action-btn cancel" onclick="loadGame()">取 消</button>
    </div>
  `);
}

function doDelete(i){
  const saves=getSaves();
  delete saves['slot'+i];
  writeSaves(saves);
  loadGame();
}

function confirmLoadAuto(){
  var autoSlot=getAutoSaveSlot();
  var info=slotSummary(autoSlot);
  if(!info){showToast('自动存档数据异常');return}
  showModal(`
    <div class="modal-title">读 取 自 动 存 档</div>
    <div class="modal-hint">读取自动存档：${info.charName} · ${info.eventTitle}<br>当前未存档的进度将丢失。</div>
    <div class="modal-actions">
      <button class="modal-action-btn confirm" onclick="doLoadAuto()">读 取</button>
      <button class="modal-action-btn cancel" onclick="loadGame()">取 消</button>
    </div>
  `);
}

function doLoadAuto(){
  try{
    var autoSlot=getAutoSaveSlot();
    if(!autoSlot||!autoSlot.data){closeModal();showToast('自动存档数据异常');return}
    G=JSON.parse(JSON.stringify(autoSlot.data));
    if(!G.tags)G.tags=[];
    if(typeof G.lastFanshiTurn!=='number')G.lastFanshiTurn=-99;
    if(!G.attitudes.shishen)G.attitudes.shishen=30;
    if(typeof G.inPrison!=='boolean')G.inPrison=false;
    if(typeof G.prisonIndex!=='number')G.prisonIndex=0;
    if(typeof G.age!=='number')G.age=20;
    if(G.branch===undefined)G.branch=null;
    if(G.branchIndex===null)G.branchIndex=undefined;
    if(G.lastBranchChoice===undefined)G.lastBranchChoice=null;
    if(G._lastChoice===undefined)G._lastChoice=null;
    if(typeof G.turn!=='number')G.turn=1;
    if(typeof G.rankIndex!=='number')G.rankIndex=0;
    if(!G.stats)G.stats={caibo:0,wentao:0,lizheng:0,wulue:0,tizhi:0};
    if(!G.attitudes)G.attitudes={shengjuan:50,zhongguan:30,yanlu:50,minwang:50,shishen:50};
    if(typeof G.soundOn!=='boolean')G.soundOn=true;
    if(typeof G.emperorDead!=='boolean')G.emperorDead=false;
    closeModal();
    showScreen('game-screen');updateTopbar();renderPanels();
    G._skipTransition=true;renderEvent();G._skipTransition=false;
    showToast('已读取自动存档');
  }catch(e){
    console.error('Load auto-save failed:',e);
    showToast('读档失败：'+e.message);
  }
}

function confirmRestart(){
  showModal(`
    <div class="modal-title">重 新 开 局</div>
    <div class="modal-hint">弃官归乡，从头再来？当前未存档的进度将会丢失。</div>
    <div class="modal-actions">
      <button class="modal-action-btn confirm" onclick="doRestart()">确 定</button>
      <button class="modal-action-btn cancel" onclick="closeModal()">取 消</button>
    </div>
  `);
}
function doRestart(){
  sessionStorage.removeItem('czAutoSave');
  localStorage.removeItem('czAutoSave');
  closeModal();
  G={screen:'title',charId:null,stats:{caibo:0,wentao:0,lizheng:0,wulue:0,tizhi:0},attitudes:{shengjuan:50,zhongguan:30,yanlu:50,minwang:50,shishen:50},tags:[],currentEvent:0,rankIndex:0,turn:1,age:20,lastFanshiTurn:-99,soundOn:G.soundOn,branch:null,branchIndex:undefined,lastBranchChoice:null,inPrison:false,prisonIndex:0,emperorDead:false,_lastChoice:null,_resolvedChoice:null};
  showScreen('title-screen');
}

function showFollowModal(){
  showModal(`
    <div class="modal-title">关 注 更 新 & 反 馈</div>
    <div class="follow-modal-content">
      <div class="follow-section">
        <div class="follow-label">小红书</div>
        <div class="follow-name">Pyacark 的创造日常</div>
        <a class="follow-link" href="https://xhslink.com/m/4hcA36FCcTm" target="_blank" rel="noopener">前往小红书主页 →</a>
      </div>
      <div class="follow-section">
        <div class="follow-label">QQ 群</div>
        <div class="follow-name">崇祯直聘大明公务员内推群</div>
        <div class="follow-qq-num">群号：1098366528</div>
      </div>
      <div class="follow-section">
        <div class="follow-label">微信群</div>
        <div class="follow-hint">群人数较多，请添加作者微信，通过邀请入群</div>
        <div class="follow-qq-num">ID：Pyacark</div>
      </div>
    </div>
    <button class="modal-close-btn" onclick="closeModal()">返 回</button>
  `);
}

// Mobile drawer toggle
function toggleMobileDrawer(){
  const layout=document.querySelector('.game-layout');
  const btn=document.getElementById('drawerToggle');
  if(!layout||!btn)return;
  const open=layout.classList.toggle('drawer-open');
  btn.querySelector('.drawer-toggle-arrow').textContent=open?'▼':'▲';
}

var _pseudoFS=false;
function _canNativeFS(){
  return !!(document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen);
}
function _isNativeFS(){
  return !!(document.fullscreenElement||document.webkitFullscreenElement);
}
function _updateFSBtn(){
  var btn=document.getElementById('fullscreenBtn');
  if(btn) btn.textContent=(_isNativeFS()||_pseudoFS)?'退出':'全屏';
}
function toggleFullscreen(){
  if(_isNativeFS()){
    // Exit native fullscreen
    if(document.exitFullscreen) document.exitFullscreen();
    else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
    return;
  }
  if(_pseudoFS){
    // Exit pseudo fullscreen
    document.body.classList.remove('pseudo-fullscreen');
    _pseudoFS=false;
    _updateFSBtn();
    return;
  }
  // Try native fullscreen first
  var el=document.documentElement;
  var entered=false;
  if(el.requestFullscreen){
    el.requestFullscreen().then(function(){entered=true;}).catch(function(){_enterPseudoFS();});
  }else if(el.webkitRequestFullscreen){
    el.webkitRequestFullscreen();
    // webkit doesn't return promise; check after a tick
    setTimeout(function(){if(!_isNativeFS()) _enterPseudoFS();},300);
  }else{
    _enterPseudoFS();
  }
}
function _enterPseudoFS(){
  document.body.classList.add('pseudo-fullscreen');
  _pseudoFS=true;
  _updateFSBtn();
  window.scrollTo(0,0);
}
document.addEventListener('fullscreenchange',_updateFSBtn);
document.addEventListener('webkitfullscreenchange',_updateFSBtn);

function showToast(msg){
  const t=document.createElement('div');t.className='game-toast';t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity 0.5s';setTimeout(()=>t.remove(),500)},1800);
}

// ============================
// AUTO-SAVE (session persistence across refresh)
// ============================
function autoSave(){
  if(!G.charId)return;
  try{
    var json=JSON.stringify(G);
    sessionStorage.setItem('czAutoSave',json);
    // Also persist to localStorage for cross-session auto-save
    localStorage.setItem('czAutoSave',JSON.stringify({data:{...G,stats:{...G.stats},attitudes:{...G.attitudes},tags:[...(G.tags||[])]},date:new Date().toISOString()}));
  }catch(e){}
}
function getAutoSaveSlot(){
  try{
    var raw=localStorage.getItem('czAutoSave');
    if(!raw)return null;
    var slot=JSON.parse(raw);
    if(!slot||!slot.data||!slot.data.charId)return null;
    return slot;
  }catch(e){return null}
}
function autoRestore(){
  try{
    const raw=sessionStorage.getItem('czAutoSave');
    if(!raw)return false;
    const data=JSON.parse(raw);
    if(!data||!data.charId)return false;
    G=data;
    if(!G.tags)G.tags=[];
    if(typeof G.lastFanshiTurn!=='number')G.lastFanshiTurn=-99;
    if(!G.attitudes.shishen)G.attitudes.shishen=30;
    if(typeof G.inPrison!=='boolean')G.inPrison=false;
    if(typeof G.prisonIndex!=='number')G.prisonIndex=0;
    if(typeof G.age!=='number')G.age=20;
    if(G.branch===undefined)G.branch=null;
    if(G.branchIndex===null)G.branchIndex=undefined;
    if(G.lastBranchChoice===undefined)G.lastBranchChoice=null;
    if(G._lastChoice===undefined)G._lastChoice=null;
    if(typeof G.turn!=='number')G.turn=1;
    if(typeof G.rankIndex!=='number')G.rankIndex=0;
    if(!G.stats)G.stats={caibo:0,wentao:0,lizheng:0,wulue:0,tizhi:0};
    if(!G.attitudes)G.attitudes={shengjuan:50,zhongguan:30,yanlu:50,minwang:50,shishen:50};
    if(typeof G.soundOn!=='boolean')G.soundOn=true;
    if(typeof G.emperorDead!=='boolean')G.emperorDead=false;
    showScreen('game-screen');updateTopbar();renderPanels();
    G._skipTransition=true;renderEvent();G._skipTransition=false;
    return true;
  }catch(e){return false}
}

// On page load: try to restore session state
(function(){
  if(autoRestore()){
    updateSoundBtns();
  }
})();
