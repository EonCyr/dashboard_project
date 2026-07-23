
export const loadData = async (role, username, setMetrics, setIsLoading) => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/students?role=${role}&username=${username}`);
    const students = await response.json();
    
    const studentMetrics = students.map((student) => {
      const parsedScores = typeof student.scores === 'string' 
        ? JSON.parse(student.scores) 
        : student.scores || {};

      // Helper to convert sub-objects into readable strings if they are objects
      const formatScoreField = (field) => {
        if (!field) return 'N/A';
        if (typeof field === 'object') {
          return Object.entries(field)
            .map(([key, val]) => `${key.replace(/_/g, ' ')}: ${val}`)
            .join(' | ');
        }
        return field;
      };

      const bandValue = (student.value || student.band || 'N/A').toUpperCase();

      // Default to fall back upon
      let weights = { vocab: 0.25, pap: 0.35, writing: 0.20, lrc: 0.20 }; // Default fallback
    
      if (bandValue.startsWith('A')) {
        // Example weights for Band A (e.g., heavier emphasis on writing and advanced comprehension)
        weights = { vocab: 0.5, pap: 0.35, writing: 0.075, lrc: 0.075 };
      } else if (bandValue.startsWith('B')) {
        // Example weights for Band B (e.g., balanced core skills focus)
        weights = { vocab: 0.15, pap: 0.50, writing: 0.175, lrc: 0.175 };
      } else if (bandValue.startsWith('C')) {
        // Example weights for Band C (e.g., heavier emphasis on foundational vocab and phonics)
        weights = { vocab: 0.15, pap: 0.35, writing: 0.25, lrc: 0.25 };
      }

      // Helper to calculate total sum and keep raw entries array
      const processCategory = (categoryObj) => {
        if (!categoryObj || typeof categoryObj !== 'object') {
          return { total: 0, items: [] };
        }
        
        const entries = Object.entries(categoryObj);
        const total = entries.reduce((acc, [, val]) => acc + (parseFloat(val) || 0), 0);
        
        // Map into clean label-value pairs for row rendering
        const items = entries.map(([key, val]) => ({
          label: key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), // Capitalize first letter
          value: val ?? 'N/A'
        }));

        return { total, items };
      };

      const vocabData = processCategory(parsedScores.vocab);
      const papData = processCategory(parsedScores['pa/phonics']);
      const writingData = processCategory(parsedScores.writing);
      const lrcData = processCategory(parsedScores['listening/readingcomprehension']);

      // Calculate final weighted score
      const finalWeightedScore = (
        (vocabData.total * weights.vocab) +
        (papData.total * weights.pap) +
        (writingData.total * weights.writing) +
        (lrcData.total * weights.lrc)
      ).toFixed(2);

      return {
        id: student.studentid,
        name: student.name || `Student ${student.studentid}`,
        value: bandValue,
        semester: student.semester || 'N/A',
        totalScore: finalWeightedScore,
        scores: {
          vocab: vocabData,
          pap: papData,
          writing: writingData,
          lrc: lrcData,
          // vocab: formatScoreField(parsedScores.vocab),
          // pap: formatScoreField(parsedScores['pa/phonics']),
          // writing: formatScoreField(parsedScores.writing),
          // lrc: formatScoreField(parsedScores['listening/readingcomprehension']),
        },
      };
    });
    setMetrics(studentMetrics);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setIsLoading(false);
  }
};