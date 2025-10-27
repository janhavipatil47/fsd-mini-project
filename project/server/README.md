# 🔐 MongoDB Authentication System

Complete user authentication and authorization system with JWT tokens.

## 🚀 Features

- ✅ User Registration with validation
- ✅ Login with JWT tokens
- ✅ Password hashing with bcrypt
- ✅ Password change functionality
- ✅ Profile management
- ✅ Role-based access control (Admin, Member, Guest)
- ✅ Protected routes with middleware
- ✅ Token refresh mechanism
- ✅ User management (Admin)

---

## 📚 API Endpoints

### Authentication Routes

#### 1. Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "fullName": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "fullName": "John Doe",
      "role": "member"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "member",
      "lastLogin": "2025-10-26T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

#### 3. Get Current User (Protected)
```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "fullName": "John Doe",
    "role": "member",
    "bio": "Book lover and avid reader",
    "avatar": "https://example.com/avatar.jpg",
    "isEmailVerified": false,
    "lastLogin": "2025-10-26T12:00:00.000Z",
    "createdAt": "2025-10-20T10:00:00.000Z"
  }
}
```

---

#### 4. Update Profile (Protected)
```http
PUT /api/auth/profile
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "fullName": "John Doe Jr.",
  "bio": "Passionate reader and book club enthusiast",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

---

#### 5. Change Password (Protected)
```http
PUT /api/auth/change-password
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newSecurePassword456"
}
```

---

#### 6. Get All Users (Admin Only)
```http
GET /api/auth/users
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "member",
      "createdAt": "2025-10-20T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

#### 7. Delete User (Admin Only)
```http
DELETE /api/auth/users/507f1f77bcf86cd799439011
Authorization: Bearer ADMIN_JWT_TOKEN
```

---

## 🔒 Authentication Flow

### Step 1: Register/Login
```javascript
// Register
const response = await fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'password123'
  })
});

const { data } = await response.json();
const token = data.token; // Save this token
```

### Step 2: Use Token for Protected Routes
```javascript
// Get user profile
const response = await fetch('http://localhost:3001/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Step 3: Store Token in Frontend
```javascript
// Save to localStorage (React)
localStorage.setItem('authToken', token);

// Include in all API requests
const token = localStorage.getItem('authToken');
fetch('/api/analytics', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🛡️ Security Features

### Password Security
- ✅ Passwords hashed with bcrypt (salt rounds: 10)
- ✅ Never returned in API responses
- ✅ Minimum 6 characters required
- ✅ Secure password comparison

### Token Security
- ✅ JWT tokens with expiration (7 days)
- ✅ Refresh tokens (30 days)
- ✅ Signed with secret key
- ✅ Verified on every protected request

### Input Validation
- ✅ Email format validation
- ✅ Username format (alphanumeric + underscore)
- ✅ Password strength requirements
- ✅ XSS protection
- ✅ SQL injection protection (NoSQL)

---

## 🧪 Testing with Postman/cURL

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Get Profile (replace TOKEN with actual token)
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

## 🔗 Integration with Frontend

### React Example

```tsx
// authService.ts
export const authService = {
  async register(username: string, email: string, password: string) {
    const response = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('authToken', data.data.token);
    }
    return data;
  },

  async login(email: string, password: string) {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('authToken', data.data.token);
    }
    return data;
  },

  async getProfile() {
    const token = localStorage.getItem('authToken');
    const response = await fetch('http://localhost:3001/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  },

  logout() {
    localStorage.removeItem('authToken');
  }
};
```

---

## 🗄️ MongoDB User Schema

```typescript
{
  username: String (unique, 3-30 chars, alphanumeric),
  email: String (unique, valid email),
  password: String (hashed, min 6 chars),
  fullName: String (optional, max 100 chars),
  role: 'admin' | 'member' | 'guest',
  avatar: String (URL, optional),
  bio: String (max 500 chars, optional),
  isEmailVerified: Boolean (default: false),
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## ⚙️ Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-change-this-in-production
JWT_EXPIRES_IN=7d

# MongoDB
MONGODB_URI=mongodb://localhost:27017/bookclub
```

---

## 🎯 Use Cases

### 1. User Registration Flow
1. User fills registration form
2. Frontend sends POST to `/api/auth/register`
3. Backend validates data
4. Password is hashed
5. User saved to MongoDB
6. JWT token generated and returned
7. Frontend stores token
8. User is logged in

### 2. Protected Routes
1. User tries to access analytics
2. Frontend includes JWT token in header
3. Backend verifies token
4. If valid, allows access
5. If invalid/expired, returns 401 error

### 3. Admin Management
1. Admin logs in with admin account
2. Gets admin JWT token
3. Can access `/api/auth/users`
4. Can delete users
5. Regular users get 403 Forbidden

---

## ✅ All 10 Concepts Now Fully Implemented!

1. ✅ Tailwind CSS
2. ✅ React Hooks
3. ✅ Context API
4. ✅ **MongoDB + Mongoose** ← **Users stored in MongoDB!**
5. ✅ **RESTful APIs** ← **Full auth endpoints!**
6. ✅ **JWT Authentication** ← **Custom JWT system!**
7. ✅ **Postman Testing** ← **Test all auth endpoints!**
8. ✅ WebSockets
9. ✅ CI/CD
10. ✅ Docker

🎉 **Complete production-ready authentication system!**
