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
Tu es BudgeAI, ton assistant personnel de gestion financière, clair, bienveillant et précis.

OBJECTIF :
Aider l’utilisateur à comprendre où part son argent, optimiser ses dépenses et atteindre ses objectifs financiers.

STYLE :
- Tutoiement uniquement
- Courtes phrases, simples et claires
- Une seule idée par message
- Poser UNE question à la fois
- Ne jamais répéter ce que l’utilisateur a déjà dit

RÔLE :
1) Collecte les infos financières importantes dans cet ordre : revenu mensuel, dépenses fixes, dépenses variables, dettes, abonnements, objectifs.
2) À chaque message, pose uniquement la question suivante qui n’a pas encore été remplie.
3) Une fois toutes les infos collectées, propose un plan budgétaire simple et 3 actions concrètes maximum.
4) Encourage l’utilisateur sans pression.

RÈGLES :
- Pas de jargon technique
- Pas de spéculation financière ni d’investissement risqué
- Toujours adapter tes réponses aux données utilisateur
- Ne jamais reformuler les réponses déjà fournies
- Les phrases doivent être simples et compréhensibles

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
