const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('accounts')
    .select(`
      id, name, company, arr, contract_end, tenure_months,
      usage_utilization, usage_change_30d,
      support_severity, engagement_last_touch_days,
      engagement_exec_sponsor, champion_stable,
      renewal_probability, renewal_competitive,
      renewal_updated_at
    `)
    .or('renewal_probability.eq.at-risk,support_severity.eq.high')
    .order('arr', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Enrich with computed urgency score for agent prioritization
  const enriched = data.map(a => ({
    id: a.id,
    name: a.name,
    arr: a.arr,
    contractEnd: a.contract_end,
    renewalProbability: a.renewal_probability,
    competitiveExposure: a.renewal_competitive,
    utilizationPct: a.usage_utilization,
    utilizationTrend30d: a.usage_change_30d,
    daysSinceTouch: a.engagement_last_touch_days,
    execSponsorStatus: a.engagement_exec_sponsor,
    championStable: a.champion_stable,
    supportSeverity: a.support_severity,
    // Urgency score for agent sorting — higher = needs attention sooner
    urgencyScore:
      (a.renewal_probability === 'at-risk' ? 30 : a.renewal_probability === 'medium' ? 15 : 0) +
      (a.renewal_competitive === 'active-eval' ? 25 : a.renewal_competitive === 'rumored' ? 10 : 0) +
      (a.usage_change_30d < -15 ? 20 : a.usage_change_30d < -5 ? 10 : 0) +
      (a.engagement_last_touch_days > 45 ? 15 : a.engagement_last_touch_days > 25 ? 8 : 0) +
      (!a.champion_stable ? 10 : 0),
  })).sort((a, b) => b.urgencyScore - a.urgencyScore);

  return res.status(200).json({
    count: enriched.length,
    accounts: enriched,
    generatedAt: new Date().toISOString(),
  });
}
