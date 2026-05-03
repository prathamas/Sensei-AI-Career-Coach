import { db } from "@/lib/prisma";
import { inngest } from "./client";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const generateIndustryInsights = inngest.createFunction(
  {
    id: "generate-industry-insights",
    triggers: [{ cron: "0 0 * * 0" }],
  },
  async ({ step }) => {
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true },
      });
    });

    for (const { industry } of industries) {
      const prompt = `
Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
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

IMPORTANT:
- Return ONLY valid JSON
- No markdown, no explanation
- At least 5 roles
- At least 5 skills and trends
`;

      const res = await step.run(
        `Generate insights for ${industry}`,
        async () => {
          return await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.7,
            response_format: { type: "json_object" },
          });
        }
      );

      const text = res.choices?.[0]?.message?.content || "";
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

      let insights;

      try {
        insights = JSON.parse(cleanedText);
      } catch (err) {
        console.error(`❌ JSON failed for ${industry}:`, cleanedText);
        continue;
      }

      await step.run(`Update ${industry} insights`, async () => {
        await db.industryInsight.update({
          where: { industry },
          data: {
            ...insights,
            lastUpdated: new Date(),
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      });
    }
  }
);