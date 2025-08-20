# Unified Educational System Documentation

## Overview

The Unified Educational System provides a comprehensive framework for managing educational content across CP, CE1, and CE2 levels. This system replaces the previous CP2025-specific implementation with a flexible, scalable architecture that supports all three levels seamlessly.

## Architecture

### File Structure
```
src/
├── types/
│   └── educational.types.ts          # Unified type definitions
├── services/
│   └── educational.service.ts        # Core business logic
├── hooks/
│   └── useEducationalData.tsx        # React hooks for data consumption
├── utils/
│   └── educationalDataLoader.ts      # Data loading and validation
└── components/
    ├── EducationalDemo.tsx           # Interactive demo component
    └── EDUCATIONAL_SYSTEM_README.md  # This documentation
```

### Main Components

1. **EducationalService**: Central service for data management
2. **useEducationalData**: React hook for reactive data access
3. **EducationalDataLoader**: Utility for loading and validating data
4. **EducationalDemo**: Interactive demonstration component

## Data Types

### Core Types
- `EducationalLevel`: 'CP' | 'CE1' | 'CE2'
- `Subject`: 'FRANCAIS' | 'MATHEMATIQUES' | 'SCIENCES' | 'HISTOIRE_GEOGRAPHIE' | 'ANGLAIS'
- `ExerciseType`: 'QCM' | 'CALCUL' | 'DRAG_DROP' | 'TEXT_INPUT' | 'LECTURE' | 'GEOMETRIE' | 'PROBLEME' | 'CONJUGAISON' | 'VOCABULAIRE'
- `Difficulty`: 'decouverte' | 'entrainement' | 'consolidation' | 'approfondissement'

### Level-Specific Interfaces
- `CPModule`, `CE1Module`, `CE2Module`
- `CPExercise`, `CE1Exercise`, `CE2Exercise`
- `CPCompetence`, `CE1Competence`, `CE2Competence`

## Usage Examples

### 1. Basic Hook Usage

```typescript
import { useEducationalData } from '../hooks/useEducationalData';

function MyComponent() {
  const { data, isLoading, error, service } = useEducationalData({
    initialData: myEducationalData
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const cpModules = service.getModulesByLevel('CP');
  const mathExercises = service.getExercisesByFilter({ subject: 'MATHEMATIQUES' });
  
  return (
    <div>
      <h2>CP Modules: {cpModules.length}</h2>
      <h2>Math Exercises: {mathExercises.length}</h2>
    </div>
  );
}
```

### 2. Specialized Hooks

```typescript
import { useCPData, useCE1Data, useCE2Data } from '../hooks/useEducationalData';

function LevelSpecificComponent() {
  const cpData = useCPData({ initialData });
  const ce1Data = useCE1Data({ initialData });
  const ce2Data = useCE2Data({ initialData });

  return (
    <div>
      <h3>CP: {cpData.modules.length} modules</h3>
      <h3>CE1: {ce1Data.modules.length} modules</h3>
      <h3>CE2: {ce2Data.modules.length} modules</h3>
    </div>
  );
}
```

### 3. Educational Service Direct Usage

```typescript
import { EducationalService } from '../services/educational.service';

const service = new EducationalService(educationalData);

// Get modules by level and subject
const cpFrenchModules = service.getModulesByLevelAndSubject('CP', 'FRANCAIS');

// Get exercises by competence
const competenceExercises = service.getExercisesByCompetenceCode('CP.FR.L1.1');

// Get statistics
const stats = service.getStatistics();
console.log(`Total exercises: ${stats.totalExercises}`);
```

### 4. Data Loading and Validation

```typescript
import { EducationalDataLoader } from '../utils/educationalDataLoader';

const loader = new EducationalDataLoader();

// Load from API
const apiData = await loader.loadData({
  source: 'api',
  url: '/api/educational-data'
});

// Load from local file
const fileData = await loader.loadData({
  source: 'file',
  path: './data/educational-content.json'
});

// Validate data
const isValid = loader.validateEducationalData(apiData);
```

## Integration with Existing CP2025 Data

### Migration from Old CP2025 Format

The system includes a built-in integration method to transform existing CP2025 data into the new unified format:

