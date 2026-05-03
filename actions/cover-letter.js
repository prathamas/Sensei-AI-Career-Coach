"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const groq = new Groq({
apiKey: process.env.GROQ_API_KEY,
});

export async function generateCoverLetter(data) {
const { userId } = await auth();
if (!userId) throw new Error("Unauthorized");

const user = await db.user.findUnique({
where: { clerkUserId: userId },
});

if (!user) throw new Error("User not found");

const prompt = `
Write a professional cover letter for a ${data.jobTitle} position at ${data.companyName}.

About the candidate:

* Industry: ${user.industry}
* Years of Experience: ${user.experience}
* Skills: ${user.skills?.join(", ")}
* Professional Background: ${user.bio}

Job Description:
${data.jobDescription}

Requirements:

1. Use a professional, enthusiastic tone
2. Highlight relevant skills and experience
3. Show understanding of the company's needs
4. Keep it concise (max 400 words)
5. Use proper business letter formatting
6. Include specific examples of achievements
7. Relate candidate's background to job requirements
   `;

try {
const response = await groq.chat.completions.create({
model: "llama-3.1-8b-instant",
messages: [
{ role: "system", content: "You are a professional career assistant." },
{ role: "user", content: prompt },
],
temperature: 0.7,
});


const content = response.choices[0]?.message?.content;

const coverLetter = await db.coverLetter.create({
  data: {
    content,
    jobDescription: data.jobDescription,
    companyName: data.companyName,
    jobTitle: data.jobTitle,
    status: "completed",
    userId: user.id,
  },
});

return coverLetter;


} catch (error) {
console.error("Error generating cover letter:", error.message);


// fallback (important for demo)
return {
  content: "Sample cover letter (AI temporarily unavailable).",
  companyName: data.companyName,
  jobTitle: data.jobTitle,
};


}
}

export async function getCoverLetters() {
const { userId } = await auth();
if (!userId) throw new Error("Unauthorized");

const user = await db.user.findUnique({
where: { clerkUserId: userId },
});

if (!user) throw new Error("User not found");

return await db.coverLetter.findMany({
where: { userId: user.id },
orderBy: { createdAt: "desc" },
});
}

export async function getCoverLetter(id) {
const { userId } = await auth();
if (!userId) throw new Error("Unauthorized");

const user = await db.user.findUnique({
where: { clerkUserId: userId },
});

if (!user) throw new Error("User not found");

return await db.coverLetter.findUnique({
where: { id, userId: user.id },
});
}

export async function deleteCoverLetter(id) {
const { userId } = await auth();
if (!userId) throw new Error("Unauthorized");

const user = await db.user.findUnique({
where: { clerkUserId: userId },
});

if (!user) throw new Error("User not found");

return await db.coverLetter.delete({
where: { id, userId: user.id },
});
}
