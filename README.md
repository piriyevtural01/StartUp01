# Enterprise Database Schema Designer

A comprehensive, enterprise-grade web application for designing and managing SQL database schemas with real-time collaborative editing capabilities.

## 🚀 Features

### Core Database Design
- **Visual Table Builder**: Intuitive drag-and-drop interface for creating tables
- **Advanced Relationship Management**: Visual foreign key relationships with validation
- **Comprehensive ALTER TABLE Editor**: Modify existing table structures with real-time SQL generation
- **Live SQL Editor**: Type DDL statements with auto-completion and real-time schema updates
- **Smart Export**: Export schemas with automatic naming based on project names

### Advanced Validation & Error Prevention
- **Real-time Validation**: Prevent common SQL design violations
- **Anomaly Detection**: Block duplicate primary keys, circular references, and naming collisions
- **Constraint Validation**: Ensure foreign key references exist and data types match
- **Error Highlighting**: Clear error messages with suggestions for fixes

### Real-time Collaboration
- **Multi-user Workspaces**: Multiple authenticated users can edit simultaneously
- **Live Schema Sync**: Changes propagate instantly to all connected users
- **Visual Collaboration**: See other users' cursors and current selections
- **Conflict Resolution**: Automatic detection and resolution of editing conflicts
- **Persistent State**: Schema and collaboration state survive page reloads

### Enterprise Features
- **Role-based Access**: Owner, Editor, and Viewer permissions
- **Team Management**: Add/remove collaborators with instant permission updates
- **MongoDB Integration**: Persistent workspace and collaboration data
- **WebSocket Communication**: Real-time messaging for collaboration
- **Security**: JWT authentication and secure workspace access

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Flow** for visual diagram editing
- **Monaco Editor** for SQL editing with syntax highlighting
- **Framer Motion** for animations
- **Socket.io Client** for real-time communication

### Backend Stack
- **Node.js** with Express
- **MongoDB** with Mongoose for data persistence
- **Socket.io** for real-time collaboration
- **JWT** for authentication
- **bcrypt** for password hashing

### Key Components

#### Database Context (`src/context/DatabaseContext.tsx`)
- Centralized schema state management
- Validation engine with real-time error checking
- SQL generation for multiple database formats
- Import/export functionality

#### Collaboration Service (`src/services/collaborationService.ts`)
- WebSocket connection management
- Real-time event broadcasting
- User presence and cursor tracking
- Conflict detection and resolution

#### Advanced Tools
- **AdvancedRelationshipBuilder**: Visual FK creation with validation
- **EnhancedAlterTableEditor**: Comprehensive table modification UI
- **LiveSQLEditor**: Real-time SQL editing with schema updates
- **RealTimeCollaborationCanvas**: Multi-user visual editing

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- MongoDB 4.4+
- npm or yarn

### Environment Variables
Create a `.env` file in the root directory:

```env
# Database
MONGO_URL=mongodb://localhost:27017/database_designer

# Authentication
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# Email (for user verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Server
SERVER_PORT=5000
FRONTEND_ORIGIN=http://localhost:5173

# WebSocket (optional, defaults to same as server)
WS_URL=ws://localhost:5000
```

### Installation Steps

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd database-designer
npm install
```

2. **Start MongoDB**
```bash
# Using MongoDB service
sudo systemctl start mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

3. **Start the Development Server**
```bash
# Start both backend and frontend
npm run dev

# Or start separately
npm run server  # Backend on port 5000
npm run client  # Frontend on port 5173
```

4. **Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## 🔧 Configuration

### Database Configuration
The application uses MongoDB for persistent storage:
- **Users**: Authentication and subscription data
- **Portfolios**: Saved database schemas
- **Workspaces**: Collaboration data and invitations
- **Members**: Workspace membership and permissions

### Real-time Collaboration Setup
WebSocket connections are established automatically when users join workspaces:
- **Authentication**: JWT tokens validate WebSocket connections
- **Room Management**: Users are grouped by workspace ID
- **Event Broadcasting**: Schema changes are broadcast to all room members
- **Presence Tracking**: User online/offline status and cursor positions

### Validation Rules
The validation engine enforces these rules:
- **Primary Keys**: Maximum one per table
- **Foreign Keys**: Must reference existing tables and columns
- **Data Types**: Must match between FK and referenced columns
- **Naming**: No SQL reserved keywords, valid identifier format
- **Circular References**: Detected and prevented
- **Unique Constraints**: No duplicates on same column

## 🧪 Testing

### Unit Tests
```bash
# Run validation tests
npm run test:validation

# Run collaboration tests  
npm run test:collaboration

# Run all tests
npm test
```

### Integration Tests
```bash
# Test real-time collaboration
npm run test:integration

# Test WebSocket connections
npm run test:websocket
```

### Manual Testing Scenarios

1. **Multi-user Collaboration**
   - Open multiple browser windows/tabs
   - Login as different users
   - Join the same workspace
   - Make simultaneous schema changes
   - Verify real-time synchronization

2. **Validation Testing**
   - Try creating multiple primary keys
   - Create circular foreign key references
   - Use reserved SQL keywords as column names
   - Verify error messages and prevention

3. **Export Testing**
   - Create a complex schema with relationships
   - Export to different formats (MySQL, PostgreSQL, etc.)
   - Verify filename matches project name
   - Check SQL validity in target database

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/verify-code` - Email verification

### Portfolio Endpoints
- `GET /api/portfolios` - Get user's saved schemas
- `POST /api/portfolios` - Save new schema
- `DELETE /api/portfolios/:id` - Delete schema

### Collaboration Endpoints
- `POST /api/invitations` - Create workspace invitation
- `GET /api/invitations` - Get workspace invitations
- `POST /api/invitations/validate` - Validate join code
- `POST /api/members` - Add workspace member
- `GET /api/members` - Get workspace members

### WebSocket Events
- `schema_change` - Broadcast schema modifications
- `user_selection` - Share user selections
- `cursor_move` - Track cursor positions
- `user_joined` / `user_left` - Presence updates
- `conflict_detected` - Schema conflict notifications

## 🔒 Security

### Authentication
- JWT tokens for API authentication
- Secure password hashing with bcrypt
- Email verification for new accounts
- Session management with HTTP-only cookies

### Authorization
- Role-based access control (Owner, Editor, Viewer)
- Workspace-level permissions
- Real-time permission enforcement
- Secure WebSocket authentication

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting on sensitive endpoints

## 🚀 Deployment

### Production Build
```bash
# Build frontend
npm run build

# Start production server
npm start
```

### Environment Setup
- Set `NODE_ENV=production`
- Configure production MongoDB connection
- Set secure JWT secrets
- Configure SMTP for production emails
- Set up SSL/TLS certificates

### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run validation and tests
5. Submit pull request

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Conventional commits
- Component documentation

### Testing Requirements
- Unit tests for validation logic
- Integration tests for collaboration
- E2E tests for critical workflows
- Performance tests for large schemas

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Documentation
- [API Reference](./docs/api.md)
- [Collaboration Guide](./docs/collaboration.md)
- [Deployment Guide](./docs/deployment.md)

### Community
- GitHub Issues for bug reports
- Discussions for feature requests
- Discord for real-time support

### Enterprise Support
For enterprise deployments and custom features:
- Email: enterprise@dbdesigner.com
- Priority support available
- Custom training and onboarding