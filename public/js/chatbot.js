// ==========================================
// CHATBOT CLIENT-SIDE LOGIC
// ==========================================

let chatbotActive = false;

document.addEventListener('DOMContentLoaded', function () {
    // Only initialize if chatbot elements exist
    const chatbotToggle = document.getElementById('chatbotToggle');
    if (!chatbotToggle) return;

    setupChatbot();
});

function setupChatbot() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.getElementById('chatbotContainer');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotSend = document.getElementById('chatbotSend');
    const chatbotInput = document.getElementById('chatbotInput');

    // Toggle chatbot
    chatbotToggle.addEventListener('click', function () {
        chatbotContainer.classList.add('active');
        chatbotToggle.classList.add('active');
        chatbotActive = true;
        chatbotInput.focus();
    });

    // Close chatbot
    chatbotClose.addEventListener('click', function () {
        chatbotContainer.classList.remove('active');
        chatbotToggle.classList.remove('active');
        chatbotActive = false;
    });

    // Send message
    chatbotSend.addEventListener('click', sendMessage);

    // Send on Enter
    chatbotInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Initial suggestions
    showSuggestions(['How much did I spend?', 'Am I overspending?', 'Budget tips', 'Savings ideas']);
}

async function sendMessage() {
    const chatbotInput = document.getElementById('chatbotInput');
    const message = chatbotInput.value.trim();

    if (!message) return;

    // Add user message
    addMessage(message, 'user');
    chatbotInput.value = '';

    // Show typing indicator
    showTypingIndicator();

    try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        const response = await fetch('/api/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, userId: user.id }),
        });

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator();

        // Add bot response
        addMessage(data.botMessage, 'bot');

        // Show suggestions
        if (data.suggestions && data.suggestions.length > 0) {
            showSuggestions(data.suggestions);
        }

    } catch (error) {
        console.error('Chatbot error:', error);
        removeTypingIndicator();
        addMessage('Sorry, I encountered an error. Please try again.', 'bot');
    }
}

function addMessage(text, sender) {
    const chatbotBody = document.getElementById('chatbotBody');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}-message`;

    const icon = sender === 'bot' ? 'fa-robot' : 'fa-user';

    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas ${icon}"></i>
        </div>
        <div class="message-content">${text}</div>
    `;

    chatbotBody.appendChild(messageDiv);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

function showTypingIndicator() {
    const chatbotBody = document.getElementById('chatbotBody');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message bot-message';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;

    chatbotBody.appendChild(typingDiv);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function showSuggestions(suggestions) {
    const container = document.getElementById('chatbotSuggestions');
    container.innerHTML = '';

    suggestions.forEach(suggestion => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip';
        chip.textContent = suggestion;
        chip.addEventListener('click', function () {
            document.getElementById('chatbotInput').value = suggestion;
            sendMessage();
        });
        container.appendChild(chip);
    });
}
