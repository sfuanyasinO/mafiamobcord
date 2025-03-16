import './firebase';
import { initAuth } from './auth';
import { initChat } from './chat';
import { initVoice } from './voice';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// Initialize components
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  
  // Initialize chat and voice when user logs in
  document.addEventListener('userLoggedIn', (event) => {
    const user = event.detail;
    
    // Initialize chat functionality
    initChat();
    
    // Initialize voice chat functionality
    initVoice();
    
    // Display the current user in the UI
    updateUserUI(user);
    
    // Subscribe to online users
    subscribeToOnlineUsers();
  });
});

// Update UI for current user
function updateUserUI(user) {
  const userPanel = document.querySelector('.users-panel');
  const userInitial = user.username ? user.username[0].toUpperCase() : '?';
  
  // Add current user to online users
  const currentUserElement = document.createElement('div');
  currentUserElement.className = 'user';
  currentUserElement.innerHTML = `
    <div class="user-avatar">${userInitial}</div>
    <div>${user.username} (You)</div>
    <div class="user-status"></div>
  `;
  
  const onlineUsersList = document.getElementById('online-users');
  onlineUsersList.innerHTML = '';
  onlineUsersList.appendChild(currentUserElement);
}

// Subscribe to online users
function subscribeToOnlineUsers() {
  const onlineUsersQuery = query(collection(db, 'users'));
  
  onSnapshot(onlineUsersQuery, (snapshot) => {
    const onlineUsersList = document.getElementById('online-users');
    const currentUser = document.querySelector('.user');
    
    onlineUsersList.innerHTML = '';
    onlineUsersList.appendChild(currentUser);
    
    snapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Skip current user as we've already added them
      if (userData.username === currentUser.querySelector('div:nth-child(2)').textContent.replace(' (You)', '')) {
        return;
      }
      
      const userInitial = userData.username ? userData.username[0].toUpperCase() : '?';
      
      const userElement = document.createElement('div');
      userElement.className = 'user';
      userElement.innerHTML = `
        <div class="user-avatar">${userInitial}</div>
        <div>${userData.username}</div>
        <div class="user-status"></div>
      `;
      
      onlineUsersList.appendChild(userElement);
    });
  });
}