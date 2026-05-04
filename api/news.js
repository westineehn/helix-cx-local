const KEYWORDS = 'layoffs OR earnings OR acquisition OR leadership OR restructuring OR funding OR partnership OR expansion';

const truncate = (str, words = 12) => {
  const parts = str.split(' ');
  return parts.length <= words ? str : parts.slice(0, words).join(' ') + '...';
};

const fetchSerper = async (query, tbs, num, serperKey) => {
  const res = await fetch('https://google.serper.dev/news', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': serperKey },
    body: JSON.stringify({ q: query, num, tbs })
  });
  if (!res.ok) throw new Error(`Serper returned ${res.status}`);
  const data = await res.json();
  return data.news || [];
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serperKey = process.env.SERPER_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!serperKey) return res.status(500).json({ error: 'Serper API key not configured' });
  if (!anthropicKey) return res.status(500).json({ error: 'Anthropic API key not configured' });

  const { company, industry } = req.body;
  if (!company) return res.status(400).json({ error: 'Company name required' });

  try {
    // ── Step 1: Fetch news from Serper ──────────────────────────
    // Two queries: recent (~3 months) for specifics, broader (~6 months) for trajectory.
    const query = `"${company}" ${KEYWORDS}`;
    const [recentRaw, broaderRaw] = await Promise.all([
      fetchSerper(query, 'qdr:m3', 6, serperKey),
      fetchSerper(query, 'qdr:m6', 6, serperKey)
    ]);

    const recentUrls = new Set(recentRaw.map(a => a.link));
    const earlierRaw = broaderRaw.filter(a => !recentUrls.has(a.link));

    const toRecord = a => ({
      title: a.title || '',
      snippet: a.snippet || '',
      source: a.source || '',
      url: a.link,
      date: a.date || ''
    });

    const recent = recentRaw.map(toRecord);
    const earlier = earlierRaw.map(toRecord);

    if (recent.length === 0 && earlier.length === 0) {
      return res.status(200).json({
        summary: `No material news found for ${company} in the last 6 months.`,
        articles: [],
        fetchedAt: new Date().toISOString()
      });
    }

    // ── Step 2: Summarize via Claude ────────────────────────────
    const fmtForModel = (a, i) =>
      `${i + 1}. ${a.date ? `[${a.date}] ` : ''}${a.title}${a.snippet ? ` — ${a.snippet}` : ''} (${a.source})`;

    const recentBlock = recent.length
      ? `RECENT (last ~3 months):\n${recent.map(fmtForModel).join('\n')}`
      : 'RECENT (last ~3 months): none';
    const earlierBlock = earlier.length
      ? `EARLIER (3–6 months ago):\n${earlier.map(fmtForModel).join('\n')}`
      : 'EARLIER (3–6 months ago): none';

    const prompt = `You are a Senior Customer Success strategist briefing a CSM on ${company}${industry ? ` (${industry})` : ''} before an account conversation.

Write the summary in this exact structure, separated by blank lines:

Line 1 — TRAJECTORY: one line covering the 3–6 month direction of travel (e.g., "profitability improving, headcount cut twice, stock down ~40% YTD").

Lines 2–4 — SPECIFICS: 2–3 bullets, each starting with "• ", each ≤25 words, each citing source and approximate date inline (e.g., "• Q4 earnings beat estimates by 15% — Reuters, Feb 2026").

Last line — SO-WHAT: one line on the implication for the CSM. Pick the single most relevant lever: renewal risk, expansion opening, stakeholder stability, or competitive threat.

Total: 80–120 words.

Hard rules:
- Use only facts present in the sources below. Do not infer beyond them.
- Cite source and approximate date inline for every specific.
- If the company is private, focus on funding, headcount, leadership, and product moves. Do not invent stock or earnings data. If public, earnings and stock signals are fair game when present in the sources.
- Never use these hedge phrases: "under scrutiny", "warrant monitoring", "potential shifts", "signaling concerns", "ongoing discussions", "complex transition", "navigating challenges", "amid". Be concrete.
- If RECENT is empty or thin, say so explicitly in the trajectory line ("no material developments in last 3 months") rather than padding.
- Disambiguate: this is the company "${company}"${industry ? `, industry: ${industry}` : ''}. Ignore unrelated entities with the same name.

Sources:
${recentBlock}

${earlierBlock}

Return ONLY the summary in the structure above. No preamble, no section labels like "Trajectory:" — just the line, the bullets, and the so-what line, separated by blank lines.`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 350,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!claudeRes.ok) throw new Error(`Claude returned ${claudeRes.status}`);
    const claudeData = await claudeRes.json();
    const summary = claudeData.content?.map(c => c.text || '').join('').trim()
      || 'Summary unavailable — review articles below.';

    // For UI: prefer recent, fall back to earlier; truncate title for display only.
    const uiArticles = [...recent, ...earlier].slice(0, 3).map(a => ({
      title: truncate(a.title, 12),
      source: a.source,
      url: a.url,
      date: a.date || 'Recent'
    }));

    return res.status(200).json({
      summary,
      articles: uiArticles,
      fetchedAt: new Date().toISOString()
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
