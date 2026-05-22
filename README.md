# Nexus Smart Stadium Platform 🏟️

Nexus is a real-time, AI-powered smart stadium management and attendee experience platform. It leverages WebSockets, Redis Pub/Sub, and Google's Gemini AI to provide dynamic crowd control, live queue monitoring, and an intelligent assistant for stadium attendees.

## 🚀 Features

### 1. Attendee App (Mobile-First Frontend)
- **Live Interactive Map:** View real-time crowd density across stadium zones (North, East, South, West).
- **Live Queue Times:** Get real-time updates on wait times and queue lengths for food stalls, washrooms, and merchandise shops.
- **Smart Recommendations:** Automatically highlights the fastest food options and shortest restroom queues based on live data.
- **Nexus AI Copilot:** A Gemini-powered AI assistant that uses function calling to access live stadium data. Attendees can ask questions like *"What's the fastest food option?"* or *"How long is the wait at North Stand Bites?"* and receive real-time, data-driven answers.

### 2. Admin Command Center (Operations Dashboard)
- **Global Overview:** Monitor average crowd density, congested zones, and average queue wait times across the entire venue.
- **Live Heatmap:** Visualize crowd density in real-time across all stadium zones.
- **Simulation Engine:** Built-in tools for hackathons and demos to manually trigger events like food rushes or innings breaks, simulating real-world crowd surges.
- **Event Log:** Live tracking of system events and alerts.

### 3. Backend Engine
- **Real-time State Management:** Uses Redis Hashes to store the latest state of zones and Points of Interest (POIs).
- **Pub/Sub Architecture:** Uses Redis Pub/Sub combined with Socket.IO to broadcast live updates to all connected clients instantly.
- **Simulation Loop:** A background engine that continuously generates realistic fluctuations in crowd density and queue lengths.

## 🛠️ Tech Stack

**Frontend:**
- [Next.js](https://nextjs.org/) (React 19)
- [Tailwind CSS v4](https://tailwindcss.com/) & Framer Motion
- [Zustand](https://zustand-demo.pmnd.rs/) (State Management)
- [Socket.IO Client](https://socket.io/)
- Lucide React (Icons)

**Backend:**
- [Node.js](https://nodejs.org/) & Express
- [Socket.IO](https://socket.io/) (WebSockets)
- [Redis / ioredis](https://redis.io/) (State & Pub/Sub)
- [@google/genai](https://github.com/google/genai-js) (Gemini 2.5 Flash for AI Copilot)
- [Prisma](https://www.prisma.io/) (PostgreSQL Schema included for future persistence)

## 📦 Prerequisites

- Node.js (v18+ recommended)
- A Redis instance (Local or Upstash/Cloud)
- A Google Gemini API Key

## 🚦 Getting Started

### 1. Clone & Install
Ensure you install dependencies for both the frontend and backend.

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

**Backend (`backend/.env`):**
Create a `.env` file in the `backend` directory:
```env
PORT=4001
GEMINI_API_KEY=your_gemini_api_key_here
UPSTASH_REDIS_URL=redis://localhost:6379 # Or your Upstash Redis URL
DATABASE_URL=postgresql://user:pass@localhost:5432/stadium # For Prisma (Optional for demo)
```

**Frontend (`frontend/.env.local`):**
Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:4001
```

### 3. Running the Platform

You need to run both the backend server and the frontend application simultaneously.

**Start the Backend Engine:**
```bash
cd backend
npm run dev
```
*This will start the Express API on port 4001, initialize the Socket.IO server, connect to Redis, and start the crowd simulation engine.*

**Start the Frontend App:**
```bash
cd frontend
npm run dev
```
*This will start the Next.js application, typically on port 3000.*

### 4. Viewing the Apps

- **Landing Page:** `http://localhost:3000/`
- **Admin Dashboard:** `http://localhost:3000/dashboard`
- **Attendee Mobile App:** `http://localhost:3000/map` (Best viewed in a mobile-sized viewport or device emulator).

## 🧠 AI Copilot Implementation Details

The AI Copilot in this project uses the `@google/genai` SDK with **Function Calling**. 
- The system prompt defines the stadium layout and available tools (`checkQueueTimes` and `checkCrowdDensity`).
- When a user asks a question, Gemini determines if it needs to fetch live data.
- If so, it invokes a tool. The backend executes the tool against the live Redis state.
- The result is passed back to Gemini, which then generates a natural, contextual response for the user.
