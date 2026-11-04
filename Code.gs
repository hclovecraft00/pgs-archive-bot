/**
 * Postgrowth SG archive bot (@pgs_archive_bot)
 *
 * Admins forward a link (or a PDF) to the bot, tap a type and up to two themes,
 * and it's added to the Entries tab of this Sheet as live. The website reads that tab.
 * Spec: personal/cluster-archive/BOT-SPEC.md
 *
 * Setup (once): add BOT_TOKEN in Project Settings → Script Properties, then run setup().
 */

const TZ = 'Asia/Singapore';
const STAY_AWAKE_MS = 3 * 60 * 1000;   // after a message, keep listening this long
const MAX_RUN_MS = 5 * 60 * 1000;      // Apps Script runs are capped at 6 minutes
const PDF_FOLDER_NAME = 'PGS Archive PDFs';

const TABS = {
  entries: { name: 'Entries', headers: ['ID', 'Status', 'Title', 'Link', 'Type', 'Theme 1', 'Theme 2', 'Extra tags', 'Date', 'Authors', 'Description', 'Shared by', 'Date added', 'Archive link'] },
  themes: { name: 'Themes', headers: ['Theme', 'Description', 'Date added'] },
  types: { name: 'Types', headers: ['Type', 'Dot shape'] },
  private: { name: 'Private', headers: ['ID', 'Shared by', 'OK to credit', 'Added by', 'Telegram message', 'Notes'] },
};
const E = {}; TABS.entries.headers.forEach((h, i) => { E[h] = i + 1; });

const TYPES = [
  ['research', 'square'], ['book', 'triangle'], ['article', 'circle'], ['podcast', 'diamond'],
  ['video', 'star'], ['community', 'three-armed'], ['post', 'cross'], ['zine / own writing', '(to choose)'],
];
const STARTER_THEMES = [
  'Degrowth basics', 'Climate & planet', 'Systems & policy', 'Wellbeing', 'Critiques & debates',
  'Singapore & SEA', 'Asia', 'Work & everyday life', 'Measuring progress', 'Technology',
];

