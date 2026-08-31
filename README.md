# Notes App — MERN Stack Project

A full-stack note-taking application with secure authentication, a rich text
editor, and a fully tested backend and frontend (unit + integration tests,
95%+ backend coverage, 94%+ frontend coverage, SonarQube quality gate passed)

---

## Features

- **Authentication** — Sign up / log in with JWT, bcrypt password hashing,
  "remember me" (localStorage vs sessionStorage), per-user data isolation
- **Notes** — Create, edit, delete, favorite, trash, and permanently delete
  notes with a rich text editor (TipTap) supporting formatting, tables,
  links, and images
- **Dashboard** — Search (debounced), sort, filter (All / Favorites / Trash /
  Category), pagination, grid/list view toggle
- **Categories** — Browse notes grouped by category
- **Profile** — Edit name/email inline, upload and resize an avatar photo
- **Settings** — Dark mode toggle
- **Accessibility** — Keyboard navigation, ARIA roles, focus management on
  modals and panels
- **Logging & error handling** — Centralized Express error middleware, Pino
  request/activity logging

---

## Tech Stack

**Backend:** Node.js, Express.js, MongoDB (Mongoose), JWT, bcrypt, Helmet,
Pino

**Frontend:** React 19, Vite, Tailwind CSS, React Router, TipTap (rich text
editor), Lucide Icons

**Testing:**
- Backend — Mocha, Chai, Sinon, Supertest, mongodb-memory-server, nyc (coverage)
- Frontend — Jest, React Testing Library, @testing-library/user-event

**Code Quality:** SonarQube (Community Edition, run locally via Docker)

---

## Project Structure
├── backend/
│ ├── src/
│ │ ├── controllers/ # auth & notes business logic
│ │ ├── middlewares/ # auth, error handling, request logging
│ │ ├── models/ # Mongoose schemas (User, Note)
│ │ ├── routes/ # Express routers
│ │ ├── utils/ # logger
│ │ ├── config/ # DB connection
│ │ └── app.js
│ ├── test/
│ │ ├── unit/ # Mocha + Sinon, mocked models
│ │ ├── integration/ # Supertest against real app + in-memory Mongo
│ │ └── setup.js
│ └── server.js
└── frontend/
   └── src/
    ├── components/ # auth, profile, editor components
    ├── pages/ # Dashboard, NoteEditor, Categories, Settings
    ├── utils/ # apiRequest, theme
    └── **/*.test.jsx # Jest + RTL tests colocated with source

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (local instance or MongoDB Atlas connection string)

### 1. Backend setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/notes-app
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=http://localhost:5173
```

Run the backend:
```bash
npm run dev
```

### 2. Frontend setup
```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
```

Run the frontend:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Running Tests

### Backend (Mocha + Chai + Sinon + Supertest)
```bash
cd backend
npm test                  
npm run test:coverage     
```
**Result:** 88 tests passing · ~95% statement coverage

### Frontend (Jest + React Testing Library)
```bash
cd frontend
npm test                  
npx jest --coverage       
```
**Result:** 257+ tests passing · ~94% statement coverage

---

## Code Quality — SonarQube

Static analysis was run locally using SonarQube Community Edition (Docker) against
both `backend/coverage/lcov.info` and `frontend/coverage/lcov.info`.

**Quality Gate: Passed**

Full dashboard screenshots are available in [`/report`](./report).

To reproduce the scan locally:
```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:community
# generate coverage in both backend/ and frontend/ first, then from repo root:
npx @sonar/scan
```

---

## API Overview

| Method | Endpoint                 | Description                                   |
|---     |---                       |---                                            |
| POST   | `/api/auth/signup`       | Register a new user                           |
| POST   | `/api/auth/login`        | Log in, returns JWT                           |
| GET    | `/api/auth/me`           | Get current user profile                      |
| PUT    | `/api/auth/profile`      | Update name/email                             |
| PUT    | `/api/auth/avatar`       | Update avatar                                 |
| GET    | `/api/notes`             | List notes (search, sort, filter, pagination) |
| POST   | `/api/notes`             | Create a note                                 |
| GET    | `/api/notes/:id`         | Get a single note                             |
| PUT    | `/api/notes/:id`         | Update a note                                 |
| PATCH  | `/api/notes/:id/favorite`| Toggle favorite                               |
| PATCH  | `/api/notes/:id/trash`   | Move to trash                                 |
| PATCH  | `/api/notes/:id/restore` | Restore from trash                            |
| DELETE | `/api/notes/:id`         | Permanently delete                            |
| GET    | `/api/notes/stats`       | Dashboard stats                               |
| GET    | `/api/notes/categories`  | List categories with counts                   |

All `/api/notes/*` routes require a `Bearer` token in the `Authorization` header.

---

## Author

**Maryam Noman**
MERN Stack Intern — 10Pearls (10P Shine Internship Program, Cohort 9)