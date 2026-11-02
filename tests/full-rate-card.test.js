import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {feeConfig as c} from '../fee-config.js';
import {classify,shippingWeight,fulfillment,packaging,financials,seasonFor,targetPrice} from '../calculator.js';
const text=readFileSync(new URL('../docs/2026-user-provided-rates.txt',import.meta.url),'utf8').replaceAll('\r','');
const sections={nonPeak:text.split('一、2026 NON-PEAK')[1].split('二、2026 HOLIDAY PEAK')[0],peak:text.split('二、2026 HOLIDAY PEAK')[1].split('三、重要')[0]};
const names=['Small Standard','Large Standard','Small Bulky','Large Bulky','Extra-Large 0–50 lb','Extra-Large 50+–70 lb','Extra-Large 70+–150 lb','Extra-Large 150+ lb'];
const ids=c.sizeTiers.map(t=>t.id);
const prices=[9.99,10,50,50.01],bands=['below10','10to50','above50'];
const sources={};
for(const season of ['nonPeak','peak']){
 sources[season]={};
 for(let j=0;j<names.length;j++){
  const part=sections[season].split(`【${names[j]}】`)[1].split('【')[0];
  const triples=[...part.matchAll(/^(\d+\.\d+) \| (\d+\.\d+) \| (\d+\.\d+)$/gm)].map(m=>m.slice(1).map(Number));
  const variable=[...part.matchAll(/(?:<\$10|\$10-\$50|>\$50):\s*([\d.]+) \+ ([\d.]+) \/ 每超过(?:首个)?(\d+) lb/g)].map(m=>m.slice(1).map(Number));
  if(j===1){const tail=[...part.matchAll(/(?:<\$10|\$10-\$50|>\$50) = ([\d.]+)/g)].map(m=>Number(m[1]));triples.push(tail);}
  sources[season][ids[j]]={triples,variable};
  test(`${season} ${ids[j]}: every price-column value matches uploaded source`,()=>{
   const actual=c.rateCards[season].filter(r=>r.tier===ids[j]);
   const expected=j<2?triples: [variable.map(row=>row[0])];
   assert.equal(expected.length,j===0?8:j===1?13:1);
   assert.equal(actual.length,expected.length*3);
   expected.forEach((fees,i)=>fees.forEach((fee,k)=>{assert.equal(actual[i*3+k].base,fee);assert.equal(actual[i*3+k].band,bands[k]);}));
   if(j>=2)variable.forEach(([base,step,included],i)=>{assert.equal(actual[i].perStep,step);assert.equal(actual[i].includedWeightLb,included);});
  });
 }
 assert.equal(c.rateCards[season].length,81);
}
const p=(inches,weight)=>({inches,unitLb:weight,cubicIn:inches.reduce((a,b)=>a*b),girthIn:inches[0]+2*(inches[1]+inches[2])});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
for(const season of ['nonPeak','peak'])for(const id of ['small-standard','large-standard']){
 const limits=id==='small-standard'?[2,4,6,8,10,12,14,16].map(v=>v/16):[.25,.5,.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3];
 const triples=sources[season][id].triples;
 limits.forEach((limit,i)=>test(`${season} ${id}: exact/below/above ${limit}lb and all price boundaries`,()=>{
  const dims=id==='small-standard'?[1,.5,.1]:[1,1,1];
  for(const price of prices){const k=price<10?0:price<=50?1:2;
   for(const weight of [limit-1e-7,limit]){const f=fulfillment(p(dims,weight),price,c,season,3.5,'2026-11-02');assert.equal(f.status,'ok');assert.equal(f.base,triples[i][k]);}
   const f=fulfillment(p(dims,limit+1e-7),price,c,season,3.5,'2026-11-02');
   if(i+1<limits.length)assert.equal(f.base,triples[i+1][k]);
   else if(id==='large-standard')close(f.base,triples[i+1][k]+.08);
   else assert.equal(f.tier.id,'large-standard');
  }
 }));
}
for(const season of ['nonPeak','peak']){
 test(`${season}: Large Standard all 68 four-ounce increments through 20lb`,()=>{
  const bases=sources[season]['large-standard'].triples[12];
  for(let n=1;n<=68;n++)for(const price of prices){
   const k=price<10?0:price<=50?1:2,w=3+n*.25;
   for(const weight of [w-1e-7,w]){const fee=fulfillment(p([1,1,1],weight),price,c,season,3.5,'2026-11-02');assert.equal(fee.tier.id,'large-standard');close(fee.base,bases[k]+n*.08);}
   if(n<68)close(fulfillment(p([1,1,1],w+1e-7),price,c,season,3.5,'2026-11-02').base,bases[k]+(n+1)*.08);
  }
  assert.equal(classify(p([1,1,1],20+1e-7),c).id,'small-bulky');
 });
 for(const [id,dims,weights] of [
  ['small-bulky',[19,1,1],[1,1.000001,2,2.000001,49,50]],
  ['large-bulky',[38,1,1],[2,2.000001,49,50]],
  ['xl-0-50',[60,1,1],[2,2.000001,49,50]],
  ['xl-50-70',[60,1,1],[50.000001,51,51.000001,69,70]],
  ['xl-70-150',[60,1,1],[70.000001,71,71.000001,149,150]],
  ['xl-150',[60,1,1],[150.000001,151,151.000001,200]]
 ])test(`${season} ${id}: base/started-pound boundaries, all prices, surcharge`,()=>{
  const rows=sources[season][id].variable;assert.equal(rows.length,3);
  for(const weight of weights)for(const price of prices){const k=price<10?0:price<=50?1:2,pack=p(dims,weight);
   const f=fulfillment(pack,price,c,season,3.5,'2026-11-02');assert.equal(f.tier.id,id);
   const expected=rows[k][0]+Math.ceil(Math.max(0,Math.max(weight,dims[0]*4/139)-rows[k][2]))*rows[k][1];
   close(f.base,Math.round(expected*100)/100);close(f.surcharge,Math.round(f.base*3.5)/100);close(f.total,f.base+f.surcharge);
  }
 });
}
test('case A complete results, modes, price edges and all five target margins',()=>{
 const pack=packaging({length:15,width:12,height:12,weight:.5}),s=seasonFor(c,'auto',new Date('2026-11-02T12:00:00Z'));
 assert.equal(s.season,'peak');const f=fulfillment(pack,10.99,c,s.season,3.5,s.date),r=financials(10.99,9,7.2,15,.54,f.total);
 assert.equal(f.tier.id,'large-standard');close(f.shippingLb,1.1023113109);assert.equal(f.base,5.34);assert.equal(f.surcharge,.19);assert.equal(f.total,5.53);
 close(r.commission,1.6485);close(r.factory,1.25);close(r.profit,2.0215);close(r.margin,18.393994540491355);close(r.roi,27.61612021857924);
 assert.equal(fulfillment(pack,10.99,c,'nonPeak',3.5,s.date).base,5.11);
 for(const target of [0,15,20,25,30]){
  const evaluate=price=>{const fee=fulfillment(pack,price,c,s.season,3.5,s.date);return financials(price,9,7.2,15,.54,fee.total);};
  const minimum=targetPrice(target,evaluate);assert.ok(evaluate(minimum).margin+1e-10>=target);
  assert.ok(evaluate(minimum-.01).margin<target);
 }
 console.log('CASE A',JSON.stringify({season:s.season,...f,...r}));
});
test('case B corrected Peak costs, both price bands; old fee is gone',()=>{
 const pack=packaging({length:52.5,width:52.5,height:62.5,weight:21});
 const low=fulfillment(pack,9.99,c,'peak',3.5,'2026-11-02'),mid=fulfillment(pack,10,c,'peak',3.5,'2026-11-02');
 assert.equal(low.base,58.72);assert.equal(low.surcharge,2.06);assert.equal(low.total,60.78);
 assert.equal(mid.base,59.49);assert.equal(mid.surcharge,2.08);assert.equal(mid.total,61.57);
 assert.equal(fulfillment(pack,50.01,c,'peak',3.5,'2026-11-02').total,61.57);
 assert.notEqual(low.total,70.16);console.log('CASE B',JSON.stringify({low,mid}));
});
