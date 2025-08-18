# CP 2025 Exercise Generation System

## Overview

This system automatically generates educational exercises based on the French CP 2025 competence framework. It maps competence codes (e.g., `CP.FR.L1.1`) to specific exercise types, configurations, and difficulty levels.

## Features

- ✅ **CP 2025 Compliance**: Full mapping to official competence codes
- ✅ **Automatic Exercise Generation**: Creates exercises from competence codes
- ✅ **Multiple Exercise Types**: QCM, CALCUL, DRAG_DROP, LECTURE, etc.
- ✅ **Difficulty Progression**: Découverte → Entraînement → Consolidation → Approfondissement
- ✅ **Bulk Generation**: Create multiple exercises at once
- ✅ **CLI Tools**: Command-line interface for exercise generation
- ✅ **API Endpoints**: RESTful API for exercise management
- ✅ **Validation**: Competence code format validation
- ✅ **Testing**: Comprehensive test suite

## Competence Code Format

Competence codes follow the format: `[NIVEAU].[MATIERE].[DOMAINE][NUMERO].[COMPETENCE]`

### Examples:
- `CP.FR.L1.1` - CP Français Lecture Période 1 Compétence 1
- `CP.MA.N1.2` - CP Mathématiques Nombres Période 1 Compétence 2
- `CE1.FR.E2.3` - CE1 Français Écriture Période 2 Compétence 3

### Supported Levels:
- `CP` - Cours Préparatoire
- `CE1` - Cours Élémentaire 1
- `CE2` - Cours Élémentaire 2
- `CM1` - Cours Moyen 1
- `CM2` - Cours Moyen 2

### Supported Subjects:
- `FR` - Français
- `MA` - Mathématiques

## Exercise Types

### Français - Lecture
- **QCM**: Correspondances Graphème-Phonème
- **DRAG_DROP**: Syllabation et segmentation
- **LECTURE**: Fluence et compréhension

### Français - Écriture
- **TEXTE_LIBRE**: Calligraphie, orthographe, production

### Français - Compréhension
- **QCM**: Questions de compréhension

### Mathématiques - Nombres
- **CALCUL**: Nombres et calculs mentaux

### Mathématiques - Problèmes
- **PROBLEME**: Résolution de problèmes

### Mathématiques - Géométrie
- **GEOMETRIE**: Formes et constructions

## API Endpoints

### Create Module
```http
POST /api/exercises/modules
Content-Type: application/json
Authorization: Bearer <token>

{
  "titre": "Lecture CP - Période 1",
  "description": "Apprentissage des correspondances graphème-phonème",
  "niveau": "CP",
  "matiere": "FRANCAIS",
  "periode": "P1",
  "competenceCode": "CP.FR.L1.1"
}
```

### Create Exercise
```http
POST /api/exercises
Content-Type: application/json
Authorization: Bearer <token>

{
  "titre": "Reconnaissance du son [a]",
  "consigne": "Écoute le mot et choisis le son que tu entends",
  "type": "QCM",
  "difficulte": "decouverte",
  "moduleId": 1,
  "competenceCode": "CP.FR.L1.1",
  "configuration": {
    "question": "Quel son entends-tu dans 'CHAT' ?",
    "choix": ["CH", "CA", "AT", "HA"],
    "bonneReponse": "CH",
    "audioRequired": true
  }
}
```

### Bulk Generate Exercises
```http
POST /api/exercises/bulk-generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "competenceCodes": ["CP.FR.L1.1", "CP.FR.L1.2", "CP.FR.L1.3"],
  "moduleId": 1,
  "baseConfiguration": {
    "audioRequired": true,
    "hints": true
  },
  "generateVariations": true
}
```

### Get Exercises by Competence
```http
GET /api/exercises/by-competence/CP.FR.L1.1?limit=10&difficulte=decouverte
```

## CLI Usage

### Generate Exercises for Specific Competences
```bash
# Generate CP French Reading Period 1 exercises
npm run generate-exercises --niveau CP --matiere FRANCAIS --periode 1 --verbose

# Generate CP Math exercises
npm run generate-exercises --niveau CP --matiere MATHEMATIQUES --verbose

# Dry run to see what would be created
npm run generate-exercises --niveau CP --matiere FRANCAIS --dry-run
```

