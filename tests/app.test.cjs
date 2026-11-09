'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const script = fs.readFileSync(path.join(root,'app.js'),'utf8');
const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
const today = () => {
  const date = new Date();
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
};
const baseState = () => ({date:today(),steps:4642,goal:15000,wallet:170,ledger:[],cityBuildings:[],stepSource:'health-import'});
const snapshot = obj => JSON.parse(JSON.stringify(obj));

function harness(initial = baseState()) {
  const elements = new Map();
  const makeNode = (tag='div',id='') => {
    const classes = new Set();
    return {
      id,tag,children:[],listeners:{},dataset:{},textContent:'',value:'',disabled:false,attributes:{},hidden:true,
      style:{setProperty(name,value){this[name]=value}},
      classList:{
        add(...items){items.forEach(x=>classes.add(x))},
        remove(...items){items.forEach(x=>classes.delete(x))},
        contains(x){return classes.has(x)},
        toggle(x,force){const shouldAdd=force===undefined?!classes.has(x):force;shouldAdd?classes.add(x):classes.delete(x);return shouldAdd;}
      },
      setAttribute(name,val){this.attributes[name]=String(val)},
      removeAttribute(name){delete this.attributes[name]},
      addEventListener(name,handler){this.listeners[name]=handler},
      append(...items){this.children.push(...items)},
      replaceChildren(...items){this.children=items},
      focus(){},click(){this.listeners.click?.({target:this})}
    };
  };
  for(const id of allIds)elements.set(id,makeNode('div',id));
  const get = id => elements.get(id);
  const presets = [5000,10000,15000].map(n=>{const el=makeNode('button');el.dataset.goalPreset=String(n);return el});
  const nav = ['home','competitions','city','profile'].map(tab=>{const el=makeNode('button');el.dataset.tab=tab;return el});
  const screens = ['home','activity','competitions','city','profile'].map(tab=>get('screen-'+tab));
  let stored = snapshot(initial);
  let nextClipboard = '4.642';
  let clipboardFailure = false;
  const localStorage = {
    getItem(k){return k==='stepgo-demo-v1'?JSON.stringify(stored):null},
    setItem(k,val){if(k==='stepgo-demo-v1')stored=JSON.parse(val)}
  };
  const document = {
    hidden:false,
    getElementById:get,
    createElement:makeNode,
    addEventListener(){},
    querySelectorAll(selector){
      switch(selector){
        case '.nav-link':return nav;
        case '.screen':return screens;
        case '[data-goal-preset]':return presets;
        default: throw Error('Unexpected selector: '+selector);
      }
    }
  };
  const context={
    document,localStorage,window:{addEventListener(){},location:{}},
    navigator:{clipboard:{readText:()=>clipboardFailure?Promise.reject(new Error('denied')):Promise.resolve(nextClipboard)}},
    Intl,console,Date,Number,Math,Array,Set,String,Object,JSON,
    setTimeout:()=>1,clearTimeout:()=>{},scrollTo:()=>{},confirm:()=>true
  };
  new vm.Script(script,{filename:'app.js'}).runInNewContext(context,{timeout:1500});
  return {
    get,
    event:(id,type='click',payload={})=>{
      const node=get(id);
      assert.ok(node,'Missing DOM node: '+id);
      assert.equal(typeof node.listeners[type],'function','Missing '+type+' handler: '+id);
      return node.listeners[type](payload);
    },
    state:()=>snapshot(stored),
    setClipboard:(val,fail=false)=>{nextClipboard=val;clipboardFailure=fail},
    presets,
    nav
  };
}

test('Source syntax, DOM IDs and native/web fallback',()=>{
  assert.doesNotThrow(()=>new vm.Script(script));
  for(const id of [...script.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1])){
    assert.ok(allIds.includes(id),'JS references missing HTML element: '+id);
  }
  const app=harness();
  assert.equal(app.get('nativeHealthCard').hidden,true);
  assert.ok(allIds.includes('pasteHealthSteps'));
  assert.ok(allIds.includes('screen-city'));
  assert.ok(allIds.includes('screen-competitions'));
  assert.equal(allIds.length,new Set(allIds).size,'Duplicate DOM IDs');
});

test('4,642 steps earn 51 city coins with milestones',()=>{
  const app=harness();
  assert.equal(app.get('earnableCoins').textContent,'51');
  assert.equal(app.state().wallet,170);
  assert.equal(app.get('cityAvailablePoints').textContent,'170');
});

test('Claim once only; 51 city coins are credited and available for building',()=>{
  const app=harness();
  app.event('claimBtn');
  assert.equal(app.state().wallet,221);
  assert.equal(app.state().ledger.length,1);
  assert.equal(app.state().ledger[0].coins,51);
  assert.equal(app.get('cityAvailablePoints').textContent,'221');
  app.event('claimBtn'); // Even bypassing the disabled browser button, no duplicate payment.
  assert.equal(app.state().wallet,221);
  assert.equal(app.state().ledger.length,1);
});

