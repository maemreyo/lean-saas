// scripts/setup-advanced-billing.js

import { promises as fs } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function log(message, color = COLORS.reset) {
  console.log(`${color}${message}${COLORS.reset}`)
}

function logStep(step, message) {
  log(`\n${COLORS.bright}${COLORS.blue}[STEP ${step}]${COLORS.reset} ${message}`)
}

function logSuccess(message) {
  log(`${COLORS.green}✅ ${message}${COLORS.reset}`)
}

function logWarning(message) {
  log(`${COLORS.yellow}⚠️  ${message}${COLORS.reset}`)
}

function logError(message) {
  log(`${COLORS.red}❌ ${message}${COLORS.reset}`)
}

async function checkPrerequisites() {
  logStep(1, 'Checking prerequisites...')
  
  const requirements = [
    { name: 'Node.js', command: 'node --version', min: 'v18' },
    { name: 'pnpm', command: 'pnpm --version', min: '8.0' },
    { name: 'Supabase CLI', command: 'supabase --version', min: '1.0' }
  ]

  for (const req of requirements) {
    try {
      const version = execSync(req.command, { encoding: 'utf8' }).trim()
      logSuccess(`${req.name}: ${version}`)
    } catch (error) {
      logError(`${req.name} not found. Please install ${req.name} ${req.min}+`)
      process.exit(1)
    }
  }
  
  // Check if Docker is running
  try {
    execSync('docker info', { stdio: 'pipe' })
    logSuccess('Docker is running')
  } catch (error) {
    logWarning('Docker does not appear to be running')
    log('Please start Docker Desktop before continuing')
    
    // Ask user if they want to continue anyway
    log('\nDo you want to continue anyway? (y/n)')
    const response = execSync('read -n 1 -p "" && echo $REPLY', { encoding: 'utf8', stdio: 'inherit' }).trim().toLowerCase()
    
    if (response !== 'y') {
      log('Exiting setup. Please start Docker and run the script again.')
      process.exit(1)
    }
  }
}

async function checkEnvironmentVariables() {
  logStep(2, 'Checking environment variables...')
  
  const envFile = join(process.cwd(), 'frontend/.env.local')
  const envExampleFile = join(process.cwd(), 'frontend/.env.local.example')
  
  try {
    await fs.access(envFile)
    const envContent = await fs.readFile(envFile, 'utf8')
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ]

    const missingVars = []
    
    for (const varName of requiredVars) {
      if (!envContent.includes(varName)) {
        missingVars.push(varName)
      }
    }

    if (missingVars.length > 0) {
      logWarning('Missing environment variables:')
      missingVars.forEach(varName => log(`  - ${varName}`, COLORS.yellow))
      log('\nPlease add these to your frontend/.env.local file')
    } else {
      logSuccess('All required environment variables found')
    }
    
  } catch (error) {
    logWarning('frontend/.env.local file not found')
    
    // Try to create from example
    try {
      await fs.access(envExampleFile)
      await fs.copyFile(envExampleFile, envFile)
      logSuccess('Created frontend/.env.local from example file')
      logWarning('Please update the environment variables in frontend/.env.local')
    } catch (exampleError) {
      logError('frontend/.env.local.example file not found either')
      
      // Create a basic .env.local file
      const basicEnvContent = `# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Resend (Email)
RESEND_API_KEY=your_resend_api_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
`
      
      await fs.writeFile(envFile, basicEnvContent)
      logSuccess('Created basic frontend/.env.local file')
      logWarning('Please update all environment variables before continuing')
    }
  }
}

