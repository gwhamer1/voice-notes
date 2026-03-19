export async function POST(req) {
  try {
    const { notes, transcript } = await req.json();
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK;

    if (!webhookUrl) {
      return Response.json({ error: 'GOOGLE_SHEETS_WEBHOOK not configured' }, { status: 500 });
    }

    const payload = {
      project: notes.project,
      title: notes.title,
      summary: notes.summary.join('\n'),
      action_items: notes.action_items.join('\n'),
      transcript: transcript,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Sheets webhook error: ${response.status}`);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Sheets error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