test('10,000 steps with 10,000 daily goal = 150 city coins',()=>{
  const state=baseState(); state.steps=10000;state.goal=10000;
  const app=harness(state);
  assert.equal(app.get('earnableCoins').textContent,'150');
});

test('Daily caps: 100,000 steps cannot exceed 295 daily city coins',()=>{
  const state=baseState();state.steps=100000;
  const app=harness(state);
  assert.equal(app.get('earnableCoins').textContent,'295');
  app.event('claimBtn');
  assert.equal(app.get('cityAvailablePoints').textContent,'465');
});

test('Building spends city coins and prevents duplicate construction',()=>{
  const state=baseState();
  state.ledger=[{date:'2025-01-01',steps:4642,coins:46}];
  const app=harness(state);
  assert.equal(app.get('cityAvailablePoints').textContent,'170');
  let firstPark=app.get('cityBuildList').children[0];
  assert.equal(firstPark.children[2].disabled,false);
  firstPark.children[2].click();
  assert.equal(app.get('cityAvailablePoints').textContent,'145');
  assert.equal(app.state().wallet,145);
  assert.deepEqual(app.state().cityBuildings,['park']);
  firstPark.children[2].click(); // stale button, should not buy twice
  assert.equal(app.get('cityAvailablePoints').textContent,'145');
});

test('Manual Health import validates input and leaves coins untouched',()=>{
  const state=baseState();state.steps=0;
  const app=harness(state);
  app.get('healthSteps').value='100001';
  app.event('healthImportForm','submit',{preventDefault(){}});
  assert.equal(app.state().steps,0);
  app.get('healthSteps').value='12.458';
  app.event('healthImportForm','submit',{preventDefault(){}});
  assert.equal(app.state().steps,12458);
  assert.equal(app.state().wallet,170);
  assert.equal(app.state().stepSource,'health-import');
});

test('After claiming, importing new steps cannot claim again',()=>{
  const app=harness();
  app.event('claimBtn');
  app.get('healthSteps').value='20000';
  app.event('healthImportForm','submit',{preventDefault(){}});
  assert.equal(app.state().steps,20000);
  app.event('claimBtn');
  assert.equal(app.state().wallet,221);
});

test('Reset all data also resets built city (regression)',()=>{
  const state=baseState();
  state.ledger=[{date:'2025-01-01',steps:10000,coins:100}];
  state.cityBuildings=['park','home'];
  const app=harness(state);
  assert.equal(app.state().cityBuildings.length,2);
  app.event('clearAll');
  assert.equal(app.state().wallet,0);
  assert.deepEqual(app.state().ledger,[]);
  assert.deepEqual(app.state().cityBuildings,[]);
  assert.equal(app.get('cityBuiltCount').textContent,'1 / 9');
});

test('New calendar day retains coins and city, but resets today steps',()=>{
  const state=baseState();
  state.date='2025-01-01';state.wallet=900;state.ledger=[{date:'2025-01-01',steps:5000,coins:50}];state.cityBuildings=['park'];
  const app=harness(state);
  assert.equal(app.state().steps,0);
  assert.equal(app.state().wallet,900);
  assert.deepEqual(app.state().cityBuildings,['park']);
  assert.equal(app.get('earnableCoins').textContent,'0');
});

test('Legacy confirmed days remain readable',()=>{
  const state=baseState();
  state.ledger=[{date:today(),steps:5000,coins:50}];
  const app=harness(state);
  assert.equal(app.state().wallet,170);
  assert.equal(app.get('earnableCoins').textContent,'0');
  assert.equal(app.get('claimBtn').disabled,true);
});



test('Competition navigation works and previous step history remains reachable',()=>{
  const app=harness();
  app.event('openCompetitionBtn');
  assert.equal(app.get('screen-competitions').classList.contains('active'),true);
  assert.equal(app.nav.find(b=>b.dataset.tab==='competitions').attributes['aria-current'],'page');
  assert.equal(app.get('screen-city').classList.contains('active'),false);
  app.event('openStepsBtn');
  assert.equal(app.get('screen-activity').classList.contains('active'),true);
  app.nav.find(b=>b.dataset.tab==='city').click();
  assert.equal(app.get('screen-city').classList.contains('active'),true);
});

test('Week league and duel previews switch accessibly without changing user data',()=>{
  const app=harness();
  const before=app.state();
  assert.equal(app.get('competitionLeaguePanel').hidden,false);
  assert.equal(app.get('competitionDuelPanel').hidden,true);
  assert.equal(app.get('competitionLeagueTab').attributes['aria-pressed'],'true');
  app.event('competitionDuelTab');
  assert.equal(app.get('competitionLeaguePanel').hidden,true);
  assert.equal(app.get('competitionDuelPanel').hidden,false);
  assert.equal(app.get('competitionDuelTab').attributes['aria-pressed'],'true');
  app.event('competitionLeagueTab');
  assert.equal(app.get('competitionLeaguePanel').hidden,false);
  assert.deepEqual(app.state(),before);
});

