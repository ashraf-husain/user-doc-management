# User Document Management System

A NestJS backend application for user authentication and document management with ingestion.

## Features

### Authentication & Authorization
- **JWT-based authentication** with role-based access control
- **User roles**: Admin, Editor, Viewer
- **Registration and login** endpoints

### User Management
- **Admin-only user management** APIs
- **User CRUD operations**
- **Role assignment and permissions**

### Document Management
- **File upload** with validation
- **Document CRUD operations** with role-based permissions
- **Document search and filtering**
- **File download** functionality
- **Document status tracking**

### Ingestion Management
- **Trigger ingestion processes** for documents
- **Track ingestion status** and progress
- **Process cancellation** capabilities
- **Error handling and logging**

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport.js
- **File Upload**: Multer
- **Validation**: class-validator
- **Testing**: Jest
- **Language**: TypeScript

## Installation

### Option 1: Docker Deployment (Recommended)

1. **Prerequisites**
   - Docker Engine 20.10+
   - Docker Compose 2.0+

2. **Quick Start**
   ```
   git clone <repository-url>
   cd user-doc-management
   ```

3. **Set Environment Variables**
   - Copy .env.example to .env file and set required values.
   
   ``` cp .env.example .env ```

4. **Start App**
   ``` docker compose up --build ```

5. **Access Application**
   - Application: http://localhost:3000


## Seeding Data

Create initial users for testing:

```
npm run seed
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- Editor user: `editor@example.com` / `editor123`
- Viewer user: `viewer@example.com` / `viewer123`


## Security Features

- **Password hashing** with bcrypt
- **JWT token expiration** (24 hours)
- **Role-based access control**
- **Input validation** with class-validator
- **File type validation**
- **Request size limits**


### Project Structure
```
src/
├── auth/           # Authentication logic
├── users/          # User management
├── documents/      # Document management
├── ingestion/      # Ingestion processes
├── entities/       # Database entities
├── dto/            # Data Transfer Objects
├── config/         # Configuration files
└── main.ts         # Application entry point
```