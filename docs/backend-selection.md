# Backend Selection Feature

## Overview

Code Jarvis now supports two different chat backends:

1. **Gemini AI Powered** - Traditional AI-powered chat interface with natural language processing
2. **n8n Powered** - Webhook-based automation platform for custom workflows

## Features

### App Startup Flow
- At application startup, users are presented with a choice between the two backend options
- Backend preference is stored in browser localStorage for future sessions
- Users can change their backend preference later in the profile settings

### Gemini AI Backend
- Natural language processing for bioinformatics tasks
- Direct AI chat interface with built-in NLP tools
- Real-time AI responses
- Full integration with existing visualization features

### n8n Backend
- Webhook-based message handling
- Custom automation workflows through n8n
- Session management with unique 10-digit session IDs
- Integration with external services

## Configuration

### Environment Variables

Create a `.env.local` file in your project root with the following variable:

```bash
# n8n Webhook Configuration
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

### n8n Webhook Payload Format

When using the n8n backend, messages are sent to the webhook with the following JSON payload:

```json
{
  "chatInput": "user message content",
  "sessionId": "unique 10-digit random number"
}
```

### Session Management

- Each n8n session gets a unique 10-digit session ID
- Session IDs are generated randomly and are persistent throughout the user's session
- Session information is displayed in the profile settings when using n8n backend

## Usage

### Selecting a Backend

1. **First Time Users**: The backend selection modal appears automatically
2. **Existing Users**: Change backend in Profile Settings → Current Chat Backend → Change Backend

### Profile Settings

The profile pane now includes:
- Current backend display with icon and label
- Session ID display (for n8n backend)
- Option to change backend at any time

### Chat Interface

- **Gemini AI Mode**: Works exactly as before with full AI capabilities
- **n8n Mode**: Messages are sent to the configured webhook endpoint
- Both modes support the same visualization features

## Technical Implementation

### Key Components

- `BackendSelectionModal` - Modal for choosing backend
- `N8nWebhookService` - Service for handling n8n webhook calls
- Updated `AppContext` - Manages backend state and session data
- Updated `ChatInput` - Handles both backend types
- Updated `ProfilePane` - Shows backend information and settings

### State Management

- Backend type stored in localStorage
- Session data managed in AppContext
- Backend selection state controls app initialization flow

### Error Handling

- Graceful fallback for missing environment variables
- Clear error messages for webhook failures
- Session validation for n8n backend

## Migration

Existing users will see the backend selection modal on their next visit if no backend preference is saved. The app will continue to work with the Gemini AI backend by default until a choice is made. 