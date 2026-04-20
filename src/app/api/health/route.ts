import { verifySmtpConnection } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function GET() {
  const smtpOk = await verifySmtpConnection();
  return Response.json({
    status: 'ok',
    smtp: smtpOk ? 'connected' : 'not configured or failed',
  }, { status: 200 });
}
