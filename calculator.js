export const moneyRound=x=>Math.round((x+Number.EPSILON)*100)/100;
export const priceBand=p=>p<10?'below10':p<=50?'10to50':'above50';
// Allow only floating point representation noise at inclusive boundaries.
export const atMost=(value,limit)=>value<=limit || (Number.isFinite(limit)&&Math.abs(value-limit)<=8*Number.EPSILON*Math.max(1,Math.abs(value),Math.abs(limit)));
export function surchargePercent(config,percent,date=seasonFor(config).date){
 return config.surcharge.effectiveStart && date<config.surcharge.effectiveStart ? 0 : percent;
}
export function packaging({length,width,height,weight}){
 if(![length,width,height,weight].every(x=>Number.isFinite(x)&&x>0))return null;
 const cm=[length,width,height].sort((a,b)=>b-a),inches=cm.map(x=>x/2.54),cbm=length*width*height/1e6;
 if(![cbm,weight*2.2046226218,...inches].every(Number.isFinite))return null;
 return {cm,inches,cbm,unitLb:weight*2.2046226218,cubicIn:inches.reduce((a,b)=>a*b),girthIn:inches[0]+2*(inches[1]+inches[2])};
}
export function seasonFor(config,mode='auto',now=new Date()){
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:config.season.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 return {date,season:mode==='auto'?(date>=config.season.start&&date<=config.season.end?'peak':'nonPeak'):mode};
}
export function dimensionalWeight(p,r){
 // Keep measured dimensions untouched: minimums apply to dimensional weight only.
 const minimumWidth=r.minimumWidthIn??0,minimumHeight=r.minimumHeightIn??0;
 const cubicIn=minimumWidth||minimumHeight
  ? p.inches[0]*Math.max(p.inches[1],minimumWidth)*Math.max(p.inches[2],minimumHeight)
  : p.cubicIn;
 return cubicIn/r.divisor;
}
export function classify(p,c){
 if(!p||!c.verified)return null;
 return c.sizeTiers.find(t=>{
  const tierWeight=c.dimensionalDivisor?Math.max(p.unitLb,dimensionalWeight(p,t.shipping)):p.unitLb;
  return p.inches.every((v,i)=>atMost(v,t.maxSides[i]))&&atMost(tierWeight,t.maxTierWeightLb??t.maxUnitLb)&&atMost(p.girthIn,t.maxGirthIn);
 })??null;
}
export function shippingWeight(p,t){
 const r=t.shipping,dimensionalLb=dimensionalWeight(p,r);
 const basis=r.basis==='max'&&p.cubicIn>=r.dimensionalMinimumCubicIn?Math.max(p.unitLb,dimensionalLb):p.unitLb;
 const raw=Math.max(r.minimumLb,basis+r.packagingLb);
 return {dimensionalLb,shippingLb:r.incrementLb?Math.ceil(raw/r.incrementLb-1e-10)*r.incrementLb:raw};
}
export function fulfillment(p,price,c,season,fuel,date=seasonFor(c).date){
 if(!p)return {status:'packaging'};
 if(!(price>0)&&price!==null)return {status:'price'};
 if(price===null)return {status:'price'};
 if(!c.verified)return {status:'unverified'};
 if(!Number.isFinite(price)||!Number.isFinite(fuel)||fuel<0)return {status:'parameters'};
 const tier=classify(p,c);if(!tier)return {status:'unsupported'};
 const weight=shippingWeight(p,tier);
 const row=c.rateCards[season]?.find(r=>r.tier===tier.id&&r.band===priceBand(price)&&atMost(weight.shippingLb,r.maxWeightLb));
 if(!row)return {status:'missing-rate',tier,...weight};
 const steps=Math.max(0,Math.ceil((weight.shippingLb-row.includedWeightLb)/row.stepLb-1e-10));
 const base=moneyRound(row.base+steps*row.perStep),surcharge=moneyRound(base*surchargePercent(c,fuel,date)/100);
 return {status:'ok',tier,...weight,base,surcharge,total:moneyRound(base+surcharge)};
}
export function financials(price,factoryRmb,exchange,referral,firstMile,fba){
 if(![price,factoryRmb,exchange,referral,firstMile,fba].every(Number.isFinite)||price<=0||factoryRmb<0||exchange<=0||referral<0||referral>=100||firstMile<0||fba<0)return null;
 const factory=factoryRmb/exchange,commission=price*referral/100,investment=factory+firstMile+fba,profit=price-commission-investment;
 return {factory,commission,profit,margin:profit/price*100,roi:investment>0?profit/investment*100:null};
}
export function judgment(profit,margin){
 if(profit<0)return {tone:'red',text:'预计亏损，不建议按当前成本开发'};
 if(margin>=25)return {tone:'green',text:'利润空间健康'};
 if(margin>=15)return {tone:'yellow',text:'可以考虑，但建议继续优化成本'};
 return {tone:'orange',text:'利润空间偏低，谨慎开发'};
}
// Search independently in each band: crossing a price threshold can change fixed FBA fees.
export function targetPrice(target,evaluate,maxCents=100000000){
 for(const [lo,hi] of [[1,999],[1000,5000],[5001,maxCents]]){
  if(hi<lo)continue;
  const meets=c=>{const r=evaluate(c/100);return r&&r.margin+1e-9>=target;};
  if(!meets(hi))continue;
  let l=lo,r=hi;while(l<r){const m=Math.floor((l+r)/2);if(meets(m))r=m;else l=m+1;}
  return l/100;
 }
 return null;
}