```typescript
import { EducationalService } from '../services/educational.service';

// Old CP2025 data structure
const oldCP2025Data = {
  modules: [
    {
      id: 1,
      titre: "Français CP - Lecture Période 1 & 2",
      description: "Apprentissage des correspondances graphème-phonème...",
      niveau: "CP",
      matiere: "FRANCAIS",
      periode: "P1-P2",
      ordre: 1,
      metadata: {
        competenceDomain: "CP.FR.L1",
        cp2025: true
      }
    }
  ],
  exercises: [
    {
      titre: "Reconnaissance du son [o]",
      consigne: "Clique sur l'image qui contient le son [o]",
      type: "QCM",
      difficulte: "decouverte",
      moduleId: 1,
      configuration: {
        question: "Où entends-tu le son [o] ?",
        choix: ["moto", "papa", "mama", "nana"],
        bonneReponse: "moto"
      },
      metadata: {
        competenceCode: "CP.FR.L1.1"
      }
    }
  ],
  competences: {
    "CP.FR.L1.1": {
      titre: "Maîtriser les 15 CGP de la Période 1",
      description: "Correspondances Graphème-Phonème de base...",
      periode: "P1",
      domaine: "LECTURE",
      seuil_maitrise: 90,
      prerequis: [],
      objectifs: ["Reconnaître voyelles a,e,i,o,u"],
      exemples: ["papa", "mama", "moto", "nana"]
    }
  }
};

// Transform to unified format
const unifiedData = EducationalService.integrateCP2025Data(oldCP2025Data);

// Use with the educational system
const service = new EducationalService(unifiedData);
const cpModules = service.getModulesByLevel('CP');
const cpExercises = service.getExercisesByLevel('CP');
const cpCompetences = service.getCompetencesByLevel('CP');

console.log(`Integrated ${cpModules.length} CP modules`);
console.log(`Integrated ${cpExercises.length} CP exercises`);
console.log(`Integrated ${cpCompetences.length} CP competences`);
```

### Integration Features

The integration process automatically:

1. **Transforms Modules**: Converts old module structure to new `CPModule` format
2. **Transforms Exercises**: Converts old exercise structure to new `CPExercise` format
3. **Transforms Competences**: Converts old competence structure to new `CPCompetence` format
4. **Maps Types**: Converts old type names to new unified type system
5. **Preserves Metadata**: Maintains original metadata while adding integration markers
6. **Validates Structure**: Ensures all required fields are present

### Integration Benefits

- **Backward Compatibility**: Existing CP2025 data can be seamlessly integrated
- **Data Preservation**: All original information is preserved and enhanced
- **Type Safety**: Integrated data follows the new type-safe structure
- **Extensibility**: Easy to add CE1 and CE2 data alongside CP data
- **Unified API**: Single interface for all educational levels

## Configuration Options

### Hook Configuration

```typescript
interface UseEducationalDataOptions {
  initialData?: EducationalData;     // Initial data to load
  autoLoad?: boolean;                // Auto-load from URL
  dataUrl?: string;                  // URL to load data from
  cacheEnabled?: boolean;            // Enable caching
  validationEnabled?: boolean;       // Enable data validation
}
```

### Service Configuration

```typescript
interface ServiceOptions {
  enableCaching?: boolean;           // Enable result caching
  enableValidation?: boolean;        // Enable input validation
  enableStatistics?: boolean;        // Enable statistics generation
  enableExport?: boolean;            // Enable data export features
}
```

## Filters and Queries

### Exercise Filters

```typescript
const filters: ExerciseFilter = {
  level: 'CP',                       // Filter by educational level
  type: 'QCM',                       // Filter by exercise type
  difficulty: 'decouverte',          // Filter by difficulty
  subject: 'FRANCAIS',               // Filter by subject
  competenceCode: 'CP.FR.L1.1'       // Filter by competence
};

const filteredExercises = service.getExercisesByFilter(filters);
```

### Module Filters

```typescript
const moduleFilters: ModuleFilter = {
  level: 'CE1',                      // Filter by level
  subject: 'MATHEMATIQUES',          // Filter by subject
  period: 'P1-P2',                   // Filter by period
  competenceDomain: 'CE1.MA.N1'      // Filter by competence domain
};

const filteredModules = service.getModulesByFilter(moduleFilters);
```

