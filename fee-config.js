// Rates transcribed from rules the user reports verified in Seller Central.
// No independent document retrieval has been performed. Missing rows stay absent.
const shipping=(basis='max')=>({divisor:139,dimensionalMinimumCubicIn:0,basis,packagingLb:0,incrementLb:null,minimumLb:0});
const tier=(id,label,maxSides,maxTierWeightLb,maxGirthIn=Infinity,basis='max')=>({id,label,maxSides,maxTierWeightLb,maxGirthIn,shipping:{...shipping(basis),minimumWidthIn:id==='small-standard'?0:2,minimumHeightIn:id==='small-standard'?0:2}});
const bands=['below10','10to50','above50'];
const rows=(id,bases,includedWeightLb,perStep,maxWeightLb,stepLb=1)=>bands.map((band,i)=>({tier:id,band,maxWeightLb,base:bases[i],includedWeightLb,stepLb,perStep}));
const standard=(id,limits,fees)=>fees.flatMap((bases,i)=>rows(id,bases,limits[i],0,limits[i]));
const smallLimits=[2,4,6,8,10,12,14,16].map(oz=>oz/16);
const largeLimits=[.25,.5,.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3];
export const feeConfig = {
 version:'Amazon US 2026 · 非服装 · 用户提供完整 Non-Peak / Peak 费表',verified:true,effectiveStart:'2026-01-15',
 provenance:'用户提供并声明已核实 Seller Central；本工具未独立读取官方原文',
 sources:['https://sell.amazon.com/pricing','https://sellercentral.amazon.com/'],
 dimensionalDivisor:139,
 defaults:{ocean:250,referral:15,fuel:3.5,exchange:7.2},
 season:{timeZone:'America/Los_Angeles',start:'2026-10-15',end:'2027-01-14',verified:true},
 sizeTiers:[
  tier('small-standard','Small Standard',[15,12,0.75],1,Infinity,'unit'),
  tier('large-standard','Large Standard',[18,14,8],20),
  tier('small-bulky','Small Bulky',[37,28,20],50,130),
  tier('large-bulky','Large Bulky',[59,33,33],50,130),
  tier('xl-0-50','Extra-Large 0–50 lb',[Infinity,Infinity,Infinity],50),
  tier('xl-50-70','Extra-Large 50+–70 lb',[Infinity,Infinity,Infinity],70),
  tier('xl-70-150','Extra-Large 70+–150 lb',[Infinity,Infinity,Infinity],150),
  tier('xl-150','Extra-Large 150+ lb',[Infinity,Infinity,Infinity],Infinity,Infinity,'unit')
 ],
 rateCards:{
  nonPeak:[
   ...standard('small-standard',smallLimits,[[2.43,3.32,3.58],[2.49,3.42,3.68],[2.56,3.45,3.71],[2.66,3.54,3.80],[2.77,3.68,3.94],[2.82,3.78,4.04],[2.92,3.91,4.17],[2.95,3.96,4.22]]),
   ...standard('large-standard',largeLimits,[[2.91,3.73,3.99],[3.15,3.97,4.23],[3.42,4.24,4.50],[3.83,4.65,4.91],[4.29,5.11,5.37],[4.68,5.50,5.76],[4.84,5.66,5.92],[5.10,5.92,6.18],[5.24,6.06,6.32],[5.44,6.26,6.52],[5.61,6.43,6.69],[6.03,6.85,7.11]]),
   ...rows('large-standard',[6.46,7.28,7.54],3,.08,20,.25),
   ...rows('small-bulky',[6.58,7.35,7.35],1,.38,50),
   ...rows('large-bulky',[8.38,9.15,9.15],1,.38,50),
   ...rows('xl-0-50',[24.87,25.64,25.64],1,.38,50),
   ...rows('xl-50-70',[34.86,35.63,35.63],51,.75,70),
   ...rows('xl-70-150',[45.90,46.67,46.67],71,.75,150),
   ...rows('xl-150',[174.54,175.31,175.31],151,.19,Infinity)
  ],
  peak:[
   ...standard('small-standard',smallLimits,[[2.62,3.51,3.77],[2.68,3.61,3.87],[2.76,3.65,3.91],[2.86,3.74,4.00],[2.98,3.89,4.15],[3.03,3.99,4.25],[3.14,4.13,4.39],[3.17,4.18,4.44]]),
   ...standard('large-standard',largeLimits,[[3.15,3.97,4.23],[3.39,4.21,4.47],[3.66,4.48,4.74],[4.07,4.89,5.15],[4.52,5.34,5.60],[4.91,5.73,5.99],[5.07,5.89,6.15],[5.33,6.15,6.41],[5.47,6.29,6.55],[5.67,6.49,6.75],[5.84,6.66,6.92],[6.26,7.08,7.34]]),
   ...rows('large-standard',[6.69,7.51,7.77],3,.08,20,.25),
   ...rows('small-bulky',[7.82,8.59,8.59],1,.38,50),
   ...rows('large-bulky',[9.62,10.39,10.39],1,.38,50),
   ...rows('xl-0-50',[28.29,29.06,29.06],1,.38,50),
   ...rows('xl-50-70',[39.36,40.13,40.13],51,.75,70),
   ...rows('xl-70-150',[54.97,55.74,55.74],71,.75,150),
   ...rows('xl-150',[202.69,203.46,203.46],151,.19,Infinity)
  ]
 },
 // Retain the existing user-editable estimate; not represented as verified official surcharge.
 surcharge:{verified:true,enabled:true,basis:'baseFulfillmentFee',effectiveStart:'2026-04-17',provenance:'按用户成本参数估算，默认 3.5%，按本次用户确认执行'}
};
