// Blue Clima - WhatsApp Bot (WhatsApp Cloud API)
const express = require("express");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "blueclima2022";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;       // token i perhershem (System User)
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;     // ID e numrit nga paneli i Meta-s
const GRAPH_VERSION = process.env.GRAPH_VERSION || "v23.0";
const PORT = process.env.PORT || 3000;

// ---- Tekstet e botit ----
// Teksti i çdo hapi mund të ndryshohet nga Render → Environment pa prekur kodin
// (emri i variablit shënohet te çdo hap, p.sh. TEKST_1A). Për rresht të ri shkruaj \n.
function tekst(emri, parazgjedhur) {
  const v = (process.env[emri] || "").replace(/\\n/g, "\n").trim();
  return v || parazgjedhur;
}

const MBYLLJA = "\n\nPër t'u kthyer te menuja shkruani *0*.";

// ---- Pema e menusë ----
// Çdo nyje: titull (i shkurtër, për butonin/listën), tekst, dhe ose "opsione" (nën-menu)
// ose "veprim": "detaje" (presim të dhëna/foto -> stafi) ose "telefono" (stafi njoftohet menjëherë).
const MENU = {
  id: "MENU",
  tekst: () => tekst("TEKST_MENU",
    "Përshëndetje! Mirë se vini te *Blue Clima* ❄️🔥\nZgjidhni një nga opsionet më poshtë:"),
  opsione: [
    {
      id: "1", titull: "Dhoma frigoriferike", emer: "Dhoma frigoriferike",
      tekst: () => tekst("TEKST_1", "*Dhoma frigoriferike* ❄️\nZgjidhni:"),
      opsione: [
        { id: "1A", titull: "Preventiv", emer: "Preventiv për dhomë frigoriferike", veprim: "detaje",
          tekst: () => tekst("TEKST_1A", "Jepni përmasat e dhomës, temperaturën e punimit dhe voltazhin e kërkuar.") },
        { id: "1B", titull: "Zëvendësim produkti", emer: "Zëvendësim produkti", veprim: "detaje",
          tekst: () => tekst("TEKST_1B", "📸 Dërgoni foto të produktit dhe do t'ju kthejmë përgjigje së shpejti!") }
      ]
    },
    {
      id: "2", titull: "Frigoriferë", emer: "Frigoriferë",
      tekst: () => tekst("TEKST_2", "*Frigoriferë* 🧊\nZgjidhni:"),
      opsione: [
        { id: "2A", titull: "Zëvendësim produkti", emer: "Zëvendësim produkti", veprim: "detaje",
          tekst: () => tekst("TEKST_2A", "📸 Dërgoni foto të produktit dhe do t'ju kthejmë përgjigje së shpejti!") },
        { id: "2B", titull: "Asistencë teknike", emer: "Kërkesë për asistencë teknike", veprim: "telefono",
          tekst: () => tekst("TEKST_2B", "📞 Blue Clima do t'ju telefonojë së shpejti!") }
      ]
    },
    {
      id: "3", titull: "Kondicionerë", emer: "Kondicionerë",
      tekst: () => tekst("TEKST_3", "*Kondicionerë* 🌬️\nZgjidhni:"),
      opsione: [
        { id: "3A", titull: "Preventiv montimi", emer: "Preventiv për montim", veprim: "detaje",
          tekst: () => tekst("TEKST_3A", "Dërgoni të dhënat tuaja.") },
        { id: "3B", titull: "Asistencë", emer: "Asistencë", veprim: "telefono",
          tekst: () => tekst("TEKST_3B", "📞 Blue Clima do t'ju kontaktojë së shpejti!") }
      ]
    },
    {
      id: "4", titull: "Të tjera", emer: "Të tjera",
      tekst: () => tekst("TEKST_4", "*Të tjera*\nZgjidhni:"),
      opsione: [
        { id: "4A", titull: "Automjete", emer: "Automjete", veprim: "detaje",
          tekst: () => tekst("TEKST_4A", "📸 Dërgoni foto të produktit dhe do t'ju kthejmë përgjigje së shpejti!") },
        { id: "4B", titull: "Elektroshtëpiake", emer: "Elektroshtëpiake", veprim: "detaje",
          tekst: () => tekst("TEKST_4B", "📸 Dërgoni foto të produktit dhe do t'ju kthejmë përgjigje së shpejti!") }
      ]
    }
  ]
};

