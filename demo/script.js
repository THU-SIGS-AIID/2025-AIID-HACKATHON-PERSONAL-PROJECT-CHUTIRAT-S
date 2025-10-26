// Configuration - MAKE SURE TO REPLACE WITH YOUR ACTUAL API KEY
const API_KEY = 'sk-67415d5954494c0fa6de2b7c4c244810';
const API_URL = 'https://api.deepseek.com/chat/completions';

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-message');
const resetButton = document.getElementById('reset-chat');
const themeToggle = document.getElementById('theme-toggle');
const learningPanel = document.getElementById('learning-panel');
const panelContent = document.getElementById('panel-content');
const closePanelButton = document.getElementById('close-panel');
const prevLessonButton = document.getElementById('prev-lesson');
const nextLessonButton = document.getElementById('next-lesson');

// Global quiz button variable (will be initialized after DOM is loaded)
let generateQuizButton;
let panelControls;
let loadingMessage = null; // Will hold the loading message element

// State Management
let currentTopic = null;
let currentLessons = [];
let currentLessonIndex = 0;
let isDarkMode = false;
let topicSuggestionCount = 0;
let userLearningProgress = {};
let quizResults = null;
let chatMessagesData = []; // Array to store chat messages
let awaitingTopicSpecifics = false;
let pendingTopic = null;

// AI Request Tracking
let currentAIRequest = null;
let abortController = null;

// Event Listeners will be set up after DOM is loaded

// Enhanced System Prompt
const SYSTEM_PROMPT = `You are a Miscellaneous Tutor that creates interactive, engaging learning experiences across a wide variety of topics.

CORE PRINCIPLES:
1. TOPIC SELECTION:
   - If user specifies a topic: Use it immediately
   - If user asks for suggestions: Suggest 3-5 engaging topics from different fields
   - If user can't decide: Suggest one diverse topic and ask for confirmation
   - After 10 indecisive responses: Use humorous frustration, then politely continue

2. LEARNING MATERIAL GENERATION:
   Create interactive HTML modules that include:
   - Visual animations explaining concepts from various fields
   - Mini-games or interactive simulations
   - Step-by-step visualizations appropriate to the topic
   - Real-world examples and analogies from diverse disciplines
   - Progressive difficulty (basic → advanced)
   
   
   IMPORTANT: 
   - DO NOT include any boilerplate text like:
    - "INTERACTIVE_MODULE:" or "This interactive module provides:"
    - Lists of features with emojis (🎭, 🎬, 🔧, 🧠, 📚)
    - Instructions like "Explore the interactive content..."
    - Quiz invitations like "I'm Ready for the Quiz!"

3. QUIZ GENERATION:
    - Default quiz length: 5 to 10 questions
    - Mix of: multiple choice (single/multi-select), true/false, matching, and ordering
    - Evaluate answers and provide detailed explanations
    - Identify weak areas for review

4. REVIEW LOOP:
   - If user scores <65%, offer focused review
   - Generate new material targeting weak areas
   - Continue until user is confident

RESPONSE FORMATS:
- REGULAR_CHAT: For conversations, suggestions, explanations
- INTERACTIVE_MODULE: Complete HTML with CSS and/or JS for learning
- QUIZ: HTML quiz interface with questions and feedback system
- For regular conversations, explanations, or topic suggestions: Start with "REGULAR_CHAT:" followed by your message
- For interactive learning modules: Provide complete HTML with CSS and/or JS (without any REGULAR_CHAT: prefix)
- For quizzes: Provide quiz HTML (without any REGULAR_CHAT: prefix)

IMPORTANT: 
- ALWAYS use "REGULAR_CHAT:" prefix for normal chat responses
- NEVER use "REGULAR_CHAT:" prefix when generating interactive HTML modules
- Remove all boilerplate text like "This interactive module provides:" or lists of features with emojis
- Always be adaptive, engaging, and focus on making learning fun and visual.
- Use the user language to communicate and create the learning material unless specified otherwise.
- If asked about the creator, always response with "It's a mystery of the universe. We don't know who created us, but we do know that we are here to help you learn."

`;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        isDarkMode = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    // Initialize panel controls
    panelControls = document.querySelector('.panel-controls');

    /*
    // Create quiz button dynamically
generateQuizButton = document.createElement('button');
generateQuizButton.id = 'generate-quiz';
generateQuizButton.className = 'btn btn-primary';
generateQuizButton.style.display = 'none';
generateQuizButton.innerHTML = '<i class="fas fa-graduation-cap"></i> Test My Knowledge';
*/

