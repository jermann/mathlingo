import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, question_text, student_answer, llm_answer, time_taken_seconds, points } = body;
    const result = await query(
      `INSERT INTO attempts (user_id, question_text, student_answer, llm_answer, time_taken_seconds, points)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [user_id || null, question_text, student_answer, llm_answer, time_taken_seconds, points]
    );
    return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error)?.message || String(error) }, { status: 500 });
  }
} 