const NYJET = {};   // id -> nyja
const PRINDI = {};  // id -> nyja prind
(function indekso(n) {
  NYJET[n.id] = n;
  (n.opsione || []).forEach((o) => { PRINDI[o.id] = n; indekso(o); });
})(MENU);

// "Dhoma frigoriferike › Preventiv për dhomë frigoriferike"
function rruga(id) {
  const pjeset = [];
  for (let n = NYJET[id]; n && n.id !== "MENU"; n = PRINDI[n.id]) pjeset.unshift(n.emer);
  return pjeset.join(" › ") || "Mesazh nga klienti";
}

// Tekst i thjeshtë i një menuje (përdoret edhe si rezervë nëse butonat s'dërgohen)
function menuSiTekst(n) {
  const shkronja = (o) => n.id === "MENU" ? o.id : o.id.slice(-1).toLowerCase();
  const rreshta = n.opsione.map((o) => `*${shkronja(o)}.* ${o.emer}`).join("\n");
  return `${n.tekst()}\n\n${rreshta}` + (n.id === "MENU" ? "" : MBYLLJA);
}

// Dërgon një menu: listë për menunë kryesore, butona për nën-menutë
async function dergoMenu(to, n) {
  let trupi = n.tekst();
  if (n.id === "MENU") {
    const oferta = tekst("OFERTA", "");
    if (oferta) trupi = `🔥 *Oferta e momentit:*\n${oferta}\n\n${trupi}`;
    trupi += "\n\n" + n.opsione.map((o) => `${o.id}. ${o.emer}`).join("\n");
  }
  let interactive;
  if (n.id === "MENU") {
    interactive = {
      type: "list",
      body: { text: trupi.slice(0, 1024) },
      footer: { text: "Pallati me Shigjeta · +355 69 544 2220" },
      action: {
        button: "Shiko opsionet",
        sections: [{ title: "Blue Clima", rows: n.opsione.map((o) => ({ id: o.id, title: o.titull.slice(0, 24) })) }]
      }
    };
  } else {
    const butonat = n.opsione.map((o) => ({ type: "reply", reply: { id: o.id, title: o.titull.slice(0, 20) } }));
    butonat.push({ type: "reply", reply: { id: "MENU", title: "⬅️ Menuja" } });
    interactive = { type: "button", body: { text: trupi.slice(0, 1024) }, action: { buttons: butonat.slice(0, 3) } };
  }
  const ok = await sendPayload({ messaging_product: "whatsapp", to, type: "interactive", interactive });
  if (!ok) await sendText(to, menuSiTekst(n)); // rezervë: tekst i thjeshtë
}

// Gjen nyjen që klienti zgjodhi (klikim butoni/liste ose shkrim "1", "1a", "1.a", "a")
function gjejZgjedhjen(msg, gjendja) {
  if (msg.type === "interactive") {
    return msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || null;
  }
  if (msg.type !== "text") return null;
  const t = (msg.text?.body || "").trim().toUpperCase().replace(/[\s.\-)]/g, "");
  if (t === "0" || t === "MENU" || t === "MENUJA") return "MENU";
  if (NYJET[t] && t !== "MENU") return t;                     // "1", "1A"
  const t2 = t.replace(/1$/, "");                               // "1A1" -> "1A"
  if (/^\d[A-Z]$/.test(t2) && NYJET[t2]) return t2;
  const menuAktive = gjendja?.menu && NYJET[gjendja.menu];
  if (menuAktive && menuAktive.id !== "MENU" && /^[A-Z]$/.test(t)) {   // "a" brenda nën-menusë
    const id = menuAktive.id + t;
    if (NYJET[id]) return id;
  }
  return null;
}

// ---- Verifikimi i webhook-ut (GET) ----
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook u verifikua.");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// ---- Përcjellja e mesazheve te stafi ----
// Numri ku vijnë njoftimet (pa +). Ndryshohet nga Render me variablin STAFF_NUMBER.
const STAFF_NUMBER = (process.env.STAFF_NUMBER || "355695442220").replace(/\D/g, "");
// Shablloni i aprovuar te Meta (përdoret kur s'ke shkruar botit në 24 orët e fundit)
const STAFF_TEMPLATE = process.env.STAFF_TEMPLATE || "njoftim_klient";
const STAFF_TEMPLATE_LANG = process.env.STAFF_TEMPLATE_LANG || "sq";

