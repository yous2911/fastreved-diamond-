// Educational Data Loader Utility
// ===============================

import { EducationalData, EducationalLevel, EducationalModule, EducationalExercise, EducationalCompetence } from '../types/educational.types';

export interface DataSource {
  type: 'local' | 'api' | 'file';
  url?: string;
  data?: EducationalData;
  transform?: (data: any) => EducationalData;
}

export interface LoaderOptions {
  validateData?: boolean;
  transformData?: boolean;
  cacheData?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

export class EducationalDataLoader {
  private cache = new Map<string, EducationalData>();
  private defaultOptions: LoaderOptions = {
    validateData: true,
    transformData: true,
    cacheData: true,
    retryAttempts: 3,
    timeout: 10000
  };

  /**
   * Load educational data from a source
   */
  async loadData(source: DataSource, options: LoaderOptions = {}): Promise<EducationalData> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Check cache first
    if (opts.cacheData && source.url && this.cache.has(source.url)) {
      return this.cache.get(source.url)!;
    }

    let data: EducationalData;

    try {
      switch (source.type) {
        case 'local':
          data = await this.loadLocalData(source.data!);
          break;
        case 'api':
          data = await this.loadApiData(source.url!, opts);
          break;
        case 'file':
          data = await this.loadFileData(source.url!, opts);
          break;
        default:
          throw new Error(`Unknown data source type: ${source.type}`);
      }

      // Transform data if needed
      if (opts.transformData && source.transform) {
        data = source.transform(data);
      }

      // Validate data if needed
      if (opts.validateData) {
        this.validateEducationalData(data);
      }

      // Cache data if needed
      if (opts.cacheData && source.url) {
        this.cache.set(source.url, data);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to load educational data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load data from local source
   */
  private async loadLocalData(data: EducationalData): Promise<EducationalData> {
    return data;
  }

  /**
   * Load data from API
   */
  private async loadApiData(url: string, options: LoaderOptions): Promise<EducationalData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonData = await response.json();
      return this.transformApiResponse(jsonData);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Load data from file
   */
  private async loadFileData(filePath: string, options: LoaderOptions): Promise<EducationalData> {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      return this.transformFileResponse(jsonData);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Transform API response to EducationalData format
   */
  private transformApiResponse(response: any): EducationalData {
    // Handle different API response formats
    if (response.data) {
      return response.data;
    }
    
    if (response.modules && response.exercises && response.competences) {
      return response;
    }

    // Try to extract educational data from response
    const transformed: EducationalData = {
      modules: { CP: [], CE1: [], CE2: [] },
      exercises: { CP: [], CE1: [], CE2: [] },
      competences: { CP: [], CE1: [], CE2: [] }
    };

    // Extract modules
    if (Array.isArray(response.modules)) {
      response.modules.forEach((module: any) => {
        const level = module.niveau as EducationalLevel;
        if (level && transformed.modules[level]) {
          transformed.modules[level].push(module);
        }
      });
    }

    // Extract exercises
    if (Array.isArray(response.exercises)) {
      response.exercises.forEach((exercise: any) => {
        const module = this.findModuleById(exercise.moduleId, transformed.modules);
        if (module) {
          const level = module.niveau as EducationalLevel;
          if (level && transformed.exercises[level]) {
            transformed.exercises[level].push(exercise);
          }
        }
      });
    }

    // Extract competences
    if (Array.isArray(response.competences)) {
      response.competences.forEach((competence: any) => {
        const level = competence.niveau as EducationalLevel;
        if (level && transformed.competences[level]) {
          transformed.competences[level].push(competence);
        }
      });
    }

    return transformed;
  }

  /**
   * Transform file response to EducationalData format
   */
  private transformFileResponse(response: any): EducationalData {
    return this.transformApiResponse(response);
  }

  /**
   * Find module by ID across all levels
   */
  private findModuleById(id: number, modules: EducationalData['modules']): EducationalModule | null {
    for (const level of ['CP', 'CE1', 'CE2'] as EducationalLevel[]) {
      const module = modules[level].find(m => m.id === id);
      if (module) return module;
    }
    return null;
  }

  /**
   * Validate educational data structure
   */
  private validateEducationalData(data: EducationalData): void {
    const errors: string[] = [];

    // Check required properties
    if (!data.modules) errors.push('Missing modules property');
    if (!data.exercises) errors.push('Missing exercises property');
    if (!data.competences) errors.push('Missing competences property');

    // Check level structure
    const levels: EducationalLevel[] = ['CP', 'CE1', 'CE2'];
    levels.forEach(level => {
      if (!data.modules[level]) errors.push(`Missing modules for level ${level}`);
      if (!data.exercises[level]) errors.push(`Missing exercises for level ${level}`);
      if (!data.competences[level]) errors.push(`Missing competences for level ${level}`);
    });

    // Validate modules
    levels.forEach(level => {
      if (data.modules[level]) {
        data.modules[level].forEach((module, index) => {
          if (!module.id) errors.push(`Module ${index} in ${level} missing id`);
          if (!module.titre) errors.push(`Module ${index} in ${level} missing titre`);
          if (module.niveau !== level) errors.push(`Module ${index} in ${level} has wrong niveau: ${module.niveau}`);
        });
      }
    });

    // Validate exercises
    levels.forEach(level => {
      if (data.exercises[level]) {
        data.exercises[level].forEach((exercise, index) => {
          if (!exercise.titre) errors.push(`Exercise ${index} in ${level} missing titre`);
          if (!exercise.type) errors.push(`Exercise ${index} in ${level} missing type`);
          if (!exercise.configuration) errors.push(`Exercise ${index} in ${level} missing configuration`);
        });
      }
    });

    // Validate competences
    levels.forEach(level => {
      if (data.competences[level]) {
        data.competences[level].forEach((competence, index) => {
          if (!competence.code) errors.push(`Competence ${index} in ${level} missing code`);
          if (!competence.titre) errors.push(`Competence ${index} in ${level} missing titre`);
          if (competence.niveau !== level) errors.push(`Competence ${index} in ${level} has wrong niveau: ${competence.niveau}`);
        });
      }
    });

    if (errors.length > 0) {
      throw new Error(`Educational data validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Merge multiple educational data sources
   */
  mergeDataSources(...dataSources: EducationalData[]): EducationalData {
    const merged: EducationalData = {
      modules: { CP: [], CE1: [], CE2: [] },
      exercises: { CP: [], CE1: [], CE2: [] },
      competences: { CP: [], CE1: [], CE2: [] }
    };

    dataSources.forEach(data => {
      const levels: EducationalLevel[] = ['CP', 'CE1', 'CE2'];
      
      levels.forEach(level => {
        if (data.modules[level]) {
          merged.modules[level].push(...data.modules[level]);
        }
        if (data.exercises[level]) {
          merged.exercises[level].push(...data.exercises[level]);
        }
        if (data.competences[level]) {
          merged.competences[level].push(...data.competences[level]);
        }
      });
    });

    return merged;
  }

  /**
   * Filter educational data by criteria
   */
  filterData(data: EducationalData, filter: {
    levels?: EducationalLevel[];
    subjects?: string[];
    competenceCodes?: string[];
  }): EducationalData {
    const filtered: EducationalData = {
      modules: { CP: [], CE1: [], CE2: [] },
      exercises: { CP: [], CE1: [], CE2: [] },
      competences: { CP: [], CE1: [], CE2: [] }
    };

    const levels = filter.levels || ['CP', 'CE1', 'CE2'];

    levels.forEach(level => {
      // Filter modules
      if (data.modules[level]) {
        filtered.modules[level] = data.modules[level].filter(module => {
          if (filter.subjects && !filter.subjects.includes(module.matiere)) {
            return false;
          }
          return true;
        });
      }

      // Filter exercises
      if (data.exercises[level]) {
        filtered.exercises[level] = data.exercises[level].filter(exercise => {
          if (filter.competenceCodes && !filter.competenceCodes.includes(exercise.metadata.competenceCode)) {
            return false;
          }
          return true;
        });
      }

      // Filter competences
      if (data.competences[level]) {
        filtered.competences[level] = data.competences[level].filter(competence => {
          if (filter.competenceCodes && !filter.competenceCodes.includes(competence.code)) {
            return false;
          }
          if (filter.subjects && !filter.subjects.includes(competence.domaine)) {
            return false;
          }
          return true;
        });
      }
    });

    return filtered;
  }

  /**
   * Export data to different formats
   */
  exportData(data: EducationalData, format: 'json' | 'csv' | 'xml' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.exportToCSV(data);
      case 'xml':
        return this.exportToXML(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(data: EducationalData): string {
    const lines: string[] = [];
    
    // Modules CSV
    lines.push('Type,Level,ID,Titre,Description,Matiere,Periode');
    ['CP', 'CE1', 'CE2'].forEach(level => {
      data.modules[level as EducationalLevel].forEach(module => {
        lines.push(`Module,${level},${module.id},"${module.titre}","${module.description}",${module.matiere},${module.periode}`);
      });
    });

    // Competences CSV
    lines.push('\nType,Level,Code,Titre,Description,Domaine,SousDomaine');
    ['CP', 'CE1', 'CE2'].forEach(level => {
      data.competences[level as EducationalLevel].forEach(competence => {
        lines.push(`Competence,${level},${competence.code},"${competence.titre}","${competence.description}",${competence.domaine},${competence.sousDomaine}`);
      });
    });

    return lines.join('\n');
  }

  /**
   * Export to XML format
   */
  private exportToXML(data: EducationalData): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<educationalData>\n';
    
    // Modules
    xml += '  <modules>\n';
    ['CP', 'CE1', 'CE2'].forEach(level => {
      data.modules[level as EducationalLevel].forEach(module => {
        xml += `    <module level="${level}" id="${module.id}">\n`;
        xml += `      <titre>${module.titre}</titre>\n`;
        xml += `      <description>${module.description}</description>\n`;
        xml += `      <matiere>${module.matiere}</matiere>\n`;
        xml += `      <periode>${module.periode}</periode>\n`;
        xml += '    </module>\n';
      });
    });
    xml += '  </modules>\n';

    // Competences
    xml += '  <competences>\n';
    ['CP', 'CE1', 'CE2'].forEach(level => {
      data.competences[level as EducationalLevel].forEach(competence => {
        xml += `    <competence level="${level}" code="${competence.code}">\n`;
        xml += `      <titre>${competence.titre}</titre>\n`;
        xml += `      <description>${competence.description}</description>\n`;
        xml += `      <domaine>${competence.domaine}</domaine>\n`;
        xml += `      <sousDomaine>${competence.sousDomaine}</sousDomaine>\n`;
        xml += '    </competence>\n';
      });
    });
    xml += '  </competences>\n';
    
    xml += '</educationalData>';
    return xml;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Default loader instance
export const educationalDataLoader = new EducationalDataLoader();

// Utility functions
export const loadEducationalData = (source: DataSource, options?: LoaderOptions) => 
  educationalDataLoader.loadData(source, options);

export const mergeEducationalData = (...dataSources: EducationalData[]) => 
  educationalDataLoader.mergeDataSources(...dataSources);

export const filterEducationalData = (data: EducationalData, filter: any) => 
  educationalDataLoader.filterData(data, filter);

export const exportEducationalData = (data: EducationalData, format?: 'json' | 'csv' | 'xml') => 
  educationalDataLoader.exportData(data, format);
