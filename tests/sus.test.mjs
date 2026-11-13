import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateSus, normalizeSubmission} from '../lib/sus.mjs';
import {POST} from '../api/submit.mjs';
import {GET} from '../api/results.mjs';

const allFive = Array(10).fill(5);
const allOne = Array(10).fill(1);
const good = Array.from({length:10}, (_,i)=>i%2===0?4:2);

test('SUS: neutral answers to all items = 50',()=>assert.equal(calculateSus(Array(10).fill(3)).score,50));
test('SUS: high usability = 100',()=>assert.equal(calculateSus(Array.from({length:10},(_,i)=>i%2?1:5)).score,100));
test('SUS: low usability = 0',()=>assert.equal(calculateSus(Array.from({length:10},(_,i)=>i%2?5:1)).score,0));
test('SUS: known score = 75, sums odd=20 even=10',()=>assert.deepEqual(calculateSus(good),{odd_sum:20,even_sum:10,score:75}));
test('SUS: invalid responses rejected',()=>{
  assert.equal(calculateSus(allOne.slice(0,8)),null);
  assert.equal(calculateSus([...allFive.slice(0,9),6]),null);
  assert.equal(calculateSus([...allFive.slice(0,9),'5']),null);
});
test('Submission accepts correct values and caps free text',()=>{
  const normalized=normalizeSubmission({answers:good,visit_name:'A'.repeat(200),device:'Android',discomfort:'Léger',difficulties:'Hi',comment:'Ok'});
  assert.equal(normalized.score,75); assert.equal(normalized.visit_name.length,120);
});
test('Honeypot rejects fake submissions',()=>assert.equal(normalizeSubmission({answers:good,website:'spam'}),null));

test('POST /api/submit saves score via configured REST service',async()=>{
  process.env.SUPABASE_URL='https://sample-ref.supabase.co';
  process.env.SUPABASE_SECRET_KEY='sb_secret_FAKE_TEST_ONLY';
  const original=global.fetch;let called=false;
  global.fetch=async (url,init)=>{
    called=true; assert.equal(init.method,'POST');assert.ok(String(url).includes('/rest/v1/sus_responses'));
    assert.equal(init.headers.apikey,'sb_secret_FAKE_TEST_ONLY');
    const posted=JSON.parse(init.body);assert.equal(posted.score,75);assert.deepEqual(posted.answers,good);
    return new Response(JSON.stringify([{id:1,created_at:'2026-11-13T00:00:00Z',score:75}]),{status:201});
  };
  try{const res=await POST(new Request('https://example.com/api/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({answers:good})}));const j=await res.json();assert.equal(res.status,201);assert.equal(j.ok,true);assert.equal(j.id,1);assert.equal(called,true);}finally{global.fetch=original;}
});
test('GET /api/results returns stored submissions',async()=>{
  process.env.SUPABASE_URL='https://sample-ref.supabase.co';
  process.env.SUPABASE_SECRET_KEY='sb_secret_FAKE_TEST_ONLY';
  const original=global.fetch;
  global.fetch=async(url,init)=>{assert.equal(init.method,'GET');return new Response(JSON.stringify([{id:1,answers:good,score:75}]),{status:200});};
  try{const res=await GET();const json=await res.json();assert.equal(res.status,200);assert.equal(json.responses[0].score,75);}finally{global.fetch=original;}
});
