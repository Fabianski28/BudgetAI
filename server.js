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

  // Vérifie si on a des questions restantes
  if (session.step < questions.length) {
    const reply = questions[session.step];
    session.step++;
    return res.json({ reply });
  }

  // Toutes les questions posées : on résume
  const finalReply = `
Merci ! Voici un résumé de tes informations :\n
${JSON.stringify(session.data, null, 2)}
  `;
  // Reset session si tu veux recommencer après
  sessions[userId] = { step: 0, data: {} };

  res.json({ reply: finalReply });
});

// --- ROUTE FRONT ---
app.get("/", (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