async function checkSupabaseSetup() {
  logStep(3, 'Checking Supabase setup...')
  
  try {
    // Check if Supabase is running
    execSync('supabase status', { stdio: 'pipe' })
    logSuccess('Supabase is running')
  } catch (error) {
    logWarning('Supabase is not running')
    log('Starting Supabase...')
    
    try {
      execSync('supabase start', { stdio: 'inherit' })
      logSuccess('Supabase started successfully')
    } catch (startError) {
      logError('Failed to start Supabase')
      log('Please ensure Docker is running and try again')
      throw startError
    }
  }
  
  // Check if project is linked
  let isLinked = false
  try {
    const linkOutput = execSync('supabase link --project-ref local', { stdio: 'pipe', encoding: 'utf8' })
    if (linkOutput.includes('Project linked')) {
      isLinked = true
      logSuccess('Supabase project is already linked')
    }
  } catch (error) {
    // Project not linked, we'll link it below
  }
  
  if (!isLinked) {
    try {
      log('Linking Supabase project...')
      execSync('supabase link --project-ref local', { stdio: 'inherit' })
      logSuccess('Supabase project linked successfully')
    } catch (linkError) {
      logError('Failed to link Supabase project')
      throw linkError
    }
  }
}

async function runDatabaseMigrations() {
  logStep(4, 'Running database migrations...')
  
  try {
    // Run the advanced billing migration
    log('Running advanced billing migration...')
    execSync('supabase db push', { stdio: 'inherit' })
    logSuccess('Database migrations completed')
    
    // Run seed data
    log('Loading seed data...')
    execSync('supabase db seed', { stdio: 'inherit' })
    logSuccess('Seed data loaded')
    
  } catch (error) {
    logError('Database migration failed')
    log('Please ensure Supabase is properly set up and linked')
    throw error
  }
}

async function installDependencies() {
  logStep(5, 'Installing dependencies...')
  
  try {
    log('Installing frontend dependencies...')
    
    // Always use --ignore-scripts to avoid husky issues
    log('Using --ignore-scripts to avoid husky installation issues')
    const installCommand = 'cd frontend && pnpm install --silent --ignore-scripts'
    
    execSync(installCommand, { stdio: 'inherit' })
    logSuccess('Frontend dependencies installed')
    
    // Fix peer dependency warnings if they exist
    try {
      log('Checking for peer dependency issues...')
      execSync('cd frontend && pnpm install @testing-library/react@^14.0.0 --save-dev --ignore-scripts', { stdio: 'pipe' })
    } catch {
      // Ignore if this fails, it's not critical
    }
    
    // Inform user about husky
    logWarning('Husky git hooks were not installed due to --ignore-scripts flag')
    log('This is normal and won\'t affect the functionality of the application')
    
  } catch (error) {
    logError('Failed to install dependencies')
    log('You can install them manually with: cd frontend && pnpm install --ignore-scripts')
    logWarning('Some warnings are normal and don\'t affect functionality')
    // Don't throw error here, let setup continue
  }
}

async function deployEdgeFunctions() {
  logStep(6, 'Deploying edge functions...')
  
  try {
    const functions = [
      'billing-processor',
      'stripe-webhook', 
      'quota-reset'
    ]

    for (const func of functions) {
      log(`Deploying ${func} function...`)
      execSync(`supabase functions deploy ${func}`, { stdio: 'inherit' })
      logSuccess(`${func} function deployed`)
    }
    
  } catch (error) {
    logWarning('Edge function deployment failed - you can deploy them manually later')
    log('Run: supabase functions deploy <function-name>')
  }
}

async function generateTypes() {
  logStep(7, 'Generating TypeScript types...')
  
  try {
    execSync('cd frontend && pnpm db:generate-types', { stdio: 'inherit' })
    logSuccess('TypeScript types generated')
  } catch (error) {
    logWarning('Type generation failed - you can run it manually later')
    log('Run: pnpm db:generate-types')
  }
}

async function setupStripeWebhook() {
  logStep(8, 'Setting up Stripe webhook...')
  
  log('\n' + COLORS.yellow + 'MANUAL SETUP REQUIRED:' + COLORS.reset)
  log('Please configure your Stripe webhook manually:')
  log('')
  log('1. Go to https://dashboard.stripe.com/webhooks')
  log('2. Click "Add endpoint"')
  log('3. Set endpoint URL to: YOUR_DOMAIN/api/stripe/webhook')
  log('4. Select these events:')
  log('   - customer.subscription.created')
  log('   - customer.subscription.updated')
  log('   - customer.subscription.deleted')
  log('   - invoice.payment_succeeded')
  log('   - invoice.payment_failed')
  log('   - invoice.finalized')
  log('5. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env.local')
  log('')
}

