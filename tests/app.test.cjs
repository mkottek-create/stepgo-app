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
  const nav = ['home','activity','city','rewards','profile'].map(tab=>{const el=makeNode('button');el.dataset.tab=tab;return el});
  const screens = ['home','activity','city','rewards','profile'].map(tab=>get('screen-'+tab));
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
});

test('4,642 steps = 46 basic coins, 5 milestone coins',()=>{
  const app=harness();
  assert.equal(app.get('earnableCoins').textContent,'51');
  assert.equal(app.get('baseCoinPreview').textContent,'46');
  assert.equal(app.get('milestoneCoinPreview').textContent,'5');
  assert.equal(app.get('goalCoinPreview').textContent,'0');
  assert.equal(app.state().wallet,170);
});

test('Claim once only; 51 coins and 46 building points are credited',()=>{
  const app=harness();
  app.event('claimBtn');
  assert.equal(app.state().wallet,221);
  assert.equal(app.state().ledger.length,1);
  assert.equal(app.state().ledger[0].coins,51);
  assert.equal(app.get('cityAvailablePoints').textContent,'46');
  app.event('claimBtn'); // Even bypassing the disabled browser button, no duplicate payment.
  assert.equal(app.state().wallet,221);
  assert.equal(app.state().ledger.length,1);
});

test('10,000 steps with 10,000 daily goal = 150 test-coins',()=>{
  const state=baseState(); state.steps=10000;state.goal=10000;
  const app=harness(state);
  assert.equal(app.get('baseCoinPreview').textContent,'100');
  assert.equal(app.get('milestoneCoinPreview').textContent,'30');
  assert.equal(app.get('goalCoinPreview').textContent,'20');
  assert.equal(app.get('earnableCoins').textContent,'150');
});

test('Daily caps: 100,000 steps cannot exceed 295 test-coins / 200 building points',()=>{
  const state=baseState();state.steps=100000;
  const app=harness(state);
  assert.equal(app.get('earnableCoins').textContent,'295');
  app.event('claimBtn');
  assert.equal(app.get('cityAvailablePoints').textContent,'200');
});

test('Building only spends building points and prevents duplicate construction',()=>{
  const state=baseState();
  state.ledger=[{date:'2025-01-01',steps:4642,coins:46}];
  const app=harness(state);
  assert.equal(app.get('cityAvailablePoints').textContent,'46');
  let firstPark=app.get('cityBuildList').children[0];
  assert.equal(firstPark.children[2].disabled,false);
  firstPark.children[2].click();
  assert.equal(app.get('cityAvailablePoints').textContent,'21');
  assert.equal(app.state().wallet,170);
  assert.deepEqual(app.state().cityBuildings,['park']);
  firstPark.children[2].click(); // stale button, should not buy twice
  assert.equal(app.get('cityAvailablePoints').textContent,'21');
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
  assert.equal(app.get('totalCoinPreview').textContent,'50');
  assert.equal(app.get('earnableCoins').textContent,'0');
  assert.equal(app.get('claimBtn').disabled,true);
});