### Seed Sample Data
```bash
# Seed CP 2025 exercises
npm run seed-cp2025
```

### Validate Competences
```bash
# Validate competence codes
npm run validate-competences
```

## Configuration Examples

### QCM Exercise (Lecture)
```json
{
  "type": "QCM",
  "configuration": {
    "question": "Quel son entends-tu dans ce mot ?",
    "choix": ["A", "P", "PA", "AP"],
    "bonneReponse": "A",
    "targetSound": "a",
    "audioRequired": true
  }
}
```

### DRAG_DROP Exercise (Syllabation)
```json
{
  "type": "DRAG_DROP",
  "configuration": {
    "question": "Forme la syllabe 'MA'",
    "dragItems": [
      {"id": "sound-m", "content": "M", "category": "consonnes"},
      {"id": "sound-a", "content": "A", "category": "voyelles"}
    ],
    "zones": [
      {"id": "syllabe-zone", "label": "Glisse les sons ici", "accepts": ["consonnes", "voyelles"]}
    ],
    "solution": ["M", "A"]
  }
}
```

### CALCUL Exercise (Math)
```json
{
  "type": "CALCUL",
  "configuration": {
    "question": "Combien font 2 + 3 ?",
    "operation": "2 + 3",
    "operandes": [2, 3],
    "resultat": 5,
    "aide": "Tu peux compter sur tes doigts"
  }
}
```

## Database Schema

### Modules Table
```sql
CREATE TABLE modules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  titre VARCHAR(200) NOT NULL,
  description TEXT,
  niveau ENUM('CP', 'CE1', 'CE2', 'CM1', 'CM2') NOT NULL,
  matiere ENUM('FRANCAIS', 'MATHEMATIQUES', 'SCIENCES', 'HISTOIRE_GEOGRAPHIE', 'ANGLAIS') NOT NULL,
  periode ENUM('P1', 'P2', 'P3', 'P4', 'P5') NOT NULL,
  ordre INT NOT NULL DEFAULT 1,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Exercises Table
```sql
CREATE TABLE exercises (
  id INT PRIMARY KEY AUTO_INCREMENT,
  titre VARCHAR(300) NOT NULL,
  consigne TEXT NOT NULL,
  type ENUM('QCM', 'CALCUL', 'TEXTE_LIBRE', 'DRAG_DROP', 'CONJUGAISON', 'LECTURE', 'GEOMETRIE', 'PROBLEME') NOT NULL,
  difficulte ENUM('decouverte', 'entrainement', 'consolidation', 'approfondissement') NOT NULL,
  module_id INT NOT NULL,
  configuration JSON NOT NULL,
  points_reussite INT DEFAULT 10,
  duree_estimee INT DEFAULT 5,
  ordre INT DEFAULT 1,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);
```

## Testing

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- exercises.test.ts
```

### Test Examples
```typescript
// Test competence validation
expect(CP2025Service.validateCompetenceCode('CP.FR.L1.1')).toBe(true);
expect(CP2025Service.validateCompetenceCode('INVALID.CODE')).toBe(false);

// Test exercise generation
const template = CP2025Service.generateExerciseTemplate('CP.FR.L1.1');
expect(template).toBeDefined();
expect(template.type).toBe('QCM');
```

## Deployment

### Environment Variables
```bash
# Database
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name

# Redis (for caching)
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-jwt-secret

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
```

### Docker Deployment
```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## Troubleshooting

### Common Issues

1. **Competence Code Validation Error**
   - Ensure code follows format: `CP.FR.L1.1`
   - Check that competence exists in reference

2. **Module Not Found Error**
   - Create module before creating exercises
   - Verify module ID exists

3. **Configuration Validation Error**
   - Ensure configuration matches exercise type
   - Check required fields for each type

### Debug Mode
```bash
# Enable verbose logging
DEBUG=* npm run dev

# Test specific competence
npm run generate-exercises --niveau CP --matiere FRANCAIS --periode 1 --verbose
```

## Contributing

### Adding New Competences
1. Add competence to `src/data/cp2025-competences.ts`
2. Update exercise generation logic in `CP2025Service`
3. Add tests for new competence
4. Update documentation

### Adding New Exercise Types
1. Add type to database schema
2. Update validation schemas
3. Add generation logic in `CP2025Service`
4. Create test exercises
5. Update API documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details. 