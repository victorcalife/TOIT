#!/bin/bash

# ============================================================
# TRADIA PLATFORM - AUTOMATED SETUP SCRIPT
# ============================================================

set -e # Exit on any error

echo "🚀 TRADia Platform - Automated Setup"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ============================================================
# PREREQUISITES CHECK
# ============================================================

log_info "Checking prerequisites..."

# Check Node.js
if ! command_exists node; then
    log_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi
log_success "Node.js $(node --version) ✓"

# Check npm
if ! command_exists npm; then
    log_error "npm is not installed."
    exit 1
fi
log_success "npm $(npm --version) ✓"

# Check Docker (optional)
if command_exists docker; then
    log_success "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) ✓"
    DOCKER_AVAILABLE=true
else
    log_warning "Docker not found. You'll need to setup databases manually."
    DOCKER_AVAILABLE=false
fi

# Check Railway CLI (optional)
if command_exists railway; then
    log_success "Railway CLI $(railway --version) ✓"
    RAILWAY_AVAILABLE=true
else
    log_warning "Railway CLI not found. Install with: npm install -g @railway/cli"
    RAILWAY_AVAILABLE=false
fi

# ============================================================
# ENVIRONMENT SETUP
# ============================================================

log_info "Setting up environment configuration..."

# Copy environment file if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    log_success "Created .env file from .env.example"
    log_warning "Please edit .env file with your actual configuration values"
else
    log_info ".env file already exists"
fi

# Generate JWT secrets if not set
if ! grep -q "dev-super-secret-jwt-key" .env; then
    log_info ".env already has custom JWT secret"
else
    log_info "Generating secure JWT secrets..."
    
    # Generate random JWT secrets
    JWT_DEV=$(openssl rand -base64 64 | tr -d '\n')
    JWT_TEST=$(openssl rand -base64 64 | tr -d '\n')
    JWT_PROD=$(openssl rand -base64 64 | tr -d '\n')
    
    # Replace in .env file
    sed -i.bak "s/dev-super-secret-jwt-key-change-in-production-2025/$JWT_DEV/" .env
    sed -i.bak "s/test-super-secret-jwt-key-for-testing-only-2025/$JWT_TEST/" .env
    sed -i.bak "s/prod-ultra-secure-jwt-key-never-share-this-2025/$JWT_PROD/" .env
    
    rm .env.bak
    log_success "Generated secure JWT secrets"
fi

# ============================================================
# DEPENDENCIES INSTALLATION
# ============================================================

log_info "Installing project dependencies..."

# Root dependencies
npm install
log_success "Root dependencies installed"

# Backend dependencies
if [ -d "backend" ]; then
    cd backend
    npm install
    cd ..
    log_success "Backend dependencies installed"
fi

# Frontend dependencies
if [ -d "frontend" ]; then
    cd frontend
    npm install
    cd ..
    log_success "Frontend dependencies installed"
fi

# AI Engine dependencies (Python)
if [ -d "backend/ai-engine" ] && command_exists python3; then
    cd backend/ai-engine
    if [ -f "requirements.txt" ]; then
        python3 -m pip install -r requirements.txt
        log_success "AI Engine dependencies installed"
    fi
    cd ../..
elif [ -d "backend/ai-engine" ]; then
    log_warning "Python3 not found. Skipping AI Engine dependencies."
fi

# ============================================================
# DATABASE SETUP
# ============================================================

log_info "Setting up databases..."

if [ "$DOCKER_AVAILABLE" = true ]; then
    log_info "Starting databases with Docker..."
    
    # Check if docker-compose.yml exists
    if [ -f "docker-compose.yml" ]; then
        # Start only database services
        docker-compose up -d postgres redis
        
        # Wait for databases to be ready
        log_info "Waiting for databases to be ready..."
        sleep 10
        
        # Check PostgreSQL
        if docker-compose exec -T postgres pg_isready -U postgres; then
            log_success "PostgreSQL is ready"
        else
            log_error "PostgreSQL failed to start"
            exit 1
        fi
        
        # Check Redis
        if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
            log_success "Redis is ready"
        else
            log_error "Redis failed to start"
            exit 1
        fi
        
    else
        log_error "docker-compose.yml not found"
        exit 1
    fi
else
    log_warning "Docker not available. Please setup PostgreSQL and Redis manually:"
    echo "  - PostgreSQL: postgresql://postgres:postgres@localhost:5432/tradia_dev"
    echo "  - Redis: redis://localhost:6379"
fi

# ============================================================
# DATABASE MIGRATION
# ============================================================

log_info "Running database migrations..."

# Check if backend has migration scripts
if [ -f "backend/package.json" ] && grep -q "db:migrate" backend/package.json; then
    cd backend
    npm run db:migrate
    cd ..
    log_success "Database migrations completed"
    
    # Run seeds if available
    if grep -q "db:seed" backend/package.json; then
        cd backend
        npm run db:seed
        cd ..
        log_success "Database seeding completed"
    fi
else
    log_warning "No migration scripts found. You may need to setup database manually."
fi

# ============================================================
# DEVELOPMENT CERTIFICATES (HTTPS)
# ============================================================

log_info "Setting up development certificates..."

