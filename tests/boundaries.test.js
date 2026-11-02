import test from 'node:test';
import assert from 'node:assert/strict';
import {feeConfig as c} from '../fee-config.js';
import {fulfillment,packaging,classify,shippingWeight,seasonFor,surchargePercent,financials} from '../calculator.js';

// Pure lookup fixtures: arbitrary marker fees verify row selection, NOT Amazon rates.
const fixture=(id,limits)=>({...c,sizeTiers:[{...c.sizeTiers.find(t=>t.id===id),shipping:{...c.sizeTiers.find(t=>t.id===id).shipping,basis:'unit'}}],rateCards:Object.fromEntries(['nonPeak','peak'].map((season,seasonIndex)=>[season,limits.flatMap((limit,i)=>['below10','10to50','above50'].map((band,j)=>({tier:id,band,maxWeightLb:limit,base:10+seasonIndex*10+i+j/10,includedWeightLb:limit,stepLb:1,perStep:0})))]))});
const packed=(id,weight)=>({inches:id==='small-standard'?[5,3,.2]:[5,3,2],unitLb:weight,cubicIn:3,girthIn:15});
const prices=[9.99,10,50,50.01];
for(const [id,limits] of [['small-standard',[2,4,6,8,10,12,14,16].map(x=>x/16)],['large-standard',[.25,.5,.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75]]]){
 test(`${id}: specified weight boundaries, both seasons, four price edges (synthetic markers)`,()=>{
  const cfg=fixture(id,limits);
  for(let i=0;i<limits.length;i++)for(const [s,offset] of [['nonPeak',0],['peak',10]])for(const price of prices){
   const band=price<10?0:price<=50?1:2;
   const expected=10+offset+i+band/10;
   assert.equal(fulfillment(packed(id,limits[i]),price,cfg,s,3.5,'2026-11-02').base,expected);
   assert.equal(fulfillment(packed(id,limits[i]-1e-7),price,cfg,s,3.5,'2026-11-02').base,expected);
   if(i+1<limits.length)assert.equal(fulfillment(packed(id,limits[i]+1e-7),price,cfg,s,3.5,'2026-11-02').base,expected+1);
  }
 });
}
test('inclusive lookup tolerates conversion noise but not a measurable excess',()=>{
 const cfg=fixture('large-standard',[1,1.25,1.5]);
 assert.equal(fulfillment(packed('large-standard',1.25+Number.EPSILON),10,cfg,'peak',3.5,'2026-11-02').base,21.1);
 assert.equal(fulfillment(packed('large-standard',1.25+1e-7),10,cfg,'peak',3.5,'2026-11-02').base,22.1);
});
test('fuel effective April 17 Pacific date, both fee modes preserve that date',()=>{
 const cfg=fixture('large-standard',[1,1.25,1.5]),p=packed('large-standard',1.1);
 for(const mode of ['nonPeak','peak']){
  assert.equal(fulfillment(p,10,cfg,mode,3.5,'2026-04-16').surcharge,0);
  const f=fulfillment(p,10,cfg,mode,3.5,'2026-04-17');
  assert.equal(f.surcharge,Math.round(f.base*.035*100)/100);
 }
 assert.equal(surchargePercent(c,3.5,'2026-04-16'),0);
 assert.equal(surchargePercent(c,3.5,'2026-04-17'),3.5);
 assert.equal(seasonFor(c,'auto',new Date('2026-04-17T06:59:59Z')).date,'2026-04-16');
 assert.equal(seasonFor(c,'auto',new Date('2026-04-17T07:00:00Z')).date,'2026-04-17');
});
test('requested 15x12x12cm case: complete fee and profit calculation',()=>{
 const p=packaging({length:15,width:12,height:12,weight:.5});
 const tier=classify(p,c),w=shippingWeight(p,tier),s=seasonFor(c,'auto',new Date('2026-11-02T12:00:00Z'));
 assert.equal(tier.id,'large-standard');assert.equal(s.season,'peak');assert.equal(w.shippingLb,1.1023113109);
 assert.equal(p.cbm,.00216);assert.equal(p.cbm*250,.54);
 assert.ok(Math.abs(10.99*.15-1.6485)<1e-12);assert.equal(9/7.2,1.25);
 const fee=fulfillment(p,10.99,c,s.season,3.5,s.date);
 assert.equal(fee.base,5.34);assert.equal(fee.surcharge,.19);assert.equal(fee.total,5.53);
 const profit=financials(10.99,9,7.2,15,.54,fee.total);
 assert.ok(Math.abs(profit.profit-2.0215)<1e-12);
 assert.equal(financials(10.99,9,7.2,15,.54,NaN),null);
 console.log('Requested case:',JSON.stringify({tier:tier.label,shippingLb:w.shippingLb,dimensionalLb:w.dimensionalLb,firstMile:.54,referral:1.6485,factory:1.25,mode:s.season,base:fee.base,surcharge:fee.surcharge,total:fee.total,...profit}));
});
