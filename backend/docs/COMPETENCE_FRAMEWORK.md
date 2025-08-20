# Competence Framework Integration

## Overview

The Competence Framework Integration provides a unified system for managing educational competencies across different grade levels (CP and CE2) in the French educational system. It combines the CP 2025 curriculum with the CE2 2026-2027 framework to create a comprehensive adaptive learning system.

## Architecture

### Core Components

1. **CompetenceFrameworkService** - Main service orchestrating competence management
2. **CP 2025 Competences** - Base curriculum for CP level
3. **CE2 2026 Competences** - Advanced framework for CE2 level
4. **Database Integration** - Prerequisites and progress tracking
5. **API Endpoints** - RESTful interface for frontend integration

### Data Structure

#### Unified Competence Data
```typescript
interface UnifiedCompetenceData {
  code: string;                    // Unique competence identifier
  titre: string;                   // Competence title
  description: string;             // Detailed description
  niveau: 'CP' | 'CE1' | 'CE2';   // Grade level
  domaine: string;                 // Subject area (francais/mathematiques)
  sousDomaine: string;             // Sub-category
  prerequis: string[];             // Prerequisite competence codes
  prerequis_details?: string[];    // Detailed prerequisite descriptions
  saut_qualitatif?: string;        // Major qualitative leap description
  nouveaute?: string;              // New concept introduction
  evaluation: string;              // Assessment criteria
  donnees_chiffrees?: Record<string, any>; // Quantitative objectives
  periode?: string;                // Teaching period (CP only)
  objectifs?: string[];            // Learning objectives (CP only)
}
```

## Competence Levels

### CP (Cours Préparatoire) - 2025 Curriculum

**French (Français)**
- **L1**: Graphème-Phonème Correspondence (5 competences)
- **L2**: Syllabation (3 competences)
- **L3**: Fluence (3 competences)
- **E1**: Writing Skills (2 competences)
- **E2**: Text Production (2 competences)
- **C1**: Comprehension (3 competences)

**Mathematics (Mathématiques)**
- **N1**: Numbers (4 competences)
- **N3**: Mental Calculation (3 competences)
- **P1**: Problem Solving (3 competences)
- **G1**: Geometry (3 competences)
- **M1**: Measurements (3 competences)

### CE2 (Cours Élémentaire 2) - 2026-2027 Framework

**French (Français)**
- **Oral**: Listening and Speaking (3 competences)
- **Lecture**: Reading and Fluency (3 competences)
- **Ecriture**: Writing (2 competences)
- **Vocabulaire**: Vocabulary (3 competences)
- **Grammaire**: Grammar (3 competences)
- **Orthographe**: Spelling (2 competences)

**Mathematics (Mathématiques)**
- **Nombres**: Numbers and Fractions (4 competences)
- **Calcul**: Calculation and Operations (2 competences)
- **Problemes**: Problem Solving (2 competences)
- **Grandeurs_Mesures**: Measurements (3 competences)
- **Espace_Geometrie**: Geometry (4 competences)
- **Organisation_Donnees**: Data Organization (2 competences)

## Key Features

### 1. Prerequisite Management

The system tracks prerequisite relationships between competences:

```typescript
// Example: CE2.FR.L.1.1 requires CE1.FR.O1.1 and CE1.FR.O1.2
{
  competenceCode: "CE2.FR.L.1.1",
  prerequisiteCode: "CE1.FR.O1.1",
  weight: 1.0,
  description: "Prérequis CE1 pour CE2.FR.L.1.1"
}
```

### 2. Qualitative Leaps

CE2 introduces major qualitative leaps that require special attention:

- **Fluence**: 70 → 90 words/minute
- **Writing**: 3-5 lines → 10 lines
- **Numbers**: 1000 → 10,000
- **Fractions**: Introduction of decimal notation
- **Symmetry**: New geometric concept

### 3. Adaptive Learning Paths

The system generates personalized learning paths based on:

- Student progress on prerequisites
- Performance on current competences
- Qualitative leap requirements
- Review needs

### 4. Blocking Detection

Students are blocked from advanced competences until prerequisites are mastered:

```typescript
{
  isBlocked: true,
  blockingPrerequisites: ["CE1.FR.O1.1", "CE1.FR.O1.2"],
  missingPrerequisites: ["CE1.FR.O1.1", "CE1.FR.O1.2"]
}
```

## API Endpoints

### Competence Management

