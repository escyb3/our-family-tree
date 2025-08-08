// public/js/ai.js
// קלינט AI helper — משתמש ב-/api/ask-ai או ב־LocalAI אם מופעל
async function aiSuggestReply(threadBody){
  try {
    const res = await fetch('/api/ask-ai',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ question: `הצע תשובה מקצועית ותמציתית להודעה הבאה: ${threadBody}` })});
    if (!res.ok) throw new Error('ai fail');
    const data = await res.json();
    return data.answer || '';
  } catch(e){
    console.error('AI error', e);
    return '';
  }
}
