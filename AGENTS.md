# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

GitHub Stars Manager is a React-based web application for managing GitHub starred repositories with AI-powered categorization, semantic search, and release tracking. It can run as a standalone frontend (data in localStorage/IndexedDB) or with an optional Express + SQLite backend for cross-device sync and CORS-free API proxying.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **State Management**: Zustand with IndexedDB persistence
- **Icons**: Lucide React
- **Backend (Optional)**: Express + SQLite (better-sqlite3) + TypeScript
- **Desktop**: Electron with electron-builder
- **Deployment**: Docker with Nginx

## Common Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

### Backend Development
```bash
# Install server dependencies
cd server && npm install

# Start development server with hot reload (port 3000)
npm run dev

# Build server (outputs to server/dist/)
npm run build

# Start production server
npm run start

# Run tests
npm test
npm run test:watch
```

### Concurrent Development
```bash
# Run both frontend and backend simultaneously
npm run dev:all

# Build both frontend and backend
npm run build:all
```

### Desktop Build
```bash
# Build desktop application (requires dist/ to be built first)
npm run build:desktop

# Run Electron in development mode
npm run electron:dev

# Create distribution packages
npm run dist
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Application available at http://localhost:8080
```

## Architecture

### Frontend Architecture

**State Management (Zustand)**
- Central store in `src/store/useAppStore.ts` with persistence to IndexedDB
- State includes: auth, repositories, AI configs, WebDAV configs, releases, search filters
- Backend API secret stored in sessionStorage only (not persisted)

**Key Services**
- `src/services/githubApi.ts` - GitHub API client (token-based auth)
- `src/services/aiService.ts` - AI provider integration (OpenAI, Codex, Ollama, etc.)
- `src/services/backendAdapter.ts` - Optional backend sync and proxy
- `src/services/webdavService.ts` - WebDAV backup/restore
- `src/services/indexedDbStorage.ts` - Zustand persistence adapter
- `src/services/autoSync.ts` - Automatic sync scheduling

**Data Flow**
1. User authenticates with GitHub token (stored in Zustand/IndexedDB)
2. Repositories sync from GitHub API with pagination
3. AI analysis generates tags/categories (optional, async)
4. Data persists to IndexedDB; optional WebDAV backup or backend sync

### Backend Architecture (Optional)

**Structure**
- `server/src/index.ts` - Express app factory and server startup
- `server/src/routes/` - Route handlers (repositories, releases, categories, configs, sync, proxy)
- `server/src/middleware/` - Auth and error handling
- `server/src/db/` - SQLite connection, migrations, schema
- `server/src/services/crypto.ts` - AES-256 encryption for secrets

**Security**
- Optional API_SECRET for Bearer token auth
- AES-256 encryption for stored tokens (ENCRYPTION_KEY env or auto-generated)
- Proxy routes allow frontend to make CORS-free calls to AI/WebDAV services

**Environment Variables**
```bash
API_SECRET=<optional bearer token for auth>
ENCRYPTION_KEY=<optional 32-byte hex key for encryption>
PORT=3000
DB_PATH=./data/data.db
```

### Database Schema (SQLite)

Tables: repositories, releases, categories, configs, sync_state
- Repositories: id, full_name, data (JSON), ai_summary, ai_tags, ai_platforms, custom_category, etc.
- Releases: id, repo_id, data (JSON), is_read
- Configs: key, value (encrypted)

## Key Files

- `src/types/index.ts` - TypeScript interfaces for all data types
- `src/store/useAppStore.ts` - Zustand store with actions and persistence
- `vite.config.ts` - Vite config with base: './' for relative paths
- `tailwind.config.js` - Tailwind with custom colors (primary, secondary, accent)
- `electron-builder.yml` - Desktop packaging config
- `docker-compose.yml` - Docker deployment with Nginx

## Development Notes

- **CORS**: When running `npm run dev` alone, AI/WebDAV calls may fail due to CORS. Use the backend (`npm run dev:all`) or Docker for full functionality.
- **Rate Limiting**: GitHub API calls have built-in delays (100ms between requests)
- **AI Analysis**: Supports multiple providers via OpenAI-compatible API format
- **State Persistence**: Zustand automatically persists to IndexedDB; partial state restoration on app load

## Testing

Backend tests use Vitest:
```bash
cd server
npm test              # Run once
npm run test:watch    # Watch mode
```

## Build Outputs

- `dist/` - Frontend build (static files)
- `server/dist/` - Backend build
- `release/` - Desktop packages (from electron-builder)
- `data/` - SQLite database and encryption key (backend)