## Statistics and Analytics

### Comprehensive Statistics

```typescript
const stats = service.getStatistics();

console.log('Module Statistics:');
console.log(`- Total modules: ${stats.totalModules}`);
console.log(`- CP modules: ${stats.modulesByLevel.CP}`);
console.log(`- CE1 modules: ${stats.modulesByLevel.CE1}`);
console.log(`- CE2 modules: ${stats.modulesByLevel.CE2}`);

console.log('Exercise Statistics:');
console.log(`- Total exercises: ${stats.totalExercises}`);
console.log(`- QCM exercises: ${stats.exercisesByType.QCM}`);
console.log(`- Discovery exercises: ${stats.exercisesByDifficulty.decouverte}`);
```

### Level Progression

```typescript
const progression = service.getLevelProgression('CP');
console.log(`Next level: ${progression.next}`);
console.log(`Previous level: ${progression.previous}`);
console.log(`Is valid level: ${progression.isValid}`);
```

## Advanced Features

### Caching

```typescript
const loader = new EducationalDataLoader({
  cacheEnabled: true,
  cacheTTL: 300000 // 5 minutes
});

// Data is automatically cached
const data1 = await loader.loadData({ source: 'api', url: '/api/data' });
const data2 = await loader.loadData({ source: 'api', url: '/api/data' }); // From cache
```

### Data Export

```typescript
// Export to JSON
const jsonData = loader.exportData(data, 'json');

// Export to CSV
const csvData = loader.exportData(data, 'csv');

// Export to XML
const xmlData = loader.exportData(data, 'xml');
```

### Data Merging

```typescript
const mergedData = loader.mergeDataSources([
  cpData,
  ce1Data,
  ce2Data
]);
```

## Testing Recommendations

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { EducationalService } from '../services/educational.service';

describe('EducationalService', () => {
  it('should integrate CP2025 data correctly', () => {
    const oldData = { /* old CP2025 data */ };
    const integrated = EducationalService.integrateCP2025Data(oldData);
    
    expect(integrated.modules.CP).toHaveLength(2);
    expect(integrated.exercises.CP).toHaveLength(2);
    expect(integrated.competences.CP).toHaveLength(2);
  });
});
```

### Integration Tests

```typescript
describe('useEducationalData Hook', () => {
  it('should load and provide data correctly', () => {
    const { result } = renderHook(() => useEducationalData({ initialData }));
    
    expect(result.current.data).toBeDefined();
    expect(result.current.service).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });
});
```

## Future Evolutions

### Planned Features

1. **Real-time Collaboration**: Multi-user editing capabilities
2. **Advanced Analytics**: Learning progress tracking
3. **AI-powered Recommendations**: Intelligent exercise suggestions
4. **Offline Support**: Local data storage and sync
5. **Multi-language Support**: Internationalization
6. **Accessibility Enhancements**: WCAG compliance improvements

### Extension Points

1. **Custom Exercise Types**: Plugin system for new exercise types
2. **Custom Validators**: Extensible validation rules
3. **Custom Export Formats**: Plugin system for export formats
4. **Custom Analytics**: Extensible analytics and reporting

## Resources

### Related Files

- `types/educational.types.ts`: Complete type definitions
- `services/educational.service.ts`: Core business logic
- `hooks/useEducationalData.tsx`: React hooks implementation
- `utils/educationalDataLoader.ts`: Data loading utilities
- `components/EducationalDemo.tsx`: Interactive demonstration

### Dependencies

- React 18+
- TypeScript 4.9+
- No external dependencies beyond React

## Contribution Guidelines

### Code Style

- Use TypeScript strict mode
- Follow React hooks best practices
- Use descriptive variable and function names
- Add comprehensive JSDoc comments
- Write unit tests for all new features

### Pull Request Process

1. Create feature branch from main
2. Implement changes with tests
3. Update documentation
4. Ensure all tests pass
5. Submit pull request with detailed description

### Testing Requirements

- Unit tests for all service methods
- Integration tests for hooks
- E2E tests for critical user flows
- Performance tests for data loading

---

This unified educational system provides a robust foundation for managing educational content across multiple levels while maintaining backward compatibility and enabling future growth.