// The 25 links from the old postgrowthsg.wordpress.com Resources page, tagged as a first pass.
// Added once by setup() when the archive is empty. Prune them in the Sheet (set Status to hidden, or delete the row).
// [title, link, type, theme 1, theme 2, date, description]
const STARTER_ITEMS = [["Nathalie Roy on degrowth","https://www.linkedin.com/posts/nathalieroy7_sustainability-degrowth-postgrowth-activity-7145729407792431104-ZEvQ","post","Degrowth basics","","2023-12","A LinkedIn post introducing degrowth and post-growth ideas."],["On economic growth (Vaclav Smil interview)","https://www.theguardian.com/books/2019/sep/21/vaclav-smil-interview-growth-must-end-economists","article","Climate & planet","Degrowth basics","2019-09","The Guardian interviews energy scientist Vaclav Smil, who argues growth must end on a finite planet."],["Who still cares about GDP?","https://www.straitstimes.com/asia/who-still-cares-about-gdp-daily-star-contributor","article","Measuring progress","Asia","","A Daily Star contributor, republished in The Straits Times, questions GDP as the measure of progress."],["How entropy leads us to degrowth","https://en.aterraeredonda.com.br/como-a-entropia-nos-leva-ao-decrescimento/","article","Climate & planet","Degrowth basics","","An essay from A Terra é Redonda linking the physics of entropy to the case for degrowth."],["Post-growth: the science of wellbeing within planetary boundaries","https://www.thelancet.com/journals/lanplh/article/PIIS2542-5196(24)00310-3/fulltext","research","Wellbeing","Climate & planet","2024","A review in The Lancet Planetary Health of research on meeting human needs within planetary limits without relying on growth."],["Degrowth economy: the climate solution no one is talking about","https://illuminem.com/energyvoices/cec60ef9-32e5-47be-b914-76cd62cf17ac","article","Climate & planet","","","An Illuminem piece arguing degrowth belongs in the climate debate."],["How to talk about a wellbeing economy","https://youtu.be/MDiGNA5hf1M","video","Wellbeing","Systems & policy","","A short video on framing and communicating a wellbeing economy."],["Life in a ‘degrowth’ economy, and why you might actually enjoy it","https://theconversation.com/life-in-a-degrowth-economy-and-why-you-might-actually-enjoy-it-32224","article","Work & everyday life","Wellbeing","2014","The Conversation on what daily life might feel like in a degrowth economy."],["Less is More (book review)","https://newrepublic.com/article/160692/less-is-more-degrowth-climate-change-book-review","article","Critiques & debates","Climate & planet","2021","The New Republic reviews Jason Hickel’s Less is More and its argument linking degrowth and climate."],["A (friendly) critique of the degrowth movement","https://medium.com/postgrowth/a-friendly-critique-of-the-degrowth-movement-f0bd2297072d","article","Critiques & debates","","","A sympathetic critique of degrowth from the Post Growth publication on Medium."],["‘Degrowth’ economics may be inevitable","https://www.straitstimes.com/opinion/degrowth-economics-may-be-inevitable","article","Degrowth basics","","2023","An opinion piece in The Straits Times, first published in The Conversation, arguing slower growth may be unavoidable."],["Steps towards a post-work, post-growth library economy","https://medium.com/postgrowth/steps-towards-establishing-a-post-work-post-growth-library-economy-1a555dbcda21","article","Work & everyday life","Systems & policy","","Proposes an economy built around sharing, libraries of things and less paid work."],["Degrowing China? By collapse, redistribution or planning","https://monthlyreview.org/2023/07/01/degrowing-china-by-collapse-redistribution-or-planning/","research","Asia","Systems & policy","2023-07","Monthly Review asks how, and whether, China could degrow."],["A Post Growth Deal (EU)","https://www.realpostgrowth.eu/","community","Systems & policy","","","Campaign site for a post-growth deal in the European Union."],["Next System Project comparative framework","https://thenextsystem.org/next-system-project-comparative-framework","research","Systems & policy","Critiques & debates","","A framework for comparing proposals for a different economic system."],["Post-growth YouTube playlist","https://www.youtube.com/playlist?list=PL-AYdLMsG8plcg1Bapamlmr4876cXdQvO","video","Degrowth basics","","","A playlist of talks and explainers on post-growth."],["Another Garden City is Possible: a plan for a post-carbon Singapore","https://share.libbyapp.com/title/5614683","book","Singapore & SEA","Climate & planet","2020","Bertrand Seah’s chapter in Eating Chilli Crab in the Anthropocene (ed. Schneider-Mayerson). On Libby."],["The Future is Degrowth","https://share.libbyapp.com/title/9046457","book","Degrowth basics","Systems & policy","2022","Schmelzer, Vansintjan and Vetter’s guide to a world beyond capitalism. On Libby."],["Less is More: How Degrowth Will Save the World","https://share.libbyapp.com/title/5651750","book","Degrowth basics","Climate & planet","2020","Jason Hickel’s widely read case for degrowth. On Libby."],["Post Growth: Life after Capitalism","https://catalogue.nlb.gov.sg/search/card?id=419a1dbc-989f-584a-946a-1b13fd253088&entityType=FormatGroup","book","Wellbeing","Degrowth basics","2021","Tim Jackson on prosperity after growth. In the NLB catalogue."],["Exploring degrowth in Singapore","https://open.spotify.com/episode/5YIFDTs1lWL5XKrkQygfMf","podcast","Singapore & SEA","","","A podcast episode on what degrowth could mean for Singapore."],["Why some economists think abandoning growth could save the planet","https://theconversation.com/degrowth-why-some-economists-think-abandoning-growth-is-the-only-way-to-save-the-planet-podcast-170748","podcast","Degrowth basics","Climate & planet","2021","The Conversation’s podcast on the economics of degrowth."],["How degrowth will reshape technology, with Jason Hickel","https://pca.st/episode/9fbd1ec0-cc4d-4b4f-872a-c08e37787dc4","podcast","Technology","","","Jason Hickel on what degrowth means for technology."],["Degrowth Singapore Facebook group","https://www.facebook.com/groups/3844872028890880/","community","Singapore & SEA","","","A Facebook group for degrowth conversations in Singapore."],["Database of degrowth resources","https://explore.degrowth.net/the-degrowth-database/","community","Degrowth basics","","","A searchable database of degrowth resources from explore.degrowth.net."]];

const props = PropertiesService.getScriptProperties();

// ---------- Setup ----------

