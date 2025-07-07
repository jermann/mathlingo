// Simple test script for MathLingo API routes
const testAPI = async () => {
  try {
    console.log('Testing /api/problem...');
    const problemRes = await fetch('http://localhost:3001/api/problem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: 1 })
    });
    
    if (!problemRes.ok) {
      console.error('Problem API failed:', problemRes.status, problemRes.statusText);
      const errorText = await problemRes.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const problemData = await problemRes.json();
    console.log('Problem API response:', problemData);
    
    if (problemData.id) {
      console.log('Testing /api/grade...');
      const gradeRes = await fetch('http://localhost:3001/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: problemData.id, 
          learnerAnswer: 'test answer' 
        })
      });
      
      if (!gradeRes.ok) {
        console.error('Grade API failed:', gradeRes.status, gradeRes.statusText);
        const errorText = await gradeRes.text();
        console.error('Error details:', errorText);
        return;
      }
      
      const gradeData = await gradeRes.json();
      console.log('Grade API response:', gradeData);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testAPI(); 