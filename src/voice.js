import Peer from 'peerjs';
import { getCurrentUser } from './auth';
import { db } from './firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, getDocs, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

let myPeer;
let myStream;
let peers = {};
let currentVoiceChannel = null;
let voiceChannelUnsubscribe = null;
let myVoiceChannelDocId = null;
let isMuted = false;

const voiceControls = document.getElementById('voice-controls');
const muteButton = document.getElementById('mute-button');
const disconnectButton = document.getElementById('disconnect-voice');

// Initialize voice chat functionality
export const initVoice = () => {
  // Initialize PeerJS
  myPeer = new Peer();
  
  myPeer.on('open', (id) => {
    console.log('My peer ID is: ' + id);
  });
  
  myPeer.on('call', (call) => {
    // Answer the call if we're in a voice channel
    if (currentVoiceChannel) {
      call.answer(myStream);
      
      call.on('stream', (userStream) => {
        addUserStream(call.peer, userStream);
      });
      
      call.on('close', () => {
        removeUserStream(call.peer);
      });
      
      peers[call.peer] = call;
    }
  });
  
  // Voice channel click event
  document.querySelectorAll('.voice-channel').forEach(element => {
    element.addEventListener('click', () => {
      const channel = element.getAttribute('data-channel');
      joinVoiceChannel(channel);
    });
  });
  
  // Mute/unmute button
  muteButton.addEventListener('click', toggleMute);
  
  // Disconnect button
  disconnectButton.addEventListener('click', leaveVoiceChannel);
};

// Join a voice channel
async function joinVoiceChannel(channelName) {
  // Leave current voice channel if already in one
  if (currentVoiceChannel) {
    await leaveVoiceChannel();
  }
  
  try {
    // Get user's audio stream
    myStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    
    // Add user to the voice channel in Firestore
    const user = getCurrentUser();
    if (!user) {
      alert('You must be logged in to join voice channels');
      return;
    }
    
    // Add to voice channel collection
    const docRef = await addDoc(collection(db, 'voiceChannels'), {
      channelName,
      userId: user.uid,
      username: user.username,
      peerId: myPeer.id,
      joinedAt: serverTimestamp()
    });
    
    myVoiceChannelDocId = docRef.id;
    currentVoiceChannel = channelName;
    
    // Show voice controls
    voiceControls.classList.remove('hidden');
    
    // Connect to existing users in the channel
    connectToUsers(channelName);
    
    // Listen for new users joining the channel
    listenToVoiceChannel(channelName);
  } catch (error) {
    console.error('Error joining voice channel:', error);
  }
}

// Connect to existing users in a voice channel
async function connectToUsers(channelName) {
  const voiceChannelQuery = query(
    collection(db, 'voiceChannels'),
    where('channelName', '==', channelName)
  );
  
  const snapshot = await getDocs(voiceChannelQuery);
  
  snapshot.forEach((userDoc) => {
    const userData = userDoc.data();
    
    // Don't connect to yourself
    if (userData.peerId !== myPeer.id) {
      connectToUser(userData.peerId);
    }
  });
}

// Listen for users joining or leaving the voice channel
function listenToVoiceChannel(channelName) {
  if (voiceChannelUnsubscribe) {
    voiceChannelUnsubscribe();
  }
  
  const voiceChannelQuery = query(
    collection(db, 'voiceChannels'),
    where('channelName', '==', channelName)
  );
  
  voiceChannelUnsubscribe = onSnapshot(voiceChannelQuery, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const userData = change.doc.data();
      
      if (change.type === 'added' && userData.peerId !== myPeer.id) {
        // New user joined
        connectToUser(userData.peerId);
      }
      
      if (change.type === 'removed' && peers[userData.peerId]) {
        // User left
        removeUserStream(userData.peerId);
      }
    });
  });
}

// Connect to a specific user
function connectToUser(peerId) {
  const call = myPeer.call(peerId, myStream);
  
  call.on('stream', (userStream) => {
    addUserStream(peerId, userStream);
  });
  
  call.on('close', () => {
    removeUserStream(peerId);
  });
  
  peers[peerId] = call;
}

// Add a user's audio stream
function addUserStream(peerId, stream) {
  const audioElement = document.createElement('audio');
  audioElement.id = `audio-${peerId}`;
  audioElement.srcObject = stream;
  audioElement.autoplay = true;
  
  // Add audio element to DOM (hidden)
  audioElement.style.display = 'none';
  document.body.appendChild(audioElement);
}

// Remove a user's audio stream
function removeUserStream(peerId) {
  if (peers[peerId]) {
    peers[peerId].close();
  }
  
  const audioElement = document.getElementById(`audio-${peerId}`);
  if (audioElement) {
    audioElement.remove();
  }
  
  delete peers[peerId];
}

// Leave the current voice channel
async function leaveVoiceChannel() {
  if (!currentVoiceChannel) return;
  
  // Stop listening for voice channel updates
  if (voiceChannelUnsubscribe) {
    voiceChannelUnsubscribe();
    voiceChannelUnsubscribe = null;
  }
  
  // Close all peer connections
  Object.values(peers).forEach(call => call.close());
  peers = {};
  
  // Remove all remote audio elements
  document.querySelectorAll('audio').forEach(el => {
    if (el.id !== 'my-audio') {
      el.remove();
    }
  });
  
  // Stop the local stream
  if (myStream) {
    myStream.getTracks().forEach(track => track.stop());
    myStream = null;
  }
  
  // Remove from Firestore
  if (myVoiceChannelDocId) {
    await deleteDoc(doc(db, 'voiceChannels', myVoiceChannelDocId));
    myVoiceChannelDocId = null;
  }
  
  currentVoiceChannel = null;
  
  // Hide voice controls
  voiceControls.classList.add('hidden');
}

// Toggle mute/unmute
function toggleMute() {
  if (!myStream) return;
  
  isMuted = !isMuted;
  
  myStream.getAudioTracks().forEach(track => {
    track.enabled = !isMuted;
  });
  
  muteButton.textContent = isMuted ? 'Unmute' : 'Mute';
}