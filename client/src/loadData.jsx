

// Function to load student data from the API
  export const loadData = async (role, username, setMetrics, setIsLoading) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/students?role=${role}&username=${username}`);
      
      if (!response.ok) {
        throw new Error('Failed to load student data');
      }

      const students = await response.json();
      const studentMetrics = students.map((student) => ({
        name: student.name,
        title: student.name, // Keep both for compatibility with your map functions
        value: student.overall_band || 'N/A', // Used by tutor view
        overall: student.overall_band,        // Used by parent view
        vocab_band: student.vocab_band,
        phonics_band: student.phonics_band,
        writing_band: student.writing_band,
        listening_band: student.listening_band,
        // Add the details object for the tutor view sub-details
        details: {
          vocab: student.vocab_band,
          phonics: student.phonics_band
        }
      }));
      setMetrics(studentMetrics);
    } catch (error) {
      console.error('Error loading student data:', error);
      setMetrics([{ title: 'Error', value: 'No data', detail: 'Unable to load student records' }]);
    } finally {
      setIsLoading(false);
    }
  };