# Support Agent Chatbot - Frontend Integration

## Overview

The Support Agent Chatbot is a globally available AI-powered assistant that slides out from the right side of the screen. It provides personalized support using **Google Gemini 2.5 Flash** (direct API) with large context window support.

## Features

- 🎯 **Global Availability**: Accessible from any page in the application
- 💬 **Real-time Chat**: Instant AI responses powered by Google Gemini
- 🎨 **Responsive Design**: Works on desktop and mobile devices
- 🌙 **Theme Support**: Automatically adapts to light/dark mode
- 📊 **Context-Aware**: Has access to user's tasks, projects, and progress
- ⚡ **Smooth Animations**: Slide-in/slide-out panel with smooth transitions

## Components

### 1. **SupportAgentChat** (`/components/support-agent/SupportAgentChat.tsx`)

The main chatbot UI component with:

- Floating button (bottom-right corner)
- Sliding panel from the right side
- Message history display
- Input field with send button
- Loading states and error handling

### 2. **useSupportAgent Hook** (`/hooks/useSupportAgent.ts`)

Custom React hook for API interactions:

- `askQuestion(query, includeContext)` - Send a question to the AI
- `getRecommendations()` - Get AI-powered recommendations
- `getNextAction()` - Get suggested next action
- `getMyProgress()` - Get progress summary
  // Clerk removed: authentication is now handled via JWT/cookies

## Setup

### 1. Environment Variables

Add to `.env` or `.env.local`:

```env
NEXT_PUBLIC_SUPPORT_AGENT_URL=http://localhost:8005
```

For production:

```env
NEXT_PUBLIC_SUPPORT_AGENT_URL=https://your-api-domain.com
```

### 2. Backend Setup

Ensure the Support Agent backend is running:

```bash
cd /path/to/kiyo_cu/KiyoBackend/support-agent
source /path/to/.venv/bin/activate
python main.py --port 8005
```

### 3. Frontend Integration

The chatbot is already integrated in the root layout (`app/layout.tsx`):

```tsx
import { SupportAgentChat } from "@/components/support-agent/SupportAgentChat";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SupportAgentChat /> {/* Global chatbot */}
      </body>
    </html>
  );
}
```

## Usage

### Opening the Chatbot

Users can open the chatbot by clicking the floating button with the message icon in the bottom-right corner.

### Chatting

1. Click the floating button to open
2. Type your question in the input field
3. Press Enter or click the Send button
4. The AI will respond with personalized assistance
5. Click the X button or tap outside (mobile) to close

### Example Questions

- "What should I work on today?"
- "Show me my current progress"
- "What are my pending tasks?"
- "Give me recommendations to improve"
- "What's my next action?"

## API Endpoints Used

```
POST /api/v1/assistant/ask-me/
- Sends questions to the AI
- Includes user context (tasks, projects, etc.)

GET /api/v1/assistant/recommendations/
- Gets AI-powered recommendations

GET /api/v1/assistant/next-action/
- Gets suggested next action

GET /api/v1/assistant/my-progress/
- Gets progress summary
```

## Styling

The chatbot uses the existing design system:

- Tailwind CSS classes
- shadcn/ui components (Button, Input, ScrollArea)
- Follows the app's color scheme (light/dark mode)
- Matches the app's typography and spacing

### Colors

```css
- Primary: bg-primary, text-primary
- Background: bg-background
- Card: bg-card
- Muted: bg-muted
- Foreground: text-foreground
```

## Customization

### Change Position

Edit the floating button position in `SupportAgentChat.tsx`:

```tsx
<Button
  className="fixed bottom-6 right-6" // Change here
  // ...
>
```

### Change Width

Edit the panel width:

```tsx
<div
  className="w-full md:w-[400px]" // Change here
  // ...
>
```

### Change Colors

Update the message bubble colors:

```tsx
// User messages
className = "bg-primary text-primary-foreground";

// AI messages
className = "bg-muted";
```

## Troubleshooting

### Chatbot not appearing

1. Check if `SupportAgentChat` is imported in `layout.tsx`
2. Verify z-index values (should be z-50 for panel, z-40 for overlay)
3. Check browser console for errors

### API errors

1. Verify backend is running on port 8005
2. Check `NEXT_PUBLIC_SUPPORT_AGENT_URL` in `.env`
3. Check browser console for network errors
4. Verify authentication is working

### Styling issues

1. Make sure Tailwind CSS is properly configured
2. Check if shadcn/ui components are installed
3. Verify `globals.css` is imported in `layout.tsx`

## Dependencies

```json
{
  // "@clerk/nextjs": "^5.x", // Clerk removed
  "lucide-react": "^0.x",
  "class-variance-authority": "^0.x",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x"
}
```

## Mobile Responsiveness

- Full-width panel on mobile devices
- Backdrop overlay for better focus
- Touch-friendly button sizes
- Optimized keyboard input

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support (Enter to send)
- Screen reader friendly
- High contrast mode support

## Performance

- Lazy loading of messages
- Debounced API calls
- Optimized re-renders
- Smooth animations (CSS transitions)

## Future Enhancements

- [ ] Message persistence (save chat history)
- [ ] Voice input support
- [ ] File attachment support
- [ ] Quick action buttons
- [ ] Typing indicators
- [ ] Multi-language support
- [ ] Emoji support
- [ ] Message reactions

## Support

For issues or questions:

- Check the backend logs: `/tmp/support_agent.log`
- Check browser console for frontend errors
- Verify API connectivity with `curl http://localhost:8005/api/v1/assistant/health/`