test('Demo duel starts, simulates +1000 and resets without coins, steps or city changes',()=>{
  const state=baseState();
  state.cityBuildings=['park'];
  state.ledger=[{date:'2025-01-01',steps:10000,coins:100}];
  const app=harness(state);
  const before=app.state();
  assert.equal(app.get('duelMySteps').textContent,'12.400');
  assert.equal(app.get('duelAddBtn').disabled,true);
  app.event('duelAddBtn'); // disabled button cannot mint anything even if handler is triggered
  assert.equal(app.get('duelMySteps').textContent,'12.400');
  app.event('duelStartBtn');
  assert.equal(app.get('duelStartBtn').disabled,true);
  assert.equal(app.get('duelAddBtn').disabled,false);
  app.event('duelAddBtn');
  assert.equal(app.get('duelMySteps').textContent,'13.400');
  assert.match(app.get('duelResult').textContent,/Demo-Schritte/);
  assert.deepEqual(app.state(),before,'Simulated duel must never change persistable wallet/step/city state');
  app.event('duelResetBtn');
  assert.equal(app.get('duelMySteps').textContent,'12.400');
  assert.equal(app.get('duelAddBtn').disabled,true);
  assert.deepEqual(app.state(),before);
});

test('Delete test data resets demo duel as well as city and coins',()=>{
  const app=harness();
  app.event('competitionDuelTab');
  app.event('duelStartBtn');
  app.event('duelAddBtn');
  app.event('clearAll');
  assert.equal(app.get('duelMySteps').textContent,'12.400');
  assert.equal(app.get('duelStartBtn').disabled,false);
  assert.equal(app.get('competitionLeaguePanel').hidden,false);
  assert.deepEqual(app.state().cityBuildings,[]);
  assert.equal(app.state().wallet,0);
});

test('Competition teaser and both panels explicitly identify fictional demo content',()=>{
  assert.match(html,/id="screen-competitions"/);
  assert.match(html,/NUR DEMO/);
  assert.match(html,/Alle Namen und Schrittzahlen hier sind erfunden/);
  assert.match(html,/keine echten Gegner/);
  assert.match(html,/Keine Live-Daten und kein Gegnerkontakt/);
  assert.match(html,/id="screen-activity"/);
  assert.match(html,/id="screen-city"/);
});


test('Competition pass is an informative preview, no subscription starts or is stored',()=>{
  const app=harness();
  const before=app.state();
  assert.equal(app.get('membershipInfoPanel').hidden,true);
  assert.equal(app.get('membershipInfoBtn').attributes['aria-expanded'],undefined);
  app.event('membershipInfoBtn');
  assert.equal(app.get('membershipInfoPanel').hidden,false);
  assert.equal(app.get('membershipInfoBtn').attributes['aria-expanded'],'true');
  app.event('membershipInfoBtn');
  assert.equal(app.get('membershipInfoPanel').hidden,true);
  assert.equal(app.get('membershipInfoBtn').attributes['aria-expanded'],'false');
  assert.deepEqual(app.state(),before);
  assert.match(html,/1 Monat gratis testen/);
  assert.match(html,/6,99 € <small>\/ Monat<\/small>/);
  assert.match(html,/Hier startet kein Probeabo und es wird nichts berechnet/);
  assert.equal(html.includes('id="screen-rewards"'),false);
  assert.equal(html.includes('data-tab="rewards"'),false);
});

test('Legacy coin wallet and built city survive switch to unified city currency',()=>{
  const state=baseState();
  state.wallet=180;
  state.ledger=[{date:'2025-01-01',steps:10000,coins:100}];
  state.cityBuildings=['park'];
  const app=harness(state);
  assert.deepEqual(app.state().cityBuildings,['park']);
  assert.equal(app.get('cityAvailablePoints').textContent,'180');
  assert.equal(app.get('walletCoins').textContent,'180');
  const first=app.get('cityBuildList').children[0]; // old save: built park is level 1
  assert.equal(first.children[2].disabled,false);
  assert.equal(first.children[1].children[2].textContent,'⭐ Stufe 1 / 3');
  assert.deepEqual(app.state().cityUpgrades,{});
  first.children[2].click();
  assert.equal(app.state().wallet,130);
  assert.equal(app.state().cityUpgrades.park,2);
  assert.deepEqual(app.state().cityBuildings,['park']);
});


test('City cannot purchase unaffordable building, and coins cannot go negative',()=>{
  const state=baseState();
  state.wallet=20;
  const app=harness(state);
  const firstPark=app.get('cityBuildList').children[0];
  assert.equal(firstPark.children[2].disabled,true);
  firstPark.children[2].click(); // handler re-checks funds
  assert.equal(app.state().wallet,20);
  assert.deepEqual(app.state().cityBuildings,[]);
  assert.equal(app.get('cityAvailablePoints').textContent,'20');
});

test('City purchase remains saved and daily coins still accrue once after purchase',()=>{
  const state=baseState();
  state.wallet=60;
  const app=harness(state);
  const firstPark=app.get('cityBuildList').children[0];
  firstPark.children[2].click();
  assert.equal(app.state().wallet,35);
  assert.deepEqual(app.state().cityBuildings,['park']);
  app.event('claimBtn');
  assert.equal(app.state().wallet,86);
  assert.equal(app.get('cityAvailablePoints').textContent,'86');
  app.event('claimBtn');
  assert.equal(app.state().wallet,86);
  assert.deepEqual(app.state().cityBuildings,['park']);
});


