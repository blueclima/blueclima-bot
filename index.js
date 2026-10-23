// Blue Clima - WhatsApp Bot (WhatsApp Cloud API)
const express = require("express");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "blueclima2022";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;       // token i perhershem (System User)
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;     // ID e numrit nga paneli i Meta-s
const GRAPH_VERSION = process.env.GRAPH_VERSION || "v23.0";
const PORT = process.env.PORT || 3000;

// ---- Tekstet e botit (ndryshoji sipas deshires) ----
const MENU =
  "Përshëndetje! Mirë se vini te *Blue Clima* ❄️🔥\n\n" +
  "Shkruani numrin e opsionit:\n" +
  "1️⃣ Ofertat dhe çmimet e kondicionerëve\n" +
  "2️⃣ Kërkoni servis ose montim\n" +
  "3️⃣ Kontakt dhe orari\n" +
  "4️⃣ Flisni me një punonjës";

const REPLIES = {
  // Oferta merret nga variabli OFERTA në Render (lexohet sa herë që vjen mesazh)
  get "1"() {
    const oferta = (process.env.OFERTA || "").replace(/\\n/g, "\n").trim();
    return oferta
      ? `🔥 *Oferta e momentit:*\n${oferta}\n\nPër çmim të saktë, na tregoni sipërfaqen e ambientit (m²).`
      : "Për ofertat aktuale dhe çmimet, na tregoni sipërfaqen e ambientit (m²) dhe ju dërgojmë ofertën më të mirë.";
  },
  "2": "Për servis ose montim, ju lutem na shkruani: emrin, adresën, modelin e kondicionerit dhe problemin. Do t'ju kontaktojmë së shpejti.",
  "3": "📍 Adresa: Pallati me Shigjeta\n📞 Tel: +355 69 544 2220\n🕘 Orari:\nE Hënë – E Premte, 08:00 – 18:00\nE Shtunë, 08:00 – 15:00",
  "4": "Faleminderit! Një punonjës do t'ju shkruajë sa më shpejt brenda orarit të punës."
};

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

// ---- Mesazhet hyrëse (POST) ----
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // i përgjigjemi Meta-s menjëherë

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    if (!msg) return; // p.sh. njoftime statusi (delivered/read)

    const from = msg.from;
    const text = (msg.text?.body || "").trim();
    console.log(`Mesazh nga ${from}: ${text}`);

    const reply = REPLIES[text] || MENU;
    await sendText(from, reply);
  } catch (err) {
    console.error("Gabim:", err);
  }
});

async function sendText(to, body) {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body }
    })
  });
  if (!r.ok) console.error("Dërgimi dështoi:", await r.text());
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
