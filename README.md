# 🛒 cMart - Smart POS System (Backend)

Welcome to the backend repository for the **cMart Smart POS System**! This repository contains the robust, secure, and scalable API that powers the cMart frontend application.

## 🌟 Key Features

- **Robust REST API**: Built with Node.js and Express.js.
- **Database Management**: Utilizes Prisma ORM for seamless and type-safe database interactions with PostgreSQL (hosted on Supabase).
- **Authentication & Security**: JWT-based authentication system with secure password hashing and role-based access control.
- **Image & File Handling**: Integration with Supabase Storage for secure and scalable product image uploads.
- **Scalable Architecture**: Well-structured modular design separating routes, controllers, and services for high maintainability.

## 🛠️ Technology Stack

- **Runtime Environment**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Language**: TypeScript
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database**: PostgreSQL (via [Supabase](https://supabase.com/))
- **Authentication**: JSON Web Tokens (JWT) & bcrypt

## 🚀 Getting Started

Follow these steps to get the backend running locally on your machine.

### Prerequisites

- Node.js (v18.17 or later)
- npm or yarn
- A PostgreSQL database instance (preferably Supabase for Storage support)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sadun2002/cMart-Backend.git
   cd cMart-Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and configure your database and JWT secrets:
   ```env
   # Server
   PORT=3001
   NODE_ENV=development

   # Database (Supabase PostgreSQL)
   DATABASE_URL="your_database_url_here"
   DIRECT_URL="your_direct_url_here"

   # JWT
   JWT_SECRET="your_secret_key"
   JWT_REFRESH_SECRET="your_refresh_secret"

   # Supabase Storage
   SUPABASE_URL="your_supabase_url"
   SUPABASE_SERVICE_KEY="your_supabase_service_key"
   ```

4. **Initialize Prisma (Database Migration):**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **API Endpoint:**
   The server will start on [http://localhost:3001/api/v1](http://localhost:3001/api/v1) by default.

## 📁 Project Structure

```
cMart-Backend/
├── prisma/               # Prisma schema and database migrations
├── src/                  # Core application source code
│   ├── controllers/      # Request handlers and business logic
│   ├── routes/           # Express API route definitions
│   ├── services/         # Reusable business services and logic
│   ├── utils/            # Helper functions and utilities
│   └── index.ts          # Application entry point
├── .env                  # Environment configuration (not committed)
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## 🤝 Frontend Repository

Note: This repository only contains the backend API codebase. The frontend (built with Next.js and Tailwind CSS) is managed in a separate repository.

## 📝 License

This project is proprietary and confidential.
