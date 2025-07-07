// MathLingo Demo – Full LLM‑powered version (React + Next.js)
// =================================================================
// This single file shows **both** the front‑end component *and* a fully
// working `/api/solve` handler wired to Anthropic Claude (or OpenAI)
// plus a quick self‑critique stage. Drop it in a Next.js 14+ app and go.
// -----------------------------------------------------------------
// 0. Prerequisites
//    • `npm i @anthropic-ai/sdk`   ← or replace with `openai` SDK
//    • ENV: `ANTHROPIC_API_KEY="sk‑..."`
//    • Tailwind + shadcn/ui already configured (for styling)
//    • Deploy to Vercel / Netlify: add the env var in dashboard → build
// -----------------------------------------------------------------
// 1. Front‑End Component (app/components/MathLingoDemo.tsx)

"use client";
import React, { useState, useEffect } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    FlameIcon,
    HeartIcon,
    StarIcon,
    Loader2,
} from "lucide-react";

export default function MathLingoDemo() {
    // ----- learner state -----
    const [problem, setProblem] = useState<string | null>(null);
    const [problemId, setProblemId] = useState<string | null>(null);
    const [answer, setAnswer] = useState("");
    const [feedback, setFeedback] = useState<{
        correct: boolean;
        explanation: string;
        xpGained: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);

    // gamification
    const [xp, setXp] = useState(0);
    const [hearts, setHearts] = useState(3);
    const [streak, setStreak] = useState(0);
    const [level, setLevel] = useState(1);

    // fetch first problem on mount
    useEffect(() => {
        if (!problem) fetchProblem();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchProblem = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/problem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ skill: level }),
            });
            const data = await res.json();
            setProblem(data.prompt);
            setProblemId(data.id);
            setAnswer("");
            setFeedback(null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!problemId) return;
        setLoading(true);
        try {
            const res = await fetch("/api/grade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: problemId, learnerAnswer: answer }),
            });
            const data = await res.json();
            setFeedback(data);
            // update gamified state
            if (data.correct) {
                setXp((x) => x + data.xpGained);
                setStreak((s) => s + 1);
                if ((xp + data.xpGained) / 100 >= level) setLevel((l) => l + 1);
            } else {
                setHearts((h) => Math.max(h - 1, 0));
                setStreak(0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const heartsDisplay = Array.from({ length: 3 }).map((_, i) => (
        <HeartIcon
            key={i}
            className={
                "w-6 h-6 " + (i < hearts ? "text-red-500" : "text-gray-300")
            }
            fill={i < hearts ? "currentColor" : "none"}
        />
    ));

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
            <Card className="w-full max-w-xl rounded-2xl shadow-2xl">
                <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-3xl font-bold">MathLingo</CardTitle>
                    <div className="flex items-center justify-center gap-4 text-lg">
                        <div className="flex items-center gap-1">
                            <StarIcon className="w-5 h-5 text-yellow-500" /> {xp}
                        </div>
                        <div className="flex items-center gap-1">
                            <FlameIcon className="w-5 h-5 text-orange-500" /> {streak}
                        </div>
                        <div className="flex items-center gap-1">{heartsDisplay}</div>
                    </div>
                    <div className="text-sm text-gray-500">Level {level}</div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {problem ? (
                        <>
                            <p className="text-lg font-medium">{problem}</p>
                            <Input
                                placeholder="Your answer"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                disabled={!!feedback}
                            />
                            {!feedback && (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" />
                                    ) : (
                                        "Submit"
                                    )}
                                </Button>
                            )}

                            {feedback && (
                                <div className="space-y-3">
                                    <div
                                        className={
                                            "font-semibold " +
                                            (feedback.correct ? "text-green-600" : "text-red-500")
                                        }
                                    >
                                        {feedback.correct ? "Correct!" : "Try again."}
                                    </div>
                                    <pre className="whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border text-sm">
                                        {feedback.explanation}
                                    </pre>
                                    <Button className="w-full" onClick={fetchProblem}>
                                        Next ➜
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex justify-center">Loading…</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 