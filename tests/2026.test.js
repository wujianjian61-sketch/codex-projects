import test from 'node:test';
import assert from 'node:assert/strict';
import {feeConfig as c} from '../fee-config.js';
import {packaging,classify,shippingWeight,fulfillment} from '../calculator.js';
const p=(sides,unitLb,dimLb)=>({inches:sides,unitLb,cubicIn:dimLb*139,girthIn:sides[0]+2*(sides[1]+sides[2])});
test('2026 tier boundaries use max actual/dimensional, inclusive limits',()=>{
 for(const [sides,weight,expected] of [[[15,12,.75],1,'small-standard'],[[18,14,8],20,'large-standard'],[[37,20,9],50,'small-bulky'],[[40,10,10],50,'large-bulky'],[[60,10,10],50,'xl-0-50'],[[20,10,10],50.01,'xl-50-70'],[[20,10,10],70,'xl-50-70'],[[20,10,10],70.01,'xl-70-150'],[[20,10,10],150,'xl-70-150'],[[20,10,10],150.01,'xl-150']])assert.equal(classify(p(sides,weight,weight),c).id,expected);
 assert.equal(classify(p([40,20,10],1,51),c).id,'xl-50-70');
 assert.equal(classify(p([59,33,3],30,30),c).id,'xl-0-50'); // girth 131
});
test('unit-only exception for Small Standard and XL150; other tiers use max',()=>{
 for(const [id,expected] of [['small-standard',1],['xl-150',1],['large-standard',10]])assert.equal(shippingWeight(p([13.9,10,10],1,10),c.sizeTiers.find(t=>t.id===id)).shippingLb,expected);
});
test('Peak bands and each started pound above included weight',()=>{
 const pack=p([20,5,2],2.01,2.01);
 for(const [price,base] of [[9.99,8.58],[10,9.35],[50,9.35],[50.01,9.35]])assert.equal(fulfillment(pack,price,c,'peak',3.5).base,base);
 const xl=p([60,1,1],51,51);assert.equal(fulfillment(xl,10,c,'peak',3.5).base,40.13);
 assert.equal(fulfillment({...xl,unitLb:51.01},10,c,'peak',3.5).base,40.88);
});
test('unprovided rows remain missing, never zero fee',()=>{
 for(const [pack,price,season] of [[p([10,5,.5],.5,.5),20,'peak'],[p([20,10,10],80,80),10,'peak'],[p([20,10,10],151,151),10,'peak'],[p([30,20,10],10,10),20,'nonPeak']])assert.equal(fulfillment(pack,price,{...c,rateCards:{peak:[],nonPeak:[]}},season,3.5).status,'missing-rate');
});
test('52.5 x 52.5 x 62.5 cm, 21kg regression',()=>{
 const pack=packaging({length:52.5,width:52.5,height:62.5,weight:21});
 assert.equal(classify(pack,c).id,'xl-70-150');
 assert.ok(Math.abs(pack.unitLb-46.2970750578)<1e-9);
 const fee=fulfillment(pack,9.99,c,'peak',3.5);
 assert.equal(fee.base,58.72);assert.equal(fee.surcharge,2.06);assert.equal(fee.total,60.78);
 assert.equal(fulfillment(pack,50,c,'peak',3.5).total,61.57);
 console.log(JSON.stringify({unitLb:pack.unitLb,dimensionalLb:fee.dimensionalLb,shippingLb:fee.shippingLb,girthIn:pack.girthIn,base:fee.base,surcharge:fee.surcharge,total:fee.total}));
});
