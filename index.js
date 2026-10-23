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

app.listen(PORT, () => console.log(`Serveri po punon në portin ${PORT}`));
