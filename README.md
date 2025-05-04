# ProsparityAI

![ProsparityAI Logo](/public/logo.png)

ProsparityAI is a cutting-edge AI-powered sales call assistant designed to revolutionize how sales teams interact with leads and manage their sales processes. By leveraging advanced AI technology, it automates lead qualification, provides real-time conversation analysis, and delivers actionable insights to optimize sales strategies.

## 🌟 Key Features

- **Intelligent Lead Classification**: Automatically categorizes leads based on interest level, objections, and follow-up needs
- **Real-time Conversation Analysis**: Analyzes call conversations in real-time to identify key signals and insights
- **Automated Follow-up Management**: Schedules and tracks follow-up actions based on call outcomes
- **Comprehensive Analytics**: Provides detailed insights about call performance and lead qualification patterns
- **Knowledge Base Management**: Centralizes company and product information for consistent AI responses
- **Task Management**: Creates and tracks sales-related tasks with automated reminders
- **Company Profile Management**: Customizes AI behavior based on company-specific information

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or later
- NPM or Yarn
- A Supabase account
- A Google Cloud account (for Gemini AI API)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/prosparityai.git
cd prosparityai
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Automated Setup (Recommended):
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```
This script will guide you through the entire setup process, including:
- Verifying Node.js compatibility
- Installing dependencies
- Setting up API keys
- Testing the AI agent functionality

4. Manual Environment Setup:
If you prefer to set up manually, create a `.env.local` file with the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

5. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

### Setting Up Gemini AI Integration

The application uses Google's Gemini AI for natural language processing. Follow these steps to set up your Gemini API key:

1. Visit [Google AI Studio](https://ai.google.dev/) and create an account
2. Generate an API key from the Google AI Studio console
3. Add your API key to the `.env.local` file as shown above
4. Test the AI integration by running:
```bash
node scripts/test-ai-agent.js
```

### Troubleshooting AI Integration

If you encounter issues with the AI agent:

1. Verify your Gemini API key is correct
2. Ensure you have sufficient quota for the Gemini API
3. Check the console logs for specific error messages
4. Run the test script to diagnose issues:
```bash
node scripts/test-ai-agent.js
```

## 🏗 Project Structure

```
/app                    # Next.js App Router pages and API routes
  /api                  # API endpoints
  /auth                # Authentication pages
  /dashboard           # Main dashboard
  /insights           # Analytics and insights
  /calls              # Call management
  /leads              # Lead management
  /settings           # Application settings
/components            # Reusable React components
  /ai                 # AI-related components
  /auth               # Authentication components
  /dashboard          # Dashboard components
  /ui                 # UI components
/lib                   # Utility functions and services
  /ai                 # AI processing utilities
  /auth               # Authentication utilities
  /db                 # Database utilities
/public                # Static assets
/styles                # Global styles
```

## 🛠 Technology Stack

- **Frontend**: 
  - Next.js 14 (App Router)
  - React
  - Tailwind CSS
  - TypeScript

- **Backend**:
  - Next.js API Routes
  - Supabase (Database & Auth)
  - Google Generative AI (Gemini)

- **Infrastructure**:
  - Vercel (Hosting)
  - Supabase (Database)
  - Google Cloud (AI Services)

## 📈 Key Components

### 1. AI Call Agent
- Processes speech input from leads
- Analyzes lead intent and interest level
- Generates contextual responses
- Tracks insights and follow-up needs

### 2. Insights Dashboard
- Displays call performance metrics
- Shows lead qualification analytics
- Provides trend analysis
- Identifies improvement opportunities

### 3. Lead Management
- Tracks lead information
- Stores AI-generated insights
- Manages follow-up schedules
- Provides pipeline visibility

### 4. Company Profile
- Manages company information
- Stores product/service details
- Customizes AI responses
- Maintains knowledge base

## 🔄 Development Workflow

1. Create a new branch for your feature:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and commit them:
```bash
git commit -m "Description of your changes"
```

3. Push to your branch:
```bash
git push origin feature/your-feature-name
```

4. Create a Pull Request from your branch

## 🔍 Testing

Run the test suite:
```bash
npm run test        # Run unit tests
npm run test:e2e    # Run end-to-end tests
```

## 📚 Documentation

- Project documentation is available in the `/docs` directory
- API documentation can be found at `/docs/api`
- Architecture details are in `SOLUTION_APPROACH.md`

## 🛣 Roadmap

1. **Multi-language Support**
   - Expand conversation capabilities to multiple languages
   - Improve handling of different accents and dialects

2. **Advanced Sentiment Analysis**
   - Enhanced emotional intelligence in conversations
   - Better detection of subtle conversational cues

3. **CRM Integration**
   - Connect with popular CRM platforms
   - Automated data synchronization

4. **Custom AI Training**
   - Company-specific AI model training
   - Industry-specific conversation templates

5. **Voice Recognition Improvements**
   - Better accent handling
   - Improved speech-to-text accuracy

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for our code of conduct and contribution guidelines.

## 📄 License

Copyright (c) 2024 Prosparity.AI. All rights reserved.

## 🤝 Support

For support, email support@prosparity.ai or join our Discord community.

## 🙏 Acknowledgments

- Thanks to the amazing open-source community
- Special thanks to our contributors and early adopters
- Built with ❤️ using Next.js and Supabase
