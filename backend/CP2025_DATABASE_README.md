# CP2025 Database System

A comprehensive database system for the French CP2025 educational curriculum, storing all modules, exercises, and their configurations.

## 🎯 Overview

This system provides a complete database solution for the CP2025 educational platform, including:

- **10 Educational Modules** covering CP and CP-CE1 bridge levels
- **70+ Interactive Exercises** with various types (QCM, CALCUL, DRAG_DROP, etc.)
- **Complete Competence Tracking** aligned with French curriculum
- **Advanced Querying** and filtering capabilities
- **RESTful API** for easy integration
- **Statistics and Analytics** for educational insights

## 📊 Database Schema

### Core Tables

1. **cp2025_levels** - Educational levels (CP, CE1, CP-CE1, etc.)
2. **cp2025_subjects** - Subjects (Français, Mathématiques, etc.)
3. **cp2025_periods** - Academic periods (P1, P2, P1-P2, etc.)
4. **cp2025_competence_codes** - Curriculum competence codes
5. **cp2025_modules** - Educational modules with metadata
6. **cp2025_exercises** - Individual exercises with configurations
7. **cp2025_exercise_configurations** - Exercise-specific configurations

### Key Features

- **Type Safety**: PostgreSQL ENUMs for data integrity
- **JSONB Support**: Flexible metadata storage
- **Foreign Key Constraints**: Referential integrity
- **Indexes**: Optimized query performance
- **Views**: Pre-built statistics and summaries
- **Triggers**: Automatic timestamp updates

## 🚀 Quick Setup

### Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 16+ (for optional Node.js population script)
- Bash shell (for setup script)

### 1. Database Setup

```bash
# Navigate to backend directory
cd backend

# Make setup script executable
chmod +x scripts/setup-cp2025-database.sh

# Run complete setup
./scripts/setup-cp2025-database.sh
```

### 2. Environment Configuration

Create or update your `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fastrevedkids
DB_USER=postgres
DB_PASSWORD=your_password

# API Configuration
API_PORT=3000
NODE_ENV=development
```

### 3. Manual Setup (Alternative)

If you prefer manual setup:

```bash
# 1. Create database
createdb fastrevedkids

# 2. Run schema
psql -d fastrevedkids -f scripts/cp2025_database_schema.sql

# 3. Populate data
psql -d fastrevedkids -f scripts/populate_cp2025_data.sql

# 4. Optional: Run Node.js population
node scripts/populate-cp2025-database.js
```

## 📚 Educational Content

### Modules Overview

| ID | Title | Level | Subject | Period | Exercises |
|----|-------|-------|---------|--------|-----------|
| 1 | Français CP - Lecture Période 1 & 2 | CP | Français | P1-P2 | 5 |
| 2 | Mathématiques CP - Nombres et Calculs Période 1 & 2 | CP | Mathématiques | P1-P2 | 5 |
| 3 | Français CP - Graphèmes et Sons Complexes | CP | Français | P2-P3 | 5 |
| 4 | Mathématiques CP - Nombres > 60 et Mesures | CP | Mathématiques | P3-P4 | 5 |
| 5 | Français CP - Maîtrise et Automatisation | CP | Français | P4-P5 | 10 |
| 6 | Mathématiques CP - Vers la Multiplication et les Données | CP | Mathématiques | P4-P5 | 11 |
| 7 | Français CP - Logique et Raisonnement | CP | Français | P5-Synthese | 11 |
| 8 | Mathématiques CP - Stratégies de Résolution | CP | Mathématiques | P5-Synthese | 10 |
| 9 | Français - Pont vers le CE1 | CP-CE1 | Français | Synthese-CE1 | 10 |
| 10 | Mathématiques - Pont vers le CE1 | CP-CE1 | Mathématiques | Synthese-CE1 | 11 |

### Exercise Types

- **QCM**: Multiple choice questions with audio/image support
- **CALCUL**: Mathematical calculations and operations
- **DRAG_DROP**: Interactive drag and drop exercises
- **TEXT_INPUT**: Text input with keyboard support
- **LECTURE**: Reading comprehension exercises
- **GEOMETRIE**: Geometry and spatial reasoning
- **PROBLEME**: Word problems and mathematical reasoning

### Difficulty Levels

- **decouverte**: Discovery/Introduction level
- **entrainement**: Training/Practice level
- **consolidation**: Consolidation/Reinforcement level
- **approfondissement**: Deepening/Advanced level

## 🔌 API Endpoints

### Core Endpoints

```typescript
// Modules
GET    /api/cp2025/modules                    // List all modules
GET    /api/cp2025/modules/:id                // Get module by ID
GET    /api/cp2025/modules/:id/with-exercises // Get module with exercises
GET    /api/cp2025/modules/:id/progression    // Get exercise progression
POST   /api/cp2025/modules                    // Create new module
PUT    /api/cp2025/modules/:id                // Update module
DELETE /api/cp2025/modules/:id                // Delete module

// Exercises
GET    /api/cp2025/exercises                  // List all exercises
GET    /api/cp2025/exercises/:id              // Get exercise by ID
GET    /api/cp2025/exercises/search/:keyword  // Search exercises
GET    /api/cp2025/exercises/random           // Get random exercises
GET    /api/cp2025/exercises/competence/:code // Get by competence code
GET    /api/cp2025/exercises/type/:type       // Get by exercise type
GET    /api/cp2025/exercises/difficulty/:level // Get by difficulty
POST   /api/cp2025/exercises                  // Create new exercise
PUT    /api/cp2025/exercises/:id              // Update exercise
DELETE /api/cp2025/exercises/:id              // Delete exercise

// Analytics
GET    /api/cp2025/statistics                 // Database statistics
GET    /api/cp2025/competence-codes           // List competence codes
GET    /api/cp2025/export                     // Export all data
```

