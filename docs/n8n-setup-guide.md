# n8n Webhook Setup Guide

## Step 1: Create Environment File

Create a `.env.local` file in your project root directory (same level as `package.json`):

```bash
# Create the file
touch .env.local
```

## Step 2: Add Your n8n Webhook URL

Open `.env.local` and add your n8n webhook URL:

```bash
# n8n Webhook Configuration
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-actual-n8n-instance.com/webhook/your-actual-webhook-id
```

### Example:
```bash
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://n8n.mydomain.com/webhook/abc123-def456-ghi789
```

## Step 3: Get Your n8n Webhook URL

1. **If you have n8n running locally:**
   - Go to your n8n instance (usually `http://localhost:5678`)
   - Create a new workflow or open an existing one
   - Add a "Webhook" trigger node
   - Copy the webhook URL from the node

2. **If you have n8n running on a server:**
   - Replace `localhost:5678` with your server's domain/IP
   - The webhook URL will look like: `https://your-server.com/webhook/abc123-def456-ghi789`

3. **If using n8n.cloud:**
   - Your webhook URL will be provided by n8n.cloud
   - It will look like: `https://your-workspace.n8n.cloud/webhook/abc123-def456-ghi789`

## Step 4: Test Your Webhook

You can test your webhook URL using curl:

```bash
curl -X POST https://your-n8n-instance.com/webhook/your-webhook-id \
  -H "Content-Type: application/json" \
  -d '{
    "chatInput": "test message",
    "sessionId": "1234567890"
  }'
```

## Step 5: Restart Your Development Server

After creating the `.env.local` file, restart your development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

## Step 6: Test in the App

1. Start your app
2. Choose "n8n Powered" backend
3. Try sending a message
4. Check the browser console for webhook logs

## Troubleshooting

### Error: "n8n webhook service not configured"

**Solution:** Make sure your `.env.local` file exists and contains the correct webhook URL.

### Error: "Please replace the placeholder webhook URL"

**Solution:** You're using the example URL. Replace it with your actual n8n webhook URL.

### Error: "HTTP error! status: 404"

**Solution:** Your webhook URL is incorrect. Double-check the URL in your n8n instance.

### Error: "HTTP error! status: 500"

**Solution:** Your n8n workflow has an error. Check the n8n execution logs.

## n8n Workflow Example

Here's a simple n8n workflow to handle the webhook:

1. **Webhook Trigger Node:**
   - Method: POST
   - Path: `/webhook/your-webhook-id`

2. **Set Node** (optional):
   - Set variables from webhook body:
     - `chatInput` = `{{ $json.chatInput }}`
     - `sessionId` = `{{ $json.sessionId }}`

3. **HTTP Request Node** (optional):
   - Send response back to the app

4. **Respond to Webhook Node:**
   - Response Body:
   ```json
   {
     "success": true,
     "message": "Message received successfully",
     "data": {
       "processed": true,
       "sessionId": "{{ $json.sessionId }}"
     }
   }
   ```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_N8N_WEBHOOK_URL` | Your n8n webhook URL | `https://n8n.mydomain.com/webhook/abc123-def456-ghi789` |

**Note:** The `NEXT_PUBLIC_` prefix is required for client-side access in Next.js. 