# API Documentation

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Request Body:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "viewer" // optional, defaults to viewer
}
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "viewer",
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

### Login User
**POST** `/auth/login`

Request Body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "viewer",
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "token": "jwt-token"
}
```

### Logout
**POST** `/auth/logout`

Headers:
```
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "message": "Logged out successfully"
}
```

## User Management Endpoints (Admin Only)

### Create User
**POST** `/users`

Headers:
```
Authorization: Bearer <admin-jwt-token>
```

Request Body:
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "New",
  "lastName": "User",
  "role": "editor"
}
```

### Get All Users
**GET** `/users`

Headers:
```
Authorization: Bearer <admin-jwt-token>
```

Response:
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "viewer",
    "isActive": true,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### Get User by ID
**GET** `/users/{id}`

Headers:
```
Authorization: Bearer <admin-jwt-token>
```

### Update User
**PATCH** `/users/{id}`

Headers:
```
Authorization: Bearer <admin-jwt-token>
```

Request Body:
```json
{
  "firstName": "Updated",
  "role": "editor",
  "isActive": false
}
```

### Delete User
**DELETE** `/users/{id}`

Headers:
```
Authorization: Bearer <admin-jwt-token>
```

Response: `204 No Content`

## Document Management Endpoints

### Upload Document
**POST** `/documents`

Headers:
```
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

Form Data:
```
title: "Document Title"
description: "Document Description" (optional)
file: <file-upload>
```

Response:
```json
{
  "id": "uuid",
  "title": "Document Title",
  "description": "Document Description",
  "fileName": "document.pdf",
  "filePath": "/uploads/documents/uuid.pdf",
  "mimeType": "application/pdf",
  "size": 1024,
  "status": "pending",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z",
  "createdBy": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Get Documents
**GET** `/documents`

Headers:
```
Authorization: Bearer <jwt-token>
```

Query Parameters:
- `search`: Search in title/description
- `status`: Filter by status (pending, processing, completed, failed)
- `createdBy`: Filter by user ID (admin only)
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: ASC or DESC (default: DESC)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

Response:
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "Document Title",
      "description": "Document Description",
      "fileName": "document.pdf",
      "status": "pending",
      "createdAt": "2023-01-01T00:00:00.000Z",
      "createdBy": {
        "id": "uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "total": 1
}
```

### Get Document by ID
**GET** `/documents/{id}`

Headers:
```
Authorization: Bearer <jwt-token>
```

### Update Document
**PATCH** `/documents/{id}`

Headers:
```
Authorization: Bearer <jwt-token>
```

Request Body:
```json
{
  "title": "Updated Title",
  "description": "Updated Description",
  "status": "completed"
}
```

### Delete Document
**DELETE** `/documents/{id}`

Headers:
```
Authorization: Bearer <jwt-token>
```

Response: `204 No Content`


## Ingestion Management Endpoints

### Create Ingestion Process
**POST** `/ingestion`

Headers:
```
Authorization: Bearer <jwt-token>
```

Request Body:
```json
{
  "documentId": "uuid",
  "configuration": {
    "extractText": true,
    "generateSummary": false
  }
}
```

Response:
```json
{
  "id": "uuid",
  "status": "pending",
  "configuration": {
    "extractText": true,
    "generateSummary": false
  },
  "createdAt": "2023-01-01T00:00:00.000Z",
  "document": {
    "id": "uuid",
    "title": "Document Title"
  }
}
```

### Get Ingestion Processes
**GET** `/ingestion`

Headers:
```
Authorization: Bearer <jwt-token>
```

Query Parameters:
- `documentId`: Filter by document ID
- `status`: Filter by status (pending, running, completed, failed)
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: ASC or DESC (default: DESC)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

Response:
```json
{
  "processes": [
    {
      "id": "uuid",
      "status": "completed",
      "result": {
        "extractedText": "Document content...",
        "processedAt": "2023-01-01T00:00:00.000Z"
      },
      "startedAt": "2023-01-01T00:00:00.000Z",
      "completedAt": "2023-01-01T00:00:00.000Z",
      "document": {
        "id": "uuid",
        "title": "Document Title"
      }
    }
  ],
  "total": 1
}
```

### Get Ingestion Status
**GET** `/ingestion/status/{id}`

Headers:
```
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "id": "uuid",
  "status": "running",
  "startedAt": "2023-01-01T00:00:00.000Z",
  "document": {
    "id": "uuid",
    "title": "Document Title"
  }
}
```

### Cancel Ingestion Process
**POST** `/ingestion/{id}/cancel`

Headers:
```
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "id": "uuid",
  "status": "failed",
  "errorMessage": "Process cancelled by user",
  "completedAt": "2023-01-01T00:00:00.000Z"
}
```


## Error Responses

All endpoints return standard HTTP status codes and error messages:

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You do not have access of this resource",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```
