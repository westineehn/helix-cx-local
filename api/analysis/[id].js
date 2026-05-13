import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('account_analysis')
      .select('*')
      .eq('account_id', id)
      .single();
    if (error) return res.status(404).json({ error: 'No analysis found' });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase
      .from('account_analysis')
      .upsert({
        account_id: Number(id),
        health_score: body.healthScore,
        tldr: body.tldr,
        score_reasoning: body.scoreReasoning,
        signal_scores: body.signalScores,
        category_scores: body.categoryScores,
        next_action: body.nextAction,
        immediate_actions: body.immediateActions,
        weighted_factors: body.weightedFactors,
        risk_flags: body.riskFlags,
        expansion_signals: body.expansionSignals,
        qbr_talking_points: body.qbrTalkingPoints,
        coach_script: body.coachScript,
        analyzed_at: new Date().toISOString(),
      }, { onConflict: 'account_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
