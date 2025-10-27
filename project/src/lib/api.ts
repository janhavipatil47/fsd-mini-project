// API client for MongoDB backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: string;
  avatar?: string;
}

interface AuthResponse {
  user: UserData;
  token: string;
  refreshToken: string;
}

// Register new user
export const registerUser = async (data: RegisterData): Promise<ApiResponse<AuthResponse>> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    // Handle validation errors
    if (error.errors && Array.isArray(error.errors)) {
      const errorMessages = error.errors.map((e: any) => e.msg).join(', ');
      throw new Error(errorMessages);
    }
    throw new Error(error.message || 'Registration failed');
  }

  return response.json();
};

// Login user
export const loginUser = async (data: LoginData): Promise<ApiResponse<AuthResponse>> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
};

// Get current user
export const getCurrentUser = async (token: string): Promise<ApiResponse<UserData>> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch user');
  }

  return response.json();
};

// Store token in localStorage
export const storeAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);
};

// Get token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Remove token from localStorage
export const removeAuthToken = () => {
  localStorage.removeItem('auth_token');
};

export default {
  registerUser,
  loginUser,
  getCurrentUser,
  storeAuthToken,
  getAuthToken,
  removeAuthToken,
};
