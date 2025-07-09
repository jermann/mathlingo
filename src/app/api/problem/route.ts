import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { v4 as uuid } from "uuid";
import { problemCache, setProblemWithTimestamp } from "@/lib/cache";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function getDifficultyDescription(difficulty: number): string {
  if (difficulty <= 2) return "very easy - basic concepts";
  if (difficulty <= 4) return "easy - fundamental skills";
  if (difficulty <= 6) return "moderate - standard problems";
  if (difficulty <= 8) return "challenging - complex problems";
  return "advanced - expert level";
}

// Question types
const QUESTION_TYPES = ['text', 'multiple_choice', 'formula_drawing', 'graphing'] as const;
type QuestionType = typeof QUESTION_TYPES[number];



export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY not configured. Please add it to your environment variables.",
          prompt: "What is 2 + 2?",
          id: "demo-123",
          type: "text"
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

    // Randomly select question type
    const questionType: QuestionType = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
    
    const difficultyDescription = getDifficultyDescription(adjustedDifficulty);
    
    let query = `Create a math exercise for a learner. 
Topic: ${topic}
Difficulty: ${difficultyDescription} (level ${adjustedDifficulty}/10)`;

    // Add specific instructions based on question type
    switch (questionType) {
      case 'text':
        query += `\n\nCreate a text-based math problem where students type their answer.`;
        break;
      case 'multiple_choice':
        query += `\n\nCreate a multiple choice problem with exactly 3 options. The options should be clearly different and only one should be correct.`;
        break;
      case 'formula_drawing':
        query += `\n\nCreate a problem where students need to draw or write a mathematical expression, equation, or formula.`;
        break;
      case 'graphing':
        query += `\n\nCreate a problem where students need to graph a function, plot points, or draw a mathematical graph on a coordinate plane.`;
        break;
    }



    // Add JSON output instruction
    query += `\n\nRespond ONLY with a valid JSON object in the following format:`;

    switch (questionType) {
      case 'text':
        query += `\n{
  "prompt": "the math problem text",
  "answer": "the correct answer",
  "solution": "step-by-step solution"
}`;
        break;
      case 'multiple_choice':
        query += `\n{
  "prompt": "the math problem text",
  "options": ["option 1", "option 2", "option 3"],
  "answer": "A",
  "solution": "step-by-step solution"
}`;
        break;
      case 'formula_drawing':
        query += `\n{
  "prompt": "problem asking to draw/write a mathematical expression or formula",
  "answer": "expected text representation",
  "solution": "explanation"
}`;
        break;
      case 'graphing':
        query += `\n{
  "prompt": "problem asking to graph a function or plot points on a coordinate plane",
  "answer": "expected text description of the graph",
  "solution": "explanation of how to graph it"
}`;
        break;
    }

    query += `\n\nIMPORTANT: Respond ONLY with a valid JSON object. Keep responses concise and complete. Do not include any other text, explanations, markdown formatting, or code blocks. The response must be parseable JSON.`;

    const msg = await anthropic.messages.create({
      model: "claude-3-7-sonnet-latest",
      max_tokens: 800,
      messages: [{ role: "user", content: query }],
    });

    const text = msg.content?.[0]?.type === 'text' ? msg.content[0].text : "";
    console.log('LLM Response for', questionType, ':', text.substring(0, 300));

    // Parse JSON response with better error handling
    let parsedData;
    try {
      // Try to extract JSON from the response if it's wrapped in other text
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.substring(7);
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.substring(3);
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.substring(0, jsonText.length - 3);
      }
      
      // Try to find JSON object boundaries
      const jsonStart = jsonText.indexOf('{');
      const jsonEnd = jsonText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      }
      
      // Check if the JSON appears to be complete (ends with a closing brace)
      if (!jsonText.trim().endsWith('}')) {
        throw new Error('JSON response appears to be truncated');
      }
      
      parsedData = JSON.parse(jsonText);
      
      // Validate that the parsed data has required fields
      if (!parsedData.prompt || !parsedData.answer || !parsedData.solution) {
        throw new Error('Missing required fields in parsed data');
      }
      
      // Validate multiple choice format
      if (questionType === 'multiple_choice') {
        if (!Array.isArray(parsedData.options) || parsedData.options.length !== 3) {
          throw new Error('Multiple choice must have exactly 3 options');
        }
        if (!parsedData.answer || !['A', 'B', 'C'].includes(parsedData.answer)) {
          throw new Error('Multiple choice answer must be A, B, or C');
        }
      }
    } catch (e) {
      console.error('Failed to parse JSON response:', text);
      console.error('Parse error:', e);
      
      // Return a fallback problem instead of an error
      const fallbackId = uuid();
      const fallbackProblem = {
        prompt: "What is 2 + 2?",
        answer: "4",
        solution: "2 + 2 = 4 is a basic arithmetic fact.",
        type: "text" as QuestionType,
        options: []
      };
      
      setProblemWithTimestamp(fallbackId, fallbackProblem);
      
      return new Response(
        JSON.stringify({ 
          id: fallbackId,
          prompt: fallbackProblem.prompt,
          difficulty: adjustedDifficulty,
          type: fallbackProblem.type,
          options: fallbackProblem.options
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const id = uuid();
    setProblemWithTimestamp(id, {
      prompt: parsedData.prompt,
      answer: parsedData.answer,
      solution: parsedData.solution,
      type: questionType,
      options: parsedData.options || []
    });

    return new Response(
      JSON.stringify({ 
        id, 
        prompt: parsedData.prompt,
        difficulty: adjustedDifficulty,
        type: questionType,
        options: parsedData.options || []
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Problem API error:', error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate problem. Please try again.",
        prompt: "What is 2 + 2?",
        id: "demo-123",
        type: "text"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
} 