import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const message = String(body.message || '').slice(0, 4000);
    const rating = ['sad', 'neutral', 'happy'].includes(String(body.rating))
      ? String(body.rating)
      : '';
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';

    if (!message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1) Send via Resend if configured
    const resendApiKey = process.env.RESEND_API_KEY;
    const to = process.env.FEEDBACK_EMAIL_TO;
    if (resendApiKey && to) {
      const subject = 'Hunger Games feedback';
      const content = `Feedback:\n\n${message}\n\nRating: ${
        rating || '(not provided)'
      }\nUA: ${userAgent}\nRef: ${referer}`;
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
        body: JSON.stringify({ message, rating, userAgent, referer })
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
