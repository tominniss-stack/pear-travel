import { NextResponse } from 'next/server';

export async function GET() {
  return Response.json({ status: 'ok' }, { status: 200 });
}
