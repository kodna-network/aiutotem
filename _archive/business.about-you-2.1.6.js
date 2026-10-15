// Removed in 2.1.7: Profile > About you (name, address, SSN last 4, household...). It lives in Accounts > your Me card now (scrambled).
    var d = B.personalDoc(S);
    if (!d) { a.addEvents([{ type: 'pdoc', data: { key: 'me-personal', folder: PL.ME, title: 'Personal profile', kind: 'personal', order: fields(B.PERSONAL) } }], true); p.appendChild(k.empty('Opening...')); return; } // one fixed key, so two devices make the same doc
    var about = h('div'), ak = askField(S, d, B.PERSONAL); if (ak) about.appendChild(ak);
    about.appendChild(formGroups(B.PERSONAL, d, B.values(S, d), 'You are an entity of your own: your Social Security number is your tax ID, and your personal money is separate from your businesses\' money.'));
    p.appendChild(k.acc('me-about', 'About you', [about], true));
