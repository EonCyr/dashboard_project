import { useState } from 'react';

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState('');
  const [userId, setUserId] = useState(null); // <-- Ensure this is defined here
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });

      const result = await response.json();

      if (response.ok) {
        setRole(result.role);
        setUserId(result.userid); // <-- This will now work correctly
        setIsLoggedIn(true);
      } else {
        setErrorMessage(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login request failed:', error);
      setErrorMessage('Could not connect to server. Please check your network.');
    }
  };

  return {
    isLoggedIn,
    role,
    setRole,
    userId,
    setUserId,
    username,
    setUsername,
    password,
    setPassword,
    errorMessage,
    setErrorMessage,
    handleLogin
  };
}