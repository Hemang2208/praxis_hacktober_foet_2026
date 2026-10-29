# Jira Integration Environment Variables

Add these to your `.env.local` file:

```bash
# Jira OAuth 2.0 (3LO) Configuration
# Create an app at https://developer.atlassian.com/console/myapps/
# Enable "OAuth 2.0 (3LO)" and set scopes:
#   - read:jira-work
#   - read:jira-project
#   - read:jira-user
#   - offline_access
# Set the callback URL to: http://localhost:3000/api/jira/oauth/callback

JIRA_CLIENT_ID=your_atlassian_client_id
JIRA_CLIENT_SECRET=your_atlassian_client_secret
JIRA_OAUTH_REDIRECT_URI=http://localhost:3000/api/jira/oauth/callback
```

## Setup Instructions

1. Go to [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/)
2. Create a new OAuth 2.0 (3LO) app
3. Copy the Client ID and Client Secret
4. Add the callback URL: `http://localhost:3000/api/jira/oauth/callback`
5. Enable the following scopes:
   - `read:jira-work` - Read Jira issues and work data
   - `read:jira-project` - Read Jira project information
   - `read:jira-user` - Read user information
   - `offline_access` - Get refresh tokens for long-lived access
6. Add the environment variables to `.env.local`

## Production

For production, update the callback URL to your production domain:

```bash
JIRA_OAUTH_REDIRECT_URI=https://your-domain.com/api/jira/oauth/callback
```
