# Deploying to Coolify

This guide helps you deploy the OpenStreetMap Screenshot Service to Coolify.

## Prerequisites

- A Coolify instance (Self-hosted or Cloud)
- Git repository with your service code

## Deployment Steps

### 1. Prepare your repository

Ensure your repository contains the following files:
- `Dockerfile` - Container configuration
- `docker-compose.yml` - Optional, for local testing
- `coolify.json` - Coolify-specific configuration
- `.env.example` - Example environment variables

### 2. Add your repository to Coolify

1. Log in to your Coolify dashboard
2. Click on "New Resource" → "Applications" → "Docker"
3. Select your Git provider (GitHub, GitLab, etc.)
4. Select the repository containing your service
5. Choose the branch to deploy (usually `main` or `master`)

### 3. Configure environment variables

In Coolify, add the following environment variables:

```
PORT=3000
PUPPETEER_NO_SANDBOX=true
REQUEST_TIMEOUT=30000
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW_MS=60000
```

You can adjust these values based on your needs.

### 4. Configure Coolify deployment settings

- **Build Command**: Leave empty (uses Dockerfile)
- **Docker Registry**: Optional, if you want to push your image to a registry
- **Port**: 3000 (match your PORT environment variable)
- **Resources**: Allocate at least 512MB RAM for Puppeteer to work properly

### 5. Deploy

Click the "Deploy" button in Coolify to build and deploy your service.

## Monitoring and Maintenance

### Health Check

The service includes a health check endpoint at `/health` that returns the service status, which Coolify can use to monitor service health.

### Logs

You can view the logs in the Coolify dashboard under the "Logs" tab for your application.

### Updating

To update your service, push changes to your repository and then click "Redeploy" in Coolify.

## Troubleshooting

### Common Issues

1. **Memory Issues**: If you see "out of memory" errors, increase the allocated RAM in Coolify settings.

2. **Network Issues**: Make sure outbound connections to `openstreetmap.org` and `nominatim.openstreetmap.org` are allowed.

3. **Puppeteer Errors**: If Puppeteer cannot start, ensure `PUPPETEER_NO_SANDBOX=true` is set in your environment variables.

### Getting Help

If you encounter issues with the deployment, you can:

1. Check the application logs in Coolify
2. Inspect the `/health` endpoint for service status
3. Try running the service locally with Docker to isolate the issue