"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const groq = new Groq({
apiKey: process.env.GROQ_API_KEY,
});

export const generateAIInsights = async (industry) => {
const prompt = `
Analyze the current state of the ${industry} industry and return ONLY valid JSON in this format:

{
"salaryRanges": [
{ "role": "string", "min": number, "max": number, "median": number, "location": "string" }
],
"growthRate": number,
"demandLevel": "High" | "Medium" | "Low",
"topSkills": ["skill1", "skill2"],
"marketOutlook": "Positive" | "Neutral" | "Negative",
"keyTrends": ["trend1", "trend2"],
"recommendedSkills": ["skill1", "skill2"]
}

Rules:

* ONLY return JSON (no markdown, no explanation)
* Include at least 5 roles
* Include at least 5 skills and trends
* Growth rate should be percentage number
  `;

  try {
  const response = await groq.chat.completions.create({
  model: "llama-3.1-8b-instant",
  messages: [
  { role: "system", content: "You are a data analyst that returns ONLY valid JSON." },
  { role: "user", content: prompt },
  ],
  temperature: 0.7,
  });

  let text = response.choices[0]?.message?.content;

  // Clean JSON (important)
  text = text.replace(/`json|`/g, "").trim();

  return JSON.parse(text);

  } catch (error) {
  console.error("Error generating insights:", error.message);

  // fallback (important for demo)
  return {
  salaryRanges: [
  { role: "Software Engineer", min: 500000, max: 1500000, median: 900000, location: "India" }
  ],
  growthRate: 12,
  demandLevel: "High",
  topSkills: ["JavaScript", "React", "Node.js"],
  marketOutlook: "Positive",
  keyTrends: ["AI integration", "Remote work"],
  recommendedSkills: ["System Design", "Cloud Computing"],
  };
  }
  };

export async function getIndustryInsights() {
const { userId } = await auth();
if (!userId) throw new Error("Unauthorized");

const user = await db.user.findUnique({
where: { clerkUserId: userId },
include: { industryInsight: true },
});

if (!user) throw new Error("User not found");

if (!user.industryInsight) {
const insights = await generateAIInsights(user.industry);


const industryInsight = await db.industryInsight.create({
  data: {
    industry: user.industry,
    ...insights,
    nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});

return industryInsight;


}

return user.industryInsight;
}
