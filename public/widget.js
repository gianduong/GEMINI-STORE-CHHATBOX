(function() {
  'use strict';
  
  // Configuration
  const API_BASE = (document.currentScript && document.currentScript.getAttribute('data-api')) || '';
  const WIDGET_ID = 'gemini-store-chatbox';
  
  // Prevent multiple instances
  if (document.getElementById(WIDGET_ID)) {
    return;
  }

  // Create styles
  const style = document.createElement('style');
  style.textContent = `
    /* Chatbox Button */
    .gscb-btn {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 9999;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
      color: #ffffff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      outline: none;
    }
    
    .gscb-btn:hover {
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 12px 35px rgba(59, 130, 246, 0.5);
    }
    
    .gscb-btn:active {
      transform: translateY(-1px) scale(1.02);
    }
    
    /* Chatbox Panel */
    .gscb-panel {
      position: fixed;
      right: 20px;
      bottom: 90px;
      z-index: 9998;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 600px;
      max-height: calc(100vh - 120px);
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      transform: translateY(20px) scale(0.95);
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      border: 1px solid rgba(59, 130, 246, 0.1);
    }
    
    .gscb-panel.open {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: auto;
    }
    
    /* Header */
    .gscb-header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: #ffffff;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
    }
    
    .gscb-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
      pointer-events: none;
    }
    
    .gscb-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255, 255, 255, 0.3);
    }
    
    .gscb-header-info {
      flex: 1;
      position: relative;
      z-index: 1;
    }
    
    .gscb-title {
      font-weight: 600;
      font-size: 16px;
      margin: 0 0 4px 0;
    }
    
    .gscb-subtitle {
      font-size: 12px;
      opacity: 0.9;
      margin: 0;
    }
    
    .gscb-close {
      position: absolute;
      top: 12px;
      right: 16px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.8);
      cursor: pointer;
      font-size: 18px;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
      z-index: 10;
      pointer-events: auto;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .gscb-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    
    /* Body */
    .gscb-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .gscb-body::-webkit-scrollbar {
      width: 6px;
    }
    
    .gscb-body::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .gscb-body::-webkit-scrollbar-thumb {
      background: rgba(59, 130, 246, 0.3);
      border-radius: 3px;
    }
    
    .gscb-body::-webkit-scrollbar-thumb:hover {
      background: rgba(59, 130, 246, 0.5);
    }
    
    /* Messages */
    .gscb-msg {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      animation: fadeInUp 0.3s ease;
    }
    
    .gscb-msg.user {
      flex-direction: row-reverse;
    }
    
    .gscb-msg-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }
    
    .gscb-msg.user .gscb-msg-avatar {
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      color: #ffffff;
    }
    
    .gscb-msg.assistant .gscb-msg-avatar {
      background: #e5e7eb;
      color: #374151;
    }
    
    .gscb-bubble {
      max-width: 75%;
      padding: 12px 16px;
      border-radius: 18px;
      position: relative;
      word-wrap: break-word;
      line-height: 1.4;
    }
    
    .gscb-msg.user .gscb-bubble {
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      color: #ffffff;
      border-bottom-right-radius: 6px;
    }
    
    .gscb-msg.assistant .gscb-bubble {
      background: #ffffff;
      color: #374151;
      border-bottom-left-radius: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.1);
    }
    
    .gscb-typing {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #ffffff;
      border-radius: 18px;
      border-bottom-left-radius: 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.1);
    }
    
    .gscb-typing-dots {
      display: flex;
      gap: 4px;
    }
    
    .gscb-typing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
      animation: typingDot 1.4s infinite ease-in-out;
    }
    
    .gscb-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .gscb-typing-dot:nth-child(2) { animation-delay: -0.16s; }
    
    /* Input */
    .gscb-input {
      display: flex;
      gap: 12px;
      padding: 16px 20px;
      background: #ffffff;
      border-top: 1px solid rgba(59, 130, 246, 0.1);
    }
    
    .gscb-input-field {
      flex: 1;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 12px 16px;
      outline: none;
      font-size: 14px;
      transition: all 0.2s ease;
      background: #ffffff;
    }
    
    .gscb-input-field:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .gscb-input-field::placeholder {
      color: #9ca3af;
    }
    
    .gscb-send-btn {
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      color: #ffffff;
      border: none;
      padding: 12px 16px;
      border-radius: 12px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 50px;
    }
    
    .gscb-send-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .gscb-send-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    
    /* Animations */
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes typingDot {
      0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
      }
      40% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    /* Mobile Responsive */
    @media (max-width: 480px) {
      .gscb-panel {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        right: 10px;
        bottom: 80px;
      }
      
      .gscb-btn {
        right: 15px;
        bottom: 15px;
        width: 55px;
        height: 55px;
        font-size: 22px;
      }
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .gscb-panel {
        background: #1f2937;
        border-color: rgba(59, 130, 246, 0.2);
      }
      
      .gscb-body {
        background: #111827;
      }
      
      .gscb-msg.assistant .gscb-bubble {
        background: #374151;
        color: #f9fafb;
        border-color: rgba(59, 130, 246, 0.2);
      }
      
      .gscb-input {
        background: #1f2937;
        border-top-color: rgba(59, 130, 246, 0.2);
      }
      
      .gscb-input-field {
        background: #374151;
        border-color: #4b5563;
        color: #f9fafb;
      }
      
      .gscb-input-field:focus {
        border-color: #3b82f6;
      }
      
      .gscb-input-field::placeholder {
        color: #9ca3af;
      }
    }
  `;
  
  document.head.appendChild(style);

  // Create chatbox button
  const btn = document.createElement('button');
  btn.id = WIDGET_ID;
  btn.className = 'gscb-btn';
  btn.setAttribute('aria-label', 'Mở chatbox hỗ trợ');
  btn.innerHTML = '💬';
  document.body.appendChild(btn);

  // Create chatbox panel
  const panel = document.createElement('div');
  panel.className = 'gscb-panel';
  
  panel.innerHTML = `
    <div class="gscb-header">
      <div class="gscb-avatar">AI</div>
      <div class="gscb-header-info">
        <div class="gscb-title">Trợ lý cửa hàng</div>
        <div class="gscb-subtitle">Chúng tôi ở đây để hỗ trợ bạn!</div>
      </div>
      <button class="gscb-close" aria-label="Đóng chatbox">×</button>
    </div>
    <div class="gscb-body" id="gscb-messages"></div>
    <div class="gscb-input">
      <input type="text" class="gscb-input-field" placeholder="Nhập câu hỏi của bạn..." />
      <button class="gscb-send-btn" aria-label="Gửi tin nhắn">
        <span>Gửi</span>
      </button>
    </div>
  `;
  
  document.body.appendChild(panel);

  // Get elements
  const messagesContainer = panel.querySelector('#gscb-messages');
  const inputField = panel.querySelector('.gscb-input-field');
  const sendBtn = panel.querySelector('.gscb-send-btn');
  const closeBtn = panel.querySelector('.gscb-close');
  
  // Debug: Check if closeBtn exists
  if (!closeBtn) {
    console.error('Close button not found!');
  } else {
    console.log('Close button found:', closeBtn);
  }

  // State
  let isOpen = false;
  let isTyping = false;

  // Toggle panel
  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    
    if (isOpen) {
      inputField.focus();
      loadChatHistory();
    }
  }

  // Add message to chat
  function addMessage(role, content, isStreaming = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `gscb-msg ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'gscb-msg-avatar';
    avatar.textContent = role === 'user' ? 'Bạn' : 'AI';
    
    const bubble = document.createElement('div');
    bubble.className = 'gscb-bubble';
    bubble.textContent = content;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
    
    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
    
    return bubble;
  }

  // Show typing indicator
  function showTyping() {
    if (isTyping) return;
    
    isTyping = true;
    const typingDiv = document.createElement('div');
    typingDiv.className = 'gscb-msg assistant';
    typingDiv.id = 'gscb-typing';
    
    const avatar = document.createElement('div');
    avatar.className = 'gscb-msg-avatar';
    avatar.textContent = 'AI';
    
    const typingBubble = document.createElement('div');
    typingBubble.className = 'gscb-typing';
    typingBubble.innerHTML = `
      <div class="gscb-typing-dots">
        <div class="gscb-typing-dot"></div>
        <div class="gscb-typing-dot"></div>
        <div class="gscb-typing-dot"></div>
      </div>
    `;
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(typingBubble);
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
  }

  // Hide typing indicator
  function hideTyping() {
    const typingElement = document.getElementById('gscb-typing');
    if (typingElement) {
      typingElement.remove();
    }
    isTyping = false;
  }

  // Scroll to bottom
  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Send message
  async function sendMessage() {
    const message = inputField.value.trim();
    if (!message || isTyping) return;

    // Clear input and disable send button
    inputField.value = '';
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span>Đang gửi...</span>';

    // Add user message
    addMessage('user', message);

    // Show typing indicator
    showTyping();

    try {
      const response = await fetch(`${API_BASE}/api/chat/sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Hide typing indicator
      hideTyping();

      // Add assistant message bubble
      const assistantBubble = addMessage('assistant', '');

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.token) {
                assistantBubble.textContent += data.token;
                scrollToBottom();
              }
              
              if (data.done) {
                break;
              }
              
              if (data.error) {
                assistantBubble.textContent = 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.';
                break;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
        
        buffer = lines[lines.length - 1];
      }

    } catch (error) {
      console.error('Error sending message:', error);
      hideTyping();
      
      const errorBubble = addMessage('assistant', 'Xin lỗi, có lỗi xảy ra khi gửi tin nhắn. Vui lòng thử lại sau.');
    } finally {
      // Re-enable send button
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<span>Gửi</span>';
      inputField.focus();
    }
  }

  // Load chat history
  async function loadChatHistory() {
    try {
      const response = await fetch(`${API_BASE}/api/chat/history`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || [];
        
        // Clear existing messages
        messagesContainer.innerHTML = '';
        
        // Add historical messages
        messages.forEach(msg => {
          addMessage(msg.role, msg.content);
        });
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  // Event listeners
  btn.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Close button clicked');
    togglePanel();
  });
  
  sendBtn.addEventListener('click', sendMessage);
  
  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      togglePanel();
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (isOpen && !panel.contains(e.target) && !btn.contains(e.target)) {
      togglePanel();
    }
  });

  // Initialize
  console.log('🤖 Gemini Store Chatbox widget loaded successfully');
})();