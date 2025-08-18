# FastRevedKids API Documentation

This directory contains the comprehensive OpenAPI/Swagger documentation for the FastRevedKids educational platform API.

## Generated Documentation

The documentation is automatically generated from the existing route schemas and includes:

### 📚 API Documentation Files

1. **`openapi.json`** - Complete OpenAPI 3.0 specification
2. **`routes-summary.json`** - Organized route summaries by category
3. **`authentication-guide.md`** - Detailed authentication documentation
4. **`error-codes.json`** - Complete error codes reference
5. **`api-reference.md`** - Comprehensive markdown API reference
6. **`FastRevedKids-API.postman_collection.json`** - Postman collection for testing

### 🌐 Live Documentation

Access the interactive Swagger UI at:
- **Development**: http://localhost:3003/docs
- **JSON Spec**: http://localhost:3003/docs/json
- **YAML Spec**: http://localhost:3003/docs/yaml
- **API Info**: http://localhost:3003/docs/info

## 🚀 Features

### Complete API Coverage
- ✅ **Authentication** - JWT-based authentication with refresh tokens
- ✅ **Students** - Profile management, progress tracking, recommendations
- ✅ **Exercises** - CP 2025 curriculum-aligned exercise system
- ✅ **Upload** - File upload with processing and metadata
- ✅ **Health** - System monitoring and health checks

### Comprehensive Documentation
- ✅ **Request/Response Examples** - Real-world examples for all endpoints
- ✅ **Error Codes** - Complete error response documentation
- ✅ **Authentication Guide** - JWT implementation details
- ✅ **Security Schemes** - Bearer tokens and CSRF protection
- ✅ **Validation Schemas** - Input validation with Zod schemas

### Developer Experience
- ✅ **Interactive Testing** - Try endpoints directly in Swagger UI
- ✅ **Postman Integration** - Ready-to-use Postman collection
- ✅ **Auto-generated** - Documentation stays in sync with code
- ✅ **Multiple Formats** - JSON, YAML, and Markdown outputs

## 📖 Usage

### For Developers

1. **Interactive Testing**: Use the Swagger UI at `/docs`
2. **API Reference**: Check `api-reference.md` for detailed documentation
3. **Error Handling**: Reference `error-codes.json` for error responses
4. **Authentication**: Follow the guide in `authentication-guide.md`

### For API Consumers

1. **Import Postman Collection**: Use `FastRevedKids-API.postman_collection.json`
2. **OpenAPI Spec**: Import `openapi.json` into your API client
3. **Code Generation**: Use the OpenAPI spec to generate client SDKs

## 🔧 Generation

The documentation is generated using the `APIDocumentationGenerator` utility:

```typescript
import { APIDocumentationGenerator } from '../utils/api-documentation-generator';

const generator = new APIDocumentationGenerator(fastify, './docs/api');
await generator.generateDocumentation();
await generator.generatePostmanCollection();
```

## 📋 Schema Coverage

### Authentication Endpoints
- `POST /auth/login` - Student authentication
- `POST /auth/logout` - Session termination  
- `POST /auth/refresh` - Token refresh
- `GET /auth/verify/:studentId` - Student verification

### Student Management
- `GET /students` - List students
- `GET /students/profile` - Get authenticated student profile
- `PUT /students/profile` - Update student profile
- `GET /students/progress` - Progress tracking
- `GET /students/sessions` - Session analytics

### Exercise System
- `GET /exercises` - List exercises with filtering
- `GET /exercises/:id` - Get exercise details
- `POST /exercises/attempt` - Submit exercise attempt
- `GET /exercises/recommendations` - Get personalized recommendations

### File Upload
- `POST /upload/upload` - Upload files with processing
- `GET /upload/files/:id` - Get file information
- `GET /upload/files` - List user files
- `POST /upload/images/:id/process` - Process images

### System Health
- `GET /health` - System health check
- `GET /upload/storage/stats` - Storage statistics

## 🔒 Security

The API implements comprehensive security measures:

- **JWT Authentication** - Secure token-based authentication
- **CSRF Protection** - Cross-site request forgery protection  
- **Rate Limiting** - Multi-layered request limiting
- **Input Validation** - Zod schema validation
- **Error Sanitization** - Safe error responses

## 📚 Educational Focus

Designed specifically for French primary education (CP 2025 curriculum):

- **Curriculum Alignment** - Exercises mapped to official competencies
- **Adaptive Learning** - Personalized difficulty adjustment
- **Progress Tracking** - Detailed learning analytics
- **Accessibility** - Support for diverse learning needs

---

Generated automatically by the FastRevedKids OpenAPI Documentation System