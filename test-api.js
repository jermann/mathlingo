// Test script for the new question types
const API_BASE = 'http://localhost:3001/api';

async function testProblemGeneration() {
  console.log('Testing problem generation with different question types...\n');
  
  try {
    const response = await fetch(`${API_BASE}/problem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Basic arithmetic',
        difficulty: 3,
        problemHistory: []
      })
    });
    
    const data = await response.json();
    console.log('Generated problem:');
    console.log('- Type:', data.type);
    console.log('- Prompt:', data.prompt);
    if (data.options) {
      console.log('- Options:', data.options);
    }
    console.log('- ID:', data.id);
    console.log('- Difficulty:', data.difficulty);
    console.log('');
    
    return data;
  } catch (error) {
    console.error('Error testing problem generation:', error);
  }
}

async function testGrading(problemId, answer, questionType) {
  console.log(`Testing grading for ${questionType} question...`);
  
  try {
    const response = await fetch(`${API_BASE}/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: problemId,
        learnerAnswer: answer,
        questionType: questionType
      })
    });
    
    const data = await response.json();
    console.log('- Correct:', data.correct);
    console.log('- XP Gained:', data.xpGained);
    console.log('- Explanation:', data.explanation.substring(0, 100) + '...');
    console.log('');
    
    return data;
  } catch (error) {
    console.error('Error testing grading:', error);
  }
}

async function runTests() {
  console.log('🧪 Testing MathLingo API with Multiple Question Types\n');
  
  // Test problem generation
  const problem = await testProblemGeneration();
  if (!problem) return;
  
  // Test grading based on question type
  switch (problem.type) {
    case 'text':
      await testGrading(problem.id, '42', 'text');
      break;
    case 'multiple_choice':
      await testGrading(problem.id, 'A', 'multiple_choice');
      break;
    case 'drawing':
      await testGrading(problem.id, 'x + 5 = 10', 'drawing');
      break;
  }
  
  console.log('✅ Tests completed!');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
} 