/** Run once from the editor after adding BOT_TOKEN. Safe to rerun. */
function setup() {
  if (!props.getProperty('BOT_TOKEN')) throw new Error('Add BOT_TOKEN in Project Settings → Script Properties first.');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  props.setProperty('SHEET_ID', ss.getId());
  Object.values(TABS).forEach(t => {
    let sh = ss.getSheetByName(t.name);
    if (!sh) { sh = ss.insertSheet(t.name); sh.appendRow(t.headers); sh.setFrozenRows(1); }
  });
  // Keep dates as typed text ("2021", "2014-10"), so Sheets doesn't turn them into full dates
  const entries = ss.getSheetByName(TABS.entries.name);
  entries.getRange(1, E.Date, entries.getMaxRows(), 1).setNumberFormat('@');
  entries.getRange(1, E['Date added'], entries.getMaxRows(), 1).setNumberFormat('@');
  if (!props.getProperty('NEXT_ID')) props.setProperty('NEXT_ID', '1');
  if (entries.getLastRow() < 2) importStarter();

  const themes = ss.getSheetByName(TABS.themes.name);
  if (themes.getLastRow() < 2) STARTER_THEMES.forEach(n => themes.appendRow([n, '', today()]));
  const types = ss.getSheetByName(TABS.types.name);
  if (types.getLastRow() < 2) TYPES.forEach(r => types.appendRow(r));
  const first = ss.getSheets()[0];
  if (first.getName() === 'Sheet1' && first.getLastRow() === 0) ss.deleteSheet(first);

  if (!props.getProperty('PDF_FOLDER_ID')) {
    const folder = DriveApp.createFolder(PDF_FOLDER_NAME);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    props.setProperty('PDF_FOLDER_ID', folder.getId());
  }

  tg('deleteWebhook', {});
  tg('setMyCommands', { commands: [
    { command: 'recent', description: 'The last 10 items, to edit or hide' },
    { command: 'hide', description: 'Take an item off the site, e.g. /hide PGS-0004' },
    { command: 'show', description: 'Put a hidden item back, e.g. /show PGS-0004' },
    { command: 'invite', description: 'Get a link to add another admin' },
    { command: 'cancel', description: 'Stop what you’re adding' },
    { command: 'help', description: 'How this works' },
  ] });

  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('checkMessages').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('archiveLinks').timeBased().everyHours(1).create();
  console.log('Done. PDFs folder: ' + DriveApp.getFolderById(props.getProperty('PDF_FOLDER_ID')).getUrl());
  console.log('Now open @pgs_archive_bot in Telegram and send /start. The first person to do so becomes the owner.');
}

// ---------- Polling (same approach as the Thoughts bot) ----------

function checkMessages() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const start = Date.now();
    let lastActivity = 0;
    do {
      const timeout = lastActivity ? 10 : 0;
      const offset = Number(props.getProperty('UPDATE_OFFSET') || 0);
      const updates = tg('getUpdates', { offset, timeout, allowed_updates: ['message', 'callback_query'] }) || [];
      updates.forEach(u => {
        props.setProperty('UPDATE_OFFSET', String(u.update_id + 1));
        try { handleUpdate(u); } catch (err) { console.error(err); notifyError(u, err); }
      });
      if (updates.length) lastActivity = Date.now();
    } while (lastActivity && Date.now() - lastActivity < STAY_AWAKE_MS && Date.now() - start < MAX_RUN_MS);
  } finally {
    lock.releaseLock();
  }
}

function notifyError(u, err) {
  const chat = u.message ? u.message.chat : u.callback_query ? u.callback_query.message.chat : null;
  if (chat && isAdmin(chat.id)) send(chat.id, '⚠️ Something went wrong: ' + escapeHtml(String(err.message || err)).slice(0, 300));
}

// ---------- Admins ----------

