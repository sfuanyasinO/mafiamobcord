import { db } from './firebase';
import { collection, addDoc, query, orderBy, limit, onSnapshot, where, serverTimestamp } from 'firebase/firestore';
import { getCurrentUser } from './auth';

let currentChannel = 'general';
let currentServer = 'general';
let messagesUnsubscribe = null;

const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const messagesContainer = document.getElementById('messages');
const currentChannelElement = document.getElementById('current-channel');

// Send a new message
const sendMessage = async () => {
  const messageText = messageInput.value.trim();
  if (!messageText) return;
  
  const user = getCurrentUser();
  if (!user) {
    alert('You must be logged in to send messages');
    return;
  }
  
  try {
    await addDoc(collection(db, 'messages'), {
      text: messageText,
      userId: user.uid,
      username: user.username,
      channel: currentChannel,
      server: currentServer,
      createdAt: serverTimestamp()
    });
    
    messageInput.value = '';
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

// Listen for messages in the current channel
const listenToMessages = () => {
  // Unsubscribe from previous listener if exists
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
  }
  
  const messagesQuery = query(
    collection(db, 'messages'),
    where('server', '==', currentServer),
    where('channel', '==', currentChannel),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    const messages = [];
    
    snapshot.forEach((doc) => {
      const message = doc.data();
      // Convert Firestore timestamp to Date
      const createdAt = message.createdAt ? message.createdAt.toDate() : new Date();
      
      messages.push({
        id: doc.id,
        ...message,
        createdAt
      });
    });
    
    // Sort messages by creation time (ascending)
    messages.sort((a, b) => a.createdAt - b.createdAt);
    
    renderMessages(messages);
  });
};

// Render messages in the UI
const renderMessages = (messages) => {
  messagesContainer.innerHTML = '';
  
  messages.forEach((message) => {
    const messageTime = message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userInitial = message.username ? message.username[0].toUpperCase() : '?';
    
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `
      <div class="message-avatar">${userInitial}</div>
      <div class="message-content">
        <div class="message-header">
          <span class="message-username">${message.username}</span>
          <span class="message-time">${messageTime}</span>
        </div>
        <div class="message-text">${message.text}</div>
      </div>
    `;
    
    messagesContainer.appendChild(messageElement);
  });
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

// Change channel
export const changeChannel = (channel, server = currentServer) => {
  currentChannel = channel;
  currentServer = server;
  
  // Update UI
  currentChannelElement.textContent = `#${channel}`;
  messageInput.placeholder = `Message #${channel}`;
  
  // Get messages for the new channel
  listenToMessages();
  
  // Update active channel in UI
  document.querySelectorAll('.channel').forEach(element => {
    if (element.getAttribute('data-channel') === channel) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
  });
  
  // Update active server in UI
  document.querySelectorAll('.server').forEach(element => {
    if (element.getAttribute('data-server') === server) {
      element.classList.add('active');
    } else {
      element.classList.remove('active');
    }
  });
};

// Initialize chat functionality
export const initChat = () => {
  // Setup event listeners
  sendButton.addEventListener('click', sendMessage);
  
  messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Change channel when clicking on a channel in the sidebar
  document.querySelectorAll('.channel').forEach(element => {
    element.addEventListener('click', () => {
      const channel = element.getAttribute('data-channel');
      changeChannel(channel);
    });
  });
  
  // Change server when clicking on a server in the sidebar
  document.querySelectorAll('.server').forEach(element => {
    element.addEventListener('click', () => {
      const server = element.getAttribute('data-server');
      changeChannel('general', server);
    });
  });
  
  // Start listening to messages
  listenToMessages();
};