if [ ! -d "certs" ]; then
    mkdir -p certs
    
    # Generate self-signed certificate for development
    if command_exists openssl; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout certs/dev-key.pem \
            -out certs/dev-cert.pem \
            -subj "/C=BR/ST=SP/L=SaoPaulo/O=TOIT/OU=TRADia/CN=localhost"
        
        log_success "Development certificates generated"
    else
        log_warning "OpenSSL not found. HTTPS certificates not generated."
    fi
fi

# ============================================================
# GIT HOOKS SETUP
# ============================================================

log_info "Setting up Git hooks..."

if [ -d ".git" ]; then
    # Pre-commit hook for linting
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "🔍 Running pre-commit checks..."

# Run linting
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Please fix errors before committing."
    exit 1
fi

# Run type checking
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ Type checking failed. Please fix errors before committing."
    exit 1
fi

echo "✅ Pre-commit checks passed!"
EOF

    chmod +x .git/hooks/pre-commit
    log_success "Git pre-commit hook installed"
    
    # Pre-push hook for tests
    cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
echo "🧪 Running tests before push..."

npm run test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix before pushing."
    exit 1
fi

echo "✅ All tests passed!"
EOF

    chmod +x .git/hooks/pre-push
    log_success "Git pre-push hook installed"
fi

# ============================================================
# RAILWAY SETUP (if available)
# ============================================================

if [ "$RAILWAY_AVAILABLE" = true ]; then
    log_info "Railway CLI is available. Do you want to setup Railway now? (y/n)"
    read -r SETUP_RAILWAY
    
    if [ "$SETUP_RAILWAY" = "y" ] || [ "$SETUP_RAILWAY" = "Y" ]; then
        log_info "Setting up Railway..."
        
        # Check if already logged in
        if railway whoami >/dev/null 2>&1; then
            log_success "Already logged into Railway"
        else
            log_info "Please login to Railway:"
            railway login
        fi
        
        # Check if project exists
        if [ ! -f "railway.toml" ]; then
            log_warning "railway.toml not found. Please run setup manually:"
            echo "  railway project create tradia-platform"
        else
            log_info "Railway configuration found in railway.toml"
        fi
    fi
fi

# ============================================================
# DEVELOPMENT SERVER SETUP
# ============================================================

log_info "Setting up development scripts..."

# Create start script
cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting TRADia Development Environment..."

# Start databases if using Docker
if command -v docker-compose >/dev/null 2>&1; then
    echo "📦 Starting Docker services..."
    docker-compose up -d postgres redis
    sleep 5
fi

# Start all services
echo "🖥️  Starting development servers..."
npm run dev
EOF

chmod +x start-dev.sh
log_success "Created start-dev.sh script"

# Create stop script
cat > stop-dev.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping TRADia Development Environment..."

# Stop Docker services
if command -v docker-compose >/dev/null 2>&1; then
    docker-compose down
fi

# Kill any remaining Node processes
pkill -f "node.*tradia"
pkill -f "npm.*dev"

echo "✅ Development environment stopped"
EOF

chmod +x stop-dev.sh
log_success "Created stop-dev.sh script"

# ============================================================
# FINAL SETUP VERIFICATION
# ============================================================

log_info "Verifying setup..."

# Check if all package.json scripts exist
MISSING_SCRIPTS=()

if [ -f "package.json" ]; then
    if ! grep -q "\"dev\":" package.json; then
        MISSING_SCRIPTS+=("dev")
    fi
    if ! grep -q "\"build\":" package.json; then
        MISSING_SCRIPTS+=("build")
    fi
    if ! grep -q "\"test\":" package.json; then
        MISSING_SCRIPTS+=("test")
    fi
fi

if [ ${#MISSING_SCRIPTS[@]} -gt 0 ]; then
    log_warning "Missing scripts in package.json: ${MISSING_SCRIPTS[*]}"
else
    log_success "All required scripts found in package.json"
fi

# ============================================================
# COMPLETION MESSAGE
# ============================================================

echo ""
echo "🎉 TRADia Platform Setup Complete!"
echo "=================================="
echo ""
log_success "Setup completed successfully!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. 📝 Edit .env file with your actual configuration:"
echo "   - Database URLs (if not using Docker)"
echo "   - API keys (WhatsApp, Email, etc.)"
echo "   - JWT secrets (already generated)"
echo ""
echo "2. 🚀 Start development environment:"
echo "   ./start-dev.sh"
echo "   OR"
echo "   npm run dev"
echo ""
echo "3. 🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Health:   http://localhost:3001/health"
echo ""

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "4. 🐳 Docker services available:"
    echo "   PostgreSQL: localhost:5432"
    echo "   Redis:      localhost:6379"
    echo "   PgAdmin:    http://localhost:8082 (with tools profile)"
    echo "   Redis GUI:  http://localhost:8081 (with tools profile)"
    echo ""
fi

if [ "$RAILWAY_AVAILABLE" = true ]; then
    echo "5. ☁️  Deploy to Railway:"
    echo "   railway up --service tradia-dev"
    echo ""
fi

echo "📚 Documentation:"
echo "   README.md - Project overview"
echo "   RAILWAY_SETUP.md - Railway deployment guide"
echo "   .env.example - Environment variables reference"
echo ""
echo "🆘 Need help?"
echo "   - Check logs: docker-compose logs -f"
echo "   - Health check: curl http://localhost:3001/health"
echo "   - Open an issue on GitHub"
echo ""
log_success "Happy coding! 🚀"
