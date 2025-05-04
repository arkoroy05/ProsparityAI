#!/bin/bash

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Print header
echo -e "${MAGENTA}${BOLD}===============================================${RESET}"
echo -e "${MAGENTA}${BOLD}       Prosparity AI Agent Setup Script        ${RESET}"
echo -e "${MAGENTA}${BOLD}===============================================${RESET}"
echo ""

# Check if Node.js is installed
echo -e "${BLUE}Checking Node.js installation...${RESET}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js v18 or higher.${RESET}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version must be 18 or higher. Current version: $(node -v)${RESET}"
    echo -e "${YELLOW}Please update Node.js and try again.${RESET}"
    exit 1
fi
echo -e "${GREEN}Node.js version $(node -v) is compatible.${RESET}"

# Install dependencies
echo -e "\n${BLUE}Installing dependencies...${RESET}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies.${RESET}"
    exit 1
fi
echo -e "${GREEN}Dependencies installed successfully.${RESET}"

# Set up environment variables
echo -e "\n${BLUE}Setting up environment variables...${RESET}"
echo -e "${YELLOW}You'll need to enter API keys for the services used by the application.${RESET}"
echo -e "${YELLOW}If you don't have them yet, you can set them up later by running 'node scripts/setup-api-keys.js'${RESET}"

# Run the API key setup script
node scripts/setup-api-keys.js
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to run API key setup script.${RESET}"
    echo -e "${YELLOW}You can set up your API keys manually by editing the .env.local file.${RESET}"
else
    echo -e "${GREEN}Environment variables configured successfully.${RESET}"
fi

# Make test scripts executable
chmod +x scripts/test-ai-agent.js
chmod +x scripts/setup-api-keys.js

# Run tests
echo -e "\n${BLUE}Running AI agent tests...${RESET}"
echo -e "${YELLOW}This will test if the AI agent is working correctly with your API keys.${RESET}"
echo -e "${YELLOW}If you want to skip this step, press Ctrl+C now.${RESET}"
echo ""
read -p "Press Enter to run the tests or Ctrl+C to exit..."

node scripts/test-ai-agent.js
if [ $? -ne 0 ]; then
    echo -e "${RED}AI agent tests failed.${RESET}"
    echo -e "${YELLOW}Please check your API keys and try again.${RESET}"
else
    echo -e "${GREEN}AI agent tests passed successfully.${RESET}"
fi

# Display next steps
echo -e "\n${MAGENTA}${BOLD}===============================================${RESET}"
echo -e "${MAGENTA}${BOLD}                 Next Steps                  ${RESET}"
echo -e "${MAGENTA}${BOLD}===============================================${RESET}"
echo -e "${CYAN}1. Start the development server: ${BOLD}npm run dev${RESET}"
echo -e "${CYAN}2. Open your browser at: ${BOLD}http://localhost:3000${RESET}"
echo -e "${CYAN}3. Configure your Twilio settings in the admin panel${RESET}"
echo -e "${CYAN}4. Test an AI call through the interface${RESET}"
echo -e "\n${GREEN}Setup complete! Your AI sales agent is now ready to use.${RESET}" 