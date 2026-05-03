"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { revalidatePath } from "next/cache";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Helper to ensure we only get the user's database ID
async function getAuthenticatedUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId },
  });

  if (!user) throw new Error("User not found");
  return user;
}

export async function saveResume(content) {
  const user = await getAuthenticatedUser();

  try {
    const resume = await db.resume.upsert({
      where: { userId: user.id },
      update: { content },
      create: { 
        userId: user.id, 
        content 
      },
    });

    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}

export async function getResume() {
  const user = await getAuthenticatedUser();
  
  return await db.resume.findUnique({
    where: { userId: user.id },
  });
}

export async function improveWithAI({ current, type }) {
  const user = await getAuthenticatedUser();

  const prompt = `
    As an expert resume writer, improve the following ${type} description for a ${user.industry} professional.
    
    Current content: "${current}"

    Rules:
    - Use strong action verbs (e.g., "Spearheaded", "Optimized").
    - Add measurable results/KPIs.
    - Highlight ${user.industry} specific keywords.
    - Return ONLY the improved text. Do not include any introductory remarks or quotes.
  `.trim();

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a professional resume editor. Output only the revised text." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5, // Lower temperature = more consistent/professional output
    });

    let improvedContent = response.choices[0]?.message?.content?.trim() || "";

    // Optional: Strip wrapping quotes if the AI adds them
    improvedContent = improvedContent.replace(/^["']|["']$/g, '');

    return improvedContent;
  } catch (error) {
    console.error("AI Improvement Error:", error.message);
    throw new Error("Failed to improve content");
  }
}