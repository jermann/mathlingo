# MathLingo Demo

An adaptive math learning platform that generates personalized math problems and provides instant feedback. Features four different question types with AI-powered grading and interactive drawing interfaces!

## Features

### 🎯 Four Question Types

1. **Text Input Questions** - Traditional problems where students type their answers
2. **Multiple Choice Questions** - Students select from 3 possible answers (A, B, C)
3. **Formula Drawing Questions** - Students draw mathematical expressions on an interactive canvas
4. **Graphing Questions** - Students draw graphs on a coordinate plane with gridlines and numbered axes

### 🧠 Adaptive Learning

- **Smart difficulty adjustment** based on student performance
- **Problem history tracking** to personalize future questions
- **Gamified experience** with XP, hearts, streaks, and levels
- **Topic-based learning** with AI-powered conversation

### 🎨 Interactive Drawing Interfaces

- **DrawingPad**: Canvas-based interface for mathematical formulas
- **GraphingPad**: Enhanced coordinate plane with gridlines and numbered axes
- **Real-time processing**: AI-powered OCR for immediate feedback
- **Editable results**: Students can edit AI-extracted text before submitting

### 🤖 AI-Powered Features

- **Claude Vision**: Advanced image processing for handwritten math
- **Intelligent grading**: Context-aware feedback for all question types
- **Structured responses**: Reliable JSON parsing with fallback handling
- **Topic discussion**: AI conversation to understand student interests

## Question Types in Detail

### Text Input
- Students type numerical or algebraic answers
- Supports various formats (fractions, decimals, expressions)
- Real-time validation and AI-powered feedback

### Multiple Choice
- Three carefully crafted options (A, B, C)
- One correct answer with detailed explanations
- Visual feedback for selection

### Formula Drawing
- **Interactive canvas** for drawing mathematical expressions
- **Brush size control** and eraser functionality
- **AI OCR processing** using Claude Vision
- **Manual editing** of extracted text
- Perfect for equations, formulas, and step-by-step work

### Graphing
- **Coordinate plane** with gridlines and numbered axes
- **Larger canvas** optimized for graph drawing
- **AI analysis** of drawn graphs and plots
- **Point plotting** and shape identification
- Ideal for geometry, functions, and coordinate problems

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI components, Lucide React icons
- **AI**: Anthropic Claude 3.7 Sonnet for problem generation and image processing
- **Backend**: Next.js API routes with enhanced in-memory caching
- **Drawing**: HTML5 Canvas with custom drawing interfaces

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mathlingo-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3001`

## API Endpoints

### `/api/problem`
Generates math problems with random question types and adaptive difficulty.

**Request:**
```json
{
  "topic": "Basic arithmetic",
  "difficulty": 3,
  "problemHistory": []
}
```

**Response:**
```json
{
  "id": "uuid",
  "prompt": "Plot the following points: A(1,1), B(4,1), C(4,4), D(1,4). What shape do you get?",
  "type": "graphing",
  "difficulty": 3,
  "options": []
}
```

### `/api/solve`
Comprehensive endpoint that handles all question types with AI-powered grading.

**For Text/Multiple Choice/Graphing Questions:**
```json
{
  "problem": {
    "prompt": "What is 2 + 2?",
    "answer": "4",
    "solution": "Basic arithmetic fact.",
    "type": "text"
  },
  "answer": "4",
  "questionType": "text"
}
```

**For Drawing Questions (FormData):**
- `image`: Drawing image file
- `questionType`: "formula_drawing" or "graphing"

**Response:**
```json
{
  "extractedText": "2x + 3 = 11",
  "isCorrect": true,
  "feedback": "Excellent! You correctly wrote the equation 2x + 3 = 11."
}
```

### `/api/grade` (Legacy)
Legacy endpoint for basic grading - now superseded by `/api/solve`.

## Enhanced Features

### 🛡️ Robust Error Handling
- **JSON parsing fallbacks** for malformed AI responses
- **Cache miss protection** with multiple fallback levels
- **Graceful degradation** - app never crashes, always provides working problems
- **Comprehensive logging** for debugging and monitoring

### 💾 Smart Caching
- **Timestamp-based cache** with automatic cleanup
- **Frontend state backup** for reliability
- **Memory leak prevention** with 30-minute cache expiration
- **Multiple fallback mechanisms** ensure data persistence

### 🎯 Question Type Distribution
- **Random selection** from four question types
- **Topic-appropriate prompts** for each type
- **Difficulty scaling** across all question types
- **Consistent JSON structure** for reliable parsing

## Question Type Examples

### Text Input
- **Prompt**: "Solve for x: 3x + 7 = 22"
- **Expected Answer**: "5"

### Multiple Choice
- **Prompt**: "What is the area of a rectangle with length 8 and width 6?"
- **Options**: 
  - A. 14
  - B. 48
  - C. 28
- **Correct**: B

### Formula Drawing
- **Prompt**: "Draw the equation: 2x + 3 = 11"
- **Expected Answer**: "2x + 3 = 11"
- **Interface**: Interactive canvas with brush controls

### Graphing
- **Prompt**: "Plot points A(1,1), B(4,1), C(4,4), D(1,4). What shape do you get?"
- **Expected Answer**: "square"
- **Interface**: Coordinate plane with gridlines and numbered axes

## Testing

Use the included test script to verify API functionality:

```bash
node test-api.js
```

This will test all question types and verify the complete system is working correctly.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with all question types
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
