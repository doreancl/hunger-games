import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/feedback/route';

describe('POST /api/feedback', () => {
  afterEach(() => {
    delete process.env.FEEDBACK_WEBHOOK_URL;
    delete process.env.RESEND_API_KEY;
    delete process.env.FEEDBACK_EMAIL_TO;
    delete process.env.FEEDBACK_EMAIL_FROM;
    vi.restoreAllMocks();
  });

  it('accepts valid feedback', async () => {
    process.env.FEEDBACK_WEBHOOK_URL = 'https://example.test/feedback';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        referer: 'http://localhost/new',
        'user-agent': 'vitest'
      },
      body: JSON.stringify({
        message: 'La partida se entiende bien.',
        rating: 'happy'
      })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.test/feedback',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'La partida se entiende bien.',
          rating: 'happy',
          userAgent: 'vitest',
          referer: 'http://localhost/new'
        })
      })
    );
  });

  it('sends feedback through Resend when email config exists', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    process.env.FEEDBACK_EMAIL_TO = 'team@example.test';
    process.env.FEEDBACK_EMAIL_FROM = 'feedback@example.test';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'Necesita mas claridad.',
        rating: null
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer resend-key',
          'Content-Type': 'application/json'
        })
      })
    );
  });

  it('returns delivery error when no delivery channel is configured', async () => {
    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: 'La partida se entiende bien.',
        rating: 'happy'
      })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'no_delivery_config' });
  });

  it('returns invalid request for invalid JSON', async () => {
    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid-json'
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'invalid_request' });
  });

  it('requires a message', async () => {
    const request = new Request('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '', rating: 'happy' })
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Message is required' });
  });
});
