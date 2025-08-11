#!/bin/bash

# Auto-Sync Integration Deployment Script
# This script handles deployment of the sync functionality to production

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/var/backups/finvista"
LOG_FILE="/var/log/finvista-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Validate environment
validate_environment() {
    log "Validating deployment environment..."
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "node" "npm" "psql")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command '$cmd' is not installed"
        fi
    done
    
    # Check environment file
    if [[ ! -f "$PROJECT_ROOT/backend/.env" ]]; then
        error "Environment file not found at $PROJECT_ROOT/backend/.env"
    fi
    
    # Validate required environment variables
    source "$PROJECT_ROOT/backend/.env"
    local required_vars=("DATABASE_URL" "JWT_SECRET" "CREDENTIAL_ENCRYPTION_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable '$var' is not set"
        fi
    done
    
    # Validate encryption key length
    if [[ ${#CREDENTIAL_ENCRYPTION_KEY} -lt 32 ]]; then
        error "CREDENTIAL_ENCRYPTION_KEY must be at least 32 characters long"
    fi
    
    success "Environment validation completed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/sync_deployment_$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup database
    log "Backing up database..."
    pg_dump "$DATABASE_URL" > "$backup_path/database_backup.sql"
    
    # Backup current application
    log "Backing up application files..."
    if [[ -d "$PROJECT_ROOT/backend" ]]; then
        cp -r "$PROJECT_ROOT/backend" "$backup_path/"
    fi
    
    # Backup Docker volumes
    log "Backing up Docker volumes..."
    docker run --rm -v finvista_postgres_data:/data -v "$backup_path":/backup alpine tar czf /backup/postgres_volume.tar.gz -C /data .
    
    success "Backup created at $backup_path"
    echo "$backup_path" > "$PROJECT_ROOT/.last_backup"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    cd "$PROJECT_ROOT/backend"
    
    # Generate Prisma client
    npx prisma generate
    
    # Run migrations
    npx prisma migrate deploy
    
    # Verify migrations
    npx prisma migrate status
    
    success "Database migrations completed"
}

# Build and deploy containers
deploy_containers() {
    log "Building and deploying containers..."
    
    cd "$PROJECT_ROOT"
    
    # Pull latest images
    docker-compose -f docker-compose.yml -f docker-compose.sync.yml pull
    
    # Build custom images
    docker-compose -f docker-compose.yml -f docker-compose.sync.yml build --no-cache
    
    # Stop existing containers
    docker-compose -f docker-compose.yml -f docker-compose.sync.yml down
    
    # Start new containers
    docker-compose -f docker-compose.yml -f docker-compose.sync.yml up -d
    
    success "Containers deployed successfully"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Wait for services to start
    sleep 30
    
    # Check container health
    local containers=("finvista-backend" "finvista-sync-worker" "finvista-redis")
    for container in "${containers[@]}"; do
        if ! docker ps | grep -q "$container"; then
            error "Container $container is not running"
        fi
        
        # Check health status
        local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-health-check")
        if [[ "$health_status" == "unhealthy" ]]; then
            error "Container $container is unhealthy"
        fi
        
        log "Container $container is running (health: $health_status)"
    done
    
    # Test API endpoints
    log "Testing API endpoints..."
    local api_url="http://localhost:${PORT:-3001}"
    
    # Test health endpoint
    if ! curl -f -s "$api_url/health" > /dev/null; then
        error "API health check failed"
    fi
    
    # Test sync worker metrics
    local metrics_url="http://localhost:${METRICS_PORT:-9090}"
    if ! curl -f -s "$metrics_url/health" > /dev/null; then
        error "Sync worker health check failed"
    fi
    
    success "Deployment verification completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring directories
    mkdir -p "$PROJECT_ROOT/monitoring/prometheus"
    mkdir -p "$PROJECT_ROOT/monitoring/grafana/dashboards"
    mkdir -p "$PROJECT_ROOT/monitoring/grafana/datasources"
    
    # Copy monitoring configurations
    cp "$PROJECT_ROOT/monitoring/configs/"* "$PROJECT_ROOT/monitoring/" 2>/dev/null || true
    
    # Start monitoring services
    docker-compose -f docker-compose.sync.yml up -d prometheus grafana loki
    
    success "Monitoring setup completed"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    # Create logrotate configuration
    sudo tee /etc/logrotate.d/finvista-sync > /dev/null <<EOF
$PROJECT_ROOT/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        docker-compose -f $PROJECT_ROOT/docker-compose.yml -f $PROJECT_ROOT/docker-compose.sync.yml restart sync-worker
    endscript
}
EOF
    
    success "Log rotation configured"
}

# Setup systemd service (optional)
setup_systemd_service() {
    if [[ "$1" == "--systemd" ]]; then
        log "Setting up systemd service..."
        
        sudo tee /etc/systemd/system/finvista-sync.service > /dev/null <<EOF
[Unit]
Description=FinVista Auto-Sync Integration
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_ROOT
ExecStart=/usr/local/bin/docker-compose -f docker-compose.yml -f docker-compose.sync.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.yml -f docker-compose.sync.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
        
        sudo systemctl daemon-reload
        sudo systemctl enable finvista-sync.service
        
        success "Systemd service configured"
    fi
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Remove old Docker images
    docker image prune -f
    
    # Remove old backups (keep last 7 days)
    find "$BACKUP_DIR" -name "sync_deployment_*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting Auto-Sync Integration deployment..."
    
    # Parse command line arguments
    local skip_backup=false
    local enable_systemd=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                skip_backup=true
                shift
                ;;
            --systemd)
                enable_systemd=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --skip-backup    Skip database backup"
                echo "  --systemd        Setup systemd service"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    # Run deployment steps
    check_root
    validate_environment
    
    if [[ "$skip_backup" == false ]]; then
        create_backup
    fi
    
    run_migrations
    deploy_containers
    verify_deployment
    setup_monitoring
    setup_log_rotation
    
    if [[ "$enable_systemd" == true ]]; then
        setup_systemd_service --systemd
    fi
    
    cleanup
    
    success "Auto-Sync Integration deployment completed successfully!"
    
    # Display post-deployment information
    echo ""
    echo "=== Deployment Summary ==="
    echo "API URL: http://localhost:${PORT:-3001}"
    echo "Metrics URL: http://localhost:${METRICS_PORT:-9090}"
    echo "Grafana URL: http://localhost:3000 (admin/admin)"
    echo "Prometheus URL: http://localhost:9090"
    echo ""
    echo "Next steps:"
    echo "1. Configure external API credentials in the admin panel"
    echo "2. Test sync functionality with a few users"
    echo "3. Monitor sync job execution in Grafana"
    echo "4. Set up alerting for production monitoring"
    echo ""
    echo "For troubleshooting, check:"
    echo "- Application logs: $PROJECT_ROOT/logs/"
    echo "- Container logs: docker-compose logs -f"
    echo "- Sync worker health: curl http://localhost:${METRICS_PORT:-9090}/health"
}

# Run main function with all arguments
main "$@"