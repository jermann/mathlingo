// -----------------------------------------------------------------
// 2. API Route (src/app/api/solve/route.ts or pages/api/solve.ts)
//    Calls OpenAI twice: once to SOLVE, once to CRITIQUE & score.
//    Returns JSON: { solution, critique, confidence }

import OpenAI from "openai";
import type { NextRequest } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: NextRequest) {
    try {
        // Check if API key is configured
        if (!process.env.OPENAI_API_KEY) {
            return new Response(
                JSON.stringify({
                    solution: "OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.",
                    critique: "",
                    confidence: 0,
                }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const { problem } = (await req.json()) as { problem: string };

        // 1️⃣ Get the LLM to solve step‑by‑step
        const solveMsg = await openai.chat.completions.create({
            model: "gpt-4o-mini", // adjust if needed
            max_tokens: 512,
            messages: [
                { role: "system", content: "You are a helpful math tutor. Always show clear, numbered steps and the final answer on its own line prefixed with 'ANSWER:'." },
                { role: "user", content: `Solve the following problem.\n\n${problem}` },
            ],
        });
        const solution = solveMsg.choices?.[0]?.message?.content ?? "";

        // 2️⃣ Ask the model to critique & rate confidence (0‑1)
        const critiquePrompt = `Here is your earlier solution in markdown:\n\n---\n${solution}\n---\n\nPlease critique it for correctness, clarity, and completeness. Then output a JSON object ONLY with keys: critique (string) and confidence (number 0‑1).`;

        const critiqueMsg = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 256,
            messages: [
                { role: "system", content: "You are a strict math TA who never hallucinates. If unsure, give lower confidence." },
                { role: "user", content: critiquePrompt },
            ],
        });

        // naïve JSON extraction – OpenAI usually returns code‑block JSON
        const jsonMatch = critiqueMsg.choices?.[0]?.message?.content?.match(/\{[\s\S]*\}/);
        let critique = "(no critique)", confidence = 0.5;
        if (jsonMatch) {
            try {
                const obj = JSON.parse(jsonMatch[0]);
                critique = obj.critique;
                confidence = obj.confidence;
            } catch (_) { }
        }

        return new Response(
            JSON.stringify({ solution, critique, confidence }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error(err);
        return new Response(
            JSON.stringify({
                solution: "Error processing request.",
                critique: "",
                confidence: 0,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

// -----------------------------------------------------------------
// 3. Deploying to Vercel / Netlify
// -----------------------------------------------------------------
// a. Push to GitHub/GitLab.
// b. Import repo → Vercel. Build command defaults to `next build`.
// c. Add `OPENAI_API_KEY` under *Project → Settings → Environment Variables*.
// d. For Netlify: add env var in Site settings > Environment.
// e. Hit the deployed `/demo` route and test! 🎉
// -----------------------------------------------------------------
// 4. Extending to SymPy auto‑tests (optional)
// -----------------------------------------------------------------
// • Spin up a tiny FastAPI service on Fly.io that receives a math
//   expression + proposed answer, uses SymPy to verify equivalence, and
//   returns pass/fail. Call it from this API route before critique.
// • Or bundle Pyodide in the edge runtime (experimental) for pure JS.
// ----------------------------------------------------------------- 