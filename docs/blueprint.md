# **App Name**: Code Jarvis

## Core Features:

### Chat Backend Selection System:
- **App Startup Flow**: At application startup, present users with a choice between two chat backend options:
  1. **Gemini AI Powered App**: Traditional AI-powered chat interface
  2. **n8n Powered App**: Webhook-based chat system using n8n automation platform
- **Backend Configuration**: Store user's backend preference in browser localStorage for future sessions
- **n8n Integration**: When n8n backend is selected, all chat messages are sent to n8n webhook endpoint configured in `.env` file
- **Webhook Payload Format**: n8n webhook expects JSON payload with:
  ```json
  {
    "chatInput": "user message content",
    "sessionId": "unique 10-digit random number"
  }
  ```

### User Profile & Settings:
- Client-side user profile and settings (display name, script count, estimated GPU usage) managed via browser localStorage
- Backend preference storage and management

### Chat Interface & NLP:
- **Gemini AI Mode**: Natural language processing (NLP) for bioinformatics tasks using Gemini AI
- **n8n Mode**: Webhook-based message handling with session management
- Uses NLP "tool" to extract intents and entities from user input (Gemini AI mode only)
- Session management with unique session IDs for n8n mode

### Script Management:
- Client-side script management (create, rename, open, delete, export, import) using browser localStorage
- Backend-agnostic script operations

### Data Retrieval & Search:
- Data retrieval and search functionalities for proteins and small molecules via public APIs
- Available in both Gemini AI and n8n modes

### Protein Structure Prediction:
- Protein structure prediction using a backend compute API and visualization of the predicted structure
- Available in both Gemini AI and n8n modes

## Technical Architecture:

### Environment Configuration:
- `.env` file contains n8n webhook URL for webhook-based chat
- Backend selection preference stored in localStorage
- Session ID generation for n8n webhook calls

### Chat Flow:
1. **App Initialization**: Check for existing backend preference in localStorage
2. **Backend Selection**: If no preference exists, show selection modal
3. **Gemini AI Mode**: Direct AI chat interface with NLP processing
4. **n8n Mode**: Webhook-based chat with session management and unique session IDs

### Session Management:
- Generate unique 10-digit session IDs for n8n webhook calls
- Maintain session consistency throughout user interaction
- Handle session persistence and recovery

## Style Guidelines:

- Primary color: Use a calming blue (#4285F4) for the header and main interactive elements
- Secondary color: A light gray (#F5F5F5) for backgrounds to ensure readability and reduce visual clutter
- Accent color: Teal (#00BCD4) for highlights, active states, and calls to action
- Two-pane horizontal layout with chat on the left and visualizer on the right
- Ensure high readability of chat messages and data displays
- Use clear and recognizable icons for actions such as 'New Script,' 'Save,' 'Delete,' and 'Upload'
- Backend selection modal with clear visual distinction between Gemini AI and n8n options