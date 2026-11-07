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
  const nav = ['home','competitions','city','rewards','profile'].map(tab=>{const el=makeNode('button');el.dataset.tab=tab;return el});
  const screens = ['home','activity','competitions','city','rewards','profile'].map(tab=>get('screen-'+tab));
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
  assert.match(html,/Keine Live-Daten, kein Gegnerkontakt und kein Echtgeld/);
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
  const first=app.get('cityBuildList').children[0]; // first is already built
  assert.equal(first.children[2].disabled,true);
  first.children[2].click();
  assert.equal(app.state().wallet,180);
});
