(() => {
  'use strict';
  const STORAGE_KEY = 'stepgo-demo-v1';
  const PROFILE_AVATARS = Object.freeze(['👟','🏃','🚴','🦊','🐼','🐱','🤖','👑']);
  const DEFAULT_AVATAR = '👟';
  const DEMO_START_STEPS = 12458;
  const fmt = n => new Intl.NumberFormat('de-DE').format(n);
  const todayKey = () => {const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const fresh = () => ({date:todayKey(),steps:DEMO_START_STEPS,goal:15000,wallet:0,ledger:[],cityBuildings:[],cityUpgrades:{},stepSource:'demo',importedAt:null,profile:null,avatar:DEFAULT_AVATAR});
  // Das lokale Testprofil ist KEIN echtes Login. Niemals Passwoerter speichern.
  const normalizeProfile = raw => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const name = typeof raw.name==='string' ? raw.name.trim() : '';
    const email = typeof raw.email==='string' ? raw.email.trim().toLowerCase() : '';
    if (name.length<2 || name.length>32 || /[<>\x00-\x1f]/.test(name)) return null;
    if (email && (email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return null;
    return {name,email};
  };
  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || fresh(); } catch { state = fresh(); }
  if (!state || typeof state!=='object') state = fresh();
  if (!Array.isArray(state.ledger)) state.ledger = [];
  state.profile = normalizeProfile(state.profile);
  state.avatar = PROFILE_AVATARS.includes(state.avatar)?state.avatar:DEFAULT_AVATAR;
  if (!Array.isArray(state.cityBuildings)) state.cityBuildings = [];
  state.cityBuildings = [...new Set(state.cityBuildings.filter(item=>typeof item==='string'))];
  // Alte Spielstände hatten keine Gebäude-Stufen. Bereits gebaute Gebäude bleiben Stufe 1.
  const oldLevels = state.cityUpgrades && typeof state.cityUpgrades==='object' && !Array.isArray(state.cityUpgrades)
    ? state.cityUpgrades : {};
  state.cityUpgrades = {};
  state.cityBuildings.forEach(id=>{
    if (Object.prototype.hasOwnProperty.call(oldLevels,id) && (oldLevels[id]===2 || oldLevels[id]===3)) {
      Object.defineProperty(state.cityUpgrades,id,{value:oldLevels[id],enumerable:true,writable:true,configurable:true});
    }
  });
  if (!Number.isFinite(state.goal)) state.goal = 15000;
  if (!Number.isFinite(state.wallet)) state.wallet = 0;
  if (state.date!==todayKey()) {state.date=todayKey();state.steps=0;state.stepSource="demo";state.importedAt=null;}
  if (!Number.isFinite(state.steps)) state.steps=0;
  if (state.stepSource !== "health-import" && state.stepSource !== "demo") state.stepSource="demo";
  if (state.date !== todayKey()) state.stepSource="demo";
  state.steps=Math.max(0,Math.min(100000,Math.floor(state.steps)));
  state.wallet=Math.max(0,Math.floor(state.wallet));
  state.goal=Math.min(30000,Math.max(3000,state.goal));
  const $ = id => document.getElementById(id);
  const persist = () => {try {localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}};
  let toastTimer;
  const toast = s => { const t=$('toast');t.textContent=s;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),2700); };
  // StepGo City: Stadtmuenzen sind reine, lokale Spielwaehrung ohne Geldwert.
  const MILESTONES = Object.freeze([
    {steps:3000,coins:5,icon:'👟',name:'Warm-up'},
    {steps:6000,coins:10,icon:'⚡',name:'In Bewegung'},
    {steps:10000,coins:15,icon:'🏆',name:'Zehntausender'},
    {steps:15000,coins:20,icon:'🔥',name:'Power-Tag'},
    {steps:20000,coins:25,icon:'👑',name:'Champion'}
  ]);
  const earnedForSteps = steps => Math.min(200,Math.floor(steps / 100));
  const coinBreakdown = (steps, goal) => {
    const base = earnedForSteps(steps);
    const milestones = MILESTONES.filter(m=>steps>=m.steps).reduce((sum,m)=>sum+m.coins,0);
    const target = steps>=goal ? 20 : 0;
    return {base,milestones,target,total:base+milestones+target};
  };


  // StepGo City: Stadtmuenzen sind die einzige Bauwaehrung. Bestehendes Coin-Guthaben
  // und alte Gebaeude bleiben bei der Umstellung erhalten (ohne rueckwirkende Kosten).
  const CITY_BUILDINGS = Object.freeze([
    {id:'park',name:'Stadtpark',icon:'🌳',cost:25,plot:0,description:'Eine grüne Oase zum Entspannen.'},
    {id:'home',name:'Wohnviertel',icon:'🏡',cost:45,plot:1,description:'Die ersten Bewohner ziehen ein!'},
    {id:'bakery',name:'Bäckerei',icon:'🥐',cost:85,plot:2,description:'Hier duftet es nach frischem Brot.'},
    {id:'market',name:'Marktplatz',icon:'🏪',cost:130,plot:3,description:'Das Herz deiner kleinen Stadt.'},
    {id:'lake',name:'Stadtsee',icon:'⛲',cost:90,plot:5,description:'Ein schöner Ort für eine Pause.'},
    {id:'school',name:'Schule',icon:'🏫',cost:210,plot:6,description:'Hier lernen die Kinder der Stadt.'},
    {id:'clinic',name:'Klinik',icon:'🏥',cost:300,plot:7,description:'Versorgung für die ganze Stadt.'},
    {id:'tower',name:'Stadtturm',icon:'🏰',cost:450,plot:8,description:'Das Wahrzeichen deiner City.'}
  ]);
  // Kleine, rein dekorative City-Details; beeinflussen weder Kaeufe noch Guthaben.
  const CITY_DECORATIONS = Object.freeze({
    park:'🌷 🦋 🌿',home:'🌻 🌳 🪁',bakery:'🥖 🌼 ☕',market:'🍎 🎈 🌼',
    lake:'🦆 🌾 🐸',school:'🌳 ⚽ 🌼',clinic:'💚 🌷 🌿',tower:'🌲 ✨ 🎏'
  });
  const CITY_COMIC_ACCENTS = Object.freeze({
    hall:'⭐',park:'🦋',home:'🌻',bakery:'🥨',market:'🍎',
    lake:'🐸',school:'✏️',clinic:'✚',tower:'👑'
  });
  // Niemals hypothetische (unbestätigte) Schrittzahlen gutschreiben.
  const cityAvailable = () => state.wallet;
  const buildingLevel = id => state.cityBuildings.includes(id) ? (state.cityUpgrades[id] || 1) : 0;
  const MAX_BUILDING_LEVEL = 3;
  const upgradeCost = (item,level) => Math.ceil((item.cost * (level===1?2:4)) / 5) * 5;
  const cityLevel = () => 1+Math.floor(
    (state.cityBuildings.length + state.cityBuildings.reduce((sum,id)=>sum+buildingLevel(id)-1,0))/2
  );
  function renderCity(){
    const owned=new Set(state.cityBuildings);
    const pts=cityAvailable();
    $('cityAvailablePoints').textContent=fmt(pts);
    $('cityBuiltCount').textContent=(owned.size+1)+' / 9';
    $('cityLevel').textContent='STUFE '+cityLevel();
    $('cityMapProgress').textContent=owned.size+' von 8 gebaut · '+state.cityBuildings.reduce((sum,id)=>sum+buildingLevel(id)-1,0)+' Ausbauten';
    const grid=$('cityMap');
    grid.replaceChildren();
    for(let pos=0;pos<9;pos++){
      const item=CITY_BUILDINGS.find(b=>b.plot===pos);
      const built=pos===4 || !!(item&&owned.has(item.id));
      const level=pos===4?1:(built?buildingLevel(item.id):0);
      const tile=document.createElement('div');
      tile.className='city-plot'+(built?' city-plot-built':' city-plot-locked')+(pos===4?' city-plot-center':'')+(item?' city-plot-'+item.id:'')+(built?' city-plot-level-'+level:'');
      tile.setAttribute('aria-label',pos===4?'Rathaus – Startgebäude':item.name+(built?' – Stufe '+level+' von '+MAX_BUILDING_LEVEL:' – noch frei'));
      const scene=document.createElement('div');
      scene.className='city-plot-scene';
      const art=document.createElement('span');
      art.className='city-plot-art';
      art.textContent=pos===4?'🏛️':built?item.icon:'BAU';
      const decoration=document.createElement('span');
      decoration.className='city-plot-decoration';
      decoration.setAttribute('aria-hidden','true');
      decoration.textContent=pos===4?'🌳 🌼 🦋':built?CITY_DECORATIONS[item.id]:'🌱';
      scene.append(art,decoration);
      if (built) {
        // Feste perspektivische 3D-Ansicht: Dach, Vorderwand und Seitenwand.
        // Keine große Bibliothek, kein Drehen, keine zweiten Bauteile beim Upgrade.
        const model=document.createElement('div');
        model.className='city-model city-model-'+(pos===4?'hall':item.id)+' city-model-level-'+level;
        model.setAttribute('aria-hidden','true');
        ['roof','front','side','window','door','canopy','chimney','trim','flowerbox'].forEach(part=>{
          const layer=document.createElement('span');
          layer.className='city-model-'+part;
          model.append(layer);
        });
        const emblem=document.createElement('span');
        emblem.className='city-model-emblem';
        emblem.textContent=pos===4?'🏛️':item.icon;
        model.append(emblem);
        const accent=document.createElement('span');
        accent.className='city-model-accent';
        accent.textContent=CITY_COMIC_ACCENTS[pos===4?'hall':item.id];
        model.append(accent);
        if (level>=2) {
          const ornament=document.createElement('span');
          ornament.className='city-model-ornament';
          ornament.textContent=level===3?'✦ ✦':'✦';
          model.append(ornament);
        }
        scene.append(model);
      }
      const label=document.createElement('span');
      label.className='city-plot-label';
      label.textContent=pos===4?'Rathaus':built?item.name:'Bauplatz';
      tile.append(scene,label);
      if (built && pos!==4) {
        const rank=document.createElement('span');
        rank.className='city-plot-rank';
        rank.textContent='★ '+level;
        rank.setAttribute('aria-hidden','true');
        tile.append(rank);
      }
      grid.append(tile);
    }
    const list=$('cityBuildList');
    list.replaceChildren();
    CITY_BUILDINGS.forEach(item=>{
      const built=owned.has(item.id);
      const level=buildingLevel(item.id);
      const fullyUpgraded=built && level>=MAX_BUILDING_LEVEL;
      const price=built ? (fullyUpgraded?0:upgradeCost(item,level)) : item.cost;
      const canAfford=pts>=price;
      const card=document.createElement('article');
      card.className='city-build-card city-build-'+item.id+(built?' city-build-done':'');
      const icon=document.createElement('span');
      icon.className='city-build-icon'; icon.textContent=item.icon;
      const info=document.createElement('div');info.className='city-build-info';
      const title=document.createElement('strong');title.textContent=item.name;
      const detail=document.createElement('p');detail.textContent=item.description;
      const stage=document.createElement('span');
      stage.className='city-build-stage'+(fullyUpgraded?' city-build-stage-max':'');
      stage.textContent=built?('⭐ Stufe '+level+' / '+MAX_BUILDING_LEVEL+(fullyUpgraded?' · voll ausgebaut':'')):'🌱 Noch nicht gebaut';
      info.append(title,detail,stage);
      const action=document.createElement('button');action.type='button';
      action.className='city-build-button'+(fullyUpgraded?' city-build-button-done':'')+(built&&!fullyUpgraded?' city-build-button-upgrade':'');
      action.textContent=fullyUpgraded?'★ MAX':built?'⬆ '+fmt(price)+' ✦':fmt(price)+' ✦';
      action.disabled=fullyUpgraded||!canAfford;
      action.setAttribute('aria-label',fullyUpgraded?item.name+' ist vollständig ausgebaut':built?item.name+' von Stufe '+level+' auf '+(level+1)+' für '+price+' Stadtmünzen verbessern':item.name+' für '+price+' Stadtmünzen bauen');
      action.addEventListener('click',()=>built?upgradeCityBuilding(item.id):buildCityBuilding(item.id));
      card.append(icon,info,action);
      list.append(card);
    });
    const pending=CITY_BUILDINGS.filter(item=>!owned.has(item.id)).sort((a,b)=>a.cost-b.cost);
    const upgradeable=CITY_BUILDINGS.filter(item=>owned.has(item.id)&&buildingLevel(item.id)<MAX_BUILDING_LEVEL);
    const options=[
      ...pending.map(item=>({name:item.name,price:item.cost,action:'bauen'})),
      ...upgradeable.map(item=>({name:item.name,price:upgradeCost(item,buildingLevel(item.id)),action:'verbessern'}))
    ].sort((a,b)=>a.price-b.price);
    $('cityNextHint').textContent=options.length===0
      ? '🎉 Alle Gebäude stehen auf Stufe 3! Deine Stadt ist komplett!'
      : pts>=options[0].price
        ? '🎉 Du kannst jetzt '+options[0].name+' '+options[0].action+'!'
        : 'Noch '+fmt(options[0].price-pts)+' Stadtmünzen, um '+options[0].name+' zu '+options[0].action+'.';
  }
  function buildCityBuilding(id){
    const target=CITY_BUILDINGS.find(item=>item.id===id);
    if(!target || state.cityBuildings.includes(id))return;
    if(cityAvailable()<target.cost){toast('Noch nicht genug Stadtmünzen!');return;}
    state.wallet -= target.cost;
    state.cityBuildings.push(id);
    render();
    toast(target.icon+' '+target.name+' gebaut!');
  }
  function upgradeCityBuilding(id) {
    const item=CITY_BUILDINGS.find(entry=>entry.id===id);
    if (!item || !state.cityBuildings.includes(id)) return;
    const level=buildingLevel(id);
    if(level>=MAX_BUILDING_LEVEL) return;
    const price=upgradeCost(item,level);
    if(cityAvailable()<price){toast('Noch '+fmt(price-cityAvailable())+' Stadtmünzen für das Upgrade nötig.');return;}
    state.wallet-=price;
    state.cityUpgrades[id]=level+1;
    render();
    toast('🏗️ '+item.name+' auf Stufe '+(level+1)+' verbessert!');
  }

  const currentEntry = () => state.ledger.find(x=>x.date===todayKey());
  const coinsAvailable = () => currentEntry() ? 0 : coinBreakdown(state.steps,state.goal).total;
  const dateLabel = key => {const d=new Date(`${key}T12:00:00`);return new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'long',year:'numeric'}).format(d);};
  // Spielerlevel gibt es nur fuer bestaetigte Schritte, nie fuer unbestaetigte Demo-Eingaben.
  const confirmedSteps = () => state.ledger.reduce((sum,entry)=>{
    const steps=Number(entry && entry.steps);
    return sum+(Number.isFinite(steps)?Math.max(0,Math.min(100000,Math.floor(steps))):0);
  },0);
  const PLAYER_STEPS_PER_LEVEL = 10000;
  const PLAYER_MAX_LEVEL = 50;
  const playerLevel = total => Math.min(PLAYER_MAX_LEVEL,1+Math.floor(total/PLAYER_STEPS_PER_LEVEL));
  const ACHIEVEMENTS = Object.freeze([
    {id:'first-city',icon:'🏠',name:'Grundstein',hint:'Dein erstes Gebäude errichten',
      progress:()=>state.cityBuildings.length,target:1,unit:'Gebäude'},
    {id:'first-walk',icon:'👟',name:'Losgelaufen',hint:'Einen Tag mit mindestens 5.000 Schritten bestätigen',
      progress:()=>state.ledger.some(e=>Number(e.steps)>=5000)?1:0,target:1,unit:'Tag'},
    {id:'three-city',icon:'🏙️',name:'Stadt wächst',hint:'Drei Gebäude errichten',
      progress:()=>state.cityBuildings.length,target:3,unit:'Gebäude'},
    {id:'ten-k',icon:'🏅',name:'10.000er',hint:'Einen Tag mit 10.000 Schritten bestätigen',
      progress:()=>state.ledger.some(e=>Number(e.steps)>=10000)?1:0,target:1,unit:'Tag'},
    {id:'three-days',icon:'🔥',name:'Dranbleiben',hint:'An drei Tagen Schritte bestätigen',
      progress:()=>new Set(state.ledger.map(e=>e.date).filter(d=>typeof d==='string')).size,target:3,unit:'Tage'},
    {id:'upgrade',icon:'🏗️',name:'Baumeister',hint:'Ein Gebäude auf Stufe 3 ausbauen',
      progress:()=>state.cityBuildings.some(id=>buildingLevel(id)>=3)?1:0,target:1,unit:'Gebäude'}
  ]);
  function renderAvatarChoices(){
    const chooser=$('profileAvatarChoices');
    chooser.replaceChildren();
    PROFILE_AVATARS.forEach((avatar,index)=>{
      const button=document.createElement('button');
      button.className='profile-avatar-option'+(state.avatar===avatar?' chosen':'');
      button.textContent=avatar;
      button.setAttribute('type','button');
      button.setAttribute('aria-label','Avatar '+(index+1)+' auswählen: '+avatar);
      button.setAttribute('aria-pressed',String(state.avatar===avatar));
      button.addEventListener('click',()=>{
        state.avatar=avatar;
        render();
        toast('Avatar gespeichert');
      });
      chooser.append(button);
    });
  }
  function renderAchievements(){
    const list=$('profileAchievementList');
    list.replaceChildren();
    let earned=0;
    ACHIEVEMENTS.forEach(item=>{
      const amount=Math.max(0,Math.min(item.target,Number(item.progress())||0));
      const unlocked=amount>=item.target;
      if(unlocked) earned++;
      const card=document.createElement('div');
      card.className='profile-achievement'+(unlocked?' unlocked':' locked');
      const badge=document.createElement('span');
      badge.className='profile-achievement-icon';
      badge.setAttribute('aria-hidden','true');
      badge.textContent=unlocked?item.icon:'🔒';
      const detail=document.createElement('div');
      detail.className='profile-achievement-info';
      const title=document.createElement('strong');
      title.textContent=item.name;
      const hint=document.createElement('span');
      hint.textContent=item.hint;
      const status=document.createElement('small');
      status.textContent=unlocked?'Freigeschaltet ✓':amount+' / '+item.target+' '+item.unit;
      detail.append(title,hint,status);
      card.append(badge,detail);
      list.append(card);
    });
    $('profileAchievementCount').textContent=earned+' / '+ACHIEVEMENTS.length;
  }
  function renderProfile(){
    const profile=state.profile;
    $('profileAccountBadge').textContent=profile?'LOKALES TESTPROFIL':'NICHT ANGEMELDET';
    $('profileAccountBadge').classList.toggle('has-profile',!!profile);
    $('profileAccountHeading').textContent=profile?profile.name:'Dein Spielerprofil';
    $('profileDisplayEmail').textContent=profile?(profile.email||'Keine E-Mail-Adresse hinterlegt'):'Noch keine E-Mail-Adresse hinterlegt';
    $('profileAvatar').textContent=state.avatar;
    renderAvatarChoices();
    const total=confirmedSteps();
    const level=playerLevel(total);
    const maxed=level===PLAYER_MAX_LEVEL;
    const next=maxed?0:PLAYER_STEPS_PER_LEVEL-(total%PLAYER_STEPS_PER_LEVEL);
    const fraction=maxed?100:Math.floor((total%PLAYER_STEPS_PER_LEVEL)/PLAYER_STEPS_PER_LEVEL*100);
    $('profileLevel').textContent='Level '+level;
    $('profileLifetimeSteps').textContent=fmt(total)+' bestätigte Schritte';
    $('profileLevelNext').textContent=maxed?'Maximales Level erreicht':'Noch '+fmt(next)+' Schritte';
    $('profileLevelFill').style.width=fraction+'%';
    $('profileLevelTrack').setAttribute('aria-valuenow',String(fraction));
    renderAchievements();
    $('profileStepsToday').textContent=fmt(state.steps);
    $('profileCoins').textContent=fmt(state.wallet);
    $('profileBuildings').textContent=(state.cityBuildings.length+1)+' / 9';
    $('profileEditButton').textContent=profile?'✏️ Profil bearbeiten':'✏️ Testprofil einrichten';
    $('profileRemoveButton').hidden=!profile;
    $('profileAccountNote').textContent=profile
      ? 'Nur auf diesem Gerät gespeichert. Deine E-Mail ist noch nicht verifiziert; eine echte Anmeldung ist noch nicht aktiviert.'
      : 'Du spielst bisher ohne Benutzerkonto. Ein Testprofil kannst du hier auf diesem Gerät speichern.';
    $('settingsEmailValue').textContent=profile&&profile.email?profile.email:'E-Mail-Adresse hinterlegen';
  }

  function render(){
    const pct=Math.min(100,Math.round(state.steps/state.goal*100));
    const remaining=Math.max(0,state.goal-state.steps);
    $('todayLabel').textContent=new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'numeric',month:'long'}).format(new Date()).toUpperCase();
    $('stepsMain').textContent=fmt(state.steps);
    $('goalProgress').textContent=fmt(state.steps);
    $('goalText').textContent=fmt(state.goal);
    $('stepsRemaining').textContent=remaining?`Noch ${fmt(remaining)}`:'Ziel erreicht ✓';
    $('stepRing').style.setProperty('--pct',pct+'%');
    $('stepRing').setAttribute('aria-valuemax',String(state.goal));
    $('stepRing').setAttribute('aria-valuenow',String(Math.min(state.steps,state.goal)));
    $('percentPill').textContent=`${pct} % vom Tagesziel`;
    $('earnableCoins').textContent=fmt(coinsAvailable());
    $('walletCoins').textContent=fmt(state.wallet);
    $('statSteps').textContent=fmt(state.steps);
    $('statDays').textContent=fmt(state.ledger.length);
    $('activitySteps').textContent=fmt(state.steps);
    $('activityStepSource').textContent=state.stepSource==='health-import'?'Aus Apple Health übernommen (manuell)':'Schritte im Testmodus';
    $('healthImportHint').textContent=state.stepSource==='health-import'?'Zuletzt übernommen: '+fmt(state.steps)+' Schritte · '+(state.importedAt ? new Date(state.importedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr':'heute')+'. Nur Spielwährung.':'Noch keine Health-Schritte für heute übernommen.';
    $('historyCount').textContent=`${state.ledger.length} ${state.ledger.length===1?'Eintrag':'Einträge'}`;
    $('goalRange').value=String(state.goal);
    $('goalSettingLabel').textContent=fmt(state.goal);

    // Ist heute schon bestätigt, bleibt die Tagesgutschrift eingefroren. Neue Health-Schritte
    // verändern niemals rückwirkend die Stadtmuenzen des bereits bestätigten Tages.
    const claimedEntry = currentEntry();
    $('challengeProgress').textContent=fmt(state.steps)+' / '+fmt(state.goal)+' Schritte';
    $('challengeGoalText').textContent=state.steps>=state.goal
      ? 'Stark! Du hast dein Tagesziel geknackt. 🎉'
      : 'Noch '+fmt(state.goal-state.steps)+' Schritte bis zu deinem persönlichen Tagesziel.';
    $('challengeGoalStatus').textContent=state.steps>=state.goal?'Ziel geschafft! ✓':'+'+fmt(20)+' ✦ möglich';
    $('challengeGoalStatus').classList.toggle('completed',state.steps>=state.goal);
    $('challengeFill').style.width=Math.min(100,state.steps/state.goal*100)+'%';
    $('challengeTrack').setAttribute('aria-valuemax',String(state.goal));
    $('challengeTrack').setAttribute('aria-valuenow',String(Math.min(state.steps,state.goal)));
    document.querySelectorAll('[data-goal-preset]').forEach(button=>{
      const selected=Number(button.dataset.goalPreset)===state.goal;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    const lastClaimSteps=claimedEntry ? claimedEntry.steps : state.steps;
    const listHome=$('milestoneHomeList');
    listHome.replaceChildren();
    MILESTONES.forEach(m=>{
      const achieved=lastClaimSteps>=m.steps;
      const createTile=(detailed)=>{
        const el=document.createElement('div');
        el.className=(detailed?'milestone-reward-tile':'milestone-tile')+(achieved?' achieved':'');
        const icon=document.createElement('span');
        icon.className='milestone-icon';icon.textContent=achieved?'✓':m.icon;
        const info=document.createElement('div');
        const count=document.createElement('strong');
        count.textContent=fmt(m.steps)+' Schritte';
        const name=document.createElement('small');
        name.textContent=detailed ? m.name : achieved ? 'Geschafft!' : m.name;
        info.append(count,name);
        const coin=document.createElement('span');
        coin.className='milestone-reward-coin';coin.textContent='+'+m.coins+' ✦';
        el.append(icon,info,coin);
        return el;
      };
      listHome.append(createTile(false));
    });
    const next=MILESTONES.find(m=>state.steps<m.steps);
    $('nextMilestoneText').textContent=claimedEntry
      ? 'Heute wurden deine Stadtmünzen schon gesammelt. Morgen warten neue Boni!'
      : next ? 'Noch '+fmt(next.steps-state.steps)+' Schritte bis '+next.name+' (+'+next.coins+' Stadtmünzen)!'
             : 'Alle fünf Meilensteine erreicht! 👑';

    renderCity();
    renderProfile();
    const claimed=!!currentEntry();
    $('claimBtn').disabled=claimed || state.steps<100;
    $('claimBtnText').textContent=claimed?'Heute bereits bestätigt ✓':state.steps<100?'Mindestens 100 Schritte nötig':'Schritte bestätigen';
    $('claimCaption').textContent=claimed?'Morgen warten neue Stadtmünzen auf dich.':'1 Stadtmünze / 100 Schritte (max. 200) + Tagesziel- und Meilenstein-Boni · kein Geldwert';
    const history=$('historyList');history.replaceChildren();
    if (!state.ledger.length){const el=document.createElement('div');el.className='empty';el.textContent='Noch keine Tage bestätigt. Deine ersten Stadtmünzen warten auf dich!';history.append(el);}
    else state.ledger.slice().reverse().forEach(entry=>{const el=document.createElement('div');el.className='history-entry';const left=document.createElement('div');const date=document.createElement('span');date.className='date';date.textContent=dateLabel(entry.date);const steps=document.createElement('div');steps.className='step-detail';steps.textContent=`${fmt(entry.steps)} Schritte`+(Number.isFinite(entry.milestoneCoins)?` · Bonus +${entry.milestoneCoins+entry.goalCoins} Stadtmünzen`:'');left.append(date,steps);const coin=document.createElement('strong');coin.textContent=`+${fmt(entry.coins)} ✦`;el.append(left,coin);history.append(el);});
    persist();
  }

  // StepGo Arena: nur lokale UI-Vorschau. Keine Online-Spieler, keine echten Gewinne
  // und keine Verbindung zu Stadtmuenzen, Tages-Schritten oder Gebaeuden.
  const demoDuel = {active:false,mine:12400,rival:11800};
  function showCompetitionView(view) {
    const showLeague = view === 'league';
    $('competitionLeaguePanel').hidden = !showLeague;
    $('competitionDuelPanel').hidden = showLeague;
    $('competitionLeagueTab').setAttribute('aria-pressed',String(showLeague));
    $('competitionDuelTab').setAttribute('aria-pressed',String(!showLeague));
    $('competitionLeagueTab').classList.toggle('active',showLeague);
    $('competitionDuelTab').classList.toggle('active',!showLeague);
  }
  function renderDemoDuel() {
    $('duelMySteps').textContent = fmt(demoDuel.mine);
    $('duelOpponentSteps').textContent = fmt(demoDuel.rival);
    const top = Math.max(1,demoDuel.mine,demoDuel.rival);
    $('duelMyFill').style.width = (demoDuel.mine/top*100).toFixed(1)+'%';
    $('duelOpponentFill').style.width = (demoDuel.rival/top*100).toFixed(1)+'%';
    $('duelStartBtn').disabled = demoDuel.active;
    $('duelAddBtn').disabled = !demoDuel.active || demoDuel.mine>=100000;
    $('duelResetBtn').disabled = !demoDuel.active;
    $('duelStatus').textContent = demoDuel.active
      ? '🟢 Demo läuft – ohne echten 72-Stunden-Timer'
      : 'Beispielduell – noch nicht gestartet.';
    const diff = Math.abs(demoDuel.mine-demoDuel.rival);
    $('duelResult').textContent = !demoDuel.active
      ? 'Die Beispielwerte ändern keine Stadtmünzen oder Gebäude.'
      : diff===0 ? 'Gleichstand! Alle Schritte hier sind reine Testwerte.'
      : (demoDuel.mine>demoDuel.rival?'Du liegst ':'LaufFuchs liegt ') +
        fmt(diff) + ' Demo-Schritte vorne. Keine echten Gewinne.';
  }
  $('membershipInfoBtn').addEventListener('click',()=>{
    const panel = $('membershipInfoPanel');
    panel.hidden = !panel.hidden;
    const expanded = !panel.hidden;
    $('membershipInfoBtn').setAttribute('aria-expanded',String(expanded));
    $('membershipInfoBtn').textContent = expanded ? 'Weniger anzeigen ↑' : 'Was ist enthalten? ↓';
  });
  $('competitionLeagueTab').addEventListener('click',()=>showCompetitionView('league'));
  $('competitionDuelTab').addEventListener('click',()=>showCompetitionView('duel'));
  $('duelStartBtn').addEventListener('click',()=>{
    if (demoDuel.active) return;
    demoDuel.active = true;
    renderDemoDuel();
    toast('⚔️ Demo-Duell gestartet – nur Beispielwerte!');
  });
  $('duelAddBtn').addEventListener('click',()=>{
    if (!demoDuel.active) return;
    demoDuel.mine = Math.min(100000,demoDuel.mine+1000);
    renderDemoDuel();
    toast('+1.000 Demo-Duellschritte – keine Stadtmünzen');
  });
  $('duelResetBtn').addEventListener('click',()=>{
    if (!demoDuel.active) return;
    demoDuel.active = false;
    demoDuel.mine = 12400;
    demoDuel.rival = 11800;
    renderDemoDuel();
    toast('Duell-Vorschau zurückgesetzt');
  });
  showCompetitionView('league');
  renderDemoDuel();

  function switchTab(tab){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='screen-'+tab));document.querySelectorAll('.nav-link').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});scrollTo({top:0,behavior:'smooth'});}
  document.querySelectorAll('.nav-link').forEach(b=>b.addEventListener('click',()=>{closeSettings();switchTab(b.dataset.tab);}));
  $('profileShortcut').addEventListener('click',()=>{closeSettings();switchTab('profile');});
  // Einstellungen im Profil: eigene App-Ansicht statt verschachtelter Karten.
  const closeSettings=()=>{
    $('profileOverview').hidden=false;
    $('profileSettings').hidden=true;
    $('settingsDetail').hidden=true;
  };
  const openSettings=()=>{
    $('profileOverview').hidden=true;
    $('profileSettings').hidden=false;
    $('settingsDetail').hidden=true;
  };
  const openSettingsDetail=(heading,kind='text',message='')=>{
    $('profileOverview').hidden=true;
    $('profileSettings').hidden=true;
    $('settingsDetail').hidden=false;
    $('settingsDetailHeading').textContent=heading;
    $('settingsDetailText').hidden=kind!=='text';
    $('settingsGoalContent').hidden=kind!=='goal';
    $('settingsPrivacyContent').hidden=kind!=='privacy';
    $('settingsLoginContent').hidden=kind!=='login';
    if(kind==='text') $('settingsDetailText').textContent=message;
  };
  // Hamburger-Menü oben rechts: Einstellungen sind ausschließlich hier erreichbar.
  const menuButton=$('headerMenuButton');
  const menu=$('headerMenu');
  const closeHeaderMenu=()=>{
    menu.hidden=true;
    menuButton.setAttribute('aria-expanded','false');
    menuButton.setAttribute('aria-label','Menü öffnen');
  };
  menuButton.addEventListener('click',()=>{
    const willOpen=menu.hidden;
    menu.hidden=!willOpen;
    menuButton.setAttribute('aria-expanded',String(willOpen));
    menuButton.setAttribute('aria-label',willOpen?'Menü schließen':'Menü öffnen');
  });
  $('menuSettingsButton').addEventListener('click',()=>{
    closeHeaderMenu();
    switchTab('profile');
    openSettings();
  });
  $('menuProfileButton').addEventListener('click',()=>{
    closeHeaderMenu();
    closeSettings();
    switchTab('profile');
  });
  document.addEventListener('click',event=>{
    if(!event.target.closest('.header-menu-wrap'))closeHeaderMenu();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!menu.hidden){closeHeaderMenu();menuButton.focus();}
  });
  $('settingsBackButton').addEventListener('click',closeSettings);
  $('settingsDetailBackButton').addEventListener('click',openSettings);
  const openProfileEditFromSettings=()=>{
    closeSettings();
    $('profileEditButton').click();
  };
  $('settingsEmailButton').addEventListener('click',openProfileEditFromSettings);
  $('settingsNameButton').addEventListener('click',openProfileEditFromSettings);
  $('settingsLocalProfileButton').addEventListener('click',openProfileEditFromSettings);
  $('settingsInviteButton').addEventListener('click',()=>openSettingsDetail('Freund:innen einladen','text','Freunde-Einladungen gibt es in der Testversion noch nicht. Dafür brauchen wir zuerst echte Benutzerkonten und eine sichere Einladung.'));
  $('settingsBlockedButton').addEventListener('click',()=>openSettingsDetail('Blockierte Personen','text','Bisher gibt es keine echten Kontakte oder Spielergegner, die du blockieren könntest. Diese Verwaltung folgt mit den Online-Konten.'));
  $('settingsLoginButton').addEventListener('click',()=>openSettingsDetail('Anmelden & registrieren','login'));
  $('settingsLogoutButton').addEventListener('click',()=>openSettingsDetail('Ausloggen','text','Du bist noch nicht mit einem Online-Konto angemeldet. Ein lokales Testprofil ist keine Anmeldung. Deshalb gibt es zurzeit nichts auszuloggen.'));
  $('settingsGoalButton').addEventListener('click',()=>openSettingsDetail('Schrittziel','goal'));
  $('settingsUnitsButton').addEventListener('click',()=>openSettingsDetail('Maßeinheit & Entfernung','text','StepGo City zählt im Moment Schritte. Eine umschaltbare Entfernungsanzeige in Kilometern oder Meilen ist für eine spätere Version geplant.'));
  $('settingsNotificationsButton').addEventListener('click',()=>openSettingsDetail('Benachrichtigungen','text','Push-Mitteilungen werden in dieser Testversion nicht verschickt. Später kannst du Erinnerungen und Wettkampfmeldungen hier selbst ein- und ausschalten.'));
  $('settingsSupportButton').addEventListener('click',()=>openSettingsDetail('Support kontaktieren','text','Der offizielle StepGo-Supportkanal ist noch nicht eingerichtet. In dieser Testversion werden keine Nachrichten versendet.'));
  $('settingsTermsButton').addEventListener('click',()=>openSettingsDetail('Nutzungsbedingungen','text','StepGo City ist derzeit ein lokaler Spielprototyp. Es gibt noch keine abgeschlossene Konto-Registrierung, keine kostenpflichtige Mitgliedschaft und keine Gewinne mit Geldwert. Verbindliche Nutzungsbedingungen werden vor dem öffentlichen Start bereitgestellt.'));
  $('settingsPrivacyButton').addEventListener('click',()=>openSettingsDetail('Datenschutz','privacy'));
  $('settingsRemoveProfileButton').addEventListener('click',()=>{
    if(!state.profile){
      openSettingsDetail('Profilangaben löschen','text','Es sind noch keine lokalen Profilangaben gespeichert. Deine Stadt und Stadtmünzen bleiben unverändert.');
      return;
    }
    // Bestehender bestaetigter Loeschvorgang fuer reine Profilfelder.
    $('profileRemoveButton').click();
    openSettings();
  });
  $('settingsClearButton').addEventListener('click',()=>$('clearAll').click());

  $('profileAvatarButton').addEventListener('click',()=>{
    const open=$('profileAvatarChooser').hidden;
    $('profileAvatarChooser').hidden=!open;
    $('profileAvatarButton').setAttribute('aria-expanded',String(open));
  });
  $('profileEditButton').addEventListener('click',()=>{
    $('profileLoginInfo').hidden=true;
    $('profileLoginButton').setAttribute('aria-expanded','false');
    $('profileName').value=state.profile?state.profile.name:'';
    $('profileEmail').value=state.profile?state.profile.email:'';
    $('profileFormError').textContent='';
    $('profileFormError').hidden=true;
    $('profileForm').hidden=false;
    $('profileName').focus();
  });
  $('profileCancelButton').addEventListener('click',()=>{
    $('profileForm').hidden=true;
    $('profileFormError').hidden=true;
  });
  $('profileForm').addEventListener('submit',event=>{
    event.preventDefault();
    const candidate={
      name:String($('profileName').value??'').trim(),
      email:String($('profileEmail').value??'').trim()
    };
    const profile=normalizeProfile(candidate);
    if(!profile){
      $('profileFormError').textContent='Bitte gib einen Spielernamen (2–32 Zeichen) und – falls eingetragen – eine gültige E-Mail-Adresse ein.';
      $('profileFormError').hidden=false;
      return;
    }
    state.profile=profile;
    $('profileFormError').hidden=true;
    $('profileForm').hidden=true;
    render();
    toast('Testprofil lokal gespeichert – noch kein echtes Konto.');
  });
  $('profileRemoveButton').addEventListener('click',()=>{
    if(!state.profile) return;
    if(!confirm('Nur deinen gespeicherten Spielernamen und die E-Mail-Adresse löschen? Stadt und Münzen bleiben erhalten.'))return;
    state.profile=null;
    $('profileForm').hidden=true;
    $('profileLoginInfo').hidden=true;
    $('profileLoginButton').setAttribute('aria-expanded','false');
    render();
    toast('Lokale Profilangaben gelöscht. Deine Stadt bleibt erhalten.');
  });
  $('profileLoginButton').addEventListener('click',()=>{
    const show=$('profileLoginInfo').hidden;
    $('profileForm').hidden=true;
    $('profileLoginInfo').hidden=!show;
    $('profileLoginButton').setAttribute('aria-expanded',String(show));
  });
  $('profileLoginCloseButton').addEventListener('click',()=>{
    $('profileLoginInfo').hidden=true;
    $('profileLoginButton').setAttribute('aria-expanded','false');
  });
  $('openCompetitionBtn').addEventListener('click',()=>switchTab('competitions'));
  $('openStepsBtn').addEventListener('click',()=>switchTab('activity'));
  $('add1k').addEventListener('click',()=>{state.steps=Math.min(100000,state.steps+1000);state.stepSource='demo';state.importedAt=null;render();toast('+1.000 Demo-Schritte hinzugefügt');});
  $('add5k').addEventListener('click',()=>{state.steps=Math.min(100000,state.steps+5000);state.stepSource='demo';state.importedAt=null;render();toast('+5.000 Demo-Schritte hinzugefügt');});
  $('resetDemo').addEventListener('click',()=>{state.steps=DEMO_START_STEPS;state.stepSource='demo';state.importedAt=null;render();toast('Demo-Schritte zurückgesetzt');});

  const parseSteps = raw => {
    const text = String(raw ?? '').trim();
    if (!/^(?:[0-9]{1,6}|[0-9]{1,3}(?:[.,\s][0-9]{3})+)$/.test(text)) return null;
    const count = Number(text.replace(/[^0-9]/g, ''));
    return Number.isInteger(count) && count >= 0 && count <= 100000 ? count : null;
  };
  const applySteps = count => {
    if (state.date !== todayKey()) {
      state.date = todayKey();
      state.stepSource = 'demo';
      state.importedAt = null;
    }
    state.steps = count;
    state.stepSource = 'health-import';
    state.importedAt = new Date().toISOString();
    $('healthSteps').value = '';
    render();
    toast(currentEntry() ? 'Schritte aktualisiert. Stadtmünzen für heute sind schon bestätigt.' : fmt(count) + ' Schritte übernommen!');
  };
  $('runHealthShortcut').addEventListener('click', () => {
    // Apple dokumentiert shortcuts://run-shortcut?name=...
    window.location.href = 'shortcuts://run-shortcut?name=StepGo-Schritte';
  });
  $('pasteHealthSteps').addEventListener('click', async () => {
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
      $('healthSteps').focus();
      toast('Zwischenablage nicht verfügbar. Die Zahl unten selbst einfügen.');
      return;
    }
    try {
      const copied = await navigator.clipboard.readText();
      const count = parseSteps(copied);
      if (count === null) {
        toast('Keine gültige Schrittzahl kopiert. Starte erst StepGo-Schritte.');
        return;
      }
      applySteps(count);
    } catch {
      $('healthSteps').focus();
      toast('Einfügen nicht erlaubt. Halte das Eingabefeld gedrückt und wähle Einsetzen.');
    }
  });


  // Der echte HealthKit-Zugriff läuft ausschließlich in der nativen iOS-App.
  // Safari und die Home-Bildschirm-Web-App bleiben beim bisherigen Kurzbefehl.
  const nativeCapacitor = window.Capacitor;
  // Eine Capacitor-WebView stellt für native Plugins direkt unter
  // window.Capacitor.Plugins einen JavaScript-Proxy bereit.
  // Die normale GitHub-Pages-App hat diesen Proxy nicht.
  const nativeHealthPlugin =
    nativeCapacitor &&
    typeof nativeCapacitor.isNativePlatform === 'function' &&
    nativeCapacitor.isNativePlatform() &&
    nativeCapacitor.Plugins &&
    nativeCapacitor.Plugins.StepGoHealth &&
    typeof nativeCapacitor.Plugins.StepGoHealth.readTodaySteps === 'function'
      ? nativeCapacitor.Plugins.StepGoHealth
      : null;
  const HEALTH_CONSENT_KEY = 'stepgo-health-native-consent-v1';
  let syncingNativeHealth = false;
  let nativeLastSync = 0;
  let nativeHealthEnabled = false;
  if (nativeHealthPlugin) {
    $('nativeHealthCard').hidden = false;
    $('manualHealthCard').classList.add('native-health-fallback');
    nativeHealthEnabled = localStorage.getItem(HEALTH_CONSENT_KEY) === 'yes';
    $('nativeHealthSyncButton').textContent = nativeHealthEnabled
      ? '↻ Schritte jetzt aktualisieren'
      : '♥ Apple Health verbinden';
    $('nativeHealthStatus').textContent = nativeHealthEnabled
      ? 'Direkte Verbindung eingerichtet. Die Schritte werden beim Öffnen aktualisiert.'
      : 'Einmal Zugriff erlauben, danach liest StepGo City deine Schritte direkt.';
  }
  async function syncNativeHealth(fromButton = false) {
    if (!nativeHealthPlugin || syncingNativeHealth) return;
    if (!nativeHealthEnabled && !fromButton) return;
    syncingNativeHealth = true;
    const button = $('nativeHealthSyncButton');
    button.disabled = true;
    button.textContent = 'Schritte werden gelesen …';
    try {
      if (!nativeHealthEnabled) {
        await nativeHealthPlugin.requestAuthorization();
        nativeHealthEnabled = true;
        localStorage.setItem(HEALTH_CONSENT_KEY,'yes');
      }
      const result = await nativeHealthPlugin.readTodaySteps();
      const steps = Number(result && result.steps);
      if (!Number.isSafeInteger(steps) || steps < 0 || steps > 100000) {
        throw new Error('Ungültige Schrittzahl von Apple Health');
      }
      if (steps === 0 && state.steps > 0) {
        $('nativeHealthStatus').textContent =
          'Apple Health liefert derzeit 0 Schritte. Bitte prüfe die Lesefreigabe in den iPhone-Einstellungen.';
        if (fromButton) toast('Health meldet 0 Schritte – bisherige Zahl bleibt erhalten.');
        return;
      }
      // Nicht unnötig oft neu schreiben und den Zeitstempel nur bei Änderung aktualisieren.
      if (steps !== state.steps || state.stepSource !== 'health-import') applySteps(steps);
      nativeLastSync = Date.now();
      $('nativeHealthStatus').textContent = fmt(steps)+' Schritte heute aus Apple Health · automatisch synchronisiert.';
      if (fromButton) toast('Apple Health synchronisiert: '+fmt(steps)+' Schritte');
    } catch (error) {
      $('nativeHealthStatus').textContent =
        'Verbindung fehlgeschlagen. Prüfe unter Einstellungen → Datenschutz & Sicherheit → Health die Lesefreigabe.';
      if (fromButton) toast('Apple Health konnte nicht gelesen werden.');
    } finally {
      button.disabled = false;
      button.textContent = nativeHealthEnabled ? '↻ Schritte jetzt aktualisieren' : '♥ Apple Health verbinden';
      syncingNativeHealth = false;
    }
  }
  if (nativeHealthPlugin) {
    $('nativeHealthSyncButton').addEventListener('click',()=>syncNativeHealth(true));
    // Beim Zurückkehren aus Health oder nach einem Spaziergang aktualisieren,
    // sofern der Nutzer den Zugriff einmal selbst aktiviert hat.
    document.addEventListener('visibilitychange',()=>{
      if (!document.hidden && nativeHealthEnabled && Date.now()-nativeLastSync>10000) {
        syncNativeHealth();
      }
    });
    window.addEventListener('focus',()=>{
      if (nativeHealthEnabled && Date.now()-nativeLastSync>10000) syncNativeHealth();
    });
    if (nativeHealthEnabled) syncNativeHealth();
  }

  $('healthImportForm').addEventListener('submit', event => {
    event.preventDefault();
    const value = parseSteps($('healthSteps').value);
    if (value === null) { toast('Bitte gültige Schrittzahl von 0 bis 100.000 eingeben.'); return; }
    applySteps(value);
  });

  $('goalRange').addEventListener('input',event=>{state.goal=Number(event.target.value);render();});
  document.querySelectorAll('[data-goal-preset]').forEach(button=>button.addEventListener('click',()=>{
    state.goal=Number(button.dataset.goalPreset);
    render();
    toast('Tagesziel auf '+fmt(state.goal)+' Schritte eingestellt');
  }));
  $('claimBtn').addEventListener('click',()=>{
    if(currentEntry()) {toast('Heute schon bestätigt.');return;}
    const earned=coinBreakdown(state.steps,state.goal);
    if(earned.total<1)return;
    state.wallet+=earned.total;
    state.ledger.push({
      date:todayKey(),steps:state.steps,coins:earned.total,
      baseCoins:earned.base,milestoneCoins:earned.milestones,goalCoins:earned.target,
      goalAtClaim:state.goal
    });
    render();
    $('modalText').textContent=`Du hast ${fmt(state.steps)} Schritte bestätigt und ${fmt(earned.total)} Stadtmünzen für deine StepGo City gesammelt!`;
    $('modalBackdrop').classList.add('open');$('modalBackdrop').setAttribute('aria-hidden','false');$('modalClose').focus();
  });
  $('modalClose').addEventListener('click',()=>{$('modalBackdrop').classList.remove('open');$('modalBackdrop').setAttribute('aria-hidden','true');});
  $('modalBackdrop').addEventListener('click',ev=>{if(ev.target===$('modalBackdrop'))$('modalClose').click();});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape' && $('modalBackdrop').classList.contains('open'))$('modalClose').click();});
  $('clearAll').addEventListener('click',()=>{if(!confirm('Wirklich alle StepGo-Testdaten löschen?'))return;closeSettings();state=fresh();demoDuel.active=false;demoDuel.mine=12400;demoDuel.rival=11800;showCompetitionView('league');renderDemoDuel();render();switchTab('home');toast('Testdaten gelöscht');});
  closeSettings();
  render();
})();
