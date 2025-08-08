// public/js/search.js
// Advanced search (separate page or modal)
async function performAdvancedSearch({q, from, to, startDate, endDate, tag}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (startDate) params.set('start', startDate);
  if (endDate) params.set('end', endDate);
  if (tag) params.set('tag', tag);
  const res = await fetch('/api/messages?'+params.toString());
  if (!res.ok) throw new Error('search failed');
  return res.json();
}
