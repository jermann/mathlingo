// Shared cache for storing problem data between API routes
export const problemCache = new Map<
  string,
  { prompt: string; answer: string; solution: string }
>(); 