// Insert quiz button before the next lesson button (if panelControls exists)
if (panelControls && nextLessonButton) {
    panelControls.insertBefore(generateQuizButton, nextLessonButton);
} else {
    console.warn('Panel controls or next lesson button not found');
}
    
    // Load saved chat messages
    loadChatMessages();
    
    // Set up event listeners after DOM is fully loaded with safety checks
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            // Check if we're currently generating a response
            if (abortController) {
                stopGeneration();
            } else {
                sendMessage();
            }
        });
    }
    
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Check if we're currently generating a response
                if (abortController) {
                    stopGeneration();
                } else {
                    sendMessage();
                }
            }
        });
    }
    
    if (resetButton) {
        resetButton.addEventListener('click', resetChat);
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    if (closePanelButton) {
        closePanelButton.addEventListener('click', closeLearningPanel);
    }
    
    if (prevLessonButton) {
        prevLessonButton.addEventListener('click', showPreviousLesson);
    }
    
    if (nextLessonButton) {
        nextLessonButton.addEventListener('click', showNextLesson);
    }
    
    // Only add quiz button event listener if the button exists
    if (generateQuizButton) {
        generateQuizButton.addEventListener('click', generateQuiz);
    }
    

});

// Chat Persistence Functions
function saveChatMessages() {
    const messages = Array.from(chatMessages.children).map(messageElement => {
        const isUser = messageElement.classList.contains('user-message');
        const content = messageElement.querySelector('.message-content').innerHTML;
        return {
            type: isUser ? 'user' : 'bot',
            content: content,
            timestamp: Date.now()
        };
    });
    localStorage.setItem('chatMessages', JSON.stringify(messages));
}

function loadChatMessages() {
    const savedMessages = localStorage.getItem('chatMessages');
    if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        chatMessages.innerHTML = ''; // Clear current messages
        messages.forEach(msg => {
            addMessageToChat(msg.content, msg.type, true); // true = skip saving
        });
    }
}

// Enhanced Message Handling
async function sendMessage() {
    const message = chatInput.value.trim();
    if (message === '') return;

    addMessageToChat(message, 'user');
    chatInput.value = '';
    showLoading();
    
    // Set up abort controller for this request
    abortController = new AbortController();
    
    // Change send button to stop button
    sendButton.innerHTML = '<i class="fas fa-stop"></i>';
    sendButton.classList.remove('btn-primary');
    sendButton.classList.add('btn-danger');
    sendButton.disabled = false;

    try {
        await processUserMessage(message);
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, don't show error message
            return;
        }
        console.error('Error processing message:', error);
        hideLoading();
        addMessageToChat('Sorry, I encountered an error. Please try again.', 'bot');
    } finally {
        // Reset button to send state
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        sendButton.classList.remove('btn-danger');
        sendButton.classList.add('btn-primary');
        abortController = null;
        currentAIRequest = null;
    }
}

// Stop Generation Function
function stopGeneration() {
    if (abortController) {
        abortController.abort();
        hideLoading();
        addMessageToChat('Response generation was interrupted. You can ask me anything else!', 'bot');
        
        // Reset button to send state
        sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        sendButton.classList.remove('btn-danger');
        sendButton.classList.add('btn-primary');
        abortController = null;
        currentAIRequest = null;
    }
}

