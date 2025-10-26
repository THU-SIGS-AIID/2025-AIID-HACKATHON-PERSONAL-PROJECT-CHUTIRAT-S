# 2025-AIID-HACKATHON-PERSONAL-PROJECT-CHUTIRAT-SAENGYINGYONGWATTANA
# Miscellaneous Tutor 🤖📚

An interactive web-based educational chatbot that provides engaging learning experiences across a wide variety of topics through AI-powered conversations and interactive modules.

## Features

- **AI-Powered Chat Interface**: Natural language conversations with an AI tutor that can explain concepts and answer questions
- **Interactive Learning Modules**: Dynamic HTML-based learning content with visualizations and animations
- **Topic Coverage**: Supports learning in Science, Technology, History, Culture, Arts, Literature, Mathematics, Philosophy, and more
- **Quiz System**: Built-in quizzes to test knowledge and identify areas for improvement
- **Dark/Light Theme**: Toggle between light and dark modes for comfortable viewing
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Chat Persistence**: Saves conversation history for continuity across sessions

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **AI Integration**: DeepSeek API for natural language processing
- **Styling**: CSS custom properties for theming, Flexbox/Grid for layouts
- **Icons**: Font Awesome for UI icons
- **Typography**: Inter font family for clean, readable text

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- An API key from DeepSeek (for AI functionality)
- Basic understanding of HTML/JavaScript (for customization)

### Installation

1. **Clone or download** this repository to your local machine
2. **Get your DeepSeek API key**:
   - Visit [DeepSeek API Platform](https://platform.deepseek.com/)
   - Sign up for an account
   - Generate your API key
3. **Configure the application**:
   - Open the `script.js` file in a text editor
   - Replace the placeholder API key with your actual DeepSeek API key:
   ```javascript
   const API_KEY = 'your-api-key-here';
   ```
4. **Launch the application**:
   - Simply open `index.html` in your web browser
   - No server setup required - runs entirely in the browser

### Configuration

To configure the AI tutor behavior, modify the `SYSTEM_PROMPT` variable in `script.js`. This controls how the AI responds to user queries and generates learning content.

## Usage

### Getting Started
1. **Start a Conversation**: Type a question or topic in the chat input and press Enter or click the send button
2. **Request Learning Modules**: Ask about specific topics to receive interactive learning content
3. **Take Quizzes**: After learning about a topic, request a quiz to test your knowledge
4. **Navigate Slides**: Use the slide panel controls to navigate through multi-part lessons
5. **Toggle Theme**: Click the theme toggle button to switch between light and dark modes
6. **Reset Chat**: Use the reset button to clear the conversation history

### Example Interactions
- "Teach me about photosynthesis"
- "Explain quantum physics in simple terms"
- "Give me a quiz about World War II"
- "Show me an interactive lesson about the solar system"
- "What are the main principles of Buddhism?"

## Project Structure

```
demo/
├── index.html      # Main HTML structure and UI elements
├── script.js       # JavaScript functionality and AI integration
├── styles.css      # Styling and responsive design
└── README.md       # This documentation file
```

## Key Components

### Chat Interface
- Real-time messaging with AI tutor
- Message history persistence
- Loading indicators and error handling

### Learning Modules
- Interactive HTML content embedded in iframes
- Fullscreen mode for immersive learning
- Responsive design for different screen sizes

### Quiz System
- Multiple question types (multiple choice, true/false, etc.)
- Instant feedback and scoring
- Targeted review for weak areas

## API Integration

The application uses the DeepSeek API for AI functionality:

```javascript
const API_URL = 'https://api.deepseek.com/chat/completions';
```

Requests are made with conversation history to maintain context across messages.

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

> **Note**: For optimal performance, we recommend using the latest version of Chrome or Firefox.

## License

This project is open source and available under the [MIT License](LICENSE).

