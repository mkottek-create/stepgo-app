(() => {
  'use strict';
  const STORAGE_KEY = 'stepgo-demo-v1';
  const DEMO_START_STEPS = 12458;
  const fmt = n => new Intl.NumberFormat('de-DE').format(n);
  const todayKey = () => {const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const fresh = () => ({date:todayKey(),steps:DEMO_START_STEPS,goal:15000,wallet:0,ledger:[],cityBuildings:[],stepSource:'demo',importedAt:null});
  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || fresh(); } catch { state = fresh(); }
  if (!state || typeof state!=='object') state = fresh();
  if (!Array.isArray(state.ledger)) state.ledger = [];
  if (!Array.isArray(state.cityBuildings)) state.cityBuildings = [];
  state.cityBuildings = [...new Set(state.cityBuildings.filter(item=>typeof item==='string'))];
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
    park:'🌼 🌿',home:'🌳 🌻',bakery:'🌷 🥖',market:'🌿 🎈',
    lake:'🦆 🌾',school:'🌳 🌼',clinic:'🌿 💚',tower:'🌲 ✨'
  });
  // Niemals hypothetische (unbestätigte) Schrittzahlen gutschreiben.
  const cityAvailable = () => state.wallet;
  const cityLevel = () => 1+Math.floor(state.cityBuildings.length/2);
  function renderCity(){
    const owned=new Set(state.cityBuildings);
    const pts=cityAvailable();
    $('cityAvailablePoints').textContent=fmt(pts);
    $('cityBuiltCount').textContent=(owned.size+1)+' / 9';
    $('cityLevel').textContent='STUFE '+cityLevel();
    $('cityMapProgress').textContent=owned.size+' von 8 gebaut';
    const grid=$('cityMap');
    grid.replaceChildren();
    for(let pos=0;pos<9;pos++){
      const item=CITY_BUILDINGS.find(b=>b.plot===pos);
      const built=pos===4 || !!(item&&owned.has(item.id));
      const tile=document.createElement('div');
      tile.className='city-plot'+(built?' city-plot-built':' city-plot-locked')+(pos===4?' city-plot-center':'')+(item?' city-plot-'+item.id:'');
      tile.setAttribute('aria-label',pos===4?'Rathaus – Startgebäude':item.name+(built?' – gebaut':' – noch frei'));
      const scene=document.createElement('div');
      scene.className='city-plot-scene';
      const art=document.createElement('span');
      art.className='city-plot-art';
      art.textContent=pos===4?'🏛️':built?item.icon:'🌱';
      const decoration=document.createElement('span');
      decoration.className='city-plot-decoration';
      decoration.setAttribute('aria-hidden','true');
      decoration.textContent=pos===4?'🌳 🌼':built?CITY_DECORATIONS[item.id]:'🌱';
      scene.append(art,decoration);
      const label=document.createElement('span');
      label.className='city-plot-label';
      label.textContent=pos===4?'Rathaus':built?item.name:'Bauplatz';
      tile.append(scene,label);
      grid.append(tile);
    }
    const list=$('cityBuildList');
    list.replaceChildren();
    CITY_BUILDINGS.forEach(item=>{
      const built=owned.has(item.id);
      const canAfford=pts>=item.cost;
      const card=document.createElement('article');
      card.className='city-build-card city-build-'+item.id+(built?' city-build-done':'');
      const icon=document.createElement('span');
      icon.className='city-build-icon'; icon.textContent=item.icon;
      const info=document.createElement('div');info.className='city-build-info';
      const title=document.createElement('strong');title.textContent=item.name;
      const detail=document.createElement('p');detail.textContent=item.description;
      info.append(title,detail);
      const action=document.createElement('button');action.type='button';
      action.className='city-build-button'+(built?' city-build-button-done':'');
      action.textContent=built?'✓ Gebaut':item.cost+' ✦';
      action.disabled=built||!canAfford;
      action.setAttribute('aria-label',built?item.name+' bereits gebaut':item.name+' für '+item.cost+' Stadtmünzen bauen');
      action.addEventListener('click',()=>buildCityBuilding(item.id));
      card.append(icon,info,action);
      list.append(card);
    });
    const pending=CITY_BUILDINGS.filter(item=>!owned.has(item.id)).sort((a,b)=>a.cost-b.cost);
    $('cityNextHint').textContent=pending.length===0
      ? '🎉 Deine erste Stadt ist komplett! Bald kommen neue Stadtteile.'
      : pts>=pending[0].cost
        ? '🎉 Du kannst jetzt '+pending[0].name+' bauen!'
        : 'Noch '+fmt(pending[0].cost-pts)+' Stadtmünzen bis zum nächsten Gebäude ('+pending[0].name+').';
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

  const currentEntry = () => state.ledger.find(x=>x.date===todayKey());
  const coinsAvailable = () => currentEntry() ? 0 : coinBreakdown(state.steps,state.goal).total;
  const dateLabel = key => {const d=new Date(`${key}T12:00:00`);return new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'long',year:'numeric'}).format(d);};
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
  document.querySelectorAll('.nav-link').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  $('profileShortcut').addEventListener('click',()=>switchTab('profile'));
  $('openCityBtn').addEventListener('click',()=>switchTab('city'));
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
  $('clearAll').addEventListener('click',()=>{if(!confirm('Wirklich alle StepGo-Testdaten löschen?'))return;state=fresh();demoDuel.active=false;demoDuel.mine=12400;demoDuel.rival=11800;showCompetitionView('league');renderDemoDuel();render();switchTab('home');toast('Testdaten gelöscht');});
  render();
})();
