import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let busy = false;

// Fonction mock si pas de clé ou problème API
function mockResponse(message, userData) {
  return `Réponse mock pour "${message}". Données utilisateur actuelles : ${JSON.stringify(userData)}`;
}

// Endpoint chat
app.post("/chat", async (req, res) => {
  const { message, userData } = req.body;
  if (!message) return res.status(400).json({ error: "Message vide" });

  if (busy) return res.status(429).json({ error: "Serveur occupé, réessayez" });
  busy = true;

  try {
    const systemPrompt = `
Tu es BudgeAI, un assistant personnel de gestion financière simple, précis et bienveillant.

OBJECTIF :
Aider l’utilisateur à comprendre où part son argent, optimiser ses dépenses, mieux gérer son budget et atteindre ses objectifs financiers.

STYLE :
- Clair et concret
- Jamais moralisateur
- Conseils courts et applicables immédiatement
- Ton empathique mais professionnel

RÔLE :
1. Collecte les infos financières importantes (revenus, dépenses, dettes, abonnements, objectifs).
2. Analyse la situation et repère les optimisations possibles.
3. Propose un plan budgétaire simple et réaliste.
4. Donne toujours des actions concrètes (3 max).
5. Encourage l’utilisateur sans pression.

RÈGLES :
- Pas de jargon technique.
- Pas de spéculation financière ni d’investissement risqué.
- Toujours adapter tes réponses aux données utilisateur.
- Pose **une seule question à la fois**.
- Ne passe jamais à l’étape suivante tant que l’utilisateur n’a pas répondu.
- Ne répète pas les étapes déjà collectées.

Données utilisateur : ${JSON.stringify(userData)}
`;

    let reply;

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
              { role: "system", content: systemPrompt },
              { role: "user", content: message }
            ],
            temperature: 0.5,
            max_tokens: 400
          })
        });

        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        const data = await response.json();
        reply = data.choices[0].message.content;

      } catch (err) {
        console.error("Erreur API Groq :", err.message);
        reply = mockResponse(message, userData);
      }
    } else {
      reply = mockResponse(message, userData);
    }

    res.json({ reply });

  } finally {
    busy = false;
  }
});

// Servir index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
