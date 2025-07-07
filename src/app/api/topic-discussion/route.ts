import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY not configured. Please add it to your environment variables.",
          response: "I'd be happy to help you choose math topics! What kind of problems interest you?",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const { message, conversationHistory = [] } = (await req.json()) as { 
      message: string; 
      conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }> 
    };

    const systemPrompt = `You are a helpful math tutor helping a student choose what type of math problems they want to work on. 

Your goal is to:
1. Understand what math topics interest them
2. Help them articulate their preferences clearly
3. Suggest appropriate difficulty levels
4. Ask clarifying questions to better understand their needs
5. Eventually help them settle on a specific topic area

Keep responses friendly and encouraging. Ask follow-up questions to better understand their interests and skill level. Don't be too formal - be conversational and supportive.

After a few exchanges, if they seem ready, help them summarize their preferences into a clear topic description that can be used to generate problems.`;

    const messages = [
      { role: "user" as const, content: systemPrompt },
      ...conversationHistory,
      { role: "user" as const, content: message }
    ];

    const msg = await anthropic.messages.create({
      model: "claude-3-7-sonnet-latest",
      max_tokens: 500,
      messages: messages,
    });

    const response = msg.content?.[0]?.type === 'text' ? msg.content[0].text : "";

    return new Response(
      JSON.stringify({ response }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Topic discussion API error:', error);
    return new Response(
      JSON.stringify({
        error: "Failed to process message. Please try again.",
        response: "I'm having trouble understanding. Could you try rephrasing that?"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
} 