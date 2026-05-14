const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  const { id } = req.query;

  // PUT /api/accounts/:id — update account
  if (req.method === 'PUT') {
    const a = req.body;
    const { data, error } = await supabase
      .from('accounts')
      .update({
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
        renewal_updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // DELETE /api/accounts/:id
  if (req.method === 'DELETE') {
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
