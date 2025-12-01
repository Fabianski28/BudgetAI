import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express(); // ⚠️ app défini avant tout usage

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // sert index.html et front

// --- MESSAGE DE BIENVENUE ---
const welcomeMessage = `
👋 Bonjour ! Je suis BudgetIA, ton assistant personnel pour gérer ton argent,
comprendre où part ton budget, optimiser tes dépenses et t’aider à atteindre tes objectifs financiers.
Comment puis-je t’aider aujourd’hui ?
`;

// --- MOCK EN CAS D'ERREUR ---
function mockResponse(message, userData) {
  return `Réponse mock à "${message}". Vos données : ${JSON.stringify(userData)}`;
}

// --- ENDPOINT DE BIENVENUE ---
app.get("/welcome", (req, res) => {
  res.json({ welcome: welcomeMessage });
});

// --- ENDPOINT CHAT ---
let busy = false;
app.post("/chat", async (req, res) => {
  const { message, userData } = req.body;
  if (!message) return res.status(400).json({ error: "Message vide" });

  if (busy) return res.status(429).json({ error: "Serveur occupé, réessayez" });
  busy = true;

  try {
    if (process.env.GROQ_API_KEY) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "system",
                content: `
Tu es BudgeAI, un assistant personnel de gestion financière simple et progressif.

OBJECTIF :
Créer un budget pour l’utilisateur sans jamais le submerger. Tu poses UNE question à la fois et tu n’avances jamais à l’étape suivante tant que l’utilisateur n’a pas répondu.

STYLE :
- Clair, humain, bienveillant
- Très court à chaque message
- 1 seule question par message
- Jamais de pavé
- Tu t’adaptes au niveau de l’utilisateur

DÉROULEMENT :
1) Première étape : demande le revenu mensuel (question simple).
2) Quand l’utilisateur répond, remercie et demande les dépenses fixes.
3) Ensuite : dépenses variables.
4) Ensuite : dettes éventuelles.
5) Ensuite : objectifs financiers.
6) Enfin : crée un petit résumé + recommandations simples.

IMPORTANT :
Tu dois TOUJOURS poser une seule question et attendre la réponse, même si tu as assez d’infos pour analyser.
Tu ne fais jamais de long texte.

Données utilisateur : {{USER_DATA}}
                `
              },
              { role: "user", content: message }
            ],
            temperature: 0.5,
            max_tokens: 500
          })
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

        const data = await response.json();
        res.json({ reply: data.choices[0].message.content });

      } catch (err) {
        console.error("Erreur Groq, utilisation du mock :", err.message);
        res.json({ reply: mockResponse(message, userData) });
      }
    } else {
      console.log("Pas de clé API trouvée");
      res.json({ reply: mockResponse(message, userData) });
    }

  } finally {
    busy = false;
  }
});

// --- ROUTE DE TEST ---
app.get("/health", (req, res) => res.send("Serveur BudgetIA OK"));

// --- SERVEUR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
