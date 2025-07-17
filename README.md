# YouTube TOS Analyst

A comprehensive YouTube policy analysis tool that helps content creators understand and comply with YouTube's community guidelines and advertiser-friendly policies.

## Features

- **Multi-Model AI Analysis**: Supports both Claude 3 Haiku and Gemini 1.5 Flash for robust policy analysis
- **Enhanced Risk Assessment**: Detailed analysis across multiple policy categories
- **Context-Aware Analysis**: Considers content type, target audience, and monetization impact
- **Actionable Suggestions**: Specific recommendations to improve content compliance
- **Real-time Processing**: Fast analysis with intelligent fallback mechanisms
- **Error Monitoring**: Integrated Sentry for real-time error tracking and debugging

## AI Models

The application now supports dual AI models for enhanced reliability and performance:

### Primary Model: Gemini 2.0 Flash
- **Provider**: Google
- **Model**: `gemini-2.0-flash`
- **Benefits**: 
  - Multi-modal analysis capabilities (text + video)
  - Enhanced content understanding
  - Superior analysis accuracy
  - Higher rate limits (15 requests/minute)
  - Better understanding of nuanced policy violations
  - More detailed explanations and suggestions

### Fallback Model: Claude 3 Haiku
- **Provider**: Anthropic
- **Model**: `claude-3-haiku-20240307`
- **Benefits**: 
  - Reliable fallback option
  - Good performance for basic analysis
  - No additional API key required if already configured

## Environment Variables

```env
# Required for Claude 3 Haiku (primary model)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Required for Gemini 1.5 Flash (fallback model)
GOOGLE_API_KEY=your_google_api_key_here

# Sentry Error Monitoring (recommended for production)
SENTRY_DSN=your_sentry_dsn_here
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Other existing variables...
```

## Error Monitoring with Sentry

The application includes Sentry integration for comprehensive error monitoring:

### Benefits
- **Real-time Error Tracking**: Monitor errors as they happen
- **Performance Monitoring**: Track API response times and bottlenecks
- **User Session Replay**: Understand user interactions leading to errors
- **Automatic Error Grouping**: Intelligent error categorization
- **Production Debugging**: Detailed error context for faster resolution

### Setup
1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new project for your Next.js application
3. Copy your DSN from the project settings
4. Add the DSN to your environment variables:
   - `SENTRY_DSN` for server-side errors
   - `NEXT_PUBLIC_SENTRY_DSN` for client-side errors

### What's Monitored
- AI analysis failures and fallbacks
- API endpoint errors
- Client-side JavaScript errors
- Performance bottlenecks
- User interactions leading to errors

## Model Selection Logic

The application automatically selects the best available model:

1. **Gemini 2.5 Flash Preview** (if `GOOGLE_API_KEY` is set)
2. **Claude 3 Haiku** (fallback if Gemini unavailable or fails)

This ensures maximum uptime and analysis quality while maintaining backward compatibility.

## Testing the Integration

Visit `/test-claude` to test the new Claude integration with sample content.

## API Endpoints

- `POST /api/test-claude` - Test Claude integration
- `GET /api/test-claude` - Get integration status

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (see above)

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Visit `http://localhost:3000` to start analyzing content

## Architecture

The application uses a model abstraction layer that seamlessly switches between AI providers:

- **AIModel Interface**: Common interface for all AI models
- **ClaudeModel**: Implementation for Claude 3 Haiku
- **GeminiModel**: Implementation for Gemini 1.5 Flash
- **Automatic Fallback**: Graceful degradation if primary model fails

This design ensures minimal code changes while providing maximum flexibility and reliability.