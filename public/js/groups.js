async function resolveGroupRecipients(toField) {
  const recipients = toField.split(',').map(r => r.trim());
  const all = [];
  for (const r of recipients) {
    if (r.includes("@")) {
      const res = await fetch(`/api/group/${r}`);
      const group = await res.json();
      all.push(...group.members);
    } else {
      all.push(r);
    }
  }
  return [...new Set(all)];
}

// בשלב השליחה:
const recipients = await resolveGroupRecipients(form.to.value);
data.to = recipients;
