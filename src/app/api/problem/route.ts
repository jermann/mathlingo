import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuid } from "uuid";
import { problemCache } from "@/lib/cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function getDifficultyDescription(difficulty: number): string {
  if (difficulty <= 2) return "very easy - basic concepts";
  if (difficulty <= 4) return "easy - fundamental skills";
  if (difficulty <= 6) return "moderate - standard problems";
  if (difficulty <= 8) return "challenging - complex problems";
  return "advanced - expert level";
}

export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY not configured. Please add it to your environment variables.",
          prompt: "What is 2 + 2?",
          id: "demo-123"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const { topic, difficulty, problemHistory = [] } = (await req.json()) as { 
      topic: string; 
      difficulty: number; 
      problemHistory?: Array<{ correct: boolean; difficulty: number }> 
    };

    // Adaptive difficulty adjustment based on recent performance
    let adjustedDifficulty = difficulty;
    if (problemHistory.length > 0) {
      const recentProblems = problemHistory.slice(-3); // Last 3 problems
      const correctCount = recentProblems.filter(p => p.correct).length;
      
      if (correctCount === 3) {
        // All correct - increase difficulty
        adjustedDifficulty = Math.min(difficulty + 1, 10);
      } else if (correctCount === 0) {
        // All wrong - decrease difficulty
        adjustedDifficulty = Math.max(difficulty - 1, 1);
      }
      // If 1-2 correct, keep same difficulty
    }

    const difficultyDescription = getDifficultyDescription(adjustedDifficulty);
    const query = `Create a math exercise for a learner. 
Topic: ${topic}
Difficulty: ${difficultyDescription} (level ${adjustedDifficulty}/10)
Format:\nPROMPT: <problem text>\nANSWER: <numeric or simplified expression>\nSOLUTION: <markdown step-by-step>`;

    const msg = await anthropic.messages.create({
      model: "claude-3-7-sonnet-latest",
      max_tokens: 300,
      messages: [{ role: "user", content: query }],
    });

  const text = msg.content?.[0]?.type === 'text' ? msg.content[0].text : "";
  const promptMatch = text.match(/PROMPT:\s*(.+)/i);
  const answerMatch = text.match(/ANSWER:\s*(.+)/i);
  const solutionMatch = text.match(/SOLUTION:[\s\S]*$/i);
  if (!promptMatch || !answerMatch) {
    return new Response("Bad LLM output", { status: 500 });
  }

  const id = uuid();
  problemCache.set(id, {
    prompt: promptMatch[1].trim(),
    answer: answerMatch[1].trim(),
    solution: solutionMatch ? solutionMatch[0].replace(/SOLUTION:/i, "").trim() : "",
  });

  return new Response(
    JSON.stringify({ 
      id, 
      prompt: promptMatch[1].trim(),
      difficulty: adjustedDifficulty 
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
  } catch (error) {
    console.error('Problem API error:', error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate problem. Please try again.",
        prompt: "What is 2 + 2?",
        id: "demo-123"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
} 