import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Serve static files ---
app.use(express.static(path.join(__dirname, "public")));

// --- Message de bienvenue ---
const welcomeMessage = `
👋 Bonjour ! Je suis BudgetIA, ton assistant personnel pour gérer ton argent,
comprendre où part ton budget, optimiser tes dépenses et t’aider à atteindre tes objectifs financiers.
Je vais te poser une question à la fois pour ne pas te submerger.
`;

// --- Mock en cas d'erreur ou pas de clé ---
function mockResponse(message, userData) {
  return `Réponse mock à "${message}". Données utilisateur : ${JSON.stringify(userData)}`;
}

// --- Endpoint pour récupérer le message de bienvenue ---
app.get("/welcome", (req, res) => {
  res.json({ welcome: welcomeMessage });
});

// --- Endpoint chat ---
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
Tu poses UNE question à la fois et n'avances jamais tant que l'utilisateur n'a pas répondu.

ÉTAPES :
1) Revenu mensuel
2) Dépenses fixes
3) Dépenses variables
4) Dettes éventuelles
5) Objectifs financiers
6) Résumé + recommandations simples

Règles :
- Une seule question par message
- Pas de long texte
- Adapté aux réponses de l'utilisateur

Données utilisateur : ${JSON.stringify(userData)}
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

// --- Route principale pour renvoyer index.html ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
