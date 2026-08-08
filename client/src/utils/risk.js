export function getRiskStatus(item, riskConfig) {

  const score = Number(item.totalScore || item.rawScore || 0);
  
  // 2. Extract Band
  const studentBand = (item.value || 'B').charAt(0).toUpperCase();

  // 3. Get config for band with fallback
  const bandConfig = riskConfig?.[studentBand] || riskConfig?.['B'] || {};

  // 4. Normalize threshold properties (handles camelCase AND snake_case)
  const critical = Number(bandConfig.criticalScore ?? bandConfig.critical_score ?? 20);
  const moderate = Number(bandConfig.moderateScore ?? bandConfig.moderate_score ?? 25);
  const highPerf = Number(bandConfig.highPerformerScore ?? bandConfig.high_performer_score ?? 28);
  const minWindow = Number(bandConfig.baselineWindow ?? bandConfig.baseline_window ?? 2);

  const historyCount = Number(item.scoresCount || item.assessmentsCount || 2);

  let statusTag = 'STABLE_PROGRESS';
  let statusLabel = 'On Track';

  if (historyCount < minWindow) {
    statusTag = 'INSUFFICIENT_DATA';
    statusLabel = 'Needs Baseline Data';
  } else if (score < critical) {
    statusTag = 'CRITICAL_RISK';
    statusLabel = 'Critical Intervention Needed';
  } else if (score >=critical && score < moderate) {
    statusTag = 'MODERATE_RISK';
    statusLabel = 'At-Risk / Stagnant';
  } else if (score >= highPerf) {
    statusTag = 'HIGH_PERFORMER';
    statusLabel = 'Exceeding Milestones';
  }

  return { statusTag, statusLabel };
}
