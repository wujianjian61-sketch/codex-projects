import test from 'node:test';
import assert from 'node:assert/strict';
import {feeConfig as config} from '../fee-config.js';
import {packaging,classify,shippingWeight} from '../calculator.js';
const pack=(inches,lb)=>packaging({length:inches[0]*2.54,width:inches[1]*2.54,height:inches[2]*2.54,weight:lb/2.2046226218});
const tier=id=>config.sizeTiers.find(t=>t.id===id);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
for(const id of ['large-standard','small-bulky','large-bulky','xl-0-50','xl-50-70','xl-70-150','xl-150']){
 test(`${id}: width and height minimum 2in, no floor on length`,()=>{
  for(const sides of [[10,1,.5],[10,3,.5],[10,2,2],[10,3,2],[1,.5,.25]]){
   const p=pack(sides,.01),result=shippingWeight(p,tier(id));
   const expected=sides[0]*Math.max(sides[1],2)*Math.max(sides[2],2)/139;
   near(result.dimensionalLb,expected);
   near(result.shippingLb,id==='xl-150'?p.unitLb:Math.max(p.unitLb,expected));
  }
 });
}
test('Small Standard shipping weight uses actual weight, no 2in minimum',()=>{
 const p=pack([10,1,.5],.2),result=shippingWeight(p,tier('small-standard'));
 near(result.shippingLb,.2);near(result.dimensionalLb,5/139);
 assert.equal(classify(p,config).id,'small-standard');
});
test('dimensional minimums affect classification without changing measured size, girth or CBM',()=>{
 const p=pack([1000,1,1],1),original=structuredClone(p);
 assert.equal(classify(p,config).id,'xl-0-50');
 near(shippingWeight(p,classify(p,config)).shippingLb,4000/139);
 const q=pack([2000,1,1],1);assert.equal(classify(q,config).id,'xl-50-70');
 const r=pack([6000,1,1],1);assert.equal(classify(r,config).id,'xl-150');
 near(shippingWeight(r,classify(r,config)).shippingLb,1);
 assert.deepEqual(p,original);
});
test('unordered cm input sorted before floors; original user case remains unchanged',()=>{
 const p=pack([.5,10,1],.1);near(shippingWeight(p,tier('large-standard')).dimensionalLb,40/139);
 const q=packaging({length:15,width:12,height:12,weight:.5});
 assert.equal(classify(q,config).id,'large-standard');
 near(shippingWeight(q,classify(q,config)).dimensionalLb,.9482826420476383);
 near(shippingWeight(q,classify(q,config)).shippingLb,1.1023113109);
});
