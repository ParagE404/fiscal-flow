#!/bin/bash

# Secret Management Setup Script
# This script helps set up secure credential management for production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Generate secure encryption key
generate_encryption_key() {
    log "Generating secure encryption key..."
    
    # Generate 32-byte (256-bit) key
    local key=$(openssl rand -hex 32)
    echo "$key"
}

# Generate JWT secret
generate_jwt_secret() {
    log "Generating JWT secret..."
    
    # Generate 64-byte key for JWT
    local secret=$(openssl rand -base64 64 | tr -d '\n')
    echo "$secret"
}

# Generate webhook secret
generate_webhook_secret() {
    log "Generating webhook secret..."
    
    # Generate 32-byte key for webhook signing
    local secret=$(openssl rand -hex 32)
    echo "$secret"
}

# Generate Redis password
generate_redis_password() {
    log "Generating Redis password..."
    
    # Generate strong password for Redis
    local password=$(openssl rand -base64 32 | tr -d '\n')
    echo "$password"
}

# Setup environment file with secrets
setup_env_file() {
    local env_file="$1"
    local backup_file="${env_file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    log "Setting up environment file: $env_file"
    
    # Backup existing file
    if [[ -f "$env_file" ]]; then
        cp "$env_file" "$backup_file"
        log "Backed up existing environment file to: $backup_file"
    fi
    
    # Generate secrets
    local encryption_key=$(generate_encryption_key)
    local jwt_secret=$(generate_jwt_secret)
    local webhook_secret=$(generate_webhook_secret)
    local redis_password=$(generate_redis_password)
    
    # Update or add secrets to environment file
    if [[ -f "$env_file" ]]; then
        # Update existing file
        sed -i.bak "s/^CREDENTIAL_ENCRYPTION_KEY=.*/CREDENTIAL_ENCRYPTION_KEY=$encryption_key/" "$env_file" || \
        echo "CREDENTIAL_ENCRYPTION_KEY=$encryption_key" >> "$env_file"
        
        sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" "$env_file" || \
        echo "JWT_SECRET=$jwt_secret" >> "$env_file"
        
        sed -i.bak "s/^WEBHOOK_SECRET=.*/WEBHOOK_SECRET=$webhook_secret/" "$env_file" || \
        echo "WEBHOOK_SECRET=$webhook_secret" >> "$env_file"
        
        sed -i.bak "s/^REDIS_PASSWORD=.*/REDIS_PASSWORD=$redis_password/" "$env_file" || \
        echo "REDIS_PASSWORD=$redis_password" >> "$env_file"
        
        # Remove backup files created by sed
        rm -f "${env_file}.bak"
    else
        error "Environment file not found: $env_file"
    fi
    
    success "Environment file updated with secure secrets"
    
    # Display summary (without showing actual secrets)
    echo ""
    echo "=== Secrets Generated ==="
    echo "CREDENTIAL_ENCRYPTION_KEY: [32 characters] ✓"
    echo "JWT_SECRET: [64+ characters] ✓"
    echo "WEBHOOK_SECRET: [32 characters] ✓"
    echo "REDIS_PASSWORD: [32+ characters] ✓"
    echo ""
}