### Query Parameters

```typescript
// Module filtering
GET /api/cp2025/modules?niveau=CP&matiere=FRANCAIS&periode=P1-P2

// Exercise filtering
GET /api/cp2025/exercises?module_id=1&type=QCM&difficulte=decouverte

// Random exercises
GET /api/cp2025/exercises/random?limit=5&niveau=CP&matiere=MATHEMATIQUES
```

## 💻 Usage Examples

### Using the Database Service

```typescript
import { CP2025DatabaseService } from './services/cp2025-database.service';

const cp2025Service = new CP2025DatabaseService(pool);

// Get all CP modules
const cpModules = await cp2025Service.getModules({ niveau: 'CP' });

// Get exercises for a specific module
const exercises = await cp2025Service.getExercisesByModuleId(1);

// Get exercise progression
const progression = await cp2025Service.getModuleExerciseProgression(1);

// Get random exercises for practice
const randomExercises = await cp2025Service.getRandomExercises(10, {
  niveau: 'CP',
  matiere: 'FRANCAIS'
});

// Search exercises
const searchResults = await cp2025Service.searchExercises('phonème');

// Get statistics
const stats = await cp2025Service.getStatistics();
```

### Frontend Integration

```typescript
// React hook example
const useCP2025Data = () => {
  const [modules, setModules] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modulesRes, exercisesRes] = await Promise.all([
          fetch('/api/cp2025/modules'),
          fetch('/api/cp2025/exercises')
        ]);
        
        const modulesData = await modulesRes.json();
        const exercisesData = await exercisesRes.json();
        
        setModules(modulesData);
        setExercises(exercisesData);
      } catch (error) {
        console.error('Error fetching CP2025 data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { modules, exercises, loading };
};
```

## 📈 Statistics and Analytics

### Database Statistics View

The system provides comprehensive statistics through the `cp2025_statistics` view:

```sql
SELECT * FROM cp2025_statistics;
```

Returns:
- Total modules and exercises
- Breakdown by difficulty level
- Breakdown by exercise type
- Breakdown by educational level
- Breakdown by subject

### Custom Queries

```sql
-- Exercises by competence domain
SELECT 
    m.competence_domain,
    COUNT(e.id) as exercise_count
FROM cp2025_modules m
JOIN cp2025_exercises e ON m.id = e.module_id
GROUP BY m.competence_domain
ORDER BY exercise_count DESC;

-- Difficulty progression for a module
SELECT 
    e.difficulte,
    COUNT(*) as count
FROM cp2025_exercises e
WHERE e.module_id = 1
GROUP BY e.difficulte
ORDER BY 
    CASE e.difficulte
        WHEN 'decouverte' THEN 1
        WHEN 'entrainement' THEN 2
        WHEN 'consolidation' THEN 3
        WHEN 'approfondissement' THEN 4
    END;
```

## 🔧 Maintenance

### Backup and Restore

```bash
# Create backup
./scripts/setup-cp2025-database.sh backup

# Restore from backup
psql -d fastrevedkids -f backups/cp2025_backup_YYYYMMDD_HHMMSS.sql
```

### Verification

```bash
# Verify database setup
./scripts/setup-cp2025-database.sh verify

# Check specific components
./scripts/setup-cp2025-database.sh schema
./scripts/setup-cp2025-database.sh populate
```

### Data Export

```bash
# Export all data as JSON
curl http://localhost:3000/api/cp2025/export > cp2025_export.json
```

## 🛠️ Development

### Adding New Modules

```sql
INSERT INTO cp2025_modules (
    titre, description, niveau, matiere, periode, ordre, competence_domain, metadata
) VALUES (
    'Nouveau Module',
    'Description du nouveau module',
    'CP',
    'FRANCAIS',
    'P1-P2',
    11,
    'CP.FR.L1.1',
    '{"competenceDomain": "CP.FR.L1", "cp2025": true}'
);
```

### Adding New Exercises

```sql
INSERT INTO cp2025_exercises (
    titre, consigne, type, difficulte, module_id, competence_code, metadata
) VALUES (
    'Nouvel Exercice',
    'Consigne de l''exercice',
    'QCM',
    'decouverte',
    1,
    'CP.FR.L1.1',
    '{"competenceCode": "CP.FR.L1.1"}'
);
```

### Schema Migrations

For schema changes, create migration files:

```sql
-- migrations/001_add_new_field.sql
ALTER TABLE cp2025_exercises ADD COLUMN new_field VARCHAR(100);
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection Error**: Check PostgreSQL is running and credentials are correct
2. **Permission Error**: Ensure database user has proper permissions
3. **Schema Error**: Verify PostgreSQL version compatibility (12+)
4. **Data Import Error**: Check SQL syntax and foreign key constraints

### Debug Commands

```bash
# Check database connection
psql -h localhost -U postgres -d fastrevedkids -c "SELECT version();"

# Check table structure
psql -h localhost -U postgres -d fastrevedkids -c "\d cp2025_modules"

# Check data count
psql -h localhost -U postgres -d fastrevedkids -c "SELECT COUNT(*) FROM cp2025_exercises;"

# Check for errors in logs
tail -f logs/application.log
```

## 📝 License

This CP2025 database system is part of the FastRevEdKids educational platform.

## 🤝 Contributing

To contribute to the CP2025 database system:

1. Follow the existing schema patterns
2. Add appropriate competence codes
3. Include comprehensive metadata
4. Test with the verification script
5. Update documentation

## 📞 Support

For support with the CP2025 database system:

- Check the troubleshooting section
- Review the API documentation
- Test with the verification script
- Check the logs for detailed error messages 