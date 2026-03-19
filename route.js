export async function POST(req) {
  try {
    const { transcript, projects } = await req.json();

    if (!transcript || transcript.trim().length === 0) {
      return Response.json({ error: 'No transcript provided' }, { status: 400 });
    }

    const projectList = projects && projects.length > 0
      ? projects.map(p => `- ${p}`).join('\n')
      : '- SPS (Sustainable Paving Stones)\n- Pickleball Body\n- Roof Leads\n- AIL (Adventuring Into Life)\n- GP Scoop\n- General';

    const systemPrompt = `You are a note-taking assistant. You receive voice transcripts and extract structured notes.

Known projects:
${projectList}

Rules:
1. Detect which project this note belongs to by scanning for keywords or explicit mentions at the start ("this is for X", "re: X", etc.).
2. If no project is clearly mentioned, assign "General".
3. Extract 3-6 concise bullet points summarizing the key ideas.
4. Extract any clear action items (things to do, follow up on, call, build, etc.).
5. Respond ONLY with valid JSON, no markdown, no preamble.

JSON format:
{
  "project": "Project Name",
  "summary": ["bullet 1", "bullet 2", "bullet 3"],
  "action_items": ["action 1", "action 2"],
  "title": "3-5 word title for this note"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Transcript: "${transcript}"` }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    }

    return Response.json({ success: true, notes: parsed, transcript });
  } catch (err) {
    console.error('Process error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
