
export const loadData = async (role, username, setMetrics, setIsLoading) => {
  setIsLoading(true);
  try {
    const response = await fetch(`/api/students?role=${role}&username=${username}`);
    const students = await response.json();
    
    const studentMetrics = students.map((student) => {
      // If scores is already an object, use it; if string, parse it
      const parsedScores = typeof student.scores === 'string' 
        ? JSON.parse(student.scores) 
        : student.scores || {};

      return {
        name: student.name,
        value: student.value || student.band || 'N/A', // Map band to value for the <h3>
        scores: {
          vocab: parsedScores?.vocab || 'N/A',
          pap: parsedScores?.['pa/phonics'] || 'N/A',
          writing: parsedScores?.writing || 'N/A',
          lrc: parsedScores?.['listening/readingcomprehension'] || 'N/A',
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