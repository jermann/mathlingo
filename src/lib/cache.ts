// Question types
export type QuestionType = 'text' | 'multiple_choice' | 'formula_drawing' | 'graphing';

// Base problem interface
interface BaseProblem {
  prompt: string;
  answer: string;
  solution: string;
  type: QuestionType;
}

// Text input problem
interface TextProblem extends BaseProblem {
  type: 'text';
}

// Multiple choice problem
interface MultipleChoiceProblem extends BaseProblem {
  type: 'multiple_choice';
  options: string[];
}

// Formula drawing problem
interface FormulaDrawingProblem extends BaseProblem {
  type: 'formula_drawing';
}

// Graphing problem
interface GraphingProblem extends BaseProblem {
  type: 'graphing';
}

// Union type for all problem types
export type Problem = TextProblem | MultipleChoiceProblem | FormulaDrawingProblem | GraphingProblem;

// Shared cache for storing problem data between API routes
export const problemCache = new Map<string, Problem>();

// Cache cleanup function to prevent memory leaks
export function cleanupCache() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  
  for (const [key, value] of problemCache.entries()) {
    // If the cache entry has a timestamp and it's older than maxAge, remove it
    if ((value as any).timestamp && (now - (value as any).timestamp) > maxAge) {
      problemCache.delete(key);
    }
  }
}

// Enhanced cache setter that includes timestamp
export function setProblemWithTimestamp(id: string, problem: Problem) {
  const problemWithTimestamp = {
    ...problem,
    timestamp: Date.now()
  };
  problemCache.set(id, problemWithTimestamp as Problem);
} 