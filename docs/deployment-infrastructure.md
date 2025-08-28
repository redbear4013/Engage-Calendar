# Weekend Planner App - Deployment & Infrastructure Architecture

## Overview

The Weekend Planner App infrastructure is designed for high availability, scalability, and security using modern cloud-native technologies. This document outlines the complete deployment strategy, infrastructure components, and operational procedures.

### Infrastructure Principles
- **Cloud-Native**: Containerized applications with Kubernetes orchestration
- **Auto-Scaling**: Dynamic scaling based on demand
- **High Availability**: Multi-region deployment with failover capabilities
- **Infrastructure as Code**: All infrastructure defined and managed as code
- **Security First**: Zero-trust security model with defense in depth
- **Observability**: Comprehensive monitoring, logging, and alerting

## Infrastructure Architecture

### High-Level Infrastructure Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                          INTERNET                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE CDN                               │
├─────────────────────────────────────────────────────────────────┤
│  • DDoS Protection        • SSL Termination                    │
│  • Web Application Firewall • Global Edge Caching             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 AWS LOAD BALANCER                               │
├─────────────────────────────────────────────────────────────────┤
│  Application Load Balancer (ALB)                               │
│  • Health Checks     • SSL/TLS Termination                     │
│  • Auto Scaling      • Multi-AZ Distribution                   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  KUBERNETES CLUSTER (EKS)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   API Gateway   │  │  User Service   │  │Calendar Service │ │
│  │                 │  │                 │  │                 │ │
│  │ • Rate Limiting │  │ • Authentication│  │ • Calendar CRUD │ │
│  │ • Request       │  │ • User Profiles │  │ • Event Mgmt    │ │
│  │   Routing       │  │ • OAuth         │  │ • Conflict Det. │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Event Service  │  │Recommendation   │  │Analytics Service│ │
│  │                 │  │Service          │  │                 │ │
│  │ • External APIs │  │ • ML Engine     │  │ • User Tracking │ │
│  │ • Event Agg.    │  │ • Personalize   │  │ • Performance   │ │
│  │ • Data Sync     │  │ • A/B Testing   │  │ • Business KPIs │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   PostgreSQL    │  │     Redis       │  │   File Storage  │ │
│  │   (RDS)         │  │   (ElastiCache) │  │   (S3)         │ │
│  │                 │  │                 │  │                 │ │
│  │ • Multi-AZ      │  │ • Clustering    │  │ • CDN           │ │
│  │ • Read Replicas │  │ • Persistence   │  │ • Versioning    │ │
│  │ • Automated     │  │ • High Avail.   │  │ • Lifecycle     │ │
│  │   Backups       │  │ • SSL/TLS       │  │ • Encryption    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Container Strategy

### Docker Configuration

#### Base Image
```dockerfile
# Dockerfile.base - Shared base image for all services
FROM node:18-alpine AS base

# Security updates and essential packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    ca-certificates \
    curl \
    dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set up working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY --chown=nextjs:nodejs . .

# Health check script
COPY --chown=nextjs:nodejs scripts/health-check.js ./

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node health-check.js

CMD ["dumb-init", "node", "server.js"]
```

#### Service-Specific Dockerfile
```dockerfile
# services/user-service/Dockerfile
FROM weekend-planner-base:latest

# Copy service-specific files
COPY --chown=nextjs:nodejs src/ ./src/
COPY --chown=nextjs:nodejs prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Expose service port
EXPOSE 3001

# Health check for this service
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["dumb-init", "node", "src/server.js"]
```

### Multi-Stage Build Pipeline
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && \
    npm prune --production

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Security hardening
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init ca-certificates && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

USER nextjs

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["dumb-init", "node", "dist/server.js"]
```

## Kubernetes Deployment

### Namespace Configuration
```yaml
# k8s/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: weekend-planner-prod
  labels:
    name: weekend-planner-prod
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: weekend-planner-staging
  labels:
    name: weekend-planner-staging
    environment: staging
