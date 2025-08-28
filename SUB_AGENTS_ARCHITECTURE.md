# Sub-Agents Architecture for App Development

## Overview
This document outlines a comprehensive sub-agent architecture for building full-stack applications. Each sub-agent is specialized for specific domains and can be invoked automatically based on context or explicitly called when needed.

## Architecture Principles

### Model Assignment Strategy
- **Haiku (Fast/Low Cost)**: Simple tasks, code formatting, basic documentation
- **Sonnet (Balanced)**: Development tasks, code review, testing, architecture decisions  
- **Opus (Advanced)**: Critical tasks, security auditing, complex system design, AI/ML work

### Delegation System
- **Auto-delegation**: Context-aware routing based on task analysis
- **Explicit calling**: Direct agent invocation using `@agent-name` syntax
- **Multi-agent workflows**: Coordinated tasks across multiple specialists

## Sub-Agent Categories

### 🏗️ Core Development

#### `frontend-architect`
**Model**: Sonnet  
**Specialization**: Frontend architecture and user experience design
- React/Vue/Angular ecosystem expertise
- State management (Redux, Zustand, Pinia)
- Component architecture and design systems
- Performance optimization and accessibility
- Progressive web app development

#### `backend-architect` 
**Model**: Sonnet  
**Specialization**: Server-side architecture and API design
- REST/GraphQL API design and implementation
- Database schema design and optimization
- Microservices architecture patterns
- Authentication and authorization systems
- Caching strategies and performance tuning

#### `fullstack-integrator`
**Model**: Sonnet  
**Specialization**: End-to-end application integration
- Frontend-backend communication patterns
- Real-time features (WebSockets, SSE)
- Data flow optimization
- Cross-platform compatibility
- Build pipeline coordination

### 💻 Language Specialists

#### `javascript-pro`
**Model**: Sonnet  
**Specialization**: Modern JavaScript and TypeScript development
- ES6+ features and best practices
- Node.js backend development
- TypeScript advanced patterns
- Module bundling and optimization
- Testing frameworks (Jest, Vitest)

#### `python-expert`
**Model**: Sonnet  
**Specialization**: Python development and ecosystem
- FastAPI/Django/Flask frameworks
- Data processing with pandas/numpy
- Async programming patterns
- Package management and virtual environments
- Python testing and debugging

#### `react-specialist`
**Model**: Sonnet  
**Specialization**: React ecosystem and modern patterns
- Hooks and functional components
- Context API and state management
- Server-side rendering (Next.js)
- React Native for mobile development
- Component testing with React Testing Library

### ☁️ Infrastructure & DevOps

#### `cloud-architect`
**Model**: Sonnet  
**Specialization**: Cloud infrastructure and deployment
- AWS/GCP/Azure service integration
- Container orchestration (Docker, Kubernetes)
- Infrastructure as Code (Terraform, CDK)
- CI/CD pipeline design
- Serverless architecture patterns

#### `database-expert`
**Model**: Sonnet  
**Specialization**: Database design and optimization  
- SQL and NoSQL database selection
- Schema design and migrations
- Query optimization and indexing
- Database scaling strategies
- Backup and disaster recovery

#### `devops-engineer`
**Model**: Sonnet  
**Specialization**: Development operations and automation
- CI/CD pipeline implementation
- Monitoring and logging setup
- Container management
- Environment provisioning
- Performance monitoring

### 🔒 Security & Quality

#### `security-auditor`
**Model**: Opus  
**Specialization**: Application security and vulnerability assessment
- OWASP Top 10 vulnerability scanning
- Authentication and authorization review
- API security best practices
- Data encryption and privacy compliance
- Security testing and penetration testing

#### `code-reviewer`
**Model**: Sonnet  
**Specialization**: Code quality and best practices enforcement
- Code style and convention enforcement
- Performance optimization suggestions
- Refactoring recommendations
- Technical debt identification
- Documentation review

#### `test-engineer`
**Model**: Sonnet  
**Specialization**: Comprehensive testing strategies
- Unit, integration, and E2E testing
- Test-driven development (TDD)
- Test automation frameworks
- Performance testing
- Accessibility testing

### 📊 Data & Analytics

#### `data-engineer`
**Model**: Sonnet  
**Specialization**: Data pipeline and processing systems
- ETL/ELT pipeline design
- Data warehouse architecture
- Real-time data processing
- Data validation and quality
- Analytics infrastructure

#### `ai-ml-engineer`
**Model**: Opus  
**Specialization**: AI/ML integration and deployment
- Model training and evaluation
- ML pipeline development
- AI service integration
- Model deployment and monitoring
- Natural language processing

### 🎨 Design & UX

