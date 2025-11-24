# University Human Resource System - Deployment Guide

## Preparing for Vercel Deployment

### Step 1: Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Add Environment Variables to Vercel Project
Before deploying, you need to add your actual environment variables to your Vercel project. This can be done in two ways:

#### Option A: Add via Vercel Dashboard
1. Log in to your Vercel dashboard at https://vercel.com/dashboard
2. Select your newly created project
3. Go to Settings -> Environment Variables
4. Add all the variables from your `.env.local` file:

##### Required Environment Variables:
- DATABASE_URL: Your database connection string
- NEXTAUTH_SECRET: Secret for NextAuth
- NEXTAUTH_URL: Production URL (e.g., https://your-project.vercel.app)
- NEXT_PUBLIC_APP_URL: Public facing URL
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_ANON_KEY: Your Supabase anon key
- FLUTTERWAVE_SECRET_KEY: Flutterwave secret key
- FLUTTERWAVE_PUBLIC_KEY: Flutterwave public key
- FLUTTERWAVE_ENCRYPTION_KEY: Flutterwave encryption key
- GOOGLE_CLIENT_ID: Google OAuth client ID
- GOOGLE_CLIENT_SECRET: Google OAuth client secret
- FACEBOOK_CLIENT_ID: Facebook OAuth client ID
- FACEBOOK_CLIENT_SECRET: Facebook OAuth client secret
- LINKEDIN_CLIENT_ID: LinkedIn OAuth client ID
- LINKEDIN_CLIENT_SECRET: LinkedIn OAuth client secret
- GEMINI_API_KEY: Google Gemini API key
- DARAJA_CONSUMER_KEY: Safaricom Daraja consumer key
- DARAJA_CONSUMER_SECRET: Safaricom Daraja consumer secret
- DARAJA_BUSINESS_SHORTCODE: Safaricom business shortcode
- DARAJA_PASSKEY: Safaricom passkey
- DARAJA_INITIATOR_NAME: Safaricom initiator name
- DARAJA_SECURITY_CREDENTIAL: Safaricom security credential
- MPESA_B2C_TIMEOUT: Mpesa B2C timeout URL
- MPESA_B2C_RESULT: Mpesa B2C result URL
- MPESA_TRANSACTION_STATUS_TIMEOUT: Transaction status timeout URL
- MPESA_TRANSACTION_STATUS_RESULT: Transaction status result URL

#### Option B: Add via Vercel CLI
```bash
vercel env add DATABASE_URL development
# Then paste the value from your .env.local file
# Repeat for all the required environment variables
```

### Step 4: Create or link your Vercel project
```bash
# Make sure you're in the project root directory
cd C:\Users\isaac\Documents\NextJS\University Human Resource

# Link your Vercel project
vercel
# When prompted, choose to create a new project or link an existing one
```

### Step 5: Deploy to Vercel
```bash
# For staging deployment
vercel --env DATABASE_URL=your-db-url --env NEXTAUTH_SECRET=your-secret ...

# Or after setting environment variables via dashboard:
vercel --prod
```

## Post-Deployment Steps

1. **Run Prisma Migrations**: After deployment, you need to run database migrations:
   ```bash
   # You can add a script to package.json to run migrations
   npx prisma migrate deploy
   ```
   
   Or set this up in your Vercel project settings under "Post-build step" or by using Vercel's deployment hooks.

2. **Set Up Automatic Deployments** (Optional):
   - Connect your GitHub/GitLab/Bitbucket repository to Vercel
   - Set up automatic deployments on push to main branch

## Security Best Practices

⚠️ **CRITICAL SECURITY NOTES**:
1. Never commit `.env` files containing actual credentials to git
2. Your `.env.local` file should be in `.gitignore` and NOT committed
3. Use Vercel's environment variable management for sensitive data
4. Use strong secrets for NEXTAUTH_SECRET (you can generate one with `openssl rand -base64 32`)
5. Regularly rotate your API keys and tokens
6. Ensure database URLs and other credentials use encrypted connections

## Troubleshooting Common Issues

1. **Database Connection Issues**:
   - Verify your DATABASE_URL is properly set in Vercel environment
   - Ensure your database allows connections from Vercel's IP range
   
2. **NextAuth Issues**:
   - Make sure NEXTAUTH_URL points to your deployed Vercel URL
   - Ensure NEXTAUTH_SECRET is set correctly

3. **API Route Issues**:
   - Check that webhook URLs are updated to point to your Vercel deployment
   - Verify that CORS is properly configured for production

## Important Security Recommendations

### Before Going Live:
1. Change all the credentials in your `.env.local` file to new, unique values
2. Regenerate your NEXTAUTH_SECRET
3. Update all third-party service configurations with your production URLs
4. Test all integration points in a staging environment first

### Ongoing Security:
1. Regularly audit your Vercel environment variables
2. Monitor for unauthorized access to your dashboard
3. Keep dependencies updated
4. Use HTTPS for all services

### Git Security:
1. Add explicit patterns to `.gitignore` for any backup or temporary env files:
   ```
   *.env.backup
   *.env.backup.*
   .env.local~
   .env.save
   ```

Your application is now prepared for Vercel deployment with proper security considerations.