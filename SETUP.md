# Setup Instructions - Like You're in Third Grade

This is your **own** AI platform like Emergent.sh! Follow these simple steps.

## What You Have

- **Frontend**: A website where users chat with AI
- **Backend**: Server that handles everything
- **Database**: Stores users, credits, and chat history
- **Credits System**: Users pay for AI usage
- **Stripe Billing**: Accept payments
- **Admin Panel**: Manage users and credits

## Step 1: Get Your Computer Ready

### Install These Programs:
1. **Node.js** (version 18 or newer)
   - Go to https://nodejs.org
   - Download and install
   - Check it works: Open terminal and type `node --version`

2. **pnpm** (package manager)
   - Open terminal and type: `npm install -g pnpm`

## Step 2: Set Up Your Database

You need a PostgreSQL database. Two easy options:

### Option A: Use Vercel Postgres (Easiest)
1. Go to https://vercel.com
2. Create account
3. Create new project
4. Go to Storage tab
5. Click "Create Database" > "Postgres"
6. Copy the connection string

### Option B: Use Local Database
1. Install PostgreSQL from https://postgresql.org
2. Connection string looks like: `postgresql://username:password@localhost:5432/database`

## Step 3: Create Your .env File

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in these values:

### Required Settings:

```env
# 1. Secret for authentication (make this random)
AUTH_SECRET=your-random-secret-here

# 2. Your database connection
POSTGRES_URL=postgresql://user:password@host:5432/database

# 3. Stripe Keys (get from https://dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# 4. Your website URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 5. AI Gateway (if using Vercel AI)
AI_GATEWAY_API_KEY=your_gateway_key_here

# 6. File storage (optional, for Vercel Blob)
BLOB_READ_WRITE_TOKEN=your_blob_token_here

# 7. Redis (optional, for caching)
REDIS_URL=your_redis_url_here
```

### How to Get These Values:

**AUTH_SECRET**: Make a random string
- Easy way: Go to https://generate-secret.vercel.app/32
- Or type: `openssl rand -base64 32`

**STRIPE Keys**:
1. Go to https://dashboard.stripe.com
2. Create account
3. Go to Developers > API Keys
4. Copy your keys

**STRIPE_WEBHOOK_SECRET**:
1. In Stripe Dashboard, go to Developers > Webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/stripe/webhook`
4. Select events: `checkout.session.completed`, `customer.subscription.*`
5. Copy the webhook secret

## Step 4: Install Everything

Open terminal in your project folder and run:

```bash
pnpm install
```

This downloads all the code packages you need. Takes 2-5 minutes.

## Step 5: Set Up Your Database

Run these commands one at a time:

```bash
# Generate database migrations
pnpm db:generate

# Apply migrations to create tables
pnpm db:migrate

# (Optional) See your database in a visual tool
pnpm db:studio
```

## Step 6: Seed Your Data

Go to your app and visit the **Admin Panel**:

1. Start the app (see Step 7)
2. Register a user account
3. Visit http://localhost:3000/admin
4. Click "Seed Model Pricing" button

This creates all the AI models and their credit costs!

## Step 7: Start Your App

```bash
pnpm dev
```

Your app is now running at: **http://localhost:3000**

## Step 8: Create Your First User

1. Go to http://localhost:3000
2. Click "Register"
3. Create your account
4. You start with 100 free credits!

## Step 9: Grant Yourself More Credits (Admin)

1. Go to http://localhost:3000/admin
2. Enter your email
3. Enter credit amount (like 10000)
4. Click "Grant Credits"

Now you have credits to test!

## Step 10: Use Your Platform

### As a User:
- **Chat**: Go to home page and start chatting
- **Dashboard**: http://localhost:3000/dashboard
  - See your credit balance
  - View usage stats
  - Purchase more credits
  
### As an Admin:
- **Admin Panel**: http://localhost:3000/admin
  - Grant credits to users
  - Manage model pricing
  - Seed database

## How Credits Work

Every AI message costs credits:
- **Fast models** (GPT-3.5, Claude Haiku): 1 credit
- **Balanced models** (GPT-4, Claude Sonnet): 5 credits
- **Advanced models** (GPT-4 Turbo, Claude Opus): 10 credits

Users can buy more credits through Stripe!

## Connecting Your Own AI Models

Your platform is set up to use different AI providers. To connect YOUR OWN models:

### Option 1: Use Your Own OpenAI/Anthropic API Keys
1. Get API key from OpenAI or Anthropic
2. Add to `.env`: `OPENAI_API_KEY=your-key`
3. Update `lib/ai/providers.ts` with your key

### Option 2: Run Models on Your Own Server
You mentioned you have:
- 16GB GPU
- Server with storage

To run your own models:

1. **Install Ollama** (easiest):
   ```bash
   curl https://ollama.ai/install.sh | sh
   ollama pull llama3
   ollama serve
   ```

2. **Update the model provider**:
   Edit `lib/ai/providers.ts` to point to `http://localhost:11434`

