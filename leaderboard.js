
const SUPABASE_URL = 'https://rjvjgxwfunafqwpnzwne.supabase.co';
const SUPABASE_KEY = 'sb_publishable_u_SupvLT_Ls43HyCJlf5dQ_G9AyF0kC';

const list = document.querySelector('#highScores');
const gameover = document.querySelector('#gameover');

function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function showGlobalScores() {
  if (!list) return;

  try {
    const response = await fetch(
      SUPABASE_URL +
      '/rest/v1/leaderboard?select=player_name,score&order=score.desc&limit=5',
      { headers: { apikey: SUPABASE_KEY }, cache: 'no-store' }
    );

    if (!response.ok) throw new Error('Could not load scores');

    const rows = await response.json();

    list.innerHTML = rows.length
      ? rows.map((row, i) =>
          `<li><span>${i + 1}.</span> ` +
          `<span>${escapeText(row.player_name)}</span> ` +
          `<b>${Math.floor(Number(row.score) || 0).toLocaleString('fa-IR')}</b></li>`
        ).join('')
      : '<li>هنوز رکورد جهانی ثبت نشده</li>';
  } catch (error) {
    console.warn('Global leaderboard unavailable:', error);
  }
}

async function submitGlobalScore(score) {
  try {
    let name = localStorage.getItem('gahremaniRunLeaderboardName');

    if (!name) {
      const entered = prompt(
        'یک نام برای لیدربورد جهانی انتخاب کن (حداکثر ۲۰ نویسه):',
        'بازیکن'
      );
      name = (entered === null ? 'بازیکن' : entered)
        .trim().slice(0, 20) || 'بازیکن';

      localStorage.setItem('gahremaniRunLeaderboardName', name);
    }

    const response = await fetch(
      SUPABASE_URL + '/rest/v1/leaderboard',
      {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          player_name: name,
          score: Math.max(0, Math.min(100000000, Math.floor(score)))
        })
      }
    );

    if (!response.ok) throw new Error('Could not submit score');
    await showGlobalScores();
  } catch (error) {
    console.warn('Score submission failed:', error);
  }
}

if (gameover) {
  let wasVisible = !gameover.classList.contains('hidden');

  new MutationObserver(() => {
    const visible = !gameover.classList.contains('hidden');

    if (visible && !wasVisible) {
      showGlobalScores();

      let text = document.querySelector('#finalScore')?.textContent || '0';
      text = text.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
      text = text.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));

      const score = Number(text.replace(/\D/g, '')) || 0;
      submitGlobalScore(score);
    }

    wasVisible = visible;
  }).observe(gameover, { attributes: true, attributeFilter: ['class'] });
}

showGlobalScores();
