"use client";
import React, { useState, useEffect, useRef } from "react";
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
    MessageCircle,
    BookOpen,
    Target,
    Camera,
    Type,
    CheckCircle,
    BarChart3,
} from "lucide-react";
import DrawingPad from "./DrawingPad";
import GraphingPad from "./GraphingPad";
import { problemCache } from "@/lib/cache";

const SUGGESTED_TOPICS = [
    "Basic arithmetic (addition, subtraction, multiplication, division)",
    "Fractions and decimals",
    "Algebra and linear equations",
    "Geometry and shapes",
    "Word problems and real-world applications",
    "Mental math and quick calculations",
    "Patterns and sequences",
    "Probability and statistics",
    "Trigonometry basics",
    "Calculus fundamentals"
];

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ProblemHistory {
    correct: boolean;
    difficulty: number;
}

type QuestionType = 'text' | 'multiple_choice' | 'formula_drawing' | 'graphing';

export default function AdaptiveMathLingo() {
    // Topic discussion state
    const [isDiscussingTopic, setIsDiscussingTopic] = useState(true);
    const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [discussionLoading, setDiscussionLoading] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState("");

    // Problem solving state
    const [problem, setProblem] = useState<string | null>(null);
    const [problemId, setProblemId] = useState<string | null>(null);
    const [questionType, setQuestionType] = useState<QuestionType>('text');
    const [answer, setAnswer] = useState("");
    const [selectedOption, setSelectedOption] = useState<string>("");
    const [options, setOptions] = useState<string[]>([]);
    const [currentProblemData, setCurrentProblemData] = useState<any>(null);
    const [feedback, setFeedback] = useState<{
        correct: boolean;
        explanation: string;
        xpGained: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentDifficulty, setCurrentDifficulty] = useState(3);
    const [problemHistory, setProblemHistory] = useState<ProblemHistory[]>([]);
    const [problemNumber, setProblemNumber] = useState(0);
    const [totalProblems] = useState(10);

    // Drawing state
    const [drawingImage, setDrawingImage] = useState<string | null>(null);
    const [imageProcessing, setImageProcessing] = useState(false);

    // Gamification state
    const [xp, setXp] = useState(0);
    const [hearts, setHearts] = useState(3);
    const [streak, setStreak] = useState(0);
    const [level, setLevel] = useState(1);

    // Start topic discussion on mount
    useEffect(() => {
        if (isDiscussingTopic && conversationHistory.length === 0) {
            setConversationHistory([{
                role: 'assistant',
                content: "Hi! I'm here to help you choose what math problems to work on. What kind of math topics interest you? You can tell me about subjects you enjoy, things you find challenging, or areas you'd like to improve in!"
            }]);
        }
    }, [isDiscussingTopic, conversationHistory.length]);

    const handleTopicMessage = async () => {
        if (!currentMessage.trim()) return;
        
        const userMessage = { role: 'user' as const, content: currentMessage };
        setConversationHistory(prev => [...prev, userMessage]);
        setCurrentMessage("");
        setDiscussionLoading(true);

        try {
            const res = await fetch("/api/topic-discussion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    message: currentMessage,
                    conversationHistory: conversationHistory
                }),
            });
            const data = await res.json();
            
            if (data.response) {
                setConversationHistory(prev => [...prev, {
                    role: 'assistant',
                    content: data.response
                }]);
            }
        } catch (e) {
            console.error(e);
            setConversationHistory(prev => [...prev, {
                role: 'assistant',
                content: "Sorry, I'm having trouble understanding. Could you try again?"
            }]);
        } finally {
            setDiscussionLoading(false);
        }
    };

    const selectSuggestedTopic = (topic: string) => {
        setSelectedTopic(topic);
        setConversationHistory([{
            role: 'assistant',
            content: `Great choice! Let's work on "${topic}". I'll generate 10 problems for you, starting at a moderate difficulty level that will adapt based on how you do. Ready to begin?`
        }]);
    };

    const startProblemSet = () => {
        setIsDiscussingTopic(false);
        fetchProblem();
    };

    const fetchProblem = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/problem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    topic: selectedTopic,
                    difficulty: currentDifficulty,
                    problemHistory: problemHistory
                }),
            });
            const data = await res.json();
            
            // Set the problem data (no more error handling needed since backend provides fallbacks)
            setProblem(data.prompt);
            setProblemId(data.id);
            setQuestionType(data.type);
            setCurrentDifficulty(data.difficulty);
            setAnswer("");
            setSelectedOption("");
            setOptions(data.options || []);
            setDrawingImage(null);
            setImageProcessing(false);
            setFeedback(null);
            setProblemNumber(prev => prev + 1);
            
            // Store the complete problem data in frontend state as backup
            setCurrentProblemData({
                prompt: data.prompt,
                answer: "4", // Fallback answer
                solution: "Basic arithmetic fact.",
                type: data.type,
                options: data.options || []
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const processDrawing = async (imageData: string) => {
        if (!imageData) return;

        setImageProcessing(true);
        
        try {
            // Convert base64 to blob
            const response = await fetch(imageData);
            const blob = await response.blob();
            
            const formData = new FormData();
            formData.append('image', blob, 'drawing.png');
            formData.append('questionType', questionType);

            const res = await fetch("/api/solve", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            
            if (data.extractedText) {
                setAnswer(data.extractedText);
            }
        } catch (e) {
            console.error('Error processing drawing:', e);
        } finally {
            setImageProcessing(false);
        }
    };

    const handleSubmit = async () => {
        if (!problemId) return;
        setLoading(true);
        
        let submissionAnswer = "";
        if (questionType === 'multiple_choice') {
            submissionAnswer = selectedOption; // selectedOption should be A, B, or C
        } else {
            submissionAnswer = answer;
        }

        try {
            // Get the current problem from cache, with frontend state as fallback
            const currentProblem = problemCache.get(problemId);
            let problemToSubmit;
            
            if (!currentProblem) {
                // If problem not found in cache, use frontend state or create fallback
                problemToSubmit = currentProblemData || {
                    prompt: problem || "What is 2 + 2?",
                    answer: "4",
                    solution: "Basic arithmetic fact.",
                    type: questionType,
                    options: options
                };
            } else {
                problemToSubmit = currentProblem;
            }

            const res = await fetch("/api/solve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    problem: problemToSubmit,
                    answer: submissionAnswer,
                    questionType: questionType
                }),
            });
            const data = await res.json();
            
            // Convert the new response format to the expected feedback format
            const feedbackData = {
                correct: data.isCorrect,
                explanation: data.feedback || (data.isCorrect ? "Correct!" : "Incorrect."),
                xpGained: data.isCorrect ? 10 : 0
            };
            
            setFeedback(feedbackData);
            
            // Update problem history for adaptive difficulty
            setProblemHistory(prev => [...prev, {
                correct: data.isCorrect,
                difficulty: currentDifficulty
            }]);
            
            // Update gamified state
            if (data.isCorrect) {
                setXp((x) => x + feedbackData.xpGained);
                setStreak((s) => s + 1);
                if ((xp + feedbackData.xpGained) / 100 >= level) setLevel((l) => l + 1);
            } else {
                setHearts((h) => Math.max(h - 1, 0));
                setStreak(0);
            }
        } catch (e) {
            console.error(e);
            setFeedback({
                correct: false,
                explanation: "An error occurred while grading your answer. Please try again.",
                xpGained: 0
            });
        } finally {
            setLoading(false);
        }
    };

    const nextProblem = () => {
        if (problemNumber >= totalProblems) {
            // Problem set complete
            setIsDiscussingTopic(true);
            setProblemNumber(0);
            setProblemHistory([]);
            setCurrentDifficulty(3);
            setConversationHistory([{
                role: 'assistant',
                content: "Great job completing the problem set! Would you like to try a different topic or work on more problems in the same area?"
            }]);
        } else {
            fetchProblem();
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

    const renderQuestionTypeIcon = () => {
        switch (questionType) {
            case 'text':
                return <Type className="w-4 h-4" />;
            case 'multiple_choice':
                return <CheckCircle className="w-4 h-4" />;
            case 'formula_drawing':
                return <Camera className="w-4 h-4" />;
            case 'graphing':
                return <BarChart3 className="w-4 h-4" />;
            default:
                return <Type className="w-4 h-4" />;
        }
    };

    const renderQuestionInput = () => {
        switch (questionType) {
            case 'text':
                return (
                    <Input
                        placeholder="Your answer"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !feedback && handleSubmit()}
                        disabled={!!feedback}
                    />
                );
            case 'multiple_choice':
                return (
                    <div className="space-y-2">
                        {options.map((option, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            return (
                                <Button
                                    key={idx}
                                    variant={selectedOption === letter ? "default" : "outline"}
                                    className="w-full justify-start"
                                    onClick={() => setSelectedOption(letter)}
                                    disabled={!!feedback}
                                >
                                    <span className="font-bold mr-2">{letter}.</span>
                                    {option}
                                </Button>
                            );
                        })}
                    </div>
                );
            case 'formula_drawing':
                return (
                    <div className="space-y-4">
                        <DrawingPad
                            onDrawingChange={(imageData) => {
                                setDrawingImage(imageData);
                                if (imageData) {
                                    // Process the drawing immediately
                                    processDrawing(imageData);
                                }
                            }}
                            disabled={!!feedback}
                        />
                        {imageProcessing && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Loader2 className="animate-spin w-4 h-4" />
                                Processing drawing...
                            </div>
                        )}
                        <Input
                            placeholder="Extracted text (you can edit this)"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !feedback && handleSubmit()}
                            disabled={!!feedback}
                        />
                    </div>
                );
            case 'graphing':
                return (
                    <div className="space-y-4">
                        <GraphingPad
                            onDrawingChange={(imageData) => {
                                setDrawingImage(imageData);
                                if (imageData) {
                                    // Process the drawing immediately
                                    processDrawing(imageData);
                                }
                            }}
                            disabled={!!feedback}
                        />
                        {imageProcessing && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Loader2 className="animate-spin w-4 h-4" />
                                Processing graph...
                            </div>
                        )}
                        <Input
                            placeholder="Describe your graph or extracted text (you can edit this)"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !feedback && handleSubmit()}
                            disabled={!!feedback}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    if (isDiscussingTopic) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
                <Card className="w-full max-w-2xl rounded-2xl shadow-2xl">
                    <CardHeader className="space-y-2 text-center">
                        <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
                            <MessageCircle className="w-8 h-8" />
                            MathLingo Topic Discussion
                        </CardTitle>
                        <div className="text-sm text-gray-500">
                            Let's find the perfect math problems for you!
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Conversation History */}
                        <div className="max-h-96 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg">
                            {conversationHistory.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                            msg.role === 'user'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-white border border-gray-200'
                                        }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {discussionLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
                                        <Loader2 className="animate-spin w-4 h-4" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Tell me about your math interests..."
                                value={currentMessage}
                                onChange={(e) => setCurrentMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleTopicMessage()}
                                disabled={discussionLoading}
                            />
                            <Button
                                onClick={handleTopicMessage}
                                disabled={discussionLoading || !currentMessage.trim()}
                            >
                                {discussionLoading ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    "Send"
                                )}
                            </Button>
                        </div>

                        {/* Suggested Topics */}
                        <div className="space-y-2">
                            <div className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Or choose from these popular topics:
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {SUGGESTED_TOPICS.map((topic, idx) => (
                                    <Button
                                        key={idx}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => selectSuggestedTopic(topic)}
                                        className="text-left justify-start h-auto p-3"
                                    >
                                        {topic}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Start Button */}
                        {selectedTopic && (
                            <Button 
                                onClick={startProblemSet}
                                className="w-full"
                                size="lg"
                            >
                                <Target className="w-4 h-4 mr-2" />
                                Start 10 Problems on "{selectedTopic}"
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                    <div className="text-sm text-gray-500">
                        Level {level} • Problem {problemNumber}/{totalProblems} • Difficulty {currentDifficulty}/10
                    </div>
                    <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                        {renderQuestionTypeIcon()}
                        {questionType === 'text' && 'Text Input'}
                        {questionType === 'multiple_choice' && 'Multiple Choice'}
                        {questionType === 'formula_drawing' && 'Formula Drawing'}
                        {questionType === 'graphing' && 'Graphing'}
                    </div>
                    <div className="text-xs text-gray-400">{selectedTopic}</div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {problem ? (
                        <>
                            <p className="text-lg font-medium">{problem}</p>
                            
                            {renderQuestionInput()}
                            
                            {!feedback && (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading || (questionType === 'multiple_choice' && !selectedOption) || (questionType === 'text' && !answer.trim()) || ((questionType === 'formula_drawing' || questionType === 'graphing') && !answer.trim())}
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
                                    <Button className="w-full" onClick={nextProblem}>
                                        {problemNumber >= totalProblems ? "Complete Set ✓" : "Next ➜"}
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