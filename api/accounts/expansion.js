import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id, name, company, arr, contract_end,
      usage_utilization, usage_change_30d,
      expansion_history_arr, expansion_signals,
      engagement_exec_sponsor, engagement_last_touch_days,
      champion_stable
    `)
    .gte('usage_utilization', 70)
    .order('expansion_history_arr', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const enriched = data
    .filter(a => a.expansion_history_arr > 0 || (a.expansion_signals && !a.expansion_signals.startsWith('None')))
    .map(a => ({
      id: a.id,
      name: a.name,
      arr: a.arr,
      utilizationPct: a.usage_utilization,
      utilizationTrend30d: a.usage_change_30d,
      expansionHistoryArr: a.expansion_history_arr,
      expansionSignals: a.expansion_signals,
      execSponsorStatus: a.engagement_exec_sponsor,
      daysSinceTouch: a.engagement_last_touch_days,
      opportunityScore:
        (a.expansion_history_arr > 300000 ? 30 : a.expansion_history_arr > 100000 ? 20 : 10) +
        (a.usage_utilization >= 90 ? 20 : a.usage_utilization >= 80 ? 10 : 5) +
        (a.usage_change_30d > 15 ? 15 : a.usage_change_30d > 5 ? 8 : 0) +
        (a.engagement_exec_sponsor === 'highly active' ? 15 : a.engagement_exec_sponsor === 'active' ? 8 : 0),
    }))
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  return res.status(200).json({
    count: enriched.length,
    accounts: enriched,
    generatedAt: new Date().toISOString(),
  });
}
