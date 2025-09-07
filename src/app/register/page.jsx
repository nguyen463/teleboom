"use client";

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validations
      if (!formData.email || !formData.username || !formData.displayName || !formData.password || !formData.confirmPassword) {
        throw new Error('All fields are required');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!formData.email.includes('@') || !formData.email.includes('.')) {
        throw new Error('Please enter a valid email address');
      }

      if (formData.username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }

      // Check if backend is reachable
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      if (!API_URL) {
        throw new Error('Server configuration error');
      }

      console.log('Registering with API URL:', API_URL);

      const response = await axios.post(
        `${API_URL}/api/auth/register`, 
        {
          email: formData.email,
          username: formData.username,
          displayName: formData.displayName,
          password: formData.password
        },
        {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      setSuccess('Account created successfully! Redirecting...');
      
      // Auto-login
      try {
        const loginResponse = await axios.post(
          `${API_URL}/api/auth/login`, 
          {
            email: formData.email,
            password: formData.password
          },
          {
            timeout: 10000,
          }
        );
        
        sessionStorage.setItem('chat-app-token', loginResponse.data.token);
        sessionStorage.setItem('chat-user', JSON.stringify(loginResponse.data.user));
        router.push('/');
      } catch (loginError) {
        // If auto-login fails, just redirect to login page
        setSuccess('Account created! Please login now.');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }

    } catch (err) {
      if (err.code === 'NETWORK_ERROR' || err.code === 'ECONNABORTED') {
        setError('Cannot connect to server. Please try again later.');
      } else if (err.response?.status === 404) {
        setError('Server endpoint not found. Please check configuration.');
      } else {
        setError(err.response?.data?.message || err.message || 'Registration failed');
      }
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">Create Your Account</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ... (input fields remain the same) ... */}
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
              loading 
                ? 'bg-blue-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">
            ✅ {success}
          </div>
        )}

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* REMOVED Terms and Privacy links to avoid 404 errors */}
      </div>
    </div>
  );
}
