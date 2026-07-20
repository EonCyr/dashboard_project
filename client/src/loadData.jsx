
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

      return {
        id: student.studentid,
        name: student.name,
        value: student.value || student.band || 'N/A',
        semester: student.semester || 'N/A',
        scores: {
          vocab: formatScoreField(parsedScores.vocab),
          pap: formatScoreField(parsedScores['pa/phonics']),
          writing: formatScoreField(parsedScores.writing),
          lrc: formatScoreField(parsedScores['listening/readingcomprehension']),
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