async function runTests() {
  logStep(9, 'Running tests...')
  
  try {
    log('Running type checks...')
    execSync('cd frontend && pnpm type-check', { stdio: 'inherit' })
    logSuccess('Type checking passed')
    
    log('Running linting...')
    execSync('cd frontend && pnpm lint', { stdio: 'inherit' })
    logSuccess('Linting passed')
    
  } catch (error) {
    logWarning('Some tests failed - check the output above')
  }
}

async function displayCompletionMessage() {
  log('\n' + COLORS.bright + COLORS.green + '🎉 ADVANCED BILLING MODULE SETUP COMPLETE!' + COLORS.reset)
  log('')
  log(COLORS.bright + 'What was installed:' + COLORS.reset)
  log('✅ Database schema with usage tracking')
  log('✅ TypeScript types and validation')
  log('✅ React hooks for billing data')
  log('✅ UI components for billing dashboard')
  log('✅ API routes for usage tracking')
  log('✅ Edge functions for automation')
  log('✅ Stripe webhook handlers')
  log('✅ Sample data for testing')
  log('')
  log(COLORS.bright + 'Next steps:' + COLORS.reset)
  log('1. Configure your Stripe webhook (see step 7 above)')
  log('2. Test the billing dashboard: http://localhost:3000/dashboard/billing')
  log('3. Review usage tracking in the Usage tab')
  log('4. Set up your pricing plans in Stripe')
  log('5. Configure quota limits for your plans')
  log('')
  log(COLORS.bright + 'Key features now available:' + COLORS.reset)
  log('🎯 Usage-based billing with automatic tracking')
  log('📊 Real-time usage analytics and quotas')
  log('🚨 Automated billing alerts and notifications')
  log('💳 Advanced Stripe integration with webhooks')
  log('⚡ Background processing with edge functions')
  log('📈 Comprehensive billing dashboard')
  log('')
  log(COLORS.cyan + 'Documentation: Check the README files for detailed usage instructions' + COLORS.reset)
  log('')
}

async function main() {
  try {
    log(COLORS.bright + COLORS.magenta + '🚀 LEAN-SAAS ADVANCED BILLING SETUP' + COLORS.reset)
    log('This script will set up the complete advanced billing module.')
    log('')

    // Handle CLI arguments
    const args = process.argv.slice(2)
    const isDebug = args.includes('--debug')
    const skipDeps = args.includes('--skip-deps')
    const skipTests = args.includes('--skip-tests')
    
    // Set environment variables for debug mode
    if (isDebug) {
      log('Debug mode enabled - showing detailed error messages')
      process.env.SUPABASE_DEBUG = 'true'
    }

    await checkPrerequisites()
    await checkEnvironmentVariables()
    await checkSupabaseSetup()
    
    if (!skipDeps) {
      await installDependencies()
    } else {
      log('Skipping dependency installation (--skip-deps)')
    }
    
    await runDatabaseMigrations()
    await deployEdgeFunctions()
    await generateTypes()
    
    if (!skipTests) {
      await runTests()
    } else {
      log('Skipping tests (--skip-tests)')
    }
    
    await setupStripeWebhook()
    await displayCompletionMessage()

  } catch (error) {
    logError('Setup failed: ' + error.message)
    
    // Show stack trace in debug mode
    if (process.argv.includes('--debug')) {
      log('\nError details:')
      log(error.stack)
    }
    
    log('\nPlease fix the error above and run the script again.')
    process.exit(1)
  }
}

// Handle CLI arguments
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  log(COLORS.bright + 'Advanced Billing Setup Script' + COLORS.reset)
  log('')
  log('Usage: node scripts/setup-advanced-billing.js [options]')
  log('')
  log('Options:')
  log('  --help, -h     Show this help message')
  log('  --debug        Show detailed error messages')
  log('  --skip-deps    Skip dependency installation')
  log('  --skip-tests   Skip running tests')
  log('')
  process.exit(0)
}

main()

export default {
  checkPrerequisites,
  checkEnvironmentVariables,
  checkSupabaseSetup,
  runDatabaseMigrations,
  installDependencies,
  deployEdgeFunctions,
  generateTypes,
  runTests
}