```

### ConfigMap and Secrets
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: weekend-planner-prod
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  API_VERSION: "v1"
  CORS_ORIGIN: "https://weekendplanner.com"
  RATE_LIMIT_WINDOW: "3600000"
  RATE_LIMIT_MAX: "1000"
  JWT_ISSUER: "weekend-planner-api"
  JWT_AUDIENCE: "weekend-planner-app"

---
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: weekend-planner-prod
type: Opaque
data:
  DATABASE_URL: <base64-encoded-db-url>
  REDIS_URL: <base64-encoded-redis-url>
  JWT_PRIVATE_KEY: <base64-encoded-jwt-private-key>
  JWT_PUBLIC_KEY: <base64-encoded-jwt-public-key>
  ENCRYPTION_KEY: <base64-encoded-encryption-key>
  EVENTBRITE_API_KEY: <base64-encoded-eventbrite-key>
  MEETUP_API_KEY: <base64-encoded-meetup-key>
  GOOGLE_MAPS_API_KEY: <base64-encoded-google-maps-key>
```

### Service Deployments

#### User Service Deployment
```yaml
# k8s/user-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: weekend-planner-prod
  labels:
    app: user-service
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 2
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
        version: v1
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
      - name: user-service
        image: weekend-planner/user-service:v1.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 3001
          name: http
          protocol: TCP
        env:
        - name: PORT
          value: "3001"
        - name: SERVICE_NAME
          value: "user-service"
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 5
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: temp-volume
          mountPath: /tmp
        - name: logs-volume
          mountPath: /app/logs
      volumes:
      - name: temp-volume
        emptyDir: {}
      - name: logs-volume
        emptyDir: {}
      restartPolicy: Always

---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: weekend-planner-prod
  labels:
    app: user-service
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3001
    protocol: TCP
    name: http
  selector:
    app: user-service

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
  namespace: weekend-planner-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 4
        periodSeconds: 60
      selectPolicy: Max
```

#### API Gateway Deployment
```yaml
# k8s/api-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: weekend-planner-prod
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: weekend-planner/api-gateway:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: USER_SERVICE_URL
          value: "http://user-service"
        - name: CALENDAR_SERVICE_URL
          value: "http://calendar-service"
        - name: EVENT_SERVICE_URL
          value: "http://event-service"
        - name: RECOMMENDATION_SERVICE_URL
          value: "http://recommendation-service"
        - name: ANALYTICS_SERVICE_URL
          value: "http://analytics-service"
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  namespace: weekend-planner-prod
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: api-gateway
```

### Ingress Configuration
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: weekend-planner-ingress
  namespace: weekend-planner-prod
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/backend-protocol: HTTP
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS":443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-west-2:account:certificate/cert-id
    alb.ingress.kubernetes.io/security-groups: sg-api-gateway
    alb.ingress.kubernetes.io/load-balancer-attributes: access_logs.s3.enabled=true,access_logs.s3.bucket=weekend-planner-alb-logs
spec:
  rules:
  - host: api.weekendplanner.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
  - host: weekendplanner.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-app
            port:
              number: 80
  tls:
  - hosts:
    - api.weekendplanner.com
    - weekendplanner.com
    secretName: weekend-planner-tls
```

## Database Infrastructure

### PostgreSQL on AWS RDS
```yaml
# terraform/rds.tf
resource "aws_db_subnet_group" "weekend_planner" {
  name       = "weekend-planner-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "Weekend Planner DB subnet group"
    Environment = var.environment
  }
}

resource "aws_db_parameter_group" "weekend_planner" {
  family = "postgres14"
  name   = "weekend-planner-postgres14"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # Log queries taking > 1 second
  }

  tags = {
    Name = "Weekend Planner PostgreSQL parameters"
    Environment = var.environment
  }
}

resource "aws_db_instance" "weekend_planner_primary" {
  identifier     = "weekend-planner-primary"
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.weekend_planner.arn

  db_name  = "weekend_planner"
  username = "weekend_planner_admin"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.weekend_planner.name
  parameter_group_name   = aws_db_parameter_group.weekend_planner.name

  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  multi_az               = true
  publicly_accessible    = false
  copy_tags_to_snapshot  = true
  deletion_protection    = true

  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_monitoring.arn

  tags = {
    Name = "Weekend Planner Primary Database"
    Environment = var.environment
  }
}