function admins() { return JSON.parse(props.getProperty('ADMINS') || '{}'); }
function isAdmin(chatId) { return Object.prototype.hasOwnProperty.call(admins(), String(chatId)); }
function adminName(chatId) { return admins()[String(chatId)] || ''; }
function nameOf(from) { return [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'admin'; }

function handleUpdate(u) {
  const msg = u.message;
  const tap = u.callback_query;
  const chat = msg ? msg.chat : tap ? tap.message.chat : null;
  if (!chat || chat.type !== 'private') return;

  const list = admins();
  if (!Object.keys(list).length && msg) {               // first person becomes the owner
    list[String(chat.id)] = nameOf(msg.from);
    props.setProperty('ADMINS', JSON.stringify(list));
    send(chat.id, 'Hello! You’re the first admin of the Postgrowth archive.\n\n' + HELP);
    return;
  }
  if (!isAdmin(chat.id)) {
    if (msg && acceptInvite(msg)) return;
    if (msg) send(chat.id, 'Hi! This bot is for Postgrowth SG admins. To share a resource, message one of the organisers, or join the Telegram group.');
    return;
  }
  if (tap) return handleTap(tap);
  handleMessage(msg);
}

function acceptInvite(msg) {
  const code = props.getProperty('INVITE_CODE');
  const text = (msg.text || '').trim();
  if (!code || text !== '/start ' + code) return false;
  props.deleteProperty('INVITE_CODE');
  const list = admins();
  list[String(msg.chat.id)] = nameOf(msg.from);
  props.setProperty('ADMINS', JSON.stringify(list));
  send(msg.chat.id, 'Welcome! You’re now an admin of the Postgrowth archive.\n\n' + HELP);
  Object.keys(list).filter(id => id !== String(msg.chat.id)).forEach(id => send(id, `🔗 ${escapeHtml(nameOf(msg.from))} is now an archive admin.`));
  return true;
}

const HELP = [
  '<b>Add something:</b> forward or paste a message with a link, or send a PDF. I’ll read the page, then you tap a type and up to two themes, and tap <b>Done</b>. It goes live on the site within a few minutes.',
  '',
  '/recent: the last 10 items, to edit or hide',
  '/hide PGS-0004 · /show PGS-0004: take an item off the site or put it back',
  '/invite: a one-time link to add another admin',
  '/cancel: stop what you’re adding',
  '',
  'Bigger changes: edit the Sheet directly.',
].join('\n');

// ---------- Messages ----------

function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = (msg.text || msg.caption || '').trim();
  const cmd = text.startsWith('/') ? text.split(/\s+/)[0].toLowerCase().replace(/@.*$/, '') : '';
  const draft = getDraft(chatId);

  if (cmd === '/start' || cmd === '/help') return send(chatId, HELP);
  if (cmd === '/cancel') { clearDraft(chatId); return send(chatId, 'Cancelled. Nothing was saved.'); }
  if (cmd === '/invite') return sendInvite(chatId);
  if (cmd === '/recent') return sendRecent(chatId);
  if (cmd === '/hide' || cmd === '/show') return setStatus(chatId, text.split(/\s+/)[1], cmd === '/hide' ? 'hidden' : 'live');

  // Answering a question the bot asked. A forwarded link or PDF instead starts a new item.
  const newThing = msg.document || (draft && draft.awaiting !== 'desc' && findUrl(msg));
  if (draft && draft.awaiting && !cmd && text && !newThing) return answerQuestion(chatId, draft, text);

  // A PDF
  const doc = msg.document;
  if (doc && (doc.mime_type === 'application/pdf' || /\.pdf$/i.test(doc.file_name || ''))) return startFromPdf(msg, doc);

  // A link
  const url = findUrl(msg);
  if (url) return startFromLink(msg, url);

  send(chatId, 'Send me a link or a PDF to add it to the archive. /help for more.');
}

function findUrl(msg) {
  const ents = (msg.entities || []).concat(msg.caption_entities || []);
  const src = msg.text || msg.caption || '';
  for (const e of ents) {
    if (e.type === 'text_link' && e.url) return e.url;
    if (e.type === 'url') return src.substr(e.offset, e.length);
  }
  const m = src.match(/https?:\/\/[^\s<>"]+/) || src.match(/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/[^\s<>"]*/i);
  return m ? m[0].replace(/[.,;:!?)\]]+$/, '') : null;
}

function startFromLink(msg, rawUrl) {
  const chatId = msg.chat.id;
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl;
  const dup = findByLink(url);
  const meta = readPage(url);
  const draft = {
    link: url, title: meta.title || '', authors: meta.authors || '', date: meta.date || '', desc: meta.desc || '',
    type: '', t1: '', t2: '', extra: '', sharedBy: '', okCredit: '', msgRef: `${chatId}:${msg.message_id}`,
    awaiting: '', step: 'type', themes: themeNames(), dupOf: dup ? dup.id : '',
  };
  saveDraft(chatId, draft);
  if (!draft.title) { draft.awaiting = 'title'; saveDraft(chatId, draft); }
  showCard(chatId, draft, true);
  if (!draft.title) send(chatId, 'I couldn’t read a title from that page. What should it be called? (Type it, or /cancel.)');
}

function startFromPdf(msg, doc) {
  const chatId = msg.chat.id;
  if (doc.file_size && doc.file_size > 20 * 1024 * 1024) return send(chatId, 'That PDF is over 20 MB, which Telegram won’t let bots download. Upload it to the “PGS Archive PDFs” Drive folder yourself, then send me its link.');
  const file = tg('getFile', { file_id: doc.file_id });
  if (!file || !file.file_path) return send(chatId, 'I couldn’t download that PDF. Try again, or send a link instead.');
  const blob = UrlFetchApp.fetch(`https://api.telegram.org/file/bot${props.getProperty('BOT_TOKEN')}/${file.file_path}`).getBlob()
    .setName(doc.file_name || 'resource.pdf');
  const saved = DriveApp.getFolderById(props.getProperty('PDF_FOLDER_ID')).createFile(blob);
  const title = (msg.caption || '').trim() || (doc.file_name || '').replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
  const draft = {
    link: saved.getUrl(), title, authors: '', date: '', desc: '', type: 'research', t1: '', t2: '', extra: '',
    sharedBy: '', okCredit: '', msgRef: `${chatId}:${msg.message_id}`, awaiting: '', step: 'type', themes: themeNames(), pdf: true, dupOf: '',
  };
  saveDraft(chatId, draft);
  showCard(chatId, draft, true);
}

