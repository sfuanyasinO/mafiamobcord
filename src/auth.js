import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

let currentUser = null;

const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authTabs = document.querySelectorAll('.auth-tab');
const closeModal = document.querySelector('.close');

// Switch between login and register forms
authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab');
    
    // Update active tab
    authTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show the corresponding form
    if (tabName === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
    } else {
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
    }
  });
});

// Close the modal
closeModal.addEventListener('click', () => {
  authModal.style.display = 'none';
});

// Login
document.getElementById('login-button').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    authModal.style.display = 'none';
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
});

// Register
document.getElementById('register-button').addEventListener('click', async () => {
  const username = document.getElementById('register-username').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Store additional user data in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      username,
      email,
      createdAt: new Date().toISOString(),
      photoURL: null
    });
    
    authModal.style.display = 'none';
  } catch (error) {
    alert('Registration failed: ' + error.message);
  }
});

// Initialize authentication state listener
export const initAuth = () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        currentUser = {
          uid: user.uid,
          email: user.email,
          ...userDoc.data()
        };
        
        // Update UI for logged-in user
        document.dispatchEvent(new CustomEvent('userLoggedIn', { detail: currentUser }));
      }
    } else {
      currentUser = null;
      // Show auth modal
      authModal.style.display = 'block';
    }
  });
};

// Log out
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

// Get current authenticated user
export const getCurrentUser = () => currentUser;