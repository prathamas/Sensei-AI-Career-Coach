"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// --- HELPER FUNCTIONS ---

function isValidQuiz(quiz) {
  if (!quiz || typeof quiz !== "object" || !Array.isArray(quiz.questions)) {
    return false;
  }
  // Check for exactly 10 questions
  if (quiz.questions.length !== 10) {
    return false;
  }
  for (const q of quiz.questions) {
    if (
      !q ||
      typeof q.question !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      q.options.some((opt) => typeof opt !== "string") ||
      typeof q.correctAnswer !== "string" ||
      typeof q.explanation !== "string" ||
      !q.options.includes(q.correctAnswer)
    ) {
      return false;
    }
  }
  return true;
}

// --- EXPORTED ACTIONS ---

export async function generateQuiz() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { industry: true, skills: true },
  });
  
  if (!user) throw new Error("User not found");

  const randomSeed = Math.floor(Math.random() * 100000);
  const prompt = `
    Seed: ${randomSeed}
    Generate EXACTLY 10 UNIQUE technical interview MCQ questions for a ${user.industry} professional ${
    user.skills?.length ? `with expertise in ${user.skills.join(", ")}` : ""
  }.
    Return ONLY JSON:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string","string","string","string"],
          "correctAnswer": "string",
          "explanation": "string"
        }
      ]
    }
  `.trim();

  async function callModel() {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a technical interviewer. Return strict JSON only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "";
    return JSON.parse(text);
  }

  try {
    let quiz = await callModel();

    // If invalid, retry once
    if (!isValidQuiz(quiz)) {
      console.log("Retry: Invalid quiz format received.");
      quiz = await callModel();
    }

    if (isValidQuiz(quiz)) {
      return quiz.questions;
    }
    
    throw new Error("Invalid quiz structure after retry");

  } catch (error) {
    console.error("Quiz generation failed:", error.message);
    // Fallback static data if the AI fails completely
    return [
      {
        question: "What is the primary purpose of JavaScript?",
        options: ["Styling", "Interactivity", "Database management", "Hardware control"],
        correctAnswer: "Interactivity",
        explanation: "JavaScript is primarily used to create interactive elements within web browsers."
      },
      // ... more fallback questions as needed
    ];
  }
}

export async function saveQuizResult(questions, answers, score) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, industry: true },
  });

  if (!user) throw new Error("User not found");

  // Map results for storage
  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index] ?? null,
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);
  let improvementTip = null;

  if (wrongAnswers.length > 0) {
    const wrongQuestionsText = wrongAnswers
      .map((q) => `Q: ${q.question} (User: ${q.userAnswer}, Correct: ${q.answer})`)
      .join("\n");

    try {
      const tipResponse = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "Give a 2-sentence encouraging study tip based on these mistakes." },
          { role: "user", content: `Industry: ${user.industry}. Errors:\n${wrongQuestionsText}` },
        ],
      });
      improvementTip = tipResponse.choices[0]?.message?.content?.trim() || null;
    } catch (e) {
      console.error("Tip generation failed", e);
    }
  }

  try {
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults, // Must be a Json field in your Prisma schema
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Database save failed:", error.message);
    throw new Error("Failed to save result to database.");
  }
}

export async function getAssessments() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });

  if (!user) throw new Error("User not found");

  try {
    return await db.assessment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Fetch failed:", error.message);
    throw new Error("Failed to fetch assessments");
  }
}