/** Reads title, authors, date and description from the page. No AI: just the page's own tags. */
function readPage(url) {
  const out = {};
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PGSArchiveBot/1.0)' } });
    if (res.getResponseCode() >= 400) return out;
    const type = String(res.getHeaders()['Content-Type'] || res.getHeaders()['content-type'] || '');
    if (!/html/i.test(type)) return out;
    const html = res.getContentText().slice(0, 400000);
    const metas = {};
    (html.match(/<meta\b[^>]*>/gi) || []).forEach(tag => {
      const key = ((tag.match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i) || [])[1] || '').toLowerCase();
      const val = (tag.match(/\bcontent\s*=\s*"([^"]*)"/i) || tag.match(/\bcontent\s*=\s*'([^']*)'/i) || [])[1];
      if (key && val) (metas[key] = metas[key] || []).push(decode(val));
    });
    const first = k => (metas[k] || [])[0];
    const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
    out.title = clean(first('citation_title') || first('og:title') || first('twitter:title') || (titleTag && decode(titleTag)) || '');
    const authors = metas['citation_author'] || metas['dc.creator'] || metas['author'] || [];
    out.authors = clean(authors.slice(0, 6).join('; ') + (authors.length > 6 ? ' et al.' : ''));
    const d = first('citation_publication_date') || first('citation_date') || first('citation_online_date') || first('article:published_time') || first('dc.date') || '';
    const ym = d.match(/(\d{4})[\/-](\d{1,2})/) || d.match(/(\d{4})/);
    out.date = ym ? (ym[2] ? `${ym[1]}-${('0' + ym[2]).slice(-2)}` : ym[1]) : '';
    out.desc = clean(first('og:description') || first('description') || first('twitter:description') || '').slice(0, 400);
  } catch (err) { console.warn('readPage', url, err); }
  return out;
}

function decode(s) {
  return String(s).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, '’').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}
