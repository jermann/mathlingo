# MathLingo Demo

An adaptive math learning platform that generates personalized math problems and provides instant feedback. Now with multiple question types!

## Features

### 🎯 Multiple Question Types

1. **Text Input Questions** - Traditional problems where students type their answers
2. **Multiple Choice Questions** - Students select from 3 possible answers (A, B, C)
3. **Drawing Questions** - Students upload images of handwritten math work, which gets processed using AI vision

### 🧠 Adaptive Learning

- Difficulty adjusts based on student performance
- Tracks problem history to personalize future questions
- Gamified experience with XP, hearts, streaks, and levels

### 💬 Interactive Topic Discussion

- AI-powered conversation to understand student interests
- Suggests relevant math topics
- Personalized problem generation based on preferences

## Question Types in Detail

### Text Input
- Students type numerical or algebraic answers
- Supports various formats (fractions, decimals, expressions)
- Real-time validation and feedback

### Multiple Choice
- Three carefully crafted options (A, B, C)
- One correct answer with detailed explanations
- Visual feedback for selection

### Drawing/Image Upload
- Upload photos of handwritten math work
- AI-powered OCR using Claude Vision
- Automatic text extraction with manual editing capability
- Perfect for complex equations and step-by-step work

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, Radix UI components
- **AI**: Anthropic Claude for problem generation and image processing
- **Backend**: Next.js API routes with in-memory caching

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
Generates math problems with random question types.

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
  "prompt": "What is 15 + 27?",
  "type": "multiple_choice",
  "options": ["A. 42", "B. 43", "C. 44"],
  "difficulty": 3
}
```

### `/api/grade`
Grades student answers based on question type.

**Request:**
```json
{
  "id": "problem_id",
  "learnerAnswer": "A",
  "questionType": "multiple_choice"
}
```

**Response:**
```json
{
  "correct": true,
  "explanation": "Great job! 15 + 27 = 42",
  "xpGained": 10
}
```

### `/api/solve`
Processes uploaded images using AI vision for drawing questions.

**Request:** FormData with image file

**Response:**
```json
{
  "extractedText": "x + 5 = 10"
}
```

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

### Drawing
- **Prompt**: "Draw the equation: 2x + 3 = 11"
- **Expected Answer**: "2x + 3 = 11"

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