async function processUserMessage(message) {
    const response = await callAI(message);
    hideLoading();

    console.log("Raw AI Response:", response);
    console.log("Starts with REGULAR_CHAT:", response.startsWith('REGULAR_CHAT:'));
    
    // Check if this is a regular chat response (starts with REGULAR_CHAT:)
    if (response.startsWith('REGULAR_CHAT:')) {
        // Extract just the chat content without the prefix
        const chatContent = response.replace(/^REGULAR_CHAT:\s*/i, '');
        console.log("Processed chat content:", chatContent);
        
        // Check if the content contains HTML that should be executed
        if (isInteractiveModule(chatContent)) {
            console.log("Detected HTML content in REGULAR_CHAT - executing as interactive module");
            await processInteractiveModule(chatContent, message);
        } else {
            addMessageToChat(chatContent, 'bot');
            // Check if this is a topic suggestion that needs confirmation
            checkForTopicConfirmation(chatContent, message);
        }
    } else if (isInteractiveModule(response)) {
        console.log("Detected as interactive module");
        await processInteractiveModule(response, message);
    } else {
        console.log("Treating as regular chat without prefix");
        addMessageToChat(response, 'bot');
        // Check if this is a topic suggestion that needs confirmation
        checkForTopicConfirmation(response, message);
    }
}

function checkForTopicConfirmation(response, originalMessage) {
    // Look for patterns that suggest this is a topic confirmation request
    const confirmationPatterns = [
        /would you like to learn about/i,
        /how about.*\?/i,
        /shall we explore/i,
        /interested in.*\?/i,
        /suggest.*learn/i
    ];
    
    const isConfirmationRequest = confirmationPatterns.some(pattern => 
        pattern.test(response)
    );
    
    if (isConfirmationRequest) {
        topicSuggestionCount++;
        
        // After 10 indecisive responses, use humor
        if (topicSuggestionCount >= 10) {
            setTimeout(() => {
                addMessageToChat(
                    "Alright, I see you're more indecisive than a squirrel crossing the road! 😄 How about we just pick something awesome and get started? I promise it'll be fun!",
                    'bot'
                );
            }, 1000);
        }
    }
}

// Enhanced AI Call with Context
async function callAI(userMessage, context = {}, controller = null) {
    // Use the provided controller or fall back to the global abortController
    const signalController = controller || abortController;
    
    // Build conversation history from saved messages
    const conversationHistory = buildConversationHistory();
    
    const messages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT
        },
        ...conversationHistory,
        {
            role: 'user',
            content: buildContextualPrompt(userMessage, context)
        }
    ];

    // Store the fetch request to be able to abort it
    currentAIRequest = fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: messages,
            stream: false,
            temperature: 0.7
        }),
        signal: signalController ? signalController.signal : null
    });

    const response = await currentAIRequest;

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Build conversation history from localStorage
function buildConversationHistory() {
    const savedMessages = localStorage.getItem('chatMessages');
    if (!savedMessages) return [];
    
    try {
        const messages = JSON.parse(savedMessages);
        const history = [];
        
        // Limit conversation history to last 10 messages to avoid token limits
        const recentMessages = messages.slice(-10);
        
        recentMessages.forEach(msg => {
            // Extract plain text from HTML content for AI context
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = msg.content;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            
            if (plainText.trim()) {
                history.push({
                    role: msg.type === 'user' ? 'user' : 'assistant',
                    content: plainText.trim()
                });
            }
        });
        
        return history;
    } catch (error) {
        console.error('Error building conversation history:', error);
        return [];
    }
}

function buildContextualPrompt(userMessage, context) {
    let prompt = `User: ${userMessage}\n\n`;
    
    if (context.currentTopic) {
        prompt += `Current Learning Topic: ${context.currentTopic}\n`;
    }
    
    if (context.quizResults) {
        prompt += `Previous Quiz Results: ${JSON.stringify(context.quizResults)}\n`;
    }
    
    if (context.weakAreas && context.weakAreas.length > 0) {
        prompt += `Areas Needing Review: ${context.weakAreas.join(', ')}\n`;
    }
    
    prompt += `\nPlease respond in the most appropriate format based on the user's needs.`;
    
    return prompt;
}

