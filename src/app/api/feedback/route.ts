import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  console.log('Feedback API route hit');
  try {
    const body = await req.json();
    const { attempt_id, thumbs_up, comment } = body;
    const result = await query(
      `INSERT INTO feedback (attempt_id, thumbs_up, comment)
       VALUES ($1, $2, $3) RETURNING id`,
      [attempt_id, thumbs_up, comment]
    );
    return NextResponse.json({ id: result.rows[0].id }, { status: 201 });
  } catch (error) {
    let parsedBody = null;
    try {
      parsedBody = await req.json();
    } catch (e) {
      parsedBody = 'Could not parse body (already consumed or invalid JSON)';
    }
    console.error('Feedback API error:', {
      body: parsedBody,
      error: error instanceof Error ? error.stack : error
    });
    return NextResponse.json({ error: (error as Error)?.message || String(error), stack: (error as Error)?.stack }, { status: 500 });
  }
} 