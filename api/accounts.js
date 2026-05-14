const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Map flat DB row back to the nested shape App.jsx expects
const toAccount = (row) => ({
  id: row.id,
  name: row.name,
  company: row.company,
  industry: row.industry,
  logo: row.logo,
  arr: row.arr,
  contractEnd: row.contract_end,
  tenureMonths: row.tenure_months,
  usage: {
    utilization: row.usage_utilization,
    change30d: row.usage_change_30d,
    trend: row.usage_trend,
  },
  support: {
    tickets30d: row.support_tickets_30d,
    severity: row.support_severity,
    sentiment: row.support_sentiment,
    csat: row.support_csat,
  },
  engagement: {
    lastQbr: row.engagement_last_qbr,
    execSponsorStatus: row.engagement_exec_sponsor,
    lastTouchDays: row.engagement_last_touch_days,
    qbrAttendance: row.engagement_qbr_attendance,
  },
  expansion: {
    historyArr: row.expansion_history_arr,
    historyNote: row.expansion_history_note,
    signals: row.expansion_signals,
  },
  relationship: {
    championStable: row.champion_stable,
    recentChanges: row.champion_changes,
  },
  external: row.external_context,
  renewal: {
    probability: row.renewal_probability,
    contractType: row.renewal_contract_type,
    autoRenew: row.renewal_auto_renew,
    competitiveExposure: row.renewal_competitive,
    updatedAt: row.renewal_updated_at,
  },
});

module.exports = async function handler(req, res) {
  // GET /api/accounts — return all accounts
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('arr', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data.map(toAccount));
  }

  // POST /api/accounts — create new account
  if (req.method === 'POST') {
    const a = req.body;
    const { data, error } = await supabase
      .from('accounts')
      .insert([{
        name: a.name, company: a.company, industry: a.industry, logo: a.logo,
        arr: a.arr, contract_end: a.contractEnd, tenure_months: a.tenureMonths,
        usage_utilization: a.usage.utilization, usage_change_30d: a.usage.change30d, usage_trend: a.usage.trend,
        support_tickets_30d: a.support.tickets30d, support_severity: a.support.severity,
        support_sentiment: a.support.sentiment, support_csat: a.support.csat,
        engagement_last_qbr: a.engagement.lastQbr, engagement_exec_sponsor: a.engagement.execSponsorStatus,
        engagement_last_touch_days: a.engagement.lastTouchDays, engagement_qbr_attendance: a.engagement.qbrAttendance,
        expansion_history_arr: a.expansion.historyArr, expansion_history_note: a.expansion.historyNote,
        expansion_signals: a.expansion.signals, champion_stable: a.relationship.championStable,
        champion_changes: a.relationship.recentChanges, external_context: a.external,
        renewal_probability: a.renewal.probability, renewal_contract_type: a.renewal.contractType,
        renewal_auto_renew: a.renewal.autoRenew, renewal_competitive: a.renewal.competitiveExposure,
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(toAccount(data));
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
