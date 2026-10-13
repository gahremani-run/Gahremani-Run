const SUPABASE_URL = 'https://rjvjgxwfunafqwpnzwne.supabase.co';
const SUPABASE_KEY = 'sb_publishable_u_SupvLT_Ls43HyCJlf5dQ_G9AyF0kC';
const PLAYER_NAME_KEY = 'gahremaniRunLeaderboardName';
const CLOUD_CODE_KEY = 'gahremaniCloudSave_v1';
const list = document.querySelector('#highScores');
const gameover = document.querySelector('#gameover');
function escapeText(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function normalizeName(value) { return String(value ?? '').trim().replace(/[<>]/g, '').slice(0, 20); }
function getOrCreateRecoveryCode() {
  let code = localStorage.getItem(CLOUD_CODE_KEY);
  if (!code) { const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); code = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase(); localStorage.setItem(CLOUD_CODE_KEY, code); }
  return code;
}
async function rpc(name, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});
  if (!response.ok) throw new Error(`RPC ${name} failed (${response.status})`); return response.json();
}
async function showGlobalScores() {
  if (!list) return;
  try {
    const response = await fetch(SUPABASE_URL + '/rest/v1/leaderboard?select=player_name,score&order=score.desc&limit=1000', {headers:{apikey:SUPABASE_KEY},cache:'no-store'});
    if (!response.ok) throw new Error('Could not load scores');
    const rows = await response.json(), bestByName = new Map();
    for (const row of rows) {
      const name = normalizeName(row.player_name); if (!name) continue;
      const key = name.toLocaleLowerCase(), score = Math.max(0, Math.floor(Number(row.score) || 0)), prior = bestByName.get(key);
      if (!prior || score > prior.score) bestByName.set(key, {name, score});
    }
    const top = [...bestByName.values()].sort((a,b)=>b.score-a.score).slice(0,10);
    list.innerHTML = top.length ? top.map((row,i)=>`<li><span style="opacity:.8">${i+1}.</span> <span>${escapeText(row.name)}</span> <b>${row.score.toLocaleString('fa-IR')}</b></li>`).join('') : '<li>هنوز رکورد جهانی ثبت نشده</li>';
  } catch (error) { console.warn('Global leaderboard unavailable:', error); }
}
async function getUniqueName() {
  let name = normalizeName(localStorage.getItem(PLAYER_NAME_KEY)); const recoveryCode = getOrCreateRecoveryCode();
  for (let attempt=0; attempt<8; attempt++) {
    if (!name) { const entered=prompt('یک نام کاربری یکتا برای لیدربورد انتخاب کن (۲ تا ۲۰ نویسه):','بازیکن'); if (entered===null) return null; name=normalizeName(entered); }
    if (name.length<2) { alert('نام کاربری باید حداقل ۲ نویسه داشته باشد.'); name=''; continue; }
    const oldName=normalizeName(localStorage.getItem(PLAYER_NAME_KEY));
    const result=await rpc('gahremani_claim_username',{p_recovery_code:recoveryCode,p_old_name:oldName,p_new_name:name});
    if (result?.ok) { localStorage.setItem(PLAYER_NAME_KEY,name); return name; }
    if (result?.reason==='taken') alert(`نام «${name}» قبلاً انتخاب شده است. لطفاً نام دیگری انتخاب کن.`); else alert('این نام معتبر نیست؛ نامی بین ۲ تا ۲۰ نویسه انتخاب کن.');
    name='';
  }
  alert('ثبت نام انجام نشد. دوباره تلاش کن.'); return null;
}
async function submitGlobalScore(score) {
  try {
    const name=await getUniqueName(); if (!name) return;
    const seconds=Math.max(1,Math.min(1800,Math.round(Number(window.grLastRunSeconds)||0)));
    const result=await rpc('gahremani_submit_score',{p_recovery_code:getOrCreateRecoveryCode(),p_score:Math.max(0,Math.min(100000000,Math.floor(score))),p_seconds:seconds});
    if (result?.ok) { await showGlobalScores(); return; }
    if (result?.reason==='rate_limited') return;
    console.warn('Score rejected:',result);
    alert('رکورد این دور ثبت نشد.');
  } catch(error) { console.warn('Score submission failed:',error); alert('ثبت رکورد انجام نشد. اتصال اینترنت و اجرای اسکریپت‌های جدید Supabase را بررسی کن.'); }
}
if (gameover) {
  let wasVisible=!gameover.classList.contains('hidden');
  new MutationObserver(()=>{const visible=!gameover.classList.contains('hidden'); if(visible&&!wasVisible){showGlobalScores();let scoreText=document.querySelector('#finalScore')?.textContent||'0';scoreText=scoreText.replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));submitGlobalScore(Number(scoreText.replace(/\D/g,''))||0);}wasVisible=visible;}).observe(gameover,{attributes:true,attributeFilter:['class']});
}
showGlobalScores();