# Setup Docker secrets
setup_docker_secrets() {
    log "Setting up Docker secrets..."
    
    # Create secrets directory
    mkdir -p secrets
    
    # Generate and store secrets
    generate_encryption_key > secrets/credential_encryption_key
    generate_jwt_secret > secrets/jwt_secret
    generate_webhook_secret > secrets/webhook_secret
    generate_redis_password > secrets/redis_password
    
    # Set proper permissions
    chmod 600 secrets/*
    
    success "Docker secrets created in ./secrets/ directory"
    
    # Create docker-compose override for secrets
    cat > docker-compose.secrets.yml << EOF
version: '3.8'

services:
  backend:
    secrets:
      - credential_encryption_key
      - jwt_secret
      - webhook_secret
    environment:
      - CREDENTIAL_ENCRYPTION_KEY_FILE=/run/secrets/credential_encryption_key
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret

  sync-worker:
    secrets:
      - credential_encryption_key
      - webhook_secret
    environment:
      - CREDENTIAL_ENCRYPTION_KEY_FILE=/run/secrets/credential_encryption_key
      - WEBHOOK_SECRET_FILE=/run/secrets/webhook_secret

  redis:
    secrets:
      - redis_password
    environment:
      - REDIS_PASSWORD_FILE=/run/secrets/redis_password

secrets:
  credential_encryption_key:
    file: ./secrets/credential_encryption_key
  jwt_secret:
    file: ./secrets/jwt_secret
  webhook_secret:
    file: ./secrets/webhook_secret
  redis_password:
    file: ./secrets/redis_password
EOF
    
    success "Docker secrets configuration created"
}

# Setup Kubernetes secrets
setup_k8s_secrets() {
    log "Setting up Kubernetes secrets..."
    
    # Generate secrets
    local encryption_key=$(generate_encryption_key)
    local jwt_secret=$(generate_jwt_secret)
    local webhook_secret=$(generate_webhook_secret)
    local redis_password=$(generate_redis_password)
    
    # Create Kubernetes secret manifest
    cat > k8s-secrets.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: finvista-sync-secrets
  namespace: default
type: Opaque
data:
  credential-encryption-key: $(echo -n "$encryption_key" | base64)
  jwt-secret: $(echo -n "$jwt_secret" | base64)
  webhook-secret: $(echo -n "$webhook_secret" | base64)
  redis-password: $(echo -n "$redis_password" | base64)
---
apiVersion: v1
kind: Secret
metadata:
  name: finvista-api-keys
  namespace: default
type: Opaque
data:
  yahoo-finance-api-key: $(echo -n "your-yahoo-finance-api-key" | base64)
  nse-api-key: $(echo -n "your-nse-api-key" | base64)
  alpha-vantage-api-key: $(echo -n "your-alpha-vantage-api-key" | base64)
EOF
    
    success "Kubernetes secrets manifest created: k8s-secrets.yaml"
    
    echo ""
    echo "To apply the secrets to your cluster:"
    echo "kubectl apply -f k8s-secrets.yaml"
    echo ""
    echo "Remember to update the API keys in the manifest before applying!"
}

# Validate secrets
validate_secrets() {
    local env_file="$1"
    
    log "Validating secrets in environment file..."
    
    if [[ ! -f "$env_file" ]]; then
        error "Environment file not found: $env_file"
    fi
    
    source "$env_file"
    
    # Check encryption key
    if [[ -z "$CREDENTIAL_ENCRYPTION_KEY" ]]; then
        error "CREDENTIAL_ENCRYPTION_KEY is not set"
    elif [[ ${#CREDENTIAL_ENCRYPTION_KEY} -lt 32 ]]; then
        error "CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters long"
    fi
    
    # Check JWT secret
    if [[ -z "$JWT_SECRET" ]]; then
        error "JWT_SECRET is not set"
    elif [[ ${#JWT_SECRET} -lt 32 ]]; then
        error "JWT_SECRET should be at least 32 characters long"
    fi
    
    # Check webhook secret
    if [[ -n "$WEBHOOK_SECRET" && ${#WEBHOOK_SECRET} -lt 32 ]]; then
        warning "WEBHOOK_SECRET should be at least 32 characters long"
    fi
    
    success "Secret validation completed"
}

# Main function
main() {
    echo "=== FinVista Sync - Secret Management Setup ==="
    echo ""
    
    local mode="env"
    local env_file="backend/.env"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docker)
                mode="docker"
                shift
                ;;
            --k8s|--kubernetes)
                mode="k8s"
                shift
                ;;
            --env-file)
                env_file="$2"
                shift 2
                ;;
            --validate)
                validate_secrets "$env_file"
                exit 0
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --docker         Setup Docker secrets"
                echo "  --k8s            Setup Kubernetes secrets"
                echo "  --env-file FILE  Specify environment file (default: backend/.env)"
                echo "  --validate       Validate existing secrets"
                echo "  --help           Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0                           # Setup secrets in .env file"
                echo "  $0 --docker                 # Setup Docker secrets"
                echo "  $0 --k8s                    # Setup Kubernetes secrets"
                echo "  $0 --validate                # Validate existing secrets"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    case $mode in
        env)
            setup_env_file "$env_file"
            validate_secrets "$env_file"
            ;;
        docker)
            setup_docker_secrets
            ;;
        k8s)
            setup_k8s_secrets
            ;;
        *)
            error "Unknown mode: $mode"
            ;;
    esac
    
    echo ""
    echo "=== Security Recommendations ==="
    echo "1. Store secrets in a secure password manager"
    echo "2. Rotate secrets regularly (every 90 days)"
    echo "3. Use different secrets for different environments"
    echo "4. Never commit secrets to version control"
    echo "5. Limit access to secret files and environment variables"
    echo "6. Monitor for unauthorized access to secrets"
    echo ""
    
    success "Secret management setup completed!"
}

# Check if running with proper permissions
if [[ $EUID -eq 0 ]]; then
    warning "Running as root. Consider using a non-root user for better security."
fi

# Run main function
main "$@"