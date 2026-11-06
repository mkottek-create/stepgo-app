(() => {
  'use strict';
  const STORAGE_KEY = 'stepgo-demo-v1';
  const DEMO_START_STEPS = 12458;
  const fmt = n => new Intl.NumberFormat('de-DE').format(n);
  const todayKey = () => {const d = new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const fresh = () => ({date:todayKey(),steps:DEMO_START_STEPS,goal:15000,wallet:0,ledger:[]});
  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || fresh(); } catch { state = fresh(); }
  if (!state || typeof state!=='object') state = fresh();
  if (!Array.isArray(state.ledger)) state.ledger = [];
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
  const earnedForSteps = steps => Math.min(200,Math.floor(steps/100)); // Demo-Regel: 1 Coin je 100 Schritte, max. 200/Tag
  const currentEntry = () => state.ledger.find(x=>x.date===todayKey());
  const coinsAvailable = () => currentEntry() ? 0 : earnedForSteps(state.steps);
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
    $('rewardsCoins').textContent=fmt(state.wallet);
    $('statSteps').textContent=fmt(state.steps);
    $('statDays').textContent=fmt(state.ledger.length);
    $('activitySteps').textContent=fmt(state.steps);
    $('activityStepSource').textContent=state.stepSource==='health-import'?'Aus Apple Health übernommen (manuell)':'Schritte im Testmodus';
    $('healthImportHint').textContent=state.stepSource==='health-import'?'Zuletzt übernommen: '+fmt(state.steps)+' Schritte · '+(state.importedAt ? new Date(state.importedAt).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr':'heute')+'. Nur Test-Coins.':'Noch keine Health-Schritte für heute übernommen.';
    $('historyCount').textContent=`${state.ledger.length} ${state.ledger.length===1?'Eintrag':'Einträge'}`;
    $('goalRange').value=String(state.goal);
    $('goalSettingLabel').textContent=fmt(state.goal);
    const claimed=!!currentEntry();
    $('claimBtn').disabled=claimed || state.steps<100;
    $('claimBtnText').textContent=claimed?'Heute bereits bestätigt ✓':state.steps<100?'Mindestens 100 Schritte nötig':'Schritte bestätigen';
    $('claimCaption').textContent=claimed?'Morgen warten neue Coins auf dich.':'1 Coin je 100 Schritte · max. 200 Coins/Tag (Demo-Regel)';
    const history=$('historyList');history.replaceChildren();
    if (!state.ledger.length){const el=document.createElement('div');el.className='empty';el.textContent='Noch keine Tage bestätigt. Deine ersten Coins warten auf dich!';history.append(el);}
    else state.ledger.slice().reverse().forEach(entry=>{const el=document.createElement('div');el.className='history-entry';const left=document.createElement('div');const date=document.createElement('span');date.className='date';date.textContent=dateLabel(entry.date);const steps=document.createElement('div');steps.className='step-detail';steps.textContent=`${fmt(entry.steps)} Schritte`;left.append(date,steps);const coin=document.createElement('strong');coin.textContent=`+${fmt(entry.coins)} ✦`;el.append(left,coin);history.append(el);});
    persist();
  }
  function switchTab(tab){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id==='screen-'+tab));document.querySelectorAll('.nav-link').forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});scrollTo({top:0,behavior:'smooth'});}
  document.querySelectorAll('.nav-link').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  $('profileShortcut').addEventListener('click',()=>switchTab('profile'));
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
    toast(currentEntry() ? 'Schritte aktualisiert. Coins für heute sind schon bestätigt.' : fmt(count) + ' Schritte übernommen!');
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

  $('healthImportForm').addEventListener('submit', event => {
    event.preventDefault();
    const value = parseSteps($('healthSteps').value);
    if (value === null) { toast('Bitte gültige Schrittzahl von 0 bis 100.000 eingeben.'); return; }
    applySteps(value);
  });

  $('goalRange').addEventListener('input',event=>{state.goal=Number(event.target.value);render();});
  $('claimBtn').addEventListener('click',()=>{
    if(currentEntry()) {toast('Heute schon bestätigt.');return;}
    const coins=coinsAvailable(); if(coins<1)return;
    state.wallet+=coins;
    state.ledger.push({date:todayKey(),steps:state.steps,coins});
    render();$('modalText').textContent=`Du hast ${fmt(state.steps)} Schritte bestätigt und ${coins} Demo-Coins gesammelt!`;
    $('modalBackdrop').classList.add('open');$('modalBackdrop').setAttribute('aria-hidden','false');$('modalClose').focus();
  });
  $('modalClose').addEventListener('click',()=>{$('modalBackdrop').classList.remove('open');$('modalBackdrop').setAttribute('aria-hidden','true');});
  $('modalBackdrop').addEventListener('click',ev=>{if(ev.target===$('modalBackdrop'))$('modalClose').click();});
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape' && $('modalBackdrop').classList.contains('open'))$('modalClose').click();});
  $('clearAll').addEventListener('click',()=>{if(!confirm('Wirklich alle StepGo-Testdaten löschen?'))return;state=fresh();render();switchTab('home');toast('Testdaten gelöscht');});
  render();
})();
