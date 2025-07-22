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
    ThumbsUp,
    ThumbsDown,
} from "lucide-react";
import DrawingPad from "./DrawingPad";
import GraphingPad from "./GraphingPad";
import { problemCache } from "@/lib/cache";

const SUGGESTED_TOPICS = [
    {
        label: "Geometry and Shapes",
        icon: <StarIcon className="w-5 h-5 text-green-400 mr-2" />,
        value: "Geometry and shapes"
    },
    {
        label: "Calculus",
        icon: <FlameIcon className="w-5 h-5 text-green-500 mr-2" />,
        value: "Calculus fundamentals"
    }
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

// Utility: get allowed question types for a topic
function getAllowedQuestionTypes(topic: string): QuestionType[] {
    if (!topic) return ['text', 'multiple_choice', 'formula_drawing'];
    const t = topic.toLowerCase();
    if (t.includes('calculus') || t.includes('geometry') || t.includes('graph') || t.includes('shapes')) {
        return ['text', 'multiple_choice', 'formula_drawing', 'graphing'];
    }
    // Add more topics as needed
    return ['text', 'multiple_choice', 'formula_drawing'];
}

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
    const [totalProblems] = useState(6);

    // Drawing state
    const [drawingImage, setDrawingImage] = useState<string | null>(null);
    const [imageProcessing, setImageProcessing] = useState(false);
    const [loadingState, setLoadingState] = useState<null | 'grading' | 'nextQuestion'>(null); // 'grading' or 'nextQuestion' or null

    // Gamification state
    const [xp, setXp] = useState(0);
    const [hearts, setHearts] = useState(3);
    const [streak, setStreak] = useState(0);
    const [level, setLevel] = useState(1);
    // Game over state
    const [gameOver, setGameOver] = useState(false);

    // Attempt and feedback state
    const [attemptId, setAttemptId] = useState<number | null>(null);
    const [showFeedbackUI, setShowFeedbackUI] = useState(false);
    const [thumbs, setThumbs] = useState<null | boolean>(null);
    const [comment, setComment] = useState("");
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);

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
        
        // Check if the last assistant message is a 'let's work on' message
        const lastAssistantMsg = conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1] : null;
        const letsWorkOnMatch = lastAssistantMsg && lastAssistantMsg.role === 'assistant' && lastAssistantMsg.content.match(/let's work on \"(.+?)\"/i);
        if (letsWorkOnMatch) {
            // Extract topic from assistant message if not already set
            const topic = letsWorkOnMatch[1];
            if (!selectedTopic) {
                setSelectedTopic(topic);
            }
            setIsDiscussingTopic(false);
            setConversationHistory(prev => [...prev, { role: 'user', content: currentMessage }]);
            setCurrentMessage("");
            setDiscussionLoading(false);
            // Start the problem set after a short delay to allow state updates
            setTimeout(() => {
                fetchProblem();
            }, 0);
            return;
        }

        // Count user messages in topic discussion
        const userMsgCount = conversationHistory.filter(msg => msg.role === 'user').length + 1; // +1 for this message
        if (userMsgCount >= 3) {
            // Try to extract topic from last assistant message
            let topic = selectedTopic;
            if (!topic) {
                const lastAssistant = conversationHistory.slice().reverse().find(msg => msg.role === 'assistant');
                const match = lastAssistant && lastAssistant.content.match(/(?:let's work on|topic is|problems on) \"?([^"]+)\"?/i);
                if (match) {
                    topic = match[1];
                } else {
                    topic = currentMessage;
                }
            }
            setSelectedTopic(topic);
            setIsDiscussingTopic(false);
            setConversationHistory(prev => [
                ...prev,
                { role: 'user', content: currentMessage },
                { role: 'assistant', content: `Great! Let's get started on "${topic}". I'll generate 10 problems for you.` }
            ]);
            setCurrentMessage("");
            setDiscussionLoading(false);
            setTimeout(() => {
                fetchProblem();
            }, 0);
            return;
        }
        
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
            const allowedQuestionTypes = getAllowedQuestionTypes(selectedTopic);
            const res = await fetch("/api/problem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    topic: selectedTopic,
                    difficulty: currentDifficulty,
                    problemHistory: problemHistory,
                    allowedQuestionTypes // NEW: pass allowed types
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
            setAttemptId(null);
            setShowFeedbackUI(false);
            setThumbs(null);
            setComment("");
            setFeedbackSubmitted(false);
            setStartTime(Date.now());
            
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
        if (!imageData) return "";
        setImageProcessing(true);
        try {
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
            return data.extractedText || "";
        } catch (e) {
            console.error('Error processing drawing:', e);
            return "";
        } finally {
            setImageProcessing(false);
        }
    };

    const handleSubmit = async () => {
        if (!problemId) return;
        setLoading(true);
        setLoadingState('grading');
        let submissionAnswer = "";
        let processedAnswer = answer;
        // If drawing/graphing, process image on submit
        if ((questionType === 'formula_drawing' || questionType === 'graphing') && drawingImage) {
            processedAnswer = await processDrawing(drawingImage);
            setAnswer(processedAnswer); // update input with extracted text
        }
        if (questionType === 'multiple_choice') {
            submissionAnswer = selectedOption;
        } else {
            submissionAnswer = processedAnswer;
        }
        try {
            const currentProblem = problemCache.get(problemId);
            let problemToSubmit;
            if (!currentProblem) {
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
            const feedbackData = {
                correct: data.isCorrect,
                explanation: data.feedback || (data.isCorrect ? "Correct!" : "Incorrect."),
                xpGained: data.isCorrect ? 10 : 0
            };
            setFeedback(feedbackData);
            setProblemHistory(prev => [...prev, {
                correct: data.isCorrect,
                difficulty: currentDifficulty
            }]);
            if (data.isCorrect) {
                setXp((x) => x + feedbackData.xpGained);
                setStreak((s) => s + 1);
                if ((xp + feedbackData.xpGained) / 100 >= level) setLevel((l) => l + 1);
            } else {
                setHearts((h) => {
                    const newHearts = Math.max(h - 1, 0);
                    if (newHearts === 0) {
                        setGameOver(true);
                    }
                    return newHearts;
                });
                setStreak(0);
            }
            const timeTaken = startTime ? Math.round((Date.now() - startTime) / 1000) : null;
            const attemptRes = await fetch("/api/attempt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: null,
                    question_text: problem,
                    student_answer: submissionAnswer,
                    llm_answer: feedbackData.explanation,
                    time_taken_seconds: timeTaken,
                    points: feedbackData.xpGained,
                    topic: selectedTopic,
                    difficulty: currentDifficulty,
                }),
            });
            const attemptData = await attemptRes.json();
            setAttemptId(attemptData.id);
            setShowFeedbackUI(true);
        } catch (e) {
            console.error(e);
            setFeedback({
                correct: false,
                explanation: "An error occurred while grading your answer. Please try again.",
                xpGained: 0
            });
        } finally {
            setLoading(false);
            setLoadingState(null);
        }
    };

    const handleFeedbackSubmit = async () => {
        if (!attemptId || thumbs === null) return;
        setLoading(true);
        setFeedbackError(null);
        try {
            const res = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    attempt_id: attemptId,
                    thumbs_up: thumbs,
                    comment,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit feedback');
            }
            setFeedbackSubmitted(true);
            setShowFeedbackUI(false);
        } catch (e) {
            setFeedbackError((e as Error)?.message || 'Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const nextProblem = () => {
        setLoadingState('nextQuestion');
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
            setLoadingState(null);
        } else {
            fetchProblem().then(() => setLoadingState(null));
        }
        setShowFeedbackUI(false);
        setThumbs(null);
        setComment("");
        setFeedbackSubmitted(false);
    };

    // Game Over handler
    const handleRestart = () => {
        setGameOver(false);
        setIsDiscussingTopic(true);
        setConversationHistory([
            {
                role: 'assistant',
                content: "Hi! I'm here to help you choose what math problems to work on. What kind of math topics interest you? You can tell me about subjects you enjoy, things you find challenging, or areas you'd like to improve in!"
            }
        ]);
        setCurrentMessage("");
        setDiscussionLoading(false);
        setSelectedTopic("");
        setProblem(null);
        setProblemId(null);
        setQuestionType('text');
        setAnswer("");
        setSelectedOption("");
        setOptions([]);
        setCurrentProblemData(null);
        setFeedback(null);
        setLoading(false);
        setCurrentDifficulty(3);
        setProblemHistory([]);
        setProblemNumber(0);
        setDrawingImage(null);
        setImageProcessing(false);
        setLoadingState(null);
        setXp(0);
        setHearts(3);
        setStreak(0);
        setLevel(1);
        setAttemptId(null);
        setShowFeedbackUI(false);
        setThumbs(null);
        setComment("");
        setFeedbackSubmitted(false);
        setStartTime(null);
        setFeedbackError(null);
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
                        disabled={!!feedback || loadingState !== null}
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
                                    disabled={!!feedback || loadingState !== null}
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
                                // No auto-processing here
                            }}
                            disabled={!!feedback || loadingState !== null}
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
                            disabled={!!feedback || loadingState !== null}
                        />
                    </div>
                );
            case 'graphing':
                return (
                    <div className="space-y-4">
                        <GraphingPad
                            onDrawingChange={(imageData) => {
                                setDrawingImage(imageData);
                                // No auto-processing here
                            }}
                            disabled={!!feedback || loadingState !== null}
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
                            disabled={!!feedback || loadingState !== null}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    if (gameOver || problemNumber >= totalProblems) {
        // If hearts are 0, show hearts game over, else show completion game over
        const outOfHearts = hearts === 0;
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-100 via-yellow-50 to-blue-100 p-4">
                <Card className="w-full max-w-2xl rounded-3xl shadow-2xl border-4 border-dashed border-red-300">
                    <CardHeader className="space-y-2 text-center">
                        <CardTitle className={`text-4xl font-extrabold flex items-center justify-center gap-3 ${outOfHearts ? 'text-red-600' : 'text-green-600'} drop-shadow`}>
                            <HeartIcon className={`w-10 h-10 ${outOfHearts ? 'text-red-400' : 'text-green-400'} animate-bounce`} />
                            Game Over
                        </CardTitle>
                        <div className="text-base text-gray-700 font-semibold flex flex-col items-center justify-center">
                            <span className="mb-2">{outOfHearts ? '💔' : '🎉'}</span>
                            <span className="max-w-xl mx-auto text-center">
                                {outOfHearts
                                    ? "You've run out of hearts!"
                                    : "You've completed all the questions!"}
                                <br/>Here are your stats for this run:
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center gap-4 text-lg font-semibold">
                            <div className="flex items-center gap-2">
                                <StarIcon className="w-6 h-6 text-yellow-500" /> XP: {xp}
                            </div>
                            <div className="flex items-center gap-2">
                                <FlameIcon className="w-6 h-6 text-orange-500" /> Streak: {streak}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-blue-600 font-bold">Level: {level}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-green-600 font-bold">Problems Solved: {problemNumber}</span>
                            </div>
                        </div>
                        <Button 
                            onClick={handleRestart}
                            className="w-full mt-4 rounded-2xl bg-green-400 hover:bg-green-500 text-white text-xl font-bold shadow-lg animate-pulse"
                            size="lg"
                        >
                            <Target className="w-5 h-5 mr-2" />
                            Start Again
                        </Button>
                        <div className="text-center text-gray-500 text-sm">Choose a topic or enter what to practice next!</div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isDiscussingTopic) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-100 via-yellow-50 to-blue-100 p-4">
                <Card className="w-full max-w-2xl rounded-3xl shadow-2xl border-4 border-dashed border-green-200">
                    <CardHeader className="space-y-2 text-center">
                        <CardTitle className="text-4xl font-extrabold flex items-center justify-center gap-3 text-green-600 drop-shadow">
                            <MessageCircle className="w-10 h-10 text-blue-400 animate-bounce" />
                            MathLingo
                        </CardTitle>
                        <div className="text-base text-gray-700 font-semibold flex flex-col items-center justify-center">
                            <span className="mb-2">🎉</span>
                            <span className="max-w-xl mx-auto text-center">Hi! I'm here to help you choose what math problems to work on.<br/>What kind of math topics interest you? You can tell me about subjects you enjoy, things you find challenging, or areas you'd like to improve in!</span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Conversation History */}
                        <div className="max-h-80 overflow-y-auto space-y-3 p-4 bg-white/70 rounded-lg border border-blue-100 shadow-inner">
                            {conversationHistory.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl font-medium shadow-md transition-all duration-200 ${
                                            msg.role === 'user'
                                                ? 'bg-blue-400 text-white border-2 border-blue-300'
                                                : 'bg-green-100 text-green-700 border-2 border-green-200'
                                        }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {discussionLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-green-100 border border-green-200 px-4 py-2 rounded-2xl">
                                        <Loader2 className="animate-spin w-4 h-4 text-green-400" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <div className="flex gap-2 items-center">
                            <Input
                                placeholder="Tell me about your math interests..."
                                value={currentMessage}
                                onChange={(e) => setCurrentMessage(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleTopicMessage()}
                                disabled={discussionLoading}
                                className="rounded-xl border-2 border-blue-200 focus:ring-green-200"
                            />
                            <Button
                                onClick={handleTopicMessage}
                                disabled={discussionLoading || !currentMessage.trim()}
                                className="rounded-xl bg-green-400 hover:bg-green-500 text-white font-bold shadow"
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
                            <div className="text-base font-bold text-gray-700 flex items-center gap-2 justify-center">
                                <BookOpen className="w-5 h-5 text-blue-400" />
                                Or choose a topic to get started:
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 justify-center items-center mt-2">
                                {SUGGESTED_TOPICS.map((topic, idx) => (
                                    <Button
                                        key={idx}
                                        variant="outline"
                                        size="lg"
                                        onClick={() => selectSuggestedTopic(topic.value)}
                                        className="flex items-center gap-2 px-6 py-4 rounded-2xl border-2 border-green-200 bg-white hover:bg-green-50 text-lg font-semibold shadow-md transition-all duration-200 hover:scale-105"
                                    >
                                        {topic.icon}
                                        {topic.label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Start Button */}
                        {selectedTopic && (
                            <Button 
                                onClick={startProblemSet}
                                className="w-full mt-4 rounded-2xl bg-blue-400 hover:bg-blue-500 text-white text-xl font-bold shadow-lg animate-pulse"
                                size="lg"
                            >
                                <Target className="w-5 h-5 mr-2" />
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
                                    disabled={loadingState !== null || (questionType === 'multiple_choice' && !selectedOption) || (questionType === 'text' && !answer.trim()) || ((questionType === 'formula_drawing' || questionType === 'graphing') && !drawingImage)}
                                    className="w-full"
                                >
                                    {loadingState === 'grading' ? (
                                        <Loader2 className="animate-spin" />
                                    ) : (
                                        "Submit"
                                    )}
                                </Button>
                            )}
                            {/* Loading overlays/messages */}
                            {loadingState === 'grading' && (
                                <div className="flex items-center justify-center gap-2 text-blue-500 font-semibold mt-2 animate-pulse">
                                    <Loader2 className="animate-spin w-4 h-4" /> Grading answer...
                                </div>
                            )}
                            {loadingState === 'nextQuestion' && (
                                <div className="flex items-center justify-center gap-2 text-blue-500 font-semibold mt-2 animate-pulse">
                                    <Loader2 className="animate-spin w-4 h-4" /> Loading next question...
                                </div>
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
                                            {feedbackError && (
                                                <div className="text-red-600 text-xs mb-2">{feedbackError}</div>
                                            )}
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
                                    <Button className="w-full" onClick={nextProblem} disabled={loadingState !== null}>
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