# Read replica for scaling read operations
resource "aws_db_instance" "weekend_planner_read_replica" {
  identifier = "weekend-planner-read-replica"
  
  replicate_source_db = aws_db_instance.weekend_planner_primary.id
  instance_class      = "db.r6g.large"

  multi_az            = false
  publicly_accessible = false

  performance_insights_enabled = true
  monitoring_interval         = 60

  tags = {
    Name = "Weekend Planner Read Replica"
    Environment = var.environment
  }
}
```

### Redis Cluster
```yaml
# terraform/redis.tf
resource "aws_elasticache_subnet_group" "weekend_planner" {
  name       = "weekend-planner-redis-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "Weekend Planner Redis subnet group"
    Environment = var.environment
  }
}

resource "aws_elasticache_parameter_group" "weekend_planner" {
  family = "redis7"
  name   = "weekend-planner-redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  tags = {
    Name = "Weekend Planner Redis parameters"
    Environment = var.environment
  }
}

resource "aws_elasticache_replication_group" "weekend_planner" {
  replication_group_id       = "weekend-planner-redis"
  description                = "Weekend Planner Redis cluster"

  port                = 6379
  parameter_group_name = aws_elasticache_parameter_group.weekend_planner.name
  subnet_group_name   = aws_elasticache_subnet_group.weekend_planner.name
  security_group_ids  = [aws_security_group.redis.id]

  node_type                     = "cache.r7g.large"
  num_cache_clusters           = 3
  multi_az_enabled             = true
  automatic_failover_enabled   = true

  at_rest_encryption_enabled   = true
  transit_encryption_enabled   = true
  auth_token                  = var.redis_auth_token

  maintenance_window = "sun:03:00-sun:04:00"
  snapshot_retention_limit = 7
  snapshot_window         = "02:00-03:00"

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format      = "text"
    log_type        = "slow-log"
  }

  tags = {
    Name = "Weekend Planner Redis Cluster"
    Environment = var.environment
  }
}
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy Weekend Planner App

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-west-2
  ECR_REPOSITORY: weekend-planner
  EKS_CLUSTER_NAME: weekend-planner-cluster

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: weekend_planner_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run security audit
      run: npm audit --audit-level=high

    - name: Run linting
      run: npm run lint

    - name: Run type checking
      run: npm run type-check

    - name: Run unit tests
      run: npm run test:unit
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://postgres:test_password@localhost:5432/weekend_planner_test
        REDIS_URL: redis://localhost:6379

    - name: Run integration tests
      run: npm run test:integration
      env:
        NODE_ENV: test
        DATABASE_URL: postgresql://postgres:test_password@localhost:5432/weekend_planner_test
        REDIS_URL: redis://localhost:6379

    - name: Run E2E tests
      run: npm run test:e2e
      env:
        NODE_ENV: test

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  security-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: Upload Trivy scan results to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  build-and-deploy:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/staging'

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}

    - name: Login to Amazon ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v1

    - name: Build, tag, and push images to Amazon ECR
      env:
        ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        IMAGE_TAG: ${{ github.sha }}
      run: |
        # Build and push each microservice
        for service in user-service calendar-service event-service recommendation-service analytics-service api-gateway; do
          echo "Building $service..."
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY/$service:$IMAGE_TAG ./services/$service
          docker push $ECR_REGISTRY/$ECR_REPOSITORY/$service:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY/$service:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY/$service:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY/$service:latest
        done

    - name: Deploy to staging
      if: github.ref == 'refs/heads/staging'
      env:
        IMAGE_TAG: ${{ github.sha }}
      run: |
        aws eks update-kubeconfig --name $EKS_CLUSTER_NAME --region $AWS_REGION
        
        # Update image tags in Kubernetes manifests
        sed -i "s/:latest/:$IMAGE_TAG/g" k8s/staging/*.yaml
        
        # Apply manifests
        kubectl apply -f k8s/staging/
        
        # Wait for rollout
        kubectl rollout status deployment/user-service -n weekend-planner-staging
        kubectl rollout status deployment/calendar-service -n weekend-planner-staging
        kubectl rollout status deployment/event-service -n weekend-planner-staging

    - name: Deploy to production
      if: github.ref == 'refs/heads/main'
      env:
        IMAGE_TAG: ${{ github.sha }}
      run: |
        aws eks update-kubeconfig --name $EKS_CLUSTER_NAME --region $AWS_REGION
        
        # Blue-green deployment strategy
        ./scripts/blue-green-deploy.sh $IMAGE_TAG
        
        # Run post-deployment tests
        ./scripts/post-deployment-tests.sh
        
        # Switch traffic to new version
        ./scripts/switch-traffic.sh

    - name: Notify team
      if: always()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Blue-Green Deployment Script
```bash
#!/bin/bash
# scripts/blue-green-deploy.sh

set -e

IMAGE_TAG=$1
NAMESPACE="weekend-planner-prod"

# Determine current and new environments
CURRENT_ENV=$(kubectl get service api-gateway -n $NAMESPACE -o jsonpath='{.spec.selector.environment}' || echo "blue")
if [ "$CURRENT_ENV" = "blue" ]; then
    NEW_ENV="green"
else
    NEW_ENV="blue"
fi

echo "Current environment: $CURRENT_ENV"
echo "Deploying to environment: $NEW_ENV"

# Update deployment manifests with new image tag and environment
for service in user-service calendar-service event-service recommendation-service analytics-service api-gateway; do
    # Create new deployment for the new environment
    cat k8s/prod/$service.yaml | \
        sed "s/:latest/:$IMAGE_TAG/g" | \
        sed "s/environment: blue/environment: $NEW_ENV/g" | \
        sed "s/environment: green/environment: $NEW_ENV/g" | \
        sed "s/name: $service/name: $service-$NEW_ENV/g" | \
        kubectl apply -f -
done

# Wait for all deployments to be ready
echo "Waiting for deployments to be ready..."
for service in user-service calendar-service event-service recommendation-service analytics-service api-gateway; do
    kubectl rollout status deployment/$service-$NEW_ENV -n $NAMESPACE --timeout=600s
done

# Run health checks
echo "Running health checks..."
./scripts/health-check.sh $NEW_ENV

# If health checks pass, update services to point to new environment
echo "Health checks passed. Updating services..."
for service in user-service calendar-service event-service recommendation-service analytics-service api-gateway; do
    kubectl patch service $service -n $NAMESPACE -p '{"spec":{"selector":{"environment":"'$NEW_ENV'"}}}'
done

# Wait a bit for traffic to stabilize
sleep 30

# Clean up old environment
echo "Cleaning up old environment: $CURRENT_ENV"
for service in user-service calendar-service event-service recommendation-service analytics-service api-gateway; do
    kubectl delete deployment $service-$CURRENT_ENV -n $NAMESPACE || true
done

echo "Blue-green deployment completed successfully!"
```

## Monitoring & Observability

### Prometheus Configuration
```yaml
# k8s/monitoring/prometheus.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    rule_files:
      - "/etc/prometheus/rules/*.yml"

    alerting:
      alertmanagers:
        - static_configs:
            - targets:
              - alertmanager:9093

    scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)

      - job_name: 'kubernetes-services'
        kubernetes_sd_configs:
          - role: endpoints
        relabel_configs:
          - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
            action: keep
            regex: true

      - job_name: 'weekend-planner-services'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - weekend-planner-prod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: (user-service|calendar-service|event-service|recommendation-service|analytics-service|api-gateway)
```

### Grafana Dashboards
```json
{
  "dashboard": {
    "id": null,
    "title": "Weekend Planner - Application Metrics",
    "tags": ["weekend-planner", "microservices"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{namespace=\"weekend-planner-prod\"}[5m]))",
            "legendFormat": "Requests/sec"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps"
          }
        }
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{namespace=\"weekend-planner-prod\"}[5m])) by (le, service))",
            "legendFormat": "95th percentile - {{service}}"
          },
          {
            "expr": "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket{namespace=\"weekend-planner-prod\"}[5m])) by (le, service))",
            "legendFormat": "50th percentile - {{service}}"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{namespace=\"weekend-planner-prod\", status=~\"5..\"}[5m])) by (service) / sum(rate(http_requests_total{namespace=\"weekend-planner-prod\"}[5m])) by (service)",
            "legendFormat": "{{service}} error rate"
          }
        ]
      },
      {
        "id": 4,
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(database_connections_active{namespace=\"weekend-planner-prod\"}) by (service)",
            "legendFormat": "{{service}} active connections"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

### Alerting Rules
```yaml
# k8s/monitoring/alerts.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  weekend-planner.yml: |
    groups:
    - name: weekend-planner-alerts
      rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{namespace="weekend-planner-prod", status=~"5.."}[5m])) by (service) / sum(rate(http_requests_total{namespace="weekend-planner-prod"}[5m])) by (service) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected in {{ $labels.service }}"
          description: "{{ $labels.service }} has an error rate of {{ $value | humanizePercentage }} for the last 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{namespace="weekend-planner-prod"}[5m])) by (le, service)) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time in {{ $labels.service }}"
          description: "95th percentile response time for {{ $labels.service }} is {{ $value }}s"

      - alert: DatabaseConnectionsHigh
        expr: sum(database_connections_active{namespace="weekend-planner-prod"}) by (service) / sum(database_connections_max{namespace="weekend-planner-prod"}) by (service) > 0.8
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High database connection usage in {{ $labels.service }}"
          description: "{{ $labels.service }} is using {{ $value | humanizePercentage }} of database connections"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total{namespace="weekend-planner-prod"}[15m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} is crash looping"
          description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} is restarting frequently"

      - alert: ServiceDown
        expr: up{namespace="weekend-planner-prod"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service {{ $labels.job }} has been down for more than 1 minute"
```

### Log Aggregation
```yaml
# k8s/logging/fluent-bit.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         1
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020

    [INPUT]
        Name              tail
        Path              /var/log/containers/*weekend-planner*.log
        Parser            cri
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           On
        Merge_Log_Key       log_processed

    [FILTER]
        Name                parser
        Match               kube.*
        Key_Name            log
        Parser              json
        Reserve_Data        True

    [OUTPUT]
        Name                cloudwatch_logs
        Match               kube.*
        region              us-west-2
        log_group_name      /aws/containerinsights/weekend-planner/application
        log_stream_prefix   ${HOSTNAME}
        auto_create_group   true
        extra_user_agent    container-insights
```

## Disaster Recovery & Backup

### Database Backup Strategy
```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_BUCKET="weekend-planner-backups"
DATABASE_HOST="weekend-planner-primary.cluster-xyz.us-west-2.rds.amazonaws.com"

# Create database dump
echo "Creating database backup..."
pg_dump -h $DATABASE_HOST -U weekend_planner_admin -d weekend_planner \
    --verbose --no-password --format=custom \
    --file="/tmp/weekend_planner_backup_$TIMESTAMP.dump"

# Compress backup
gzip "/tmp/weekend_planner_backup_$TIMESTAMP.dump"

# Upload to S3
aws s3 cp "/tmp/weekend_planner_backup_$TIMESTAMP.dump.gz" \
    "s3://$BACKUP_BUCKET/database/daily/weekend_planner_backup_$TIMESTAMP.dump.gz"

# Clean up local file
rm "/tmp/weekend_planner_backup_$TIMESTAMP.dump.gz"

# Create point-in-time recovery snapshot
aws rds create-db-snapshot \
    --db-instance-identifier weekend-planner-primary \
    --db-snapshot-identifier weekend-planner-snapshot-$TIMESTAMP

echo "Database backup completed successfully"
```

### Disaster Recovery Plan
```yaml
# terraform/disaster-recovery.tf
# Cross-region backup for disaster recovery
resource "aws_db_instance" "weekend_planner_dr" {
  provider = aws.dr_region
  
  identifier = "weekend-planner-dr"
  
  # Restore from snapshot in primary region
  snapshot_identifier = var.latest_snapshot_id
  
  instance_class = "db.r6g.large"
  multi_az      = true
  
  vpc_security_group_ids = [aws_security_group.database_dr.id]
  db_subnet_group_name   = aws_db_subnet_group.weekend_planner_dr.name
  
  skip_final_snapshot = false
  final_snapshot_identifier = "weekend-planner-dr-final-snapshot"
  
  tags = {
    Name = "Weekend Planner DR Database"
    Environment = "disaster-recovery"
  }
}

# S3 cross-region replication for backups
resource "aws_s3_bucket_replication_configuration" "backup_replication" {
  role   = aws_iam_role.replication.arn
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "replicate-backups"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.backups_dr.arn
      storage_class = "STANDARD_IA"
    }
  }
}
```

This comprehensive deployment and infrastructure architecture provides a robust, scalable, and secure foundation for the Weekend Planner App, ensuring high availability, disaster recovery capabilities, and operational excellence.