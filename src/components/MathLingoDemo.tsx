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
    ThumbsUp,
    ThumbsDown,
} from "lucide-react";
// Add imports for GraphingPad and DrawingPad
import GraphingPad from "./GraphingPad";
import DrawingPad from "./DrawingPad";

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

    // attempt and feedback
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [showFeedbackUI, setShowFeedbackUI] = useState(false);
    const [thumbs, setThumbs] = useState<null | boolean>(null);
    const [comment, setComment] = useState("");
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);

    // Add state for problem type and drawing answer
    const [problemType, setProblemType] = useState<string | null>(null);
    const [drawingAnswer, setDrawingAnswer] = useState<string>("");

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
            setProblemType(data.type || null);
            setAnswer("");
            setDrawingAnswer("");
            setFeedback(null);
            setAttemptId(null);
            setShowFeedbackUI(false);
            setThumbs(null);
            setComment("");
            setFeedbackSubmitted(false);
            setStartTime(Date.now());
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
            // For drawing/graphing problems, use drawingAnswer as the answer
            const userAnswer = (problemType === "graphing" || problemType === "formula_drawing") ? drawingAnswer : answer;
            const res = await fetch("/api/grade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: problemId, learnerAnswer: userAnswer }),
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
            // Store attempt in DB
            const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : null;
            const attemptRes = await fetch("/api/attempt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: null,
                    question_text: problem,
                    student_answer: userAnswer,
                    llm_answer: data.explanation,
                    time_taken_seconds: timeTaken,
                    points: data.xpGained,
                }),
            });
            const attemptData = await attemptRes.json();
            setAttemptId(attemptData.id);
            setShowFeedbackUI(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleFeedbackSubmit = async () => {
        if (!attemptId || thumbs === null) return;
        setLoading(true);
        try {
            await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attempt_id: attemptId,
                    thumbs_up: thumbs,
                    comment,
                }),
            });
            setFeedbackSubmitted(true);
            setShowFeedbackUI(false);
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
                            {/* Render input based on problem type */}
                            {problemType === "graphing" && (
                                <GraphingPad
                                    onDrawingChange={setDrawingAnswer}
                                    disabled={!!feedback}
                                />
                            )}
                            {problemType === "formula_drawing" && (
                                <DrawingPad
                                    onDrawingChange={setDrawingAnswer}
                                    disabled={!!feedback}
                                />
                            )}
                            {(problemType !== "graphing" && problemType !== "formula_drawing") && (
                                <Input
                                    placeholder="Your answer"
                                    value={answer}
                                    onChange={(e) => setAnswer(e.target.value)}
                                    disabled={!!feedback}
                                />
                            )}
                            {/* Only show submit button if not feedback and not loading */}
                            {!feedback && (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={
                                        loading ||
                                        Boolean(
                                            problemType &&
                                            (problemType === "graphing" || problemType === "formula_drawing") &&
                                            !drawingAnswer
                                        )
                                    }
                                    className="w-full"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" />
                                    ) : (
                                        "Submit"
                                    )}
                                </Button>
                            )}
                            {/* Feedback and rest of UI unchanged */}
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
                                    {/* Feedback UI */}
                                    {showFeedbackUI && !feedbackSubmitted && (
                                        <div className="space-y-2 border rounded-lg p-3 bg-gray-50">
                                            <div className="flex items-center gap-3 mb-2">
                                                <button
                                                    className={`p-2 rounded-full border ${thumbs === true ? 'bg-green-100 border-green-400' : 'border-gray-300'}`}
                                                    onClick={() => setThumbs(true)}
                                                    aria-label="Thumbs up"
                                                >
                                                    <ThumbsUp className={`w-5 h-5 ${thumbs === true ? 'text-green-600' : 'text-gray-400'}`} />
                                                </button>
                                                <button
                                                    className={`p-2 rounded-full border ${thumbs === false ? 'bg-red-100 border-red-400' : 'border-gray-300'}`}
                                                    onClick={() => setThumbs(false)}
                                                    aria-label="Thumbs down"
                                                >
                                                    <ThumbsDown className={`w-5 h-5 ${thumbs === false ? 'text-red-600' : 'text-gray-400'}`} />
                                                </button>
                                                <span className="ml-2 text-sm text-gray-500">Report an issue or give feedback</span>
                                            </div>
                                            <Input
                                                placeholder="Optional comment"
                                                value={comment}
                                                onChange={e => setComment(e.target.value)}
                                                className="mb-2"
                                            />
                                            <Button
                                                onClick={handleFeedbackSubmit}
                                                disabled={thumbs === null || loading}
                                                className="w-full"
                                            >
                                                {loading ? <Loader2 className="animate-spin" /> : "Submit Feedback"}
                                            </Button>
                                        </div>
                                    )}
                                    {feedbackSubmitted && (
                                        <div className="text-green-600 text-sm font-medium">Thank you for your feedback!</div>
                                    )}
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