function clean(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

// ---------- The card ----------

function cardText(d) {
  const lines = [];
  if (d.editing) lines.push(`✏️ <b>Editing ${d.editing}</b>`);
  if (d.dupOf && !d.editing) lines.push(`⚠️ This link is already in the archive as <b>${d.dupOf}</b>. You can still add it, or /cancel.`);
  lines.push(`<b>${escapeHtml(d.title || '(no title yet)')}</b>`);
  if (d.authors) lines.push(escapeHtml(d.authors));
  const bits = [d.type, d.date, d.pdf ? 'PDF on Drive' : ''].filter(Boolean);
  if (bits.length) lines.push(escapeHtml(bits.join(' · ')));
  const themes = [d.t1, d.t2].filter(Boolean);
  if (themes.length) lines.push('Themes: ' + escapeHtml(themes.join(' + ')));
  if (d.extra) lines.push('Tags: ' + escapeHtml(d.extra));
  if (d.desc) lines.push('\n' + escapeHtml(d.desc.length > 300 ? d.desc.slice(0, 297) + '…' : d.desc));
  if (d.sharedBy) lines.push(`\nShared by ${escapeHtml(d.sharedBy)}${d.okCredit === 'yes' ? ' (credited on the site)' : d.okCredit === 'no' ? ' (not credited)' : ''}`);
  lines.push('');
  lines.push({ type: 'What kind of resource is it?', t1: 'Pick its main theme.', t2: 'A second theme? (optional)', review: 'Anything to add? Then tap <b>Done</b>.', credit: `OK to credit ${escapeHtml(d.sharedBy)} on the site?` }[d.step] || '');
  return lines.join('\n');
}

function cardButtons(d) {
  const rows = (items, per) => { const out = []; for (let i = 0; i < items.length; i += per) out.push(items.slice(i, i + per)); return out; };
  const b = (text, data) => ({ text, callback_data: data });
  if (d.step === 'type') return rows(TYPES.map((t, i) => b(t[0], 'ty:' + i)), 2).concat([[b('✖️ Cancel', 'x')]]);
  if (d.step === 't1' || d.step === 't2') {
    const list = d.themes.map((t, i) => (d.step === 't2' && t === d.t1) ? null : b(t, d.step + ':' + i)).filter(Boolean);
    const extra = [b('➕ New theme', d.step + ':new')];
    if (d.step === 't2') extra.push(b('Skip', 't2:skip'));
    return rows(list, 2).concat([extra, [b('← Back', 'back')]]);
  }
  if (d.step === 'credit') return [[b('Yes, credit them', 'cr:yes'), b('No', 'cr:no')]];
  return [
    [b('✏️ Title', 'ed:title'), b('📝 Description', 'ed:desc')],
    [b('🙋 Shared by', 'ed:shared'), b('🏷 Extra tags', 'ed:tags')],
    [b('📅 Date / authors', 'ed:date'), b('← Themes', 'back')],
    [b('✅ Done', 'done'), b('✖️ Cancel', 'x')],
  ];
}

/** Sends a new card, or updates the existing one in place. */
function showCard(chatId, d, fresh) {
  const payload = { chat_id: chatId, text: cardText(d), parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: { inline_keyboard: cardButtons(d) } };
  if (!fresh && d.cardId) {
    payload.message_id = d.cardId;
    const r = tg('editMessageText', payload);
    if (r) return;
  }
  const sent = tg('sendMessage', payload);
  if (sent) { d.cardId = sent.message_id; saveDraft(chatId, d); }
}

function handleTap(tap) {
  const chatId = tap.message.chat.id;
  const data = tap.data || '';
  tg('answerCallbackQuery', { callback_query_id: tap.id });

  if (data.startsWith('hide:') || data.startsWith('show:')) return setStatus(chatId, data.slice(5), data.startsWith('hide:') ? 'hidden' : 'live');
  if (data.startsWith('edit:')) return startEdit(chatId, data.slice(5));

  const d = getDraft(chatId);
  if (!d || (d.cardId && d.cardId !== tap.message.message_id)) {
    return tg('editMessageReplyMarkup', { chat_id: chatId, message_id: tap.message.message_id, reply_markup: { inline_keyboard: [] } });
  }
  if (data === 'x') { clearDraft(chatId); return tg('editMessageText', { chat_id: chatId, message_id: d.cardId, text: 'Cancelled. Nothing was saved.' }); }
  if (data === 'back') { d.step = d.step === 'review' ? 't1' : d.step === 't2' ? 't1' : 'type'; d.awaiting = ''; saveDraft(chatId, d); return showCard(chatId, d); }

  if (data.startsWith('ty:')) { d.type = TYPES[+data.slice(3)][0]; d.step = d.t1 ? 'review' : 't1'; }
  else if (data.startsWith('t1:') || data.startsWith('t2:')) {
    const which = data.slice(0, 2), val = data.slice(3);
    if (val === 'new') { d.awaiting = 'new' + which; saveDraft(chatId, d); return send(chatId, 'Type the new theme’s name (it’ll be added to the Themes list).'); }
    if (val === 'skip') d.t2 = '';
    else d[which] = d.themes[+val];
    d.step = which === 't1' ? 't2' : 'review';
  }
  else if (data.startsWith('ed:')) {
    const what = data.slice(3);
    d.awaiting = what;
    saveDraft(chatId, d);
    return send(chatId, {
      title: 'Type the title.',
      desc: 'Type a short description (2–3 lines, plain language), or “-” to clear it.',
      shared: 'Who shared it? (Name as it should appear.)',
      tags: 'Type extra tags, separated by commas, or “-” to clear.',
      date: 'Type the year (or year-month like 2023-07), then optionally “;” and the authors. E.g. <code>2021; Jason Hickel</code>. Use “-” to clear.',
    }[what]);
  }
  else if (data.startsWith('cr:')) { d.okCredit = data.slice(3); d.step = 'review'; }
  else if (data === 'done') return finish(chatId, d);
  saveDraft(chatId, d);
  showCard(chatId, d);
}

function answerQuestion(chatId, d, text) {
  const v = text === '-' ? '' : text;
  const what = d.awaiting;
  d.awaiting = '';
  if (what === 'title') d.title = v || d.title;
  else if (what === 'desc') d.desc = v;
  else if (what === 'tags') d.extra = v.split(',').map(s => s.trim()).filter(Boolean).join(', ');
  else if (what === 'date') {
    const [date, authors] = v.split(';').map(s => (s || '').trim());
    d.date = v ? date : ''; if (authors !== undefined) d.authors = authors;
  }
  else if (what === 'shared') { d.sharedBy = v; if (v) { d.step = 'credit'; } else d.okCredit = ''; }
  else if (what === 'newt1' || what === 'newt2') {
    const name = clean(v);
    if (name) {
      const existing = d.themes.find(t => t.toLowerCase() === name.toLowerCase());
      const theme = existing || addTheme(name);
      if (!existing) d.themes.push(theme);
      d[what.slice(3)] = theme;
      d.step = what === 'newt1' ? 't2' : 'review';
    }
  }
  saveDraft(chatId, d);
  showCard(chatId, d, true);   // a fresh card below the typed answer, so it stays in view
}

// ---------- Saving ----------

function finish(chatId, d) {
  if (!d.title) { d.awaiting = 'title'; saveDraft(chatId, d); return send(chatId, 'It needs a title first. Type one.'); }
  if (!d.type || !d.t1) { d.step = !d.type ? 'type' : 't1'; saveDraft(chatId, d); return showCard(chatId, d); }
  const sheet = tab('entries');
  const credit = d.okCredit === 'yes' ? d.sharedBy : '';
  if (d.editing) {
    const row = rowOf(d.editing);
    if (!row) return send(chatId, `Couldn’t find ${d.editing} in the Sheet any more.`);
    const keep = sheet.getRange(row, 1, 1, TABS.entries.headers.length).getValues()[0];
    const vals = [d.editing, keep[E.Status - 1], d.title, d.link, d.type, d.t1, d.t2, d.extra, d.date, d.authors, d.desc, credit,
      keep[E['Date added'] - 1], d.link === keep[E.Link - 1] ? keep[E['Archive link'] - 1] : ''];
    sheet.getRange(row, 1, 1, vals.length).setValues([vals]);
    if (d.sharedBy) tab('private').appendRow([d.editing, d.sharedBy, d.okCredit, adminName(chatId), d.msgRef, 'edited']);
  } else {
    const id = nextId();
    sheet.appendRow([id, 'live', d.title, d.link, d.type, d.t1, d.t2, d.extra, d.date, d.authors, d.desc, credit, today(), d.pdf ? '(PDF on Drive)' : '']);
    tab('private').appendRow([id, d.sharedBy, d.okCredit, adminName(chatId), d.msgRef, '']);
    d.savedId = id;
  }
  clearDraft(chatId);
  tg('editMessageText', { chat_id: chatId, message_id: d.cardId, parse_mode: 'HTML', link_preview_options: { is_disabled: true },
    text: `✅ ${d.editing ? 'Updated' : 'Added to the archive'}: <b>${escapeHtml(d.title)}</b> (${d.editing || d.savedId})\n${escapeHtml([d.type, d.t1, d.t2].filter(Boolean).join(' · '))}` });
}

/** Adds the old Resources page links (only if the archive is empty). */
function importStarter() {
  const sheet = tab('entries');
  if (sheet.getLastRow() > 1) { console.log('Entries already has rows, so the starter links were not added.'); return; }
  const rows = STARTER_ITEMS.map(([title, link, type, t1, t2, date, desc]) =>
    [nextId(), 'live', title, link, type, t1, t2, '', date, '', desc, '', today(), '']);
  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  console.log(`Added ${rows.length} links from the old Resources page.`);
}

function nextId() {
  const n = Number(props.getProperty('NEXT_ID') || '1');
  props.setProperty('NEXT_ID', String(n + 1));
  return 'PGS-' + ('000' + n).slice(-4);
}

function addTheme(name) {
  const t = name.charAt(0).toUpperCase() + name.slice(1);
  tab('themes').appendRow([t, '', today()]);
  return t;
}

function themeNames() {
  const sh = tab('themes');
  const n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, 1).getValues().map(r => clean(r[0])).filter(Boolean) : [];
}

