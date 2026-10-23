/* Pure calculations: used by browser and Node acceptance tests. */
(function(root){
 const ratio=(n,d,factor=100)=>d===0||d==null||n==null?null:n/d*factor;
 const num=(x,k)=> x[k] === '' || x[k] == null ? null : Number(x[k]);
 function pastoral(date){const d=new Date(date+'T12:00:00Z');if(Number.isNaN(d.valueOf()))throw Error('Invalid date');const y=d.getUTCFullYear(),m=d.getUTCMonth()+1,start=m>=9?y:y-1;return {year:`${start}/${start+1}`,quarter:m>=9&&m<=11?1:m===12||m<=2?2:m<=5?3:4,start:`${start}-09-01`,end:`${start+1}-08-31`};}
 function validate(v,form){let e=[];for(const k of form.required)if(v[k]==null||String(v[k]).trim()==='')e.push('required:'+k);
 if(v.start&&v.end&&v.start>v.end)e.push('dates');
 const nonnegative=['budget','planned_cost','spent','committed','local','secured','quantity','unit_cost','total','women','men','undisclosed','unique','disability','outputs','reach','interactions','volunteers','active','compliant','assessed','sample'];
 for(const k of nonnegative)if(v[k]!==''&&v[k]!=null&&(!Number.isFinite(Number(v[k]))||Number(v[k])<0))e.push('nonnegative:'+k);
 for(const k of ['severity','probability'])if(v[k]!==''&&v[k]!=null&&(!Number.isInteger(Number(v[k]))||Number(v[k])<1||Number(v[k])>4))e.push('range:'+k);
 if(v.satisfaction!==''&&v.satisfaction!=null&&(Number(v.satisfaction)>10||Number(v.satisfaction)<0))e.push('range:satisfaction');
 if(['total','women','men','undisclosed'].every(k=>v[k]!==''&&v[k]!=null)&&Number(v.total)!==Number(v.women)+Number(v.men)+Number(v.undisclosed))e.push('sex_total');
 if(v.unique!==''&&v.unique!=null&&v.total!==''&&v.total!=null&&Number(v.unique)>Number(v.total))e.push('unique_total');
 const ages=['age_u18','age_18_24','age_25_34','age_35_49','age_50_64','age_65','age_unknown'];if(ages.every(k=>v[k]!==''&&v[k]!=null)&&v.total!==''&&v.total!=null&&ages.reduce((s,k)=>s+Number(v[k]),0)!==Number(v.total))e.push('age_total');
 if(v.active!==''&&v.active!=null&&v.volunteers!==''&&v.volunteers!=null&&Number(v.active)>Number(v.volunteers))e.push('active_total');
 if(v.compliant!==''&&v.compliant!=null&&v.assessed!==''&&v.assessed!=null&&Number(v.compliant)>Number(v.assessed))e.push('compliant_total');
 if(form.required.includes('consent')&&v.consent!=='true')e.push('consent');
 if(v.spent!==''&&v.spent!=null&&v.budget!==''&&v.budget!=null&&Number(v.spent)>Number(v.budget)&&!v.reason)e.push('overspend');
 if(v.state==='APPROVED'||v.state==='LOCKED')e.push('approval_external');
 return e;}
 function calculations(v){let spend=num(v,'spent'),budget=num(v,'budget'),local=num(v,'local'),outputs=num(v,'outputs');return {execution:ratio(spend,budget),variance:spend==null||num(v,'planned_cost')==null?null:ratio(spend-num(v,'planned_cost'),num(v,'planned_cost')),economic:spend==null||local==null?null:spend+local,costPerOutput:ratio(spend,outputs,1),fundingCoverage:ratio(num(v,'secured'),budget),risk:num(v,'severity')==null||num(v,'probability')==null?null:Number(v.severity)*Number(v.probability),engagement:ratio(num(v,'interactions'),num(v,'reach')),scoreChange:num(v,'pre')==null||num(v,'post')==null?null:Number(v.post)-Number(v.pre)};}
 const api={ratio,pastoral,validate,calculations};if(typeof module!=='undefined')module.exports=api;root.APSECore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
