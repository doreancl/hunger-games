import { type NextRequest, NextResponse } from 'next/server';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const rawMessage = String(body.message || '');
    const message = rawMessage.slice(0, 1000);
    const rating = ['sad', 'neutral', 'happy'].includes(String(body.rating))
      ? String(body.rating)
      : '';
    const email = String(body.email || '').slice(0, 254).trim();
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';

    if (message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must have at least 10 characters' },
        { status: 400 }
      );
    }

    if (rawMessage.length > 1000) {
      return NextResponse.json(
        { error: 'Message must have at most 1000 characters' },
        { status: 400 }
      );
    }

    if (email && !emailPattern.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // 1) Send via Resend if configured
    const resendApiKey = process.env.RESEND_API_KEY;
    const to = process.env.FEEDBACK_EMAIL_TO;
    if (resendApiKey && to) {
      const subject = 'Hunger Games feedback';
      const content = `Feedback:\n\n${message}\n\nRating: ${
        rating || '(not provided)'
      }\nContact email: ${email || '(not provided)'}\nUA: ${userAgent}\nRef: ${referer}`;
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.FEEDBACK_EMAIL_FROM || 'feedback@yourdomain.dev',
          to: [to],
          subject,
          text: content
        })
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return NextResponse.json({ error: 'email_failed', detail }, { status: 502 });
      }
      return NextResponse.json({ ok: true });
    }

    // 2) Fallback: POST raw JSON to webhook if configured (Slack/Discord/others)
    const webhook = process.env.FEEDBACK_WEBHOOK_URL;
    if (webhook) {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, rating, email, userAgent, referer })
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        return NextResponse.json({ error: 'webhook_failed', detail }, { status: 502 });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'no_delivery_config' }, { status: 500 });
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}
