# Prosparity.AI

Prosparity.AI is a generative AI-powered sales agent focused on lead management and outreach. The application helps sales teams manage leads, track follow-ups, and use AI to optimize the sales process.

## Project Structure

The project is organized using Next.js App Router architecture:

```
/app
  /api                # API routes
  /auth              # Authentication pages
  /dashboard         # Dashboard and main features
  /components        # Reusable UI components
  /lib               # Utility functions and hooks
```

## Features

- **Lead Management**: Track leads, score them, and manage their status
- **Task Management**: Create tasks, set reminders, and track progress
- **AI Instructions**: Configure how the AI agent interacts with leads
- **Company Management**: Set up your company profile and preferences
- **Authentication**: Secure login, registration, and company setup

## Technologies

- **Next.js 14**: React framework with App Router
- **Supabase**: Backend as a service (Auth, Database)
- **Tailwind CSS**: Utility-first CSS framework
- **React**: UI framework

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   - Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server: `npm run dev`
5. Visit `http://localhost:3000` in your browser

## Project Migration

This project is currently being migrated from Next.js Pages Router to App Router. The migration plan includes:

1. Creating proper folder structure in the app directory
2. Migrating components and pages
3. Implementing authentication with Supabase
4. Updating API routes
5. Ensuring proper state management

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

Copyright (c) 2024 Prosparity.AI. All rights reserved.