const NE_PRITJE_MS = 2 * 60 * 60 * 1000; // 2 orë
let stafiShkroiMe = 0; // koha kur stafi i shkroi botit për herë të fundit

function pershkrimMesazhi(msg) {
  switch (msg.type) {
    case "text": return (msg.text?.body || "").trim();
    case "image": return "[Foto]" + (msg.image?.caption ? " " + msg.image.caption : "");
    case "video": return "[Video]" + (msg.video?.caption ? " " + msg.video.caption : "");
    case "audio": return "[Mesazh zanor]";
    case "document": return "[Dokument] " + (msg.document?.filename || "");
    case "location": {
      const l = msg.location || {};
      return `[Vendndodhje] ${l.name || ""} ${l.address || ""} https://maps.google.com/?q=${l.latitude},${l.longitude}`.trim();
    }
    case "contacts": return "[Kontakt]";
    case "sticker": return "[Sticker]";
    default: return `[${msg.type}]`;
  }
}

// ---- Përcjellja e fotove/videove/dokumenteve te stafi ----
// WhatsApp lejon dërgimin e medias te stafi vetëm brenda dritares 24-orëshe.
// Kur dritarja është e mbyllur, media ruhet në radhë dhe dërgohet sapo stafi i shkruan botit.
const LLOJET_MEDIA = ["image", "video", "audio", "document", "sticker"];
const rradhaMedia = []; // [{ msg, titull }]
const dritarjaHapur = () => Date.now() - stafiShkroiMe < 23 * 60 * 60 * 1000;

async function percillMedia(msg, titull) {
  try {
    const m = msg[msg.type];
    const auth = { Authorization: `Bearer ${WHATSAPP_TOKEN}` };
    // 1) merr adresën e skedarit
    const info = await (await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${m.id}`, { headers: auth })).json();
    if (!info.url) throw new Error("s'u gjet url e medias: " + JSON.stringify(info));
    // 2) shkarko skedarin
    const blob = await (await fetch(info.url, { headers: auth })).blob();
    // 3) ngarkoje përsëri te numri i botit
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", info.mime_type || m.mime_type);
    form.append("file", blob, m.filename || `skedar.${(info.mime_type || "bin").split("/")[1]}`);
    const up = await (await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/media`, {
      method: "POST", headers: auth, body: form
    })).json();
    if (!up.id) throw new Error("ngarkimi dështoi: " + JSON.stringify(up));
    // 4) dërgoja stafit
    const media = { id: up.id };
    if (["image", "video", "document"].includes(msg.type)) media.caption = titull.slice(0, 1000);
    if (msg.type === "document") media.filename = m.filename || "dokument";
    await sendPayload({ messaging_product: "whatsapp", to: STAFF_NUMBER, type: msg.type, [msg.type]: media });
  } catch (e) {
    console.error("Përcjellja e medias dështoi:", e.message || e);
  }
}

async function zbrazRradhen() {
  if (!rradhaMedia.length) return;
  await sendText(STAFF_NUMBER, `📎 ${rradhaMedia.length} foto/skedarë nga klientët, që prisnin:`);
  while (rradhaMedia.length) {
    const { msg, titull } = rradhaMedia.shift();
    await percillMedia(msg, titull);
  }
}

