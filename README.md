# 📚 StudyBuddy Backend API

A production-ready REST API for the **StudyBuddy** Study Partner Matching platform.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken) |
| Security | bcryptjs, helmet, rate-limiting |
| Validation | express-validator |

---

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd studybuddy-backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env`:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/studybuddy
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
```

### 3. Seed Demo Data (optional)
```bash
npm run seed
```

### 4. Start Server
```bash
npm run dev      # development (nodemon)
npm start        # production
```

Server runs at: `http://localhost:5000`
API docs at: `http://localhost:5000/api`

---

## 📡 API Endpoints

### 🔐 Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Create account |
| POST | `/login` | No | Login + get JWT |
| GET | `/me` | ✅ | Current user info |
| POST | `/logout` | ✅ | Logout hint |
| PUT | `/change-password` | ✅ | Update password |

### 👤 Users — `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | List + search users |
| GET | `/me` | ✅ | My full profile |
| PUT | `/update` | ✅ | Update profile |
| DELETE | `/me` | ✅ | Deactivate account |
| GET | `/options` | No | Valid skills/goals/availability |
| GET | `/:id` | ✅ | View any public profile |

**Query params for `GET /api/users`:**
```
?q=rahul           → full-text search
?skill=DSA         → filter by skill
?goal=Interview+Prep
?availability=Night
?page=1&limit=12   → pagination
```

### 🤝 Matching — `/api/match`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | ✅ | Get ranked matches |
| GET | `/connections` | ✅ | My connections |
| GET | `/:userId` | ✅ | Score vs specific user |
| POST | `/connect/:userId` | ✅ | Send connect request |
| PUT | `/connect/:connectionId` | ✅ | Accept / decline |

**Query params for `GET /api/match`:**
```
?minScore=30    → minimum match % (default 0)
?page=1&limit=12
```

---

## 🧠 Matching Algorithm

Scores are computed using a weighted formula:

```
Match Score (0–100) =
  Skills overlap (Jaccard similarity) × 50 pts  +
  Same study goal                     × 30 pts  +
  Same availability                   × 20 pts
```

**Jaccard Similarity for Skills:**
```
intersection(skillsA, skillsB) / union(skillsA, skillsB)
```

Example response:
```json
{
  "matchScore": 80,
  "breakdown": {
    "skills": 30,
    "goal": 30,
    "availability": 20
  }
}
```

---

## 📦 Request / Response Examples

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Rahul Verma",
  "email": "rahul@example.com",
  "password": "securepass123",
  "course": "B.Tech CSE",
  "skills": ["DSA", "Web Dev", "AI/ML"],
  "studyGoal": "Interview Prep",
  "availability": "Night",
  "bio": "Final year student, love algorithms"
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "rahul@example.com",
  "password": "securepass123"
}
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": { "_id": "...", "name": "Rahul Verma", ... }
}
```

### Authenticated Request
```http
GET /api/match
Authorization: Bearer eyJhbGci...
```

### Update Profile
```http
PUT /api/users/update
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{
  "skills": ["DSA", "System Design", "DevOps"],
  "bio": "Updated bio here"
}
```

### Accept Connection
```http
PUT /api/match/connect/<connectionId>
Authorization: Bearer eyJhbGci...
Content-Type: application/json

{ "action": "accept" }
```

---

## 🗄️ Database Schema

### User
```
name          String (required, 2-60 chars)
email         String (unique, required)
password      String (hashed, never returned)
course        String
skills        [String] (max 10)
studyGoal     Enum: Interview Prep | Exam Prep | Project Work | ...
availability  Enum: Morning | Afternoon | Night | Weekends | Flexible
bio           String (max 300)
avatarUrl     String
isActive      Boolean
lastSeen      Date
connections   [ObjectId ref User]
createdAt     Date
updatedAt     Date
```

### Connection
```
requester   ObjectId ref User
recipient   ObjectId ref User
status      Enum: pending | accepted | declined
matchScore  Number (0-100)
createdAt   Date
```

---

## 🔒 Security Features

- ✅ Passwords hashed with **bcrypt** (12 rounds)
- ✅ JWT tokens expire in 7 days
- ✅ **Helmet** sets secure HTTP headers
- ✅ **Rate limiting** — 20 req/15min on auth, 200 req/15min elsewhere
- ✅ Request body size limited to **10kb**
- ✅ CORS whitelist configured via env
- ✅ Passwords never returned in any response (`select: false`)
- ✅ Input validation on all write endpoints

---

## 🌍 Deployment

### Render
1. Push to GitHub
2. New Web Service → connect repo
3. Build: `npm install`, Start: `node server.js`
4. Add environment variables in Render dashboard
5. Add MongoDB Atlas URI

### Railway
```bash
railway login
railway init
railway add  # add MongoDB plugin
railway up
```

### Environment for Production
```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/studybuddy
JWT_SECRET=<strong_random_64_char_string>
CLIENT_URL=https://your-frontend.vercel.app
```

---

## 📁 Project Structure

```
studybuddy-backend/
├── config/
│   └── db.js              # MongoDB connection
├── controllers/
│   ├── authController.js   # Register, login, logout
│   ├── userController.js   # Profile CRUD, search
│   └── matchController.js  # Matching algorithm + connections
├── middleware/
│   ├── auth.js             # JWT protect middleware
│   ├── validate.js         # express-validator runner
│   └── errorHandler.js     # Global error handler
├── models/
│   ├── User.js             # User schema + methods
│   └── Connection.js       # Connection request schema
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   └── matchRoutes.js
├── seed.js                 # Demo data seeder
├── server.js               # App entry point
├── .env.example
└── package.json
```

---

## 🧪 Demo Credentials (after seeding)

All passwords: `password123`

| Email | Role |
|-------|------|
| rahul@demo.com | Interview Prep / Night |
| priya@demo.com | Project Work / Morning |
| aakash@demo.com | Research / Afternoon |
| sneha@demo.com | Skill Building / Morning |
| dev@demo.com | Interview Prep / Night |