3. **Add your models to the database**:
   - Use Admin Panel > Seed Models
   - Or add custom models with your own names and pricing

## Deploying to Production

When you're ready to put this online:

### Option A: Deploy to Vercel (Easiest)
1. Push code to GitHub
2. Go to https://vercel.com
3. Import your GitHub repo
4. Add all your `.env` variables
5. Deploy!

### Option B: Deploy to Your Own Server
1. Build the app: `pnpm build`
2. Start it: `pnpm start`
3. Use nginx or Apache to point domain to port 3000
4. Use PM2 to keep it running: `pm2 start npm --name "my-ai-platform" -- start`

## Stripe Setup for Production

1. In Stripe Dashboard:
   - Create real products (not test)
   - Set up your pricing tiers
   - Add webhook endpoint for your production URL

2. Update Stripe Price IDs in `app/(chat)/dashboard/page.tsx`:
   - Replace `price_starter`, `price_pro`, `price_enterprise`
   - With your real Stripe Price IDs

## Common Issues

**"Database connection failed"**
- Check your POSTGRES_URL is correct
- Make sure database is running

**"Unauthorized" errors**
- Check AUTH_SECRET is set
- Clear browser cookies and try again

**"Insufficient credits"**
- Go to Admin Panel
- Grant yourself more credits

**Models not showing**
- Go to Admin Panel
- Click "Seed Model Pricing"

## File Structure (What Everything Does)

```
app/
  (chat)/
    - Main chat interface
    /api/
      /chat - Handles AI messages (with credit deduction!)
      /credits - Check balance, view transactions
      /models - List available AI models
      /stripe - Handle payments
      /admin - Admin functions
    /dashboard - User dashboard (credits, usage)
    /admin - Admin panel

lib/
  /db/
    schema.ts - Database structure
    queries.ts - Database functions
  credits.ts - Credit management logic

components/
  model-selector.tsx - Choose AI models
```

## Making Money With This

Your platform is ready for business:

1. **Set Your Prices**: Edit credit packages in dashboard page
2. **Create Stripe Products**: Set up in Stripe Dashboard
3. **Market Your Platform**: Tell people about it!
4. **Users Sign Up**: They get 100 free credits
5. **They Purchase More**: Through Stripe checkout
6. **You Get Paid**: Stripe deposits to your bank

## What Makes This Different from Emergent?

- **You own everything** - No platform fees
- **Your AI models** - Use any provider or your own
- **Your pricing** - Set your own credit costs
- **Your data** - All stored in your database
- **Your brand** - Customize everything

## Next Steps

1. ✅ Follow setup steps above
2. ✅ Test with your own account
3. ✅ Customize the look (edit Tailwind classes)
4. ✅ Add your own AI models
5. ✅ Set up Stripe for real payments
6. ✅ Deploy to production
7. ✅ Share with users!

## Getting Help

If you get stuck:
1. Check the error message
2. Look at the browser console (F12)
3. Check server logs in terminal
4. Make sure all .env variables are set

Remember: This is YOUR platform now. You control everything!

---

**Made specifically for you by Claude** 🚀