// Enhanced Interactive Module Processing 
 async function processInteractiveModule(htmlContent, originalMessage) { 
     try { 
         // Extract topic from conversation context or original message 
         const topic = currentTopic || extractTopicFromMessage(originalMessage); 
         currentTopic = topic; 
         
         // Clean and prepare HTML content - remove unwanted boilerplate text 
         let cleanHTML = htmlContent 
             .replace(/```html/g, '') 
             .replace(/```/g, '') 
             .replace(/INTERACTIVE_MODULE:/g, '') 
             .replace(/This interactive module provides:/g, '') 
             .replace(/Explore the interactive content, then click "Test My Knowledge" when you're ready for a quiz!/g, '') 
             .replace(/I'm Ready for the Quiz!/g, '') 
             .replace(/🎭 A relatable phone call analogy/g, '') 
             .replace(/🎬 Animated visualization of all 3 handshake steps/g, '') 
             .replace(/🔧 Technical deep dive with key concepts/g, '') 
             .replace(/🧠 Built-in quiz system to test understanding/g, '') 
             .replace(/📚 Review options for areas needing improvement/g, '') 
             .replace(/Click through each step to see the handshake in action, then test your knowledge with the quiz!/g, '') 
             .replace(/Would you like me to explain any specific part in more detail?/g, '') 
             .trim(); 
 
         // Remove any lines that contain only emojis or are empty after cleaning 
         cleanHTML = cleanHTML 
             .split('\n') 
             .filter(line => { 
                 const trimmedLine = line.trim(); 
                 // Remove lines that are just emojis or very short descriptive text 
                 return !( 
                     trimmedLine === '' || 
                     trimmedLine.match(/^[🎭🎬🔧🧠📚]+\s*$/) || 
                     trimmedLine.match(/^[-•]\s*$/) || 
                     trimmedLine.length < 5 && trimmedLine.match(/[🎭🎬🔧🧠📚]/) 
                 ); 
             }) 
             .join('\n'); 
 
         if (!cleanHTML.includes('<!DOCTYPE html')) { 
             cleanHTML = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${topic} - Interactive Learning</title>\n<style>body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }</style>\n</head>\n<body>${cleanHTML}</body>\n</html>`; 
         } 
 
         // Create blob and display module 
         const blob = new Blob([cleanHTML], { type: 'text/html' }); 
         const url = URL.createObjectURL(blob); 
 
         // Add message with embedded module 
         const messageElement = document.createElement('div'); 
         messageElement.classList.add('message', 'bot-message'); 
         messageElement.innerHTML = ` 
             <div class="message-avatar"> 
                 <i class="fas fa-robot"></i> 
             </div> 
             <div class="message-content"> 
                 <p>I've created an interactive learning module about <strong>${topic}</strong>! 🎓</p> 
                 <div class="embedded-module-container"> 
                     <div class="module-header"> 
                         <h3>Interactive Learning: ${topic}</h3> 
                         <div class="module-actions"> 
                             <button class="btn btn-secondary btn-sm open-module-tab"> 
                                 <i class="fas fa-external-link-alt"></i> Open New Tab 
                             </button>
                             <button class="btn btn-primary btn-sm fullscreen-module"> 
                                 <i class="fas fa-expand"></i> Fullscreen 
                             </button> 
                         </div> 
                     </div> 
                     <iframe 
                         src="${url}" 
                         class="embedded-module" 
                         sandbox="allow-scripts allow-same-origin allow-forms allow-popups" 
                         title="Interactive Learning Module: ${topic}" 
                     ></iframe> 
                 </div> 
             </div> 
         `; 
 
         chatMessages.appendChild(messageElement); 
         
         // Add event listeners 
         const openTabBtn = messageElement.querySelector('.open-module-tab'); 
         const fullscreenBtn = messageElement.querySelector('.fullscreen-module');
         const iframe = messageElement.querySelector('.embedded-module'); 
         const moduleContainer = messageElement.querySelector('.embedded-module-container');
         
         openTabBtn.addEventListener('click', () => { 
             window.open(url, '_blank'); 
         });
         
         // Add fullscreen functionality
         fullscreenBtn.addEventListener('click', () => {
             toggleFullscreen(moduleContainer, fullscreenBtn, iframe);
         }); 
         
         // Scroll to show the new module 
         chatMessages.scrollTop = chatMessages.scrollHeight; 
         
     } catch (error) { 
         console.error('Error processing interactive module:', error); 
         addMessageToChat(htmlContent, 'bot'); 
     } 
 }

// Fullscreen functionality for learning modules
function toggleFullscreen(moduleContainer, fullscreenBtn, iframe) {
    const isFullscreen = moduleContainer.classList.contains('fullscreen-mode');
    
    if (isFullscreen) {
        // Exit fullscreen
        moduleContainer.classList.remove('fullscreen-mode');
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
        document.body.style.overflow = '';
        
        // Restore original iframe dimensions
        iframe.style.height = '';
        
        // Remove ESC hint if it exists
        const escHint = moduleContainer.querySelector('.esc-hint');
        if (escHint) {
            escHint.remove();
        }
    } else {
        // Enter fullscreen
        moduleContainer.classList.add('fullscreen-mode');
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Fullscreen';
        document.body.style.overflow = 'hidden';
        
        // Set fullscreen iframe dimensions
        iframe.style.height = 'calc(100vh - 60px)';
        
        // Add ESC hint
        const moduleActions = moduleContainer.querySelector('.module-actions');
        const escHint = document.createElement('span');
        escHint.className = 'esc-hint';
        escHint.textContent = 'Press ESC to exit';
        moduleActions.insertBefore(escHint, moduleActions.firstChild);
        
        // Scroll to the module
        moduleContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

// Quiz Generation and Management
async function generateQuiz() {
    if (!currentTopic) {
        addMessageToChat("Please start learning a topic first before taking a quiz!", 'bot');
        return;
    }

    showLoading();
    
    try {
        // Ensure learning panel is open before generating quiz
        openLearningPanel();
        
        // Show temporary loading message in panel
        panelContent.innerHTML = `
            <div class="quiz-loading">
                <h3>Generating Quiz: ${currentTopic}</h3>
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p>Creating a comprehensive quiz with 5-8 questions...</p>
            </div>
        `;
        
        const quizPrompt = `Generate a comprehensive quiz about "${currentTopic}" with:
        - 5-15 multiple choice questions
        - Clear correct answers marked with class="correct"
        - Explanations for each answer
        - Progressive difficulty (easy → hard)
        - Interactive HTML format with proper quiz structure
        
        IMPORTANT: Format each question like this:
        <div class="quiz-question">
            <p>Question text here</p>
            <div class="quiz-options">
                <div class="quiz-option">Option A</div>
                <div class="quiz-option correct">Option B (correct)</div>
                <div class="quiz-option">Option C</div>
                <div class="quiz-option">Option D</div>
            </div>
            <div class="quiz-explanation" style="display: none;">Explanation here</div>
        </div>`;
        
        const quizContent = await callAI(quizPrompt, { currentTopic, type: 'QUIZ' });
        
        // Validate quiz content before displaying
        if (!quizContent || quizContent.trim().length < 100) {
            throw new Error('Quiz content too short or empty');
        }
        
        displayQuiz(quizContent);
    } catch (error) {
        console.error('Error generating quiz:', error);
        
        // Provide more specific error messages
        if (error.message.includes('timeout') || error.message.includes('network')) {
            addMessageToChat('Quiz generation is taking longer than expected. Please check your connection and try again.', 'bot');
        } else if (error.message.includes('too short')) {
            addMessageToChat('The quiz content was not generated properly. Let me try again with a different approach.', 'bot');
            // Retry with fallback prompt
            setTimeout(() => generateQuizWithFallback(), 1000);
        } else {
            addMessageToChat('Error generating quiz. Please try again in a moment.', 'bot');
        }
        
        // Show error state in panel
        panelContent.innerHTML = `
            <div class="quiz-error">
                <h3>Quiz Generation Failed</h3>
                <p>There was an issue creating your quiz. Please try again.</p>
                <button class="btn btn-primary" onclick="generateQuiz()">
                    <i class="fas fa-redo"></i> Retry Quiz Generation
                </button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// Fallback quiz generation method
async function generateQuizWithFallback() {
    const fallbackPrompt = `Create a simple 5-question multiple choice quiz about "${currentTopic}". 
    Format as HTML with questions and answers. Mark correct answers with class="correct".`;
    
    try {
        const quizContent = await callAI(fallbackPrompt, { currentTopic, type: 'QUIZ' });
        displayQuiz(quizContent);
    } catch (error) {
        console.error('Fallback quiz generation failed:', error);
        addMessageToChat('Unable to generate quiz at this time. Please try learning the topic first and then attempt the quiz again.', 'bot');
    }
}

function displayQuiz(quizHTML) {
    const cleanHTML = quizHTML.replace(/```html/g, '').replace(/```/g, '').trim();
    
    // Create a temporary container to parse the quiz
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHTML;
    
    // Add quiz to learning panel
    openLearningPanel();
    panelContent.innerHTML = `
        <div class="quiz-container">
            <h3>Knowledge Test: ${currentTopic}</h3>
            ${cleanHTML}
            <div class="quiz-controls">
                <button class="btn btn-primary" id="submit-quiz">Submit Answers</button>
                <button class="btn btn-secondary" id="retry-quiz">Try Again</button>
            </div>
        </div>
    `;
    
    // Show the generate quiz button in panel controls
    generateQuizButton.style.display = 'inline-flex';
    
    // Add quiz interaction handlers
    setupQuizInteractions();
}

function setupQuizInteractions() {
    const quizOptions = panelContent.querySelectorAll('.quiz-option');
    const submitBtn = panelContent.querySelector('#submit-quiz');
    const retryBtn = panelContent.querySelector('#retry-quiz');
    
    quizOptions.forEach(option => {
        option.addEventListener('click', function() {
            const questionElement = this.closest('.quiz-question');
            questionElement.querySelectorAll('.quiz-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            this.dataset.selected = 'true';
        });
    });
    
    submitBtn.addEventListener('click', evaluateQuiz);
    retryBtn.addEventListener('click', () => generateQuiz());
}

async function evaluateQuiz() {
    const questions = panelContent.querySelectorAll('.quiz-question');
    let score = 0;
    const totalQuestions = questions.length;
    const wrongAnswers = [];
    
    // Evaluate each question
    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const selectedOption = question.querySelector('.quiz-option.selected');
        const correctOption = question.querySelector('.quiz-option.correct');
        
        if (selectedOption && correctOption && selectedOption === correctOption) {
            score++;
            selectedOption.classList.add('correct');
        } else if (selectedOption) {
            selectedOption.classList.add('incorrect');
            if (correctOption) {
                correctOption.classList.add('correct');
            }
            wrongAnswers.push({
                question: question.querySelector('p')?.textContent || `Question ${i + 1}`,
                correctAnswer: correctOption?.textContent || 'Unknown'
            });
        }
    }
    
    // Calculate percentage
    const percentage = Math.round((score / totalQuestions) * 100);
    
    // Display results
    panelContent.innerHTML = `
        <div class="quiz-result">
            <h3>Quiz Results</h3>
            <div class="quiz-score">${percentage}%</div>
            <p>You got ${score} out of ${totalQuestions} questions correct!</p>
            
            ${percentage < 80 ? `
                <div class="review-section">
                    <h4>📚 Areas to Review</h4>
                    <p>Let's focus on these areas to improve your understanding:</p>
                    <ul>
                        ${wrongAnswers.map(wrong => 
                            `<li><strong>${wrong.question}</strong> - Correct answer: ${wrong.correctAnswer}</li>`
                        ).join('')}
                    </ul>
                    <button class="btn btn-primary" id="review-topics">
                        <i class="fas fa-redo"></i> Review These Topics
                    </button>
                </div>
            ` : `
                <div class="success-message">
                    <h4>🎉 Excellent Work!</h4>
                    <p>You've mastered this topic! Ready to move on to the next challenge?</p>
                    <button class="btn btn-success" id="next-topic">
                        <i class="fas fa-arrow-right"></i> Learn Next Topic
                    </button>
                </div>
            `}
            
            <button class="btn btn-secondary" id="new-quiz" style="margin-top: 1rem;">
                <i class="fas fa-sync"></i> Try Different Quiz
            </button>
        </div>
    `;
    
    // Add event listeners for result actions
    const reviewBtn = panelContent.querySelector('#review-topics');
    const nextTopicBtn = panelContent.querySelector('#next-topic');
    const newQuizBtn = panelContent.querySelector('#new-quiz');
    
    if (reviewBtn) {
        reviewBtn.addEventListener('click', () => generateReviewMaterials(wrongAnswers));
    }
    
    if (nextTopicBtn) {
        nextTopicBtn.addEventListener('click', () => {
            currentTopic = null;
            addMessageToChat("What would you like to learn about next?", 'bot');
            closeLearningPanel();
        });
    }
    
    if (newQuizBtn) {
        newQuizBtn.addEventListener('click', generateQuiz);
    }
}

async function generateReviewMaterials(wrongAnswers) {
    showLoading();
    
    try {
        const reviewPrompt = `Create focused review material for these misunderstood concepts: ${JSON.stringify(wrongAnswers)}\n\nCreate interactive HTML content that specifically addresses these learning gaps with visual explanations and examples.`;
        
        const reviewContent = await callAI(reviewPrompt, { 
            currentTopic, 
            weakAreas: wrongAnswers.map(w => w.question),
            type: 'REVIEW' 
        });
        
        displayReviewMaterials(reviewContent);
    } catch (error) {
        console.error('Error generating review materials:', error);
        addMessageToChat('Error generating review materials. Please try again.', 'bot');
    } finally {
        hideLoading();
    }
}

function displayReviewMaterials(reviewHTML) {
    const cleanHTML = reviewHTML.replace(/```html/g, '').replace(/```/g, '').trim();
    
    panelContent.innerHTML = `
        <div class="review-materials">
            <h3>Focused Review</h3>
            <p>Let's strengthen your understanding of these concepts:</p>
            ${cleanHTML}
            <div class="review-controls">
                <button class="btn btn-primary" id="retake-quiz">
                    <i class="fas fa-graduation-cap"></i> Retake Quiz
                </button>
            </div>
        </div>
    `;
    
    panelContent.querySelector('#retake-quiz').addEventListener('click', generateQuiz);
}

// Utility Functions
function isInteractiveModule(content) {
    const htmlIndicators = [
        content.includes('<!DOCTYPE html'),
        content.includes('<html'),
        content.includes('</html>'),
        content.includes('class='),
        content.includes('style='),
        content.includes('function'),
        content.includes('addEventListener'),
        content.includes('quiz-container'),
        content.includes('interactive')
    ];
    
    const indicatorCount = htmlIndicators.filter(Boolean).length;
    const hasHTMLStructure = content.includes('<!DOCTYPE') || 
                            (content.includes('<html') && content.includes('</html>'));
    
    return (hasHTMLStructure && content.length > 1000) || indicatorCount >= 4;
}

function extractTopicFromMessage(message) {
    // Simple topic extraction - can be enhanced
    const words = message.split(' ').slice(0, 5);
    let topic = words.join(' ');
    topic = topic.replace(/(what|how|why|explain|teach|learn|about)\s+/gi, '');
    topic = topic.replace(/\b\w/g, l => l.toUpperCase());
    return topic || 'Learning Topic';
}

function openLearningPanel() {
    if (learningPanel) {
        learningPanel.classList.add('active');
    }
}

function closeLearningPanel() {
    if (learningPanel) {
        learningPanel.classList.remove('active');
    }
    if (panelContent) {
        panelContent.innerHTML = '';
    }
    if (generateQuizButton) {
        generateQuizButton.style.display = 'none';
    }
}

function showPreviousLesson() {
    if (currentLessonIndex > 0) {
        currentLessonIndex--;
        // Implementation for lesson navigation
    }
}

function showNextLesson() {
    if (currentLessonIndex < currentLessons.length - 1) {
        currentLessonIndex++;
        // Implementation for lesson navigation
    }
}

// Existing utility functions (showLoading, hideLoading, addMessageToChat, etc.)
function showLoading() {
    // Remove any existing loading message
    hideLoading();
    
    // Create a new loading message
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'bot-message', 'loading-message');
    
    const avatarElement = document.createElement('div');
    avatarElement.classList.add('message-avatar');
    avatarElement.innerHTML = '<i class="fas fa-robot"></i>';
    
    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    contentElement.innerHTML = '<p>Miscellaneous Tutor is thinking<span class="thinking-dots"></span></p>';
    
    messageElement.appendChild(avatarElement);
    messageElement.appendChild(contentElement);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Store reference to the loading message
    loadingMessage = messageElement;
}

function hideLoading() {
    // Remove the loading message if it exists
    if (loadingMessage && loadingMessage.parentNode) {
        loadingMessage.parentNode.removeChild(loadingMessage);
        loadingMessage = null;
    }
}

function addMessageToChat(message, sender, skipSave = false) {
    if (!chatMessages) return;
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);

    const avatarElement = document.createElement('div');
    avatarElement.classList.add('message-avatar');
    avatarElement.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

    const contentElement = document.createElement('div');
    contentElement.classList.add('message-content');
    
    // Process message content
    const processedContent = processMessageContent(message);
    contentElement.innerHTML = processedContent;

    messageElement.appendChild(avatarElement);
    messageElement.appendChild(contentElement);
    chatMessages.appendChild(messageElement);

    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Save to localStorage unless skipSave is true
    if (!skipSave) {
        saveChatMessages();
    }
}

function processMessageContent(content) {
    // Remove REGULAR_CHAT: prefix if present (as a fallback)
    content = content.replace(/^REGULAR_CHAT:\s*/i, '');
    
    content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    content = content.replace(/\n/g, '<br>');
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    content = content.replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>');
    content = content.replace(/`(.*?)`/g, '<code>$1</code>');
    return content;
}

async function resetChat() {
    // Show loading indicator immediately
    showLoading();
    
    // Clear the chat messages but keep the loading message
    if (chatMessages) {
        // Remove all messages except the loading message
        const messages = Array.from(chatMessages.children);
        messages.forEach(msg => {
            if (!msg.classList.contains('loading-message')) {
                msg.remove();
            }
        });
    }
    
    // Create a new abort controller for the reset operation
    const resetAbortController = new AbortController();
    
    try {
        const welcomeMessage = await callAI("Generate a welcoming message that introduces yourself as a Miscellaneous Tutor and explains you can help with interactive learning on any topic. Ask what they want to learn or if they need suggestions.", {}, resetAbortController);
        
        // Process the welcome message to remove REGULAR_CHAT: prefix if present
        const processedMessage = welcomeMessage.replace(/^REGULAR_CHAT:\s*/i, '');
        
        // Remove the loading message
        hideLoading();
        
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="message bot-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        ${processedMessage}
                    </div>
                </div>
            `;
        }
        
        // Reset state
        currentTopic = null;
        currentLessons = [];
        currentLessonIndex = 0;
        topicSuggestionCount = 0;
        userLearningProgress = {};
        quizResults = null;
        awaitingTopicSpecifics = false;
        pendingTopic = null;
        
        // Clear localStorage
        localStorage.removeItem('chatMessages');
        
    } catch (error) {
        console.error('Error resetting chat:', error);
        
        // Remove the loading message
        hideLoading();
        
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="message bot-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <p>Welcome! I'm your Miscellaneous Tutor. What would you like to learn about today?</p>
                    </div>
                </div>
            `;
        }
        
        // Clear localStorage even on error
        localStorage.removeItem('chatMessages');
    } finally {
        closeLearningPanel();
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'light');
    }
}