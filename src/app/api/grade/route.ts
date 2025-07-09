import { NextRequest } from "next/server";
import { problemCache, Problem } from "@/lib/cache";

export async function POST(req: NextRequest) {
  const { id, learnerAnswer, questionType } = (await req.json()) as {
    id: string;
    learnerAnswer: string;
    questionType?: string;
  };
  
  // Handle demo case
  if (id === "demo-123") {
    const correct = learnerAnswer.trim() === "4";
    return new Response(
      JSON.stringify({
        correct,
        explanation: correct 
          ? "Great job! 2 + 2 = 4 is correct." 
          : "The correct answer is 4. 2 + 2 = 4.",
        xpGained: correct ? 10 : 0
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  
  const entry = problemCache.get(id) as Problem;
  if (!entry) return new Response("Not found", { status: 404 });

  let correct = false;
  
  // Handle different question types
  if (entry.type === 'multiple_choice') {
    correct = entry.answer.toUpperCase() === learnerAnswer.toUpperCase();
  } else {
    correct = isEquivalent(entry.answer, learnerAnswer);
  }

  const xpGained = correct ? 10 : 0;

  // Explanation: show model's step‑by‑step solution OR brief critique
  const explanation = correct
    ? entry.solution
    : `Correct answer was ${entry.answer}. Review the following steps:\n\n${entry.solution}`;

  return new Response(
    JSON.stringify({ correct, explanation, xpGained }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// naive equivalence – trims & compares, falls back to numeric compare
function isEquivalent(correctAns: string, guess: string): boolean {
  if (correctAns.trim() === guess.trim()) return true;
  const n1 = parseFloat(correctAns);
  const n2 = parseFloat(guess);
  if (!isNaN(n1) && !isNaN(n2)) return Math.abs(n1 - n2) < 1e-6;
  return false;
} 