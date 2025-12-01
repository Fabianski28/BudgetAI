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

// --- SESSION UTILISATEUR ---
const sessions = {};

// --- MESSAGE DE BIENVENUE ---
const welcomeMessage = `
👋 Bonjour ! Je suis BudgetIA, ton assistant personnel pour gérer ton argent.
Je vais t’aider à comprendre où part ton budget, optimiser tes dépenses et atteindre tes objectifs financiers.
Je te poserai une question à la fois pour ne pas te submerger.
`;

// --- MOCK EN CAS D'ERREUR ---
function mockResponse(message, session) {
  return `Réponse mock à "${message}". Session actuelle : ${JSON.stringify(session)}`;
}

// --- QUESTIONS DU FLOW ---
const questions = [
  "Quel est ton revenu mensuel ?",
  "Quelles sont tes dépenses fixes ?",
  "Quelles sont tes dépenses variables ?",
  "As-tu des dettes ?",
  "Quels sont tes objectifs financiers ?"
];

// --- ROUTE BIENVENUE ---
app.get("/welcome", (req, res) => {
  res.json({ welcome: welcomeMessage });
});

// --- ROUTE CHAT ---
app.post("/chat", async (req, res) => {
  const { userId, message } = req.body;
  if (!message) return res.status(400).json({ error: "Message vide" });
  if (!userId) return res.status(400).json({ error: "userId manquant" });

  // Init session si besoin
  if (!sessions[userId]) {
    sessions[userId] = { step: 0, data: {} };
  }
  const session = sessions[userId];

  // Enregistre la réponse précédente
  if (session.step > 0) {
    session.data[`step${session.step - 1}`] = message;
  }

  // Prépare le message pour l'IA (Groq ou mock)
  const systemPrompt = `
Tu es BudgeAI, un assistant personnel de gestion financière.
Tu poses UNE question à la fois, courte et claire.
Ne passe pas à la suivante tant que l'utilisateur n'a pas répondu.
Données utilisateur : ${JSON.stringify(session.data)}
`;

  try {
    if (process.env.GROQ_API_KEY) {
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
          max_tokens: 300
        })
      });

      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);

      const data = await response.json();
      // Réponse IA
      let reply = data.choices[0].message.content;

      // Si la session n'a pas encore fini les questions, on pose la suivante
      if (session.step < questions.length) {
        reply = questions[session.step];
        session.step++;
      } else if (session.step === questions.length) {
        // Dernière étape : on résume
        reply += `\n\nRésumé : ${JSON.stringify(session.data, null, 2)}`;
        sessions[userId] = { step: 0, data: {} }; // reset
      }

      return res.json({ reply });

    } else {
      // Pas de clé API : utilise mock
      let reply = mockResponse(message, session);
      if (session.step < questions.length) {
        reply = questions[session.step];
        session.step++;
      } else if (session.step === questions.length) {
        reply += `\n\nRésumé : ${JSON.stringify(session.data, null, 2)}`;
        sessions[userId] = { step: 0, data: {} };
      }
      return res.json({ reply });
    }

  } catch (err) {
    console.error("Erreur Groq / mock :", err.message);
    return res.json({ reply: mockResponse(message, session) });
  }
});

// --- ROUTE FRONT ---
app.get("/", (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