async function njoftoStafin(klienti, emri, arsye, permbajtja, msg) {
  if (!STAFF_NUMBER) return;
  const kaMedia = msg && LLOJET_MEDIA.includes(msg.type);
  const titull = `${arsye} · ${emri || "Klient"} (+${klienti})` + (permbajtja ? ` · ${permbajtja}` : "");
  const tekst =
    `🔔 *${arsye}*\n` +
    `👤 ${emri || "Klient"} (+${klienti})\n` +
    `💬 ${permbajtja}\n\n` +
    `Shkruaji direkt: https://wa.me/${klienti}`;

  // 1) Dritarja 24-orëshe e hapur: tekst i plotë + vetë fotoja
  if (dritarjaHapur()) {
    if (kaMedia) { await percillMedia(msg, titull + `\nhttps://wa.me/${klienti}`); return; }
    if (await sendText(STAFF_NUMBER, tekst)) return;
  }

  // 2) Përndryshe: media në radhë + shablloni i aprovuar
  if (kaMedia) {
    rradhaMedia.push({ msg, titull: titull + `\nhttps://wa.me/${klienti}` });
    if (rradhaMedia.length > 30) rradhaMedia.shift();
    permbajtja += " (shkruaji 'ok' botit për ta parë)";
  }
  const pastro = (s) => String(s).replace(/\s*\n\s*/g, " · ").replace(/\s{4,}/g, "   ").slice(0, 900);
  const okT = await sendPayload({
    messaging_product: "whatsapp",
    to: STAFF_NUMBER,
    type: "template",
    template: {
      name: STAFF_TEMPLATE,
      language: { code: STAFF_TEMPLATE_LANG },
      components: [{
        type: "body",
        parameters: [
          { type: "text", text: pastro(`${emri || "Klient"} (+${klienti})`) },
          { type: "text", text: pastro(`${arsye}: ${permbajtja}`) }
        ]
      }]
    }
  });
  if (!okT) console.error("Njoftimi i stafit dështoi (kontrollo shabllonin " + STAFF_TEMPLATE + ").");
}

// ---- Mesazhet hyrëse (POST) ----
// gjendja e klientit: { menu: id e menusë së fundit, pret: id e hapit ku presim detaje, detaje, deri }
const gjendjet = new Map();

app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // i përgjigjemi Meta-s menjëherë

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg) return; // p.sh. njoftime statusi (delivered/read)

    const from = msg.from;
    const emri = value?.contacts?.[0]?.profile?.name || "";
    const permbajtja = msg.type === "interactive"
      ? (msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "[zgjedhje]")
      : pershkrimMesazhi(msg);
    console.log(`Mesazh nga ${from}: ${permbajtja}`);

    // Mesazhet nga numri i stafit: vetëm konfirmojmë (hap dritaren 24-orëshe për njoftime)
    if (from === STAFF_NUMBER) {
      stafiShkroiMe = Date.now();
      await sendText(from, "✅ Njoftimet janë aktive për 24 orët e ardhshme. Do të të përcjell këtu mesazhet dhe fotot e klientëve.");
      await zbrazRradhen();
      return;
    }

    let g = gjendjet.get(from);
    if (g && g.deri < Date.now()) { gjendjet.delete(from); g = null; }

    // Nëse klienti po jep detaje, numrat/shkronjat i trajtojmë si detaje (p.sh. "3" ambiente),
    // përveç "0" ose klikimit të një butoni.
    const poJepDetaje = g?.pret && g.detaje;
    let zgjedhja = gjejZgjedhjen(msg, g);
    if (poJepDetaje && msg.type !== "interactive" && zgjedhja !== "MENU") zgjedhja = null;

    if (zgjedhja) {
      const n = NYJET[zgjedhja];
      if (n.opsione) {
        // Hap një menu ose nën-menu
        gjendjet.set(from, { menu: n.id, deri: Date.now() + NE_PRITJE_MS });
        await dergoMenu(from, n);
        return;
      }
      // Hap përfundimtar
      await sendText(from, n.tekst() + MBYLLJA);
      if (n.veprim === "telefono") {
        await njoftoStafin(from, emri, rruga(n.id), "📞 Kërkon të kontaktohet");
      }
      gjendjet.set(from, { menu: PRINDI[n.id].id, pret: n.id, detaje: false, deri: Date.now() + NE_PRITJE_MS });
      return;
    }

    // Klienti po dërgon detaje/foto për një hap -> i përcillen stafit
    if (g?.pret) {
      g.detaje = true;
      g.deri = Date.now() + NE_PRITJE_MS;
      await njoftoStafin(from, emri, rruga(g.pret), permbajtja, msg);
      // Konfirmimi dërgohet vetëm për mesazhin e parë, që klienti të mos marrë 5 "faleminderit" për 5 foto
      if (!g.konfirmuar) {
        g.konfirmuar = true;
        await sendText(from, tekst("FALEMINDERIT",
          "Faleminderit, e morëm ✅ Një punonjës do t'ju kontaktojë së shpejti. Mund të shtoni edhe foto ose detaje të tjera.") + MBYLLJA);
      }
      return;
    }

    // Foto, zanore, vendndodhje etj. pa zgjedhur opsion -> i përcillen stafit
    if (msg.type !== "text" && msg.type !== "interactive") {
      await njoftoStafin(from, emri, "Mesazh nga klienti", permbajtja, msg);
      await sendText(from, "Faleminderit, e morëm ✅ Do t'ju kontaktojmë së shpejti.");
      gjendjet.set(from, { menu: "MENU", pret: "MENU", detaje: true, konfirmuar: true, deri: Date.now() + NE_PRITJE_MS });
      return;
    }

    // Çdo gjë tjetër (përshëndetje etj.) -> menuja kryesore
    gjendjet.set(from, { menu: "MENU", deri: Date.now() + NE_PRITJE_MS });
    await dergoMenu(from, MENU);
  } catch (err) {
    console.error("Gabim:", err);
  }
});

