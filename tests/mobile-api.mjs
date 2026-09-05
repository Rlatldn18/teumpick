import assert from 'node:assert/strict';
const base='http://localhost:3000/api/mobile/';
const suffix=Date.now();
const password='Test-only-password-2026';
let passed=0;
async function request(path,{token,body,status=200,origin='https://localhost'}={}){
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'X-Teumpick-Client':'android',...(token?{Authorization:`Bearer ${token}`} : {}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{if(r.status===status&&status===403)data={error:raw};else throw new Error(path+': HTTP '+r.status+' '+raw)}assert.equal(r.status,status,`${path}: ${JSON.stringify(data)}`);return data;
}
const register=async(role,n)=>request('auth/register',{body:{role,name:'테스트'+n,email:`test-${suffix}-${n}@example.test`,password,acceptTerms:true,storeName:'통합 테스트 매장'+n,station:'신도림',address:'서울 테스트로 123'}});
await request('auth/me',{status:401});passed++;
const buyer=await register('buyer','a'),otherBuyer=await register('buyer','b'),seller=await register('seller','c'),otherSeller=await register('seller','d');assert.equal(buyer.user.role,'buyer');assert.equal(seller.user.role,'seller');passed++;
await request('merchant',{token:buyer.token,status:403});passed++;
await request('merchant',{token:seller.token,body:{name:'검증 매장',menu:'테스트 덮밥',category:'한식',station:'신도림',address:'서울 테스트로 123',description:'테스트',price:9500,minutes:15,open:true}});
const merchant=await request('merchant',{token:seller.token});
const catalog=await request('catalog');assert.ok(catalog.some(s=>s.id===merchant.id));passed++;
const make=qty=>({action:'create',shopId:merchant.id,unitPrice:9500,station:'신도림',qty,note:'통합 테스트',requestId:crypto.randomUUID()});
await request('orders',{token:seller.token,body:make(1),status:403});
await request('orders',{token:buyer.token,body:make(0),status:400});passed++;
const original=make(2);await request('orders',{token:buyer.token,body:original});await request('orders',{token:buyer.token,body:original});
let orders=await request('orders',{token:buyer.token});assert.equal(orders.length,1);assert.equal(orders[0].total,19000);assert.equal(orders[0].code,'');const order=orders[0];passed++;
assert.equal((await request('orders',{token:otherBuyer.token})).length,0);
await request('orders',{token:otherSeller.token,body:{action:'next',id:order.id},status:404});await request('orders',{token:buyer.token,body:{action:'next',id:order.id},status:409});passed++;
await request('account/delete',{token:buyer.token,body:{password},status:409});passed++;
await request('orders',{token:otherBuyer.token,body:make(1)});const second=(await request('orders',{token:otherBuyer.token}))[0];assert.notEqual(second.locker,order.locker);passed++;
await request('orders',{token:seller.token,body:{action:'delay',id:order.id}});orders=await request('orders',{token:buyer.token});assert.equal(orders[0].eta,order.eta+300000);passed++;
for(let n=0;n<3;n++)await request('orders',{token:seller.token,body:{action:'next',id:order.id}});
const ready=(await request('orders',{token:buyer.token}))[0];assert.equal(ready.status,3);assert.match(ready.code,/^\d{6}$/);assert.equal((await request('orders',{token:seller.token})).find(o=>o.id===order.id).code,'');passed++;
await request('orders',{token:buyer.token,body:{action:'collect',id:order.id,code:'wrong'},status:400});await request('orders',{token:buyer.token,body:{action:'collect',id:order.id,code:ready.code}});passed++;
await request('orders',{token:otherBuyer.token,body:{action:'cancel',id:second.id}});passed++;
for(let i=0;i<12;i++)await request('orders',{token:buyer.token,body:make(1)});
await request('orders',{token:otherBuyer.token,body:make(1),status:409});
orders=await request('orders',{token:buyer.token});assert.equal(new Set(orders.filter(o=>o.status<4).map(o=>o.locker)).size,12);passed++;
for(const o of orders.filter(o=>o.status===0))await request('orders',{token:buyer.token,body:{action:'cancel',id:o.id}});
await request('auth/reset',{body:{email:buyer.user.email,recoveryCode:buyer.recoveryCode,password:password+'-new'}});await request('auth/me',{token:buyer.token,status:401});passed++;
const login=await request('auth/login',{body:{email:buyer.user.email,password:password+'-new'}});assert.equal(login.user.id,buyer.user.id);passed++;
await request('auth/me',{token:login.token,origin:'https://evil.example',status:403});passed++;
await request('account/delete',{token:login.token,body:{password:password+'-new'}});await request('auth/me',{token:login.token,status:401});
for(const m of [otherBuyer,seller,otherSeller])await request('account/delete',{token:m.token,body:{password}});passed++;
console.log(`PASS: ${passed} integration groups. Registration, independent roles, native bearer sessions, catalog, pricing, idempotency, cross-account isolation, global locker capacity, ETA, pickup codes, cancellation, reset, deletion, and origin restrictions.`);


