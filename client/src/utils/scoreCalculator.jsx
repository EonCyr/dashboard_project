export const calculateStudentScores = (rawScores, studentBand) => {
  const parsed = typeof rawScores === 'string' ? JSON.parse(rawScores) : rawScores || {};
  const band = (studentBand || 'B').toUpperCase();
  
  let weights = { vocab: 0.25, pap: 0.35, writing: 0.20, lrc: 0.20 };
  if (band.startsWith('A')) weights = { vocab: 0.5, pap: 0.35, writing: 0.075, lrc: 0.075 };
  else if (band.startsWith('B')) weights = { vocab: 0.15, pap: 0.50, writing: 0.175, lrc: 0.175 };
  else if (band.startsWith('C')) weights = { vocab: 0.15, pap: 0.35, writing: 0.25, lrc: 0.25 };

  const calc = (obj) => Object.values(obj || {}).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
  
  const total = (
    (calc(parsed.vocab) * weights.vocab) +
    (calc(parsed['pa/phonics']) * weights.pap) +
    (calc(parsed.writing) * weights.writing) +
    (calc(parsed['listening/readingcomprehension']) * weights.lrc)
  ).toFixed(2);

  const formatItems = (obj) => Object.entries(obj || {}).map(([key, val]) => ({
    label: key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
    value: val ?? 'N/A'
  }));

  return {
    band,
    totalScore: total,
    score: parseFloat(total),
    scores: {
      vocab: { total: calc(parsed.vocab), items: formatItems(parsed.vocab) },
      pap: { total: calc(parsed['pa/phonics']), items: formatItems(parsed['pa/phonics']) },
      writing: { total: calc(parsed.writing), items: formatItems(parsed.writing) },
      lrc: { total: calc(parsed['listening/readingcomprehension']), items: formatItems(parsed['listening/readingcomprehension']) },
    }
  };
};