test('City redesign renders nine comic parcels, paths and scenery without changing stored data',()=>{
  const initial=baseState();
  initial.cityBuildings=['park','lake','bakery'];
  const app=harness(initial);
  const before=app.state();
  const tiles=app.get('cityMap').children;
  assert.equal(tiles.length,9);
  assert.match(html,/class="city-landscape"/);
  assert.match(html,/STEPGO VALLEY/);
  assert.match(html,/city-map-tip/);
  assert.equal(tiles[4].attributes['aria-label'],'Rathaus – Startgebäude');
  assert.match(tiles[4].className,/city-plot-center/);
  assert.equal(tiles[4].children[0].children[0].textContent,'🏛️');
  assert.match(tiles[0].className,/city-plot-park/);
  assert.match(tiles[0].className,/city-plot-built/);
  assert.match(tiles[5].className,/city-plot-lake/);
  assert.match(tiles[2].className,/city-plot-bakery/);
  assert.match(tiles[1].className,/city-plot-locked/);
  assert.equal(tiles[1].children[1].textContent,'Bauplatz');
  assert.equal(tiles[0].children[0].children[1].attributes['aria-hidden'],'true');
  assert.deepEqual(app.state(),before,'City embellishments must not write back additional currency or buildings');
});

test('City themed project cards preserve purchase button and spending logic',()=>{
  const state=baseState();
  state.wallet=110;
  const app=harness(state);
  const cards=app.get('cityBuildList').children;
  assert.equal(cards.length,8);
  assert.match(cards[0].className,/city-build-park/);
  assert.match(cards[2].className,/city-build-bakery/);
  assert.match(cards[4].className,/city-build-lake/);
  assert.equal(cards[0].children[2].disabled,false);
  cards[0].children[2].click();
  assert.equal(app.state().wallet,85);
  assert.deepEqual(app.state().cityBuildings,['park']);
  assert.equal(app.get('cityBuiltCount').textContent,'2 / 9');
  assert.equal(app.get('cityMap').children[0].children[0].children[0].textContent,'🌳');
});


test('Fixed 3D map shows geometric models and one unchanged plot per building',()=>{
  const state=baseState();
  state.cityBuildings=['home','bakery','tower'];
  state.cityUpgrades={home:3,bakery:2};
  const app=harness(state);
  const tiles=app.get('cityMap').children;
  assert.equal(tiles.length,9);
  const home=tiles[1],bakery=tiles[2],tower=tiles[8],hall=tiles[4];
  assert.match(home.className,/city-plot-home/);
  assert.match(home.className,/city-plot-level-3/);
  assert.equal(home.children[0].children[2].className,'city-model city-model-home city-model-level-3');
  assert.equal(home.children[2].textContent,'★ 3');
  assert.equal(bakery.children[0].children[2].className,'city-model city-model-bakery city-model-level-2');
  assert.equal(tower.children[0].children[2].className,'city-model city-model-tower city-model-level-1');
  assert.equal(hall.children[0].children[2].className,'city-model city-model-hall city-model-level-1');
  assert.equal(home.attributes['aria-label'],'Wohnviertel – Stufe 3 von 3');
  assert.match(html,/Comic-Spielstadt/);
  assert.match(html,/festen Gebäudestandorten/);
});

test('Upgrade journey from level 1 to 3 spends coins exactly twice and retains plot',()=>{
  const state=baseState();
  state.wallet=400;
  const app=harness(state);
  let park=app.get('cityBuildList').children[0];
  park.children[2].click(); // build 25
  assert.equal(app.state().wallet,375);
  assert.deepEqual(app.state().cityBuildings,['park']);
  assert.deepEqual(app.state().cityUpgrades,{});
  park=app.get('cityBuildList').children[0];
  assert.match(park.children[2].attributes['aria-label'],/Stufe 1 auf 2 für 50 Stadtmünzen/);
  park.children[2].click(); // upgrade 50
  assert.equal(app.state().wallet,325);
  assert.equal(app.state().cityUpgrades.park,2);
  assert.equal(app.get('cityMap').children[0].children[2].textContent,'★ 2');
  park=app.get('cityBuildList').children[0];
  assert.match(park.children[2].attributes['aria-label'],/Stufe 2 auf 3 für 100 Stadtmünzen/);
  park.children[2].click(); // upgrade 100
  assert.equal(app.state().wallet,225);
  assert.equal(app.state().cityUpgrades.park,3);
  assert.deepEqual(app.state().cityBuildings,['park']);
  assert.equal(app.get('cityMap').children.length,9);
  assert.match(app.get('cityMap').children[0].className,/city-plot-level-3/);
  park=app.get('cityBuildList').children[0];
  assert.equal(park.children[2].textContent,'★ MAX');
  assert.equal(park.children[2].disabled,true);
  park.children[2].click(); // defensive level cap
  assert.equal(app.state().wallet,225);
  assert.equal(app.state().cityUpgrades.park,3);
});

