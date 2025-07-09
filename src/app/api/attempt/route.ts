import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  console.log('Attempt API route hit');
  try {
    const body = await req.json();
    const { user_id, question_text, student_answer, llm_answer, time_taken_seconds, points, topic, difficulty } = body;
    const result = await query(
      `INSERT INTO attempts (user_id, question_text, student_answer, llm_answer, time_taken_seconds, points, topic, difficulty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [user_id || null, question_text, student_answer, llm_answer, time_taken_seconds, points, topic, difficulty]
    );
    return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    let parsedBody = null;
    try {
      parsedBody = await req.json();
    } catch (e) {
      parsedBody = 'Could not parse body (already consumed or invalid JSON)';
    }
    console.error('Attempt API error:', {
      body: parsedBody,
      error: error instanceof Error ? error.stack : error
    });
    return NextResponse.json({ error: (error as Error)?.message || String(error), stack: (error as Error)?.stack }, { status: 500 });
  }
} 