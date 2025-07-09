import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY not configured",
          extractedText: "",
          isCorrect: false
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const contentType = req.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle drawing questions (image upload)
      return await handleDrawingQuestion(req);
    } else {
      // Handle other question types (JSON)
      return await handleOtherQuestionTypes(req);
    }
  } catch (error) {
    console.error('Solve API error:', error);
    return new Response(
      JSON.stringify({
        error: "Failed to process request. Please try again.",
        extractedText: "",
        isCorrect: false
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleDrawingQuestion(req: NextRequest) {
  const formData = await req.formData();
  const imageFile = formData.get('image') as File;
  const questionType = formData.get('questionType') as string;
  
  if (!imageFile) {
    return new Response(
      JSON.stringify({ 
        error: "No image provided",
        extractedText: "",
        isCorrect: false
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Convert image to base64
  const bytes = await imageFile.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const base64Image = buffer.toString('base64');
  
  // Validate and set mime type
  let mimeType = imageFile.type;
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)) {
    mimeType = 'image/png'; // Default fallback
  }

  // Different prompts for different drawing question types
  let prompt = "Please extract the mathematical expression or equation from this image. Return only the mathematical text in a clear, readable format.";
  
  if (questionType === 'formula_drawing') {
    prompt = "Please extract the mathematical formula or expression from this image. Return only the mathematical text in a clear, readable format. If there are multiple expressions, separate them clearly.";
  } else if (questionType === 'graphing') {
    prompt = `Please analyze this graph or coordinate plot. Identify and list the coordinates of all labeled points, especially the vertex and x-intercepts. If coordinates are written on the graph, use those. Describe the general shape and any mathematical relationships shown. Return a clear description. When grading, use the following rubric: 
- 1 point for correct general shape (e.g., parabola opening up)
- 1 point for correct vertex location
- 1 point for each correctly labeled x-intercept
- 1 point for correctly labeled y-intercept
- 1 point for at least 5 points plotted
Award partial credit and provide feedback for each part.`;
  }

  // Use Claude Vision to extract text from the image
  const msg = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64Image
            }
          }
        ]
      }
    ]
  });

  const extractedText = msg.content?.[0]?.type === 'text' ? msg.content[0].text.trim() : "";

  return new Response(
    JSON.stringify({ 
      extractedText,
      isCorrect: true // For drawing questions, we just extract text, grading happens on frontend
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

async function handleOtherQuestionTypes(req: NextRequest) {
  const body = await req.json();
  const { problem, answer, questionType } = body;

  if (!problem || !answer || !questionType) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: problem, answer, or questionType",
        extractedText: "",
        isCorrect: false
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let isCorrect = false;
  let feedback = "";

  switch (questionType) {
    case 'text':
      // For text questions, use Claude to grade the answer
      const textResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Problem: ${problem.prompt}\n\nStudent's answer: ${answer}\n\nPlease grade this answer. Respond with only a JSON object in this exact format:\n{\n  "isCorrect": true/false,\n  "feedback": "brief explanation of why the answer is correct or incorrect"\n}`
          }
        ]
      });

      try {
        const textContent = textResponse.content[0];
        if (textContent.type === 'text') {
          const textResult = JSON.parse(textContent.text);
          isCorrect = textResult.isCorrect;
          feedback = textResult.feedback;
        } else {
          throw new Error('Unexpected response type');
        }
      } catch (e) {
        // Fallback grading
        isCorrect = false;
        feedback = "Unable to grade answer automatically.";
      }
      break;

    case 'multiple_choice':
      // For multiple choice, check if the selected option is correct
      // The answer should be the letter (A, B, C) and we need to check against the correct option
      const mcResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Problem: ${problem.prompt}\n\nOptions: ${JSON.stringify(problem.options)}\n\nStudent selected: ${answer}\n\nPlease determine if the selected answer is correct. Respond with only a JSON object in this exact format:\n{\n  "isCorrect": true/false,\n  "feedback": "brief explanation"\n}`
          }
        ]
      });

      try {
        const mcContent = mcResponse.content[0];
        if (mcContent.type === 'text') {
          const mcResult = JSON.parse(mcContent.text);
          isCorrect = mcResult.isCorrect;
          feedback = mcResult.feedback;
        } else {
          throw new Error('Unexpected response type');
        }
      } catch (e) {
        // Fallback grading
        isCorrect = false;
        feedback = "Unable to grade answer automatically.";
      }
      break;

    case 'formula_drawing':
    case 'graphing':
      // For drawing questions, we expect the answer to be the extracted text from the image
      // Grade based on the problem prompt and the extracted answer
      const drawingResponse = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Problem: ${problem.prompt}\n\nStudent's answer (extracted from drawing): ${answer}\n\nPlease grade this answer using the following rubric (if applicable):\n- 1 point for correct general shape (e.g., parabola opening up)\n- 1 point for correct vertex location\n- 1 point for each correctly labeled x-intercept\n- 1 point for correctly labeled y-intercept\n- 1 point for at least 5 points plotted\nAward partial credit and provide feedback for each part. Respond with only a JSON object in this exact format:\n{\n  \"score\": <number>,\n  \"maxScore\": <number>,\n  \"isCorrect\": true/false,\n  \"feedback\": \"detailed feedback for each rubric item\"\n}`
          }
        ]
      });

      try {
        const drawingContent = drawingResponse.content[0];
        if (drawingContent.type === 'text') {
          const drawingResult = JSON.parse(drawingContent.text);
          isCorrect = drawingResult.isCorrect;
          feedback = drawingResult.feedback;
          // Optionally, you can also return score and maxScore for frontend display
        } else {
          throw new Error('Unexpected response type');
        }
      } catch (e) {
        // Fallback grading
        isCorrect = false;
        feedback = "Unable to grade answer automatically.";
      }
      break;

    default:
      return new Response(
        JSON.stringify({
          error: `Unsupported question type: ${questionType}`,
          extractedText: "",
          isCorrect: false
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
  }

  return new Response(
    JSON.stringify({
      extractedText: answer,
      isCorrect,
      feedback
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
} 