async function sendPayload(payload, { silent = false } = {}) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!r.ok && !silent) console.error("Dërgimi dështoi:", await r.text());
  return r.ok;
}

async function sendText(to, body, opts) {
  return sendPayload({ messaging_product: "whatsapp", to, type: "text", text: { body } }, opts);
}

app.get("/", (req, res) => res.send("Blue Clima Bot po punon ✅"));

// ---- Politika e privatësisë (për Meta) ----
app.get("/privacy", (req, res) => {
  res.type("html").send(`<!doctype html><html lang="sq"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy – Blue Clima Inc</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;line-height:1.6;color:#222}h1{color:#0a5bb5}h2{margin-top:28px}hr{margin:40px 0}</style>
</head><body>
<h1>Politika e Privatësisë – Blue Clima Inc</h1>
<p><em>Përditësuar më: 23 tetor 2026</em></p>
<p>Blue Clima Inc përdor WhatsApp Business për t'u përgjigjur pyetjeve të klientëve rreth kondicionerëve, ofertave, servisit dhe montimit.</p>
<h2>Çfarë të dhënash mbledhim</h2>
<p>Kur na shkruani në WhatsApp, marrim numrin tuaj të telefonit, emrin e profilit në WhatsApp dhe përmbajtjen e mesazheve që na dërgoni (p.sh. emër, adresë, model kondicioneri, përshkrim i problemit).</p>
<h2>Si i përdorim</h2>
<p>Vetëm për t'ju përgjigjur, për t'ju dërguar oferta që keni kërkuar dhe për të organizuar servisin ose montimin. Nuk i shesim dhe nuk ua japim të dhënat palëve të treta për marketing.</p>
<h2>Ku ruhen</h2>
<p>Mesazhet përpunohen përmes WhatsApp Business Platform (Meta) dhe serverit tonë. Ruhen vetëm për aq kohë sa duhet për t'ju shërbyer.</p>
<h2>Të drejtat tuaja</h2>
<p>Mund të kërkoni në çdo kohë të shihni, korrigjoni ose fshini të dhënat tuaja, ose të ndaloni komunikimin, duke na shkruar "STOP" në WhatsApp ose në email.</p>
<h2>Kontakt</h2>
<p>Blue Clima Inc · Pallati me Shigjeta<br>Email: blueclimainc@gmail.com · Tel: +355 69 544 2220<br>Web: www.blueclimainc.com</p>
<hr>
<h1>Privacy Policy – Blue Clima Inc</h1>
<p><em>Last updated: October 23, 2026</em></p>
<p>Blue Clima Inc uses WhatsApp Business to answer customer questions about air conditioners, offers, service and installation.</p>
<h2>Data we collect</h2>
<p>When you message us on WhatsApp we receive your phone number, WhatsApp profile name and the content of the messages you send (e.g. name, address, air conditioner model, description of the issue).</p>
<h2>How we use it</h2>
<p>Only to reply to you, send offers you requested and arrange service or installation. We do not sell your data or share it with third parties for marketing.</p>
<h2>Storage</h2>
<p>Messages are processed through the WhatsApp Business Platform (Meta) and our server, and kept only as long as needed to serve you.</p>
<h2>Your rights</h2>
<p>You may request access to, correction or deletion of your data, or stop communication at any time by sending "STOP" on WhatsApp or by email.</p>
<h2>Contact</h2>
<p>Blue Clima Inc · Pallati me Shigjeta, Albania<br>Email: blueclimainc@gmail.com · Phone: +355 69 544 2220<br>Web: www.blueclimainc.com</p>
</body></html>`);
});

app.listen(PORT, () => console.log(`Serveri po punon në portin ${PORT}`));