```
GET /api/framework/competences/{niveau}
GET /api/framework/competences/{niveau}/domain/{domaine}
GET /api/framework/competences/code/{code}
GET /api/framework/competences/{code}/prerequisites
GET /api/framework/competences/{niveau}/leaps
GET /api/framework/competences/{niveau}/stats
```

### Student Progress

```
GET /api/framework/students/{studentId}/blocked/{competenceCode}
GET /api/framework/students/{studentId}/recommendations/{niveau}
GET /api/framework/students/{studentId}/learning-path/{niveau}
```

## Usage Examples

### 1. Get All CP Competences

```typescript
const cpCompetences = CompetenceFrameworkService.getCompetencesByLevel('CP');
console.log(`Found ${cpCompetences.length} CP competences`);
```

### 2. Check Student Blocking

```typescript
const blocked = await CompetenceFrameworkService.isBlocked(studentId, 'CE2.FR.L.1.1');
if (blocked.isBlocked) {
  console.log(`Student needs to master: ${blocked.missingPrerequisites.join(', ')}`);
}
```

### 3. Get Learning Recommendations

```typescript
const recommendations = await CompetenceFrameworkService.getRecommendations(studentId, 'CE2');
const highPriority = recommendations.filter(r => r.priority === 'high');
console.log(`High priority recommendations: ${highPriority.length}`);
```

### 4. Generate Learning Path

```typescript
const learningPath = await CompetenceFrameworkService.getLearningPath(studentId, 'CE2');
console.log(`Overall progress: ${learningPath.summary.overallProgress}%`);
console.log(`Mastered: ${learningPath.summary.mastered}/${learningPath.summary.totalCompetences}`);
```

## Integration with Adaptive Learning

### MasteryService Integration

The CompetenceFrameworkService integrates with the existing MasteryService:

```typescript
// When updating mastery, check for blocking
const blocked = await CompetenceFrameworkService.isBlocked(studentId, competenceCode);
if (blocked.isBlocked) {
  // Provide remediation suggestions
  const remediation = await PrerequisiteService.getRemediation(studentId, competenceCode);
}
```

### SuperMemo Integration

Spaced repetition cards are created for competences that need review:

```typescript
// Create review card for competence
const card = await ReviewQueueRepo.createCard({ studentId, competenceCode });
const smResult = SuperMemoService.calculateNextReview(card, quality);
```

## Database Schema

### competencePrerequisites Table

```sql
CREATE TABLE competence_prerequisites (
  id INT PRIMARY KEY AUTO_INCREMENT,
  competence_code VARCHAR(20) NOT NULL,
  prerequisite_code VARCHAR(20) NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.00,
  description TEXT
);
```

### studentProgress Table

```sql
CREATE TABLE student_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  student_id INT NOT NULL,
  competence_code VARCHAR(20) NOT NULL,
  progress_percent DECIMAL(5,2) DEFAULT 0.00,
  mastery_level ENUM('not_started', 'in_progress', 'mastered'),
  total_attempts INT DEFAULT 0,
  successful_attempts INT DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0.00,
  needs_review BOOLEAN DEFAULT FALSE,
  last_attempt_at TIMESTAMP NULL,
  mastered_at TIMESTAMP NULL
);
```

## Testing

Comprehensive test coverage includes:

- Competence retrieval by level and domain
- Prerequisite validation
- Blocking detection
- Recommendation generation
- Learning path creation
- Database integration

Run tests with:
```bash
npm test competence-framework.test.ts
```

## Future Enhancements

1. **CE1 Framework Integration** - Add CE1 competences for complete cycle coverage
2. **Advanced Analytics** - Learning pattern analysis and predictive modeling
3. **Competence Clustering** - Group related competences for targeted intervention
4. **Performance Benchmarking** - Compare student progress against national standards
5. **Adaptive Difficulty** - Dynamic exercise difficulty based on competence mastery

## Configuration

The framework supports configuration through environment variables:

```env
# Competence framework settings
COMPETENCE_FRAMEWORK_VERSION=2026-2027
ENABLE_QUALITATIVE_LEAPS=true
PREREQUISITE_WEIGHTING=1.0
REVIEW_THRESHOLD=0.8
```

## Monitoring and Analytics

The system provides comprehensive monitoring:

- Competence mastery rates
- Prerequisite blocking frequency
- Qualitative leap success rates
- Learning path efficiency
- Review recommendation accuracy

Access analytics through the monitoring endpoints or dashboard interface.
