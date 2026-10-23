const assert=require('node:assert/strict');const {pastoral,ratio,validate,calculations}=require('../app/core.js');let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}
test('pastoral year boundary',()=>{assert.equal(pastoral('2026-08-31').year,'2025/2026');assert.equal(pastoral('2026-09-01').year,'2026/2027');});
test('pastoral quarters and leap day',()=>{for(const [d,q]of[['2026-09-01',1],['2026-11-30',1],['2026-12-01',2],['2028-02-29',2],['2027-03-01',3],['2027-05-31',3],['2027-06-01',4],['2027-08-31',4]])assert.equal(pastoral(d).quarter,q);});
test('undefined denominator gives null, never zero',()=>{assert.equal(ratio(8,0),null);assert.equal(ratio(null,5),null);assert.equal(ratio(0,5),0);assert.equal(ratio(8,10),80);});
test('sex disaggregation reconciles',()=>{assert.deepEqual(validate({total:8,women:4,men:3,undisclosed:1},{required:[]}),[]);assert(validate({total:8,women:5,men:4,undisclosed:0},{required:[]}).includes('sex_total'));});
test('unknown age remains explicit',()=>{assert(!validate({total:3,age_u18:1,age_18_24:0,age_25_34:0,age_35_49:0,age_50_64:0,age_65:0,age_unknown:2},{required:[]}).includes('age_total'));});
test('reject false consent, out-of-range risk and overspend',()=>{const e=validate({consent:'false',severity:5,spent:10,budget:5},{required:['consent']});for(const code of ['consent','range:severity','overspend'])assert(e.includes(code));});
test('approval cannot be self-declared through app',()=>{assert(validate({state:'APPROVED'},{required:[]}).includes('approval_external'));});
test('financial computations preserve missing values',()=>{assert.equal(calculations({}).economic,null);let c=calculations({spent:90,budget:100,local:10,outputs:3,planned_cost:80});assert.equal(c.execution,90);assert.equal(c.economic,100);assert.equal(c.costPerOutput,30);assert.equal(c.variance,12.5);});
test('unique participants bounded by attendances',()=>{assert(validate({unique:12,total:10},{required:[]}).includes('unique_total'));});
test('four-language coverage',()=>{const c=require('../app/config.json');for(const v of [...Object.values(c.fields),...c.forms])for(const l of ['rw','en','fr','sw'])assert(v.label[l]);});
console.log(n+' test groups passed');