test('An unaffordable upgrade cannot spend coins or upgrade a building',()=>{
  const state=baseState();
  state.wallet=49;
  state.cityBuildings=['park'];
  const app=harness(state);
  const upgrade=app.get('cityBuildList').children[0].children[2];
  assert.equal(upgrade.disabled,true);
  upgrade.click(); // call handler defensively despite disabled DOM button
  assert.equal(app.state().wallet,49);
  assert.equal(app.state().cityUpgrades.park,undefined);
  assert.deepEqual(app.state().cityBuildings,['park']);
});

test('Existing saved upgrades persist while invalid data is normalized',()=>{
  const state=baseState();
  state.wallet=127;
  state.cityBuildings=['park','home'];
  state.cityUpgrades={park:2,home:99,market:3,toString:3};
  const app=harness(state);
  assert.equal(app.state().wallet,127);
  assert.deepEqual(app.state().cityBuildings,['park','home']);
  assert.deepEqual(app.state().cityUpgrades,{park:2});
  assert.equal(app.get('cityMap').children[0].children[2].textContent,'★ 2');
  assert.equal(app.get('cityMap').children[1].children[2].textContent,'★ 1');
});

test('Deleting test data also removes building upgrade levels',()=>{
  const state=baseState();
  state.cityBuildings=['park'];
  state.cityUpgrades={park:3};
  const app=harness(state);
  app.event('clearAll');
  assert.deepEqual(app.state().cityBuildings,[]);
  assert.deepEqual(app.state().cityUpgrades,{});
  assert.equal(app.get('cityMap').children.length,9);
  assert.equal(app.get('cityBuiltCount').textContent,'1 / 9');
});


test('Comic Level 2 keeps fixed city parcels and stored currency untouched',()=>{
  const state=baseState();
  state.cityBuildings=['park','home','bakery','market','lake','school','clinic','tower'];
  state.cityUpgrades={home:2,clinic:3};
  state.wallet=284;
  const app=harness(state);
  const before=app.state();
  const plots=app.get('cityMap').children;
  assert.equal(plots.length,9);
  assert.equal(plots[4].attributes['aria-label'],'Rathaus – Startgebäude');
  assert.match(html,/🌳 DEINE STADTWELT/);
  assert.match(html,/city-landscape-kite/);
  const cityOrder=['park','home','bakery','market',null,'lake','school','clinic','tower'];
  cityOrder.forEach((id,pos)=>{
    if(id)assert.match(plots[pos].className,new RegExp('city-plot-'+id));
  });
  assert.equal(plots[1].children[0].children[1].textContent,'🌻 🌳 🪁');
  assert.equal(plots[2].children[0].children[1].textContent,'🥖 🌼 ☕');
  assert.equal(plots[7].children[0].children[1].textContent,'💚 🌷 🌿');
  assert.equal(plots[0].children[0].children[2].children[10].textContent,'🦋');
  assert.equal(plots[7].children[0].children[2].children[10].textContent,'✚');
  assert.equal(plots[1].children[0].children[2].children[11].textContent,'✦');
  assert.equal(plots[7].children[0].children[2].children[11].textContent,'✦ ✦');
  assert.equal(plots[0].children[0].children[2].children.length,11); // Stufe 1 ohne Extra-Ornament
  assert.deepEqual(app.state(),before);
});

test('Comic Level 2 color and contrast styles exist and do not remove building interactions',()=>{
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  const comic=css.slice(css.indexOf('/* StepGo City V11 – COMIC STUFE 2'));
  assert.ok(comic.length>5000,'Comic theme must be present');
  for(const selector of [
    '.city-map-card{','.city-landscape{','.city-map{','.city-plot{',
    '.city-model-roof{','.city-model-canopy{','.city-model-chimney{',
    '.city-model-level-3{','.city-build-card{','.city-build-button{',
    '@media(max-width:380px)'
  ])assert.ok(comic.includes(selector),'Missing comic theme style: '+selector);
  const state=baseState();
  state.wallet=400;
  const app=harness(state);
  const park=app.get('cityBuildList').children[0].children[2];
  assert.equal(park.disabled,false);
  park.click();
  assert.equal(app.state().wallet,375);
  assert.deepEqual(app.state().cityBuildings,['park']);
  const upgrade=app.get('cityBuildList').children[0].children[2];
  assert.equal(upgrade.disabled,false);
  upgrade.click();
  assert.equal(app.state().wallet,325);
  assert.equal(app.state().cityUpgrades.park,2);
});