#### `ui-ux-designer`
**Model**: Sonnet  
**Specialization**: User interface and experience design
- Design system creation
- Wireframing and prototyping
- Accessibility compliance (WCAG)
- Mobile-first responsive design
- User journey optimization

#### `mobile-developer`
**Model**: Sonnet  
**Specialization**: Mobile application development
- React Native/Flutter development
- Native iOS/Android integration
- Mobile performance optimization
- App store deployment
- Push notifications and offline functionality

### 📋 Project Management

#### `product-manager`
**Model**: Sonnet  
**Specialization**: Product strategy and requirement management
- Feature prioritization and roadmapping
- User story creation and acceptance criteria
- Stakeholder communication
- Market research and competitive analysis
- Product metrics and KPI tracking

#### `tech-lead`
**Model**: Sonnet  
**Specialization**: Technical leadership and coordination
- Architecture decision making
- Team coordination and mentoring  
- Technical debt management
- Code review oversight
- Sprint planning and estimation

## Workflow Orchestration

### Multi-Agent Collaboration Patterns

#### Feature Development Workflow
```
1. product-manager → Requirements analysis
2. ui-ux-designer → Design mockups
3. backend-architect → API design
4. frontend-architect → Component planning
5. javascript-pro/python-expert → Implementation
6. test-engineer → Test coverage
7. security-auditor → Security review
8. code-reviewer → Final review
9. devops-engineer → Deployment
```

#### Bug Fix Workflow
```
1. code-reviewer → Issue analysis
2. [language-specialist] → Root cause identification
3. test-engineer → Reproduction test
4. [domain-expert] → Fix implementation
5. security-auditor → Security impact review
6. test-engineer → Regression testing
```

#### Performance Optimization Workflow
```
1. devops-engineer → Performance profiling
2. backend-architect → Server-side optimization
3. frontend-architect → Client-side optimization
4. database-expert → Query optimization
5. cloud-architect → Infrastructure scaling
6. test-engineer → Performance testing
```

## Usage Examples

### Explicit Agent Invocation
```
@frontend-architect Please design a component architecture for a dashboard with real-time data updates

@security-auditor Review this authentication implementation for vulnerabilities

@fullstack-integrator Help integrate the new payment API with both frontend and backend
```

### Context-Based Auto-Delegation
- Database queries → `database-expert`
- React components → `react-specialist` 
- API endpoints → `backend-architect`
- Security concerns → `security-auditor`
- Deployment issues → `devops-engineer`

## Configuration and Customization

### Agent Priority Matrix
```yaml
task_complexity:
  simple: haiku
  moderate: sonnet  
  complex: opus

domain_routing:
  frontend: [frontend-architect, react-specialist, ui-ux-designer]
  backend: [backend-architect, python-expert, database-expert]
  security: [security-auditor]
  deployment: [devops-engineer, cloud-architect]
```

### Custom Agent Creation Template
```markdown
# Agent Name: custom-specialist

## Metadata
- **Model**: sonnet|opus|haiku
- **Category**: development|infrastructure|quality|data|security|business
- **Complexity**: low|medium|high
- **Auto-invoke**: true|false

## Role Description
Brief description of agent's primary responsibility

## Expertise Areas
- Specific skill 1
- Specific skill 2
- Specific skill 3

## Capabilities
- What the agent can do
- Tools and frameworks it specializes in
- Types of problems it solves

## Collaboration Patterns
- Which agents it frequently works with
- Typical workflow position
- Handoff responsibilities
```

## Best Practices

### Agent Selection Guidelines
1. **Match complexity to capability**: Use appropriate model tier
2. **Leverage specialization**: Choose domain-specific agents
3. **Consider workflow position**: Select agents based on development phase
4. **Enable collaboration**: Use agents that work well together

### Performance Optimization
1. **Batch related tasks**: Group similar work for single agent
2. **Minimize context switching**: Keep agent focus consistent
3. **Use caching**: Leverage agent memory for repetitive tasks
4. **Monitor usage**: Track agent effectiveness and costs

### Quality Assurance
1. **Always include review**: Use `code-reviewer` for all implementations
2. **Security by default**: Involve `security-auditor` for sensitive features
3. **Test coverage**: Engage `test-engineer` for comprehensive testing
4. **Documentation**: Ensure agents document their decisions and code

## Conclusion

This sub-agent architecture provides a comprehensive framework for building robust, scalable applications with specialized expertise at every level. By leveraging the right combination of agents and models, development teams can achieve higher quality, faster delivery, and better maintainability.

The modular nature allows for easy customization and extension based on specific project needs, while the collaboration patterns ensure smooth workflow coordination across the entire development lifecycle.