// ---------- Fixing things ----------

function sendRecent(chatId) {
  const sh = tab('entries');
  const n = sh.getLastRow() - 1;
  if (n < 1) return send(chatId, 'Nothing in the archive yet. Send me a link to add the first one.');
  const rows = sh.getRange(Math.max(2, sh.getLastRow() - 9), 1, Math.min(10, n), TABS.entries.headers.length).getValues().reverse();
  const text = '<b>Latest 10</b>\n' + rows.map(r => `${r[0]}${r[1] === 'hidden' ? ' (hidden)' : ''} · ${escapeHtml(String(r[2]).slice(0, 60))}`).join('\n');
  const kb = rows.map(r => [{ text: `✏️ ${r[0]}`, callback_data: 'edit:' + r[0] }, r[1] === 'hidden' ? { text: `↩️ Show ${r[0]}`, callback_data: 'show:' + r[0] } : { text: `🙈 Hide ${r[0]}`, callback_data: 'hide:' + r[0] }]);
  tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', reply_markup: { inline_keyboard: kb } });
}

function setStatus(chatId, rawId, status) {
  const id = normaliseId(rawId);
  if (!id) return send(chatId, `Which one? e.g. /${status === 'hidden' ? 'hide' : 'show'} PGS-0004`);
  const row = rowOf(id);
  if (!row) return send(chatId, `I can’t find ${escapeHtml(id)}.`);
  tab('entries').getRange(row, E.Status).setValue(status);
  send(chatId, status === 'hidden' ? `🙈 ${id} is hidden. It’ll leave the site within a few minutes. /show ${id} to bring it back.` : `↩️ ${id} is live again.`);
}

