import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

let busy = false;

// --- QUESTIONS DU BOT ---
const questions = [
  { key: "revenue", text: "Quel est ton revenu mensuel ?" },
  { key: "expenses", text: "Quelles sont tes dépenses fixes mensuelles ?" },
  { key: "variableExpenses", text: "Quelles sont tes dépenses variables ?" },
  { key: "debts", text: "As-tu des dettes à prendre en compte ?" },
  { key: "goals", text: "Quels sont tes objectifs financiers ?" },
];

function mockResponse(message, userData) {
  return `Mock: tu as répondu "${message}" à l'étape ${userData.step || 0}`;
}

app.post("/chat", async (req, res) => {
  const { message, userData = { step: 0 } } = req.body;
  if (!message) return res.status(400).json({ error: "Message vide" });

  if (busy) return res.status(429).json({ error: "Serveur occupé, réessayez" });
  busy = true;

  try {
    let step = userData.step || 0;

    // Stock la réponse de l'utilisateur
    if (step > 0) {
      const lastKey = questions[step - 1]?.key;
      if (lastKey) userData[lastKey] = message;
    }

    // Question suivante
    if (step < questions.length) {
      const nextQuestion = questions[step].text;
      userData.step = step + 1;
      return res.json({ reply: nextQuestion, userData });
    } else {
      // Dernière étape : résumé
      const summary = `
Voici ton résumé :
- Revenu : ${userData.revenue}
- Dépenses fixes : ${userData.expenses}
- Dépenses variables : ${userData.variableExpenses}
- Dettes : ${userData.debts}
- Objectifs : ${userData.goals}

Je te conseille de créer un budget simple et de suivre tes dépenses chaque mois !
      `;
      userData.step = step + 1; // fini
      return res.json({ reply: summary, userData });
    }

  } catch (err) {
    console.error(err);
    res.json({ reply: mockResponse(message, userData), userData });
  } finally {
    busy = false;
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur lancé sur le port ${PORT}`));
