import {feeConfig as config} from './fee-config.js';
import {packaging,seasonFor,classify,shippingWeight,fulfillment,financials,judgment,targetPrice,surchargePercent} from './calculator.js';
const $=id=>document.getElementById(id);
const fields=[
 ['pack-fields','length','长度 cm',null,false],['pack-fields','width','宽度 cm',null,false],['pack-fields','height','高度 cm',null,false],['pack-fields','weight','毛重 kg',null,false],
 ['price-fields','price','Amazon 售价 USD',null,false],['price-fields','factory','出厂价 RMB',null,true],['price-fields','exchange','RMB/USD 汇率',config.defaults.exchange,false],
 ['cost-fields','ocean','头程海运 USD / m³',config.defaults.ocean,true],['cost-fields','referral','Amazon 佣金 %',config.defaults.referral,true],['cost-fields','fuel','Fuel / Logistics %',config.defaults.fuel,true]
];
for(const [group,id,label,value,zero] of fields){
 const el=document.createElement('label');el.className='field';el.htmlFor=id;el.textContent=label;
 const input=document.createElement('input');Object.assign(input,{type:'number',id,inputMode:'decimal',step:'any',min:zero?'0':'0.000001',placeholder:'请输入',autocomplete:'off'});
 if(id==='referral')input.max='99.99';
 if(value!==null)input.value=value;
 el.append(input);$(group).append(el);
}
const usd=x=>Number.isFinite(x)?`$${x.toFixed(2)}`:'—';
const num=(x,n=2)=>Number.isFinite(x)?x.toFixed(n):'—';
function read(id){const el=$(id),v=el.value.trim()===''?null:el.valueAsNumber;const def=fields.find(f=>f[1]===id);const valid=v===null||(Number.isFinite(v)&&(def[4]?v>=0:v>0)&&(id!=='referral'||v<100));el.setAttribute('aria-invalid',String(!valid));return valid?v:null;}
function list(id,rows){$(id).replaceChildren(...rows.map(([name,value])=>{const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=value;div.append(dt,dd);return div;}));}
let report='';
function render(){
 const v=Object.fromEntries(fields.map(f=>[f[1],read(f[1])]));
 const p=packaging(v),s=seasonFor(config,document.querySelector('[name=season]:checked').value);
 const params=[v.ocean,v.referral,v.fuel,v.exchange].every(x=>x!==null);
 const first=p&&v.ocean!==null?p.cbm*v.ocean:null;
 const tier=classify(p,config),weight=tier?shippingWeight(p,tier):null;
 const fee=params?fulfillment(p,v.price,config,s.season,v.fuel,s.date):{status:'parameters'};
 const finance=fee.status==='ok'&&v.factory!==null?financials(v.price,v.factory,v.exchange,v.referral,first,fee.total):null;
 const decision=finance?judgment(finance.profit,finance.margin):null;
 const messages={packaging:'请输入完整、有效的包装尺寸与毛重。',price:'请输入预计售价，以获得准确 FBA Fee。',unverified:'待确认：缺少已核实的 Amazon 2026 官方尺寸规则及费表。',unsupported:'该包装不在已确认支持的尺寸等级内。','missing-rate':'费率待补充：该尺寸等级、期间或售价档位尚未提供完整费率。',parameters:'请检查汇率与高级成本参数。',ok:'基础费按用户确认费表；附加费按成本参数单独计算。'};
 $('season-note').textContent=`美国太平洋日期 ${s.date} · ${s.season==='peak'?'Holiday Peak':'Non-Peak'}；旺季窗口与尺寸规则按用户确认数据。`;
 $('fba-total').textContent=fee.status==='ok'?usd(fee.total):'—';$('fee-note').textContent=messages[fee.status];
 list('metrics',[
 ['Product Size Tier',tier?tier.label:'待官方规则确认'],
 ['Longest / Median / Shortest',p?p.inches.map(x=>num(x)).join(' / ')+' inch':'—'],
 ['实际重量 · Unit Weight',p?num(p.unitLb)+' lb':'—'],
 ['体积重量 · Dimensional Weight',weight?num(weight.dimensionalLb)+' lb':'待确认适用除数'],
 ['Amazon Shipping Weight',weight?num(weight.shippingLb)+' lb':'待官方规则确认'],
 ['Length + Girth',p?num(p.girthIn)+' inch':'—'],
 ['包装体积',p?num(p.cbm,4)+' m³':'—'],['预计头程 / 件',usd(first)],
 ['FBA 基础履约费',fee.status==='ok'?usd(fee.base):'费率待补充'],
 [`Fuel & Logistics Surcharge (${num(surchargePercent(config,v.fuel,s.date))}%)`,fee.status==='ok'?usd(fee.surcharge):'待确认基础费']
 ]);
 $('profit').textContent=usd(finance?.profit);
 $('ratios').textContent=finance?`利润率 ${num(finance.margin)}% · ROI ${finance.roi===null?'不适用':num(finance.roi)+'%'}`:'利润率 — · ROI —';
 $('verdict').className='verdict '+(decision?.tone??'neutral');$('verdict').textContent=decision?`${decision.text} · 每卖 1 件预计赚：${usd(finance.profit)}`:'填写利润数据并确认官方费表后，可判断新品利润空间。';
 const factory=v.factory!==null&&v.exchange!==null?v.factory/v.exchange:null;
 const commission=v.price!==null&&v.referral!==null?v.price*v.referral/100:null;
 list('breakdown',[['销售收入',usd(v.price)],['Amazon 佣金',usd(commission)],['FBA 尾程费',fee.status==='ok'?usd(fee.total):'费率待补充'],['头程运费',usd(first)],['出厂成本 USD',usd(factory)],['单件利润',usd(finance?.profit)],['利润率',finance?num(finance.margin)+'%':'—'],['ROI',finance?.roi!=null?num(finance.roi)+'%':'—']]);
 const canTarget=p&&params&&v.factory!==null&&config.verified;
 $('targets').replaceChildren(...[0,15,20,25,30].map(target=>{
  const value=canTarget?targetPrice(target,price=>{const f=fulfillment(p,price,config,s.season,v.fuel,s.date);return f.status==='ok'?financials(price,v.factory,v.exchange,v.referral,first,f.total):null;}):null;
  const el=document.createElement('div');el.className='target';const label=document.createElement('span'),strong=document.createElement('strong');label.textContent=target?`${target}% 利润率`:'保本售价';strong.textContent=usd(value);el.append(label,strong);return el;
 }));
 $('target-note').textContent=canTarget?'搜索上限 $1,000,000.00；— 表示范围内无可用结果。':'需要完整包装、出厂价、有效成本参数及已核实的官方费表；不会按零尾程费反推。';
 report=[`Amazon US 新品评估（Estimate）`,`包装：${p?[v.length,v.width,v.height].join(' × ')+' cm / '+v.weight+' kg':'未填完整'}`,`Size Tier：${tier?.label??'待官方规则确认'}`,`FBA 模式：${s.season==='peak'?'Holiday Peak':'Non-Peak'}（按用户确认规则）`,`FBA 基础费：${fee.status==='ok'?usd(fee.base):'费率待补充'}`,`Fuel/Logistics：${fee.status==='ok'?usd(fee.surcharge):'待确认'}`,`FBA 尾程：${fee.status==='ok'?usd(fee.total):'费率待补充'}`,`头程：${usd(first)} / 件`,`售价：${usd(v.price)}`,`出厂价：${v.factory===null?'—':'¥'+num(v.factory)}（汇率 ${num(v.exchange)} RMB/USD）`,`单件利润：${usd(finance?.profit)}`,`利润率：${finance?num(finance.margin)+'%':'—'}`,`建议：${decision?.text??'费率未确认，暂不作开发判断'}`,`费用未含广告、仓储、退货、税费等；最终以 Seller Central 实际测量与收费为准。`].join('\n');
 $('report').textContent=report;
 $('copy-status').textContent='';
}
document.addEventListener('input',render);document.addEventListener('change',render);
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(report);$('copy-status').textContent='已复制，可直接粘贴到微信。';}catch{const selection=window.getSelection(),range=document.createRange();range.selectNodeContents($('report'));selection.removeAllRanges();selection.addRange(range);$('copy-status').textContent='浏览器未允许自动复制，已选中摘要，请长按或按 Ctrl/Cmd+C 复制。';}});
render();
