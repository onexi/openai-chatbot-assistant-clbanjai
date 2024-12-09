let state = {
  assistant_id: null,
  assistant_name: null,
  threadId: null,
  messages: [],
};

async function getAssistant(){
  let name = document.getElementById('assistant_name').value;
  try {
    const response = await fetch('/api/assistants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: name }),
    });
    state = await response.json();
    displayMessage(`Assistant ${state.assistant_name} is ready to chat`, 'system');
  } catch (error) {
    displayMessage('Failed to retrieve assistant', 'error');
    console.error(error);
  }
}

async function getThread(){
  try {
    const response = await fetch('/api/threads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    const threadData = await response.json();
    state.threadId = threadData.threadId;
    displayMessage(`New thread created: ${state.threadId}`, 'system');
  } catch (error) {
    displayMessage('Failed to create thread', 'error');
    console.error(error);
  }
}

async function getResponse(){
  const userMessage = document.getElementById('messageInput').value;
  
  if (!state.threadId || !userMessage.trim()) {
    displayMessage('Please select an assistant, create a thread, and enter a message', 'error');
    return;
  }

  try {
    displayMessage(userMessage, 'user');

    const response = await fetch('/api/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: userMessage })
    });
    
    const data = await response.json();
    
    data.messages.forEach(msg => {
      if (msg.role === 'assistant') {
        displayMessage(msg.content, 'assistant');
      }
    });

    document.getElementById('messageInput').value = '';
  } catch (error) {
    displayMessage('Failed to get response from assistant', 'error');
    console.error(error);
  }
}

function displayMessage(message, type) {
  const messageContainer = document.getElementById('message-container');
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', type);
  messageElement.textContent = message;
  messageContainer.appendChild(messageElement);
  messageContainer.scrollTop = messageContainer.scrollHeight;
}