test('Isometric diorama layout shows one continuous landscape and nine fixed places',()=>{
  assert.match(html,/class="city-map city-map-diorama"/);
  assert.match(html,/Zusammenhängende Comic-Spielstadt mit neun festen Gebäudestandorten/);
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  const iso=css.slice(css.indexOf('/* StepGo City V12 – ISOMETRISCHE STADTWELT'));
  assert.ok(iso.length>5500,'Diorama CSS needs the full scenery and responsive layout');
  assert.match(iso,/#cityMap\.city-map-diorama::before\{/);
  assert.match(iso,/#cityMap\.city-map-diorama::after\{/);
  assert.match(iso,/#cityMap\.city-map-diorama \.city-plot\{/);
  assert.match(iso,/clip-path:polygon\(/);
  assert.ok(iso.includes('city-plot:nth-child(5){left:50%;top:42%;z-index:5}'),'Rathaus remains in the fixed center');
  for(let i=1;i<=9;i++) {
    assert.ok(iso.includes('city-plot:nth-child('+i+')'),'Missing fixed building place '+i);
  }
  assert.match(iso,/@media\(max-width:380px\)/);
});

test('Diorama changes only layout: coins, saved buildings and upgrade cost stay intact',()=>{
  const state=baseState();
  state.wallet=380;
  state.cityBuildings=['park','clinic'];
  state.cityUpgrades={park:2,clinic:3};
  const app=harness(state);
  const before=app.state();
  assert.equal(app.get('cityMap').children.length,9);
  assert.equal(app.get('cityMap').children[0].attributes['aria-label'],'Stadtpark – Stufe 2 von 3');
  assert.equal(app.get('cityMap').children[7].attributes['aria-label'],'Klinik – Stufe 3 von 3');
  assert.deepEqual(app.state(),before);
  const card=app.get('cityBuildList').children[0];
  assert.match(card.children[2].attributes['aria-label'],/Stufe 2 auf 3 für 100 Stadtmünzen/);
  card.children[2].click();
  assert.equal(app.state().wallet,280);
  assert.equal(app.state().cityUpgrades.park,3);
  assert.deepEqual(app.state().cityBuildings,['park','clinic']);
  assert.equal(app.get('cityMap').children.length,9);
});



test('Natural town background replaces raster with winding footpaths, pond and trees',()=>{
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  const marker='/* StepGo City V15 – ORGANISCHE COMIC-STADT';
  assert.ok(css.includes(marker),'Latest town style must exist');
  const town=css.slice(css.indexOf(marker));
  assert.match(town,/background-image:url\("city-townscape\.svg"\)/);
  assert.match(town,/#cityMap\.city-map-diorama::before,/);
  assert.match(town,/#cityMap\.city-map-diorama::after\{/);
  assert.match(town,/content:none/);
  assert.match(town,/#cityMap\.city-map-diorama \.city-plot-locked \.city-plot-label\{display:none\}/);
  assert.match(town,/#cityMap\.city-map-diorama \.city-plot-built \.city-plot-label\{display:none\}/);
  const graphic=fs.readFileSync(path.join(root,'city-townscape.svg'),'utf8');
  assert.match(graphic,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(graphic,/viewBox="0 0 480 630"/);
  assert.match(graphic,/stroke-linecap="round"/);
  assert.match(graphic,/C110 137 142 179/);
  assert.match(graphic,/linearGradient id="water"/);
  assert.match(graphic,/circle cx=/);
  assert.ok((graphic.match(/<g transform="translate\(/g)||[]).length>=35,
    'Town should have enough decorative trees and flowers to read as a living landscape');
  assert.doesNotMatch(town,/repeating-linear-gradient\(0deg/);
  assert.match(html,/natürlichen Wegen/);
  assert.match(html,/styles\.css\?v=paths2/);
});


test('Straight city plateau preserves purchased buildings and all upgrades',()=>{
  const state=baseState();
  state.wallet=600;
  state.cityBuildings=['park','home','bakery'];
  state.cityUpgrades={home:3,bakery:2};
  const app=harness(state);
  assert.equal(app.get('cityMap').children.length,9);
  assert.equal(app.get('cityMap').children[4].children[1].textContent,'Rathaus');
  assert.equal(app.get('cityMap').children[1].children[2].textContent,'★ 3');
  assert.equal(app.get('cityMap').children[2].children[2].textContent,'★ 2');
  assert.equal(app.state().wallet,600);
  assert.deepEqual(app.state().cityBuildings,['park','home','bakery']);
  const bakery=app.get('cityBuildList').children[2].children[2];
  assert.match(bakery.attributes['aria-label'],/Bäckerei von Stufe 2 auf 3 für 340 Stadtmünzen/);
  bakery.click();
  assert.equal(app.state().wallet,260);
  assert.equal(app.state().cityUpgrades.bakery,3);
  assert.equal(app.get('cityMap').children.length,9);
});



test('Latest visual override hides all old grid, rectangular lots and raised islands',()=>{
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  const marker='/* StepGo City V15 – ORGANISCHE COMIC-STADT';
  const latest=css.slice(css.indexOf(marker));
  const rule=selector=>{
    const idx=latest.indexOf(selector+'{');
    assert.ok(idx>=0,'Missing final style '+selector);
    const start=idx+selector.length+1;
    return latest.slice(start,latest.indexOf('}',start));
  };
  const map=rule('#cityMap.city-map-diorama');
  assert.match(map,/background-image:url\("city-townscape\.svg"\)/);
  assert.match(map,/background-size:100% 100%/);
  assert.match(map,/perspective:none/);
  const hidden=latest.slice(latest.indexOf('#cityMap.city-map-diorama::before,'),latest.indexOf('#cityMap.city-map-diorama .city-plot{'));
  assert.match(hidden,/content:none/);
  assert.match(hidden,/display:none/);
  assert.match(hidden,/background:none/);
  const island=latest.slice(latest.indexOf('#cityMap.city-map-diorama .city-plot::before,'),latest.indexOf('#cityMap.city-map-diorama .city-plot-scene{'));
  assert.match(island,/content:none/);
  assert.match(island,/display:none/);
  assert.match(hidden,/content:none/,'Old city-road overlays stay disabled');
  const native=fs.readFileSync(path.join(root,'scripts/prepare-native.mjs'),'utf8');
  assert.match(native,/city-townscape\.svg/);
});



test('Town buildings have organic fixed positions while coins, levels and Rathaus are preserved',()=>{
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  const latest=css.slice(css.indexOf('/* StepGo City V15 – ORGANISCHE COMIC-STADT'));
  const places=[
    [21,24],[58,18],[82,34],
    [23,44],[51,47],[79,64],
    [20,75],[47,75],[80,87]
  ];
  places.forEach(([left,top],i)=>{
    const pos=i+1;
    assert.ok(latest.includes('city-plot:nth-child('+pos+'){left:'+left+'%;top:'+top+'%;z-index:'),
      'Missing natural fixed position for site '+pos);
  });
  const distinctRows=new Set(places.map(([x,y])=>y));
  assert.ok(distinctRows.size>=6,'Town must not visually be aligned in a strict 3x3 grid');
  const initial=baseState();
  initial.wallet=360;
  initial.cityBuildings=['park','home','clinic'];
  initial.cityUpgrades={home:3,clinic:2};
  const app=harness(initial);
  assert.equal(app.get('cityMap').children.length,9);
  assert.equal(app.get('cityMap').children[4].children[1].textContent,'Rathaus');
  assert.equal(app.get('cityMap').children[1].children[2].textContent,'★ 3');
  assert.equal(app.get('cityMap').children[7].children[2].textContent,'★ 2');
  assert.equal(app.get('cityMap').children[5].children[0].children[0].textContent,'BAU');
  assert.equal(app.state().wallet,360);
  assert.deepEqual(app.state().cityBuildings,['park','home','clinic']);
  assert.deepEqual(app.state().cityUpgrades,{home:3,clinic:2});
  assert.match(html,/styles\.css\?v=paths2/);
});



test('Town fine tune has thinner calm footpaths and a landscaped shoreline',()=>{
  const graphic=fs.readFileSync(path.join(root,'city-townscape.svg'),'utf8');
  const main=graphic.match(/M32 108 C110 137 142 179 209 194[\s\S]*?S356 198 438 267/g)||[];
  assert.equal(main.length,3,'Main path has a gentle three-layer sand stroke');
  assert.match(graphic,/stroke-width="37"/);
  assert.match(graphic,/stroke-width="29"/);
  assert.match(graphic,/stroke-width="23"/);
  assert.doesNotMatch(graphic,/stroke-width="49"/);
  assert.doesNotMatch(graphic,/stroke-width="39"/);
  assert.match(graphic,/id="lake-shore"/);
  assert.match(graphic,/fill="#e4d9ab" stroke="#bbbd83"/);
  assert.match(graphic,/stroke="#3f9b62"/);
  assert.match(graphic,/fill="url\(#water\)"/);
  assert.match(graphic,/cx="380" cy="445"/);
  assert.ok(graphic.indexOf('id="lake-shore"')<graphic.indexOf('<!-- Borders / hedges'),"Water edge integrated below trees");
});

test('Empty building sites display wooden BAU signs instead of plus circles',()=>{
  const state=baseState();
  state.wallet=180;
  const app=harness(state);
  const before=app.state();
  const plots=app.get('cityMap').children;
  assert.equal(plots.length,9);
  for(let i=0;i<9;i++){
    if(i===4)continue;
    assert.equal(plots[i].children[0].children[0].textContent,'BAU');
    assert.match(plots[i].className,/city-plot-locked/);
  }
  assert.deepEqual(app.state(),before,'Pure decoration must never alter city state');
  const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
  const last=css.slice(css.indexOf('/* StepGo City V16 – NATUERLICHE DETAILS'));
  assert.match(last,/background-image:url\("city-townscape\.svg\?v=paths2"\)/);
  assert.match(last,/\.city-plot-locked \.city-plot-art\{/);
  assert.match(last,/\.city-plot-locked \.city-plot-art::after\{/);
  assert.match(last,/\.city-plot-locked\.city-plot-lake \.city-plot-art\{/);
  assert.match(last,/\.city-plot-locked\.city-plot-lake \.city-plot-scene::after,/);
  const park=app.get('cityBuildList').children[0].children[2];
  assert.equal(park.disabled,false);
  park.click();
  assert.equal(app.state().wallet,155);
  assert.equal(app.get('cityMap').children[0].children[0].children[0].textContent,'🌳');
  assert.equal(app.get('cityMap').children[1].children[0].children[0].textContent,'BAU');
});


test('Profile setup saves name and email locally, without changing wallet or city',()=>{
  const initial=baseState();
  initial.cityBuildings=['park','home'];
  initial.cityUpgrades={home:3};
  const app=harness(initial);
  assert.equal(app.get('profileAccountBadge').textContent,'NICHT ANGEMELDET');
  assert.equal(app.get('profileDisplayEmail').textContent,'Noch keine E-Mail-Adresse hinterlegt');
  assert.equal(app.get('profileBuildings').textContent,'3 / 9');
  assert.equal(app.get('profileCoins').textContent,'170');
  app.event('profileEditButton');
  assert.equal(app.get('profileForm').hidden,false);
  app.get('profileName').value='  Lina  ';
  app.get('profileEmail').value=' LINA@Example.com ';
  app.event('profileForm','submit',{preventDefault(){}});
  assert.deepEqual(app.state().profile,{name:'Lina',email:'lina@example.com'});
  assert.equal(app.get('profileAccountHeading').textContent,'Lina');
  assert.equal(app.get('profileDisplayEmail').textContent,'lina@example.com');
  assert.equal(app.get('profileAvatar').textContent,'L');
  assert.equal(app.get('profileAccountBadge').textContent,'LOKALES TESTPROFIL');
  assert.equal(app.get('profileForm').hidden,true);
  assert.equal(app.state().wallet,170);
  assert.deepEqual(app.state().cityBuildings,['park','home']);
  assert.deepEqual(app.state().cityUpgrades,{home:3});
});

test('Profile form rejects invalid emails or short names without saving data',()=>{
  const app=harness();
  app.event('profileEditButton');
  app.get('profileName').value='A';
  app.get('profileEmail').value='not-an-email';
  app.event('profileForm','submit',{preventDefault(){}});
  assert.equal(app.state().profile,null);
  assert.equal(app.get('profileForm').hidden,false);
  assert.equal(app.get('profileFormError').hidden,false);
  app.get('profileName').value='Lina';
  app.get('profileEmail').value='not-an-email';
  app.event('profileForm','submit',{preventDefault(){}});
  assert.equal(app.state().profile,null);
  app.get('profileEmail').value='lina@example.com';
  app.event('profileForm','submit',{preventDefault(){}});
  assert.equal(app.state().profile.email,'lina@example.com');
  assert.equal(app.get('profileFormError').hidden,true);
});

test('Existing profile survives a reload and can be edited or deleted separately',()=>{
  const initial=baseState();
  initial.profile={name:'Jonas',email:'jonas@example.com'};
  initial.wallet=284;
  initial.cityBuildings=['park','clinic'];
  const app=harness(initial);
  assert.equal(app.get('profileDisplayEmail').textContent,'jonas@example.com');
  app.event('profileEditButton');
  assert.equal(app.get('profileName').value,'Jonas');
  assert.equal(app.get('profileEmail').value,'jonas@example.com');
  app.get('profileName').value='Jo';
  app.get('profileEmail').value='new@example.com';
  app.event('profileForm','submit',{preventDefault(){}});
  assert.equal(app.state().profile.name,'Jo');
  app.event('profileEditButton');
  assert.equal(app.get('profileRemoveButton').hidden,false);
  app.event('profileRemoveButton');
  assert.equal(app.state().profile,null);
  assert.equal(app.get('profileDisplayEmail').textContent,'Noch keine E-Mail-Adresse hinterlegt');
  assert.equal(app.state().wallet,284);
  assert.deepEqual(app.state().cityBuildings,['park','clinic']);
});

test('Login button provides an honest registration guide and never stores credentials',()=>{
  const app=harness();
  assert.match(html,/Aktuell ist keine echte Registrierung oder Anmeldung aktiv/);
  assert.match(html,/kein echtes Konto erstellt/);
  assert.match(html,/type="email"/);
  assert.doesNotMatch(html,/type="password"/);
  app.event('profileLoginButton');
  assert.equal(app.get('profileLoginInfo').hidden,false);
  assert.equal(app.get('profileLoginButton').attributes['aria-expanded'],'true');
  app.event('profileLoginCloseButton');
  assert.equal(app.get('profileLoginInfo').hidden,true);
  assert.equal(app.get('profileLoginButton').attributes['aria-expanded'],'false');
  assert.equal(app.state().profile,null);
});

test('Invalid legacy profile data is discarded and reset clears local profile',()=>{
  const bad=baseState();bad.profile={name:'X',email:'not-an-email'};
  const app=harness(bad);
  assert.equal(app.state().profile,null);
  const good=baseState();good.profile={name:'Mia',email:'mia@example.net'};
  const saved=harness(good);
  assert.equal(saved.get('profileAccountHeading').textContent,'Mia');
  saved.event('clearAll');
  assert.equal(saved.state().profile,null);
  assert.equal(saved.get('profileAccountBadge').textContent,'NICHT ANGEMELDET');
});