function startEdit(chatId, id) {
  const row = rowOf(id);
  if (!row) return send(chatId, `I can’t find ${escapeHtml(id)}.`);
  const r = tab('entries').getRange(row, 1, 1, TABS.entries.headers.length).getValues()[0];
  const date = r[E.Date - 1] instanceof Date ? Utilities.formatDate(r[E.Date - 1], TZ, 'yyyy') : String(r[E.Date - 1] || '');
  const d = { editing: id, title: r[E.Title - 1], link: r[E.Link - 1], type: r[E.Type - 1], t1: r[E['Theme 1'] - 1], t2: r[E['Theme 2'] - 1],
    extra: r[E['Extra tags'] - 1], date, authors: r[E.Authors - 1], desc: r[E.Description - 1], sharedBy: r[E['Shared by'] - 1],
    okCredit: r[E['Shared by'] - 1] ? 'yes' : '', step: 'review', awaiting: '', themes: themeNames(), msgRef: '', dupOf: '' };
  saveDraft(chatId, d);
  showCard(chatId, d, true);
}

function normaliseId(raw) {
  const m = String(raw || '').match(/(\d+)/);
  return m ? 'PGS-' + ('000' + Number(m[1])).slice(-4) : '';
}

function rowOf(id) {
  const sh = tab('entries');
  const n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  const ids = sh.getRange(2, 1, n, 1).getValues();
  const i = ids.findIndex(r => r[0] === id);
  return i < 0 ? 0 : i + 2;
}

/** Same link already in the archive? Ignores http/https, www, trailing slashes and tracking bits. */
function findByLink(url) {
  const key = linkKey(url);
  const sh = tab('entries');
  const n = sh.getLastRow() - 1;
  if (n < 1) return null;
  const rows = sh.getRange(2, 1, n, E.Link).getValues();
  const hit = rows.find(r => linkKey(r[E.Link - 1]) === key);
  return hit ? { id: hit[0] } : null;
}
function linkKey(u) {
  return String(u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?&](utm_[^=&]+|si|fbclid|mibextid|igshid)=[^&]*/g, '').replace(/[?&]$/, '').replace(/\/+$/, '');
}

// ---------- Wayback snapshots (hourly) ----------

/** Asks the Internet Archive to save each new link, a few per run, and stores the snapshot address. */
function archiveLinks() {
  const sh = tab('entries');
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const rows = sh.getRange(2, 1, n, TABS.entries.headers.length).getValues();
  let done = 0;
  for (let i = 0; i < rows.length && done < 5; i++) {
    const link = rows[i][E.Link - 1], arch = rows[i][E['Archive link'] - 1];
    if (!link || arch) continue;
    done++;
    try {
      const res = UrlFetchApp.fetch('https://web.archive.org/save/' + link, { muteHttpExceptions: true, followRedirects: false });
      const loc = res.getHeaders()['Location'] || res.getHeaders()['location'] || res.getHeaders()['Content-Location'] || '';
      const snap = loc ? (loc.startsWith('http') ? loc : 'https://web.archive.org' + loc) : 'https://web.archive.org/web/' + link;
      sh.getRange(i + 2, E['Archive link']).setValue(snap);
    } catch (err) {
      console.warn('archive', link, err);
    }
  }
}

// ---------- Drafts (one per admin, in Script Properties) ----------

function getDraft(chatId) { const s = props.getProperty('DRAFT_' + chatId); return s ? JSON.parse(s) : null; }
function saveDraft(chatId, d) { props.setProperty('DRAFT_' + chatId, JSON.stringify(d)); }
function clearDraft(chatId) { props.deleteProperty('DRAFT_' + chatId); }

// ---------- Invite ----------

function sendInvite(chatId) {
  const code = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  props.setProperty('INVITE_CODE', code);
  const me = tg('getMe', {});
  send(chatId, `Send this link to the new admin. It works once:\nhttps://t.me/${me.username}?start=${code}\n\nMaking a new link cancels this one.`);
}

// ---------- Helpers ----------

function tab(key) {
  const ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
  return ss.getSheetByName(TABS[key].name);
}
function today() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

function send(chatId, text) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
}

function tg(method, payload) {
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${props.getProperty('BOT_TOKEN')}/${method}`, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true,
  });
  const body = JSON.parse(res.getContentText());
  if (!body.ok) console.error(method, body.description);
  return body.result;
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
