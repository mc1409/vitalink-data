import { supabase } from "@/integrations/supabase/client";

// Database table schemas with validation rules
export const DATABASE_SCHEMAS = {
  clinical_diagnostic_lab_tests: {
    required: ['patient_id', 'test_name', 'test_type', 'test_category', 'data_source', 'measurement_time'],
    optional: ['result_value', 'numeric_value', 'unit', 'reference_range_min', 'reference_range_max', 'collection_date', 'result_date', 'sample_type', 'is_out_of_range'],
    types: {
      patient_id: 'uuid',
      test_name: 'text',
      test_type: 'text', 
      test_category: 'text',
      data_source: 'text',
      measurement_time: 'timestamp',
      result_value: 'text',
      numeric_value: 'numeric',
      unit: 'text',
      reference_range_min: 'numeric',
      reference_range_max: 'numeric',
      collection_date: 'date',
      result_date: 'date',
      sample_type: 'text',
      is_out_of_range: 'boolean'
    }
  },
  biomarker_heart: {
    required: ['patient_id', 'data_source', 'device_type', 'measurement_time'],
    optional: ['resting_heart_rate', 'max_heart_rate', 'min_heart_rate', 'average_heart_rate', 'walking_heart_rate', 'workout_heart_rate', 'recovery_heart_rate', 'systolic_bp', 'diastolic_bp', 'hrv_rmssd', 'hrv_sdnn', 'hrv_score', 'vo2_max', 'cardio_fitness_level', 'ecg_rhythm_classification', 'afib_detected', 'irregular_rhythm_detected'],
    types: {
      patient_id: 'uuid',
      data_source: 'text',
      device_type: 'text',
      measurement_time: 'timestamp',
      resting_heart_rate: 'integer',
      max_heart_rate: 'integer',
      min_heart_rate: 'integer',
      average_heart_rate: 'integer',
      walking_heart_rate: 'integer',
      workout_heart_rate: 'integer',
      recovery_heart_rate: 'integer',
      systolic_bp: 'integer',
      diastolic_bp: 'integer',
      hrv_rmssd: 'numeric',
      hrv_sdnn: 'numeric',
      hrv_score: 'integer',
      vo2_max: 'numeric',
      cardio_fitness_level: 'text',
      ecg_rhythm_classification: 'text',
      afib_detected: 'boolean',
      irregular_rhythm_detected: 'boolean'
    }
  },
  biomarker_activity: {
    required: ['patient_id', 'data_source', 'device_type', 'measurement_date', 'measurement_time'],
    optional: ['steps_count', 'distance_walked_meters', 'distance_ran_meters', 'distance_cycled_meters', 'flights_climbed', 'total_calories', 'active_calories', 'basal_calories', 'workout_calories', 'exercise_minutes', 'vigorous_activity_minutes', 'moderate_activity_minutes', 'sedentary_minutes', 'stand_hours', 'stand_goal_hours', 'workout_duration_minutes', 'workout_distance_meters', 'workout_avg_heart_rate', 'workout_max_heart_rate'],
    types: {
      patient_id: 'uuid',
      data_source: 'text',
      device_type: 'text',
      measurement_date: 'date',
      measurement_time: 'timestamp',
      steps_count: 'integer',
      distance_walked_meters: 'numeric',
      distance_ran_meters: 'numeric',
      distance_cycled_meters: 'numeric',
      flights_climbed: 'integer',
      total_calories: 'integer',
      active_calories: 'integer',
      basal_calories: 'integer',
      workout_calories: 'integer',
      exercise_minutes: 'integer',
      vigorous_activity_minutes: 'integer',
      moderate_activity_minutes: 'integer',
      sedentary_minutes: 'integer',
      stand_hours: 'integer',
      stand_goal_hours: 'integer',
      workout_duration_minutes: 'integer',
      workout_distance_meters: 'numeric',
      workout_avg_heart_rate: 'integer',
      workout_max_heart_rate: 'integer'
    }
  },
  biomarker_sleep: {
    required: ['patient_id', 'data_source', 'device_type', 'measurement_time', 'sleep_date'],
    optional: ['bedtime', 'sleep_start', 'sleep_end', 'wake_time', 'total_sleep_time', 'time_in_bed', 'rem_sleep_minutes', 'deep_sleep_minutes', 'light_sleep_minutes', 'awake_minutes', 'sleep_efficiency', 'sleep_latency', 'sleep_score', 'sleep_debt', 'sleep_disturbances', 'restfulness_score', 'avg_heart_rate', 'min_heart_rate', 'max_heart_rate', 'avg_hrv', 'avg_respiratory_rate', 'avg_spo2', 'min_spo2', 'avg_body_temperature', 'temperature_deviation'],
    types: {
      patient_id: 'uuid',
      data_source: 'text',
      device_type: 'text',
      measurement_time: 'timestamp',
      sleep_date: 'date',
      bedtime: 'timestamp',
      sleep_start: 'timestamp',
      sleep_end: 'timestamp',
      wake_time: 'timestamp',
      total_sleep_time: 'integer',
      time_in_bed: 'integer',
      rem_sleep_minutes: 'integer',
      deep_sleep_minutes: 'integer',
      light_sleep_minutes: 'integer',
      awake_minutes: 'integer',
      sleep_efficiency: 'numeric',
      sleep_latency: 'integer',
      sleep_score: 'integer',
      sleep_debt: 'integer',
      sleep_disturbances: 'integer',
      restfulness_score: 'integer',
      avg_heart_rate: 'integer',
      min_heart_rate: 'integer',
      max_heart_rate: 'integer',
      avg_hrv: 'numeric',
      avg_respiratory_rate: 'numeric',
      avg_spo2: 'integer',
      min_spo2: 'integer',
      avg_body_temperature: 'numeric',
      temperature_deviation: 'numeric'
    }
  }
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  processedData: any;
}

export interface InsertResult {
  success: boolean;
  table: string;
  insertedCount: number;
  errors: string[];
  data?: any;
}

export class DatabaseMapper {
  
  // Validate extracted data against schema
  static validateData(tableName: string, data: any[]): ValidationResult {
    const schema = DATABASE_SCHEMAS[tableName as keyof typeof DATABASE_SCHEMAS];
    if (!schema) {
      return {
        isValid: false,
        errors: [`Unknown table: ${tableName}`],
        warnings: [],
        processedData: null
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const processedData: any[] = [];

    for (const record of data) {
      const processedRecord: any = {};
      
      // Check required fields
      for (const field of schema.required) {
        if (!record.hasOwnProperty(field) || record[field] === null || record[field] === undefined) {
          errors.push(`Missing required field '${field}' in ${tableName}`);
          continue;
        }
        processedRecord[field] = this.convertType(record[field], schema.types[field]);
      }

      // Process optional fields
      for (const field of schema.optional) {
        if (record.hasOwnProperty(field) && record[field] !== null && record[field] !== undefined) {
          processedRecord[field] = this.convertType(record[field], schema.types[field]);
        }
      }

      // Add confidence and validation metadata if present
      if (record._confidence) {
        processedRecord._confidence = record._confidence;
      }
      if (record._validation_flags) {
        processedRecord._validation_flags = record._validation_flags;
      }

      if (Object.keys(processedRecord).length > 0) {
        processedData.push(processedRecord);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      processedData
    };
  }

  // Convert data types according to schema
  private static convertType(value: any, type: string): any {
    if (value === null || value === undefined) return null;

    switch (type) {
      case 'integer':
        const intVal = parseInt(value);
        return isNaN(intVal) ? null : intVal;
      case 'numeric':
        const numVal = parseFloat(value);
        return isNaN(numVal) ? null : numVal;
      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      case 'date':
        if (value instanceof Date) return value.toISOString().split('T')[0];
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
        }
        return null;
      case 'timestamp':
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'string') {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date.toISOString();
        }
        return null;
      case 'uuid':
      case 'text':
      default:
        return String(value);
    }
  }

  // Insert validated data into database
  static async insertData(tableName: string, validatedData: any[]): Promise<InsertResult> {
    try {
      console.log(`Inserting ${validatedData.length} records into ${tableName}:`, validatedData);

      // Remove metadata fields before insertion
      const cleanData = validatedData.map(record => {
        const { _confidence, _validation_flags, ...cleanRecord } = record;
        return cleanRecord;
      });

      // Type-safe table name check
      const validTables = [
        'clinical_diagnostic_lab_tests',
        'biomarker_heart', 
        'biomarker_activity',
        'biomarker_sleep',
        'biomarker_nutrition',
        'biomarker_biological_genetic_microbiome'
      ] as const;

      if (!validTables.includes(tableName as any)) {
        return {
          success: false,
          table: tableName,
          insertedCount: 0,
          errors: [`Invalid table name: ${tableName}`]
        };
      }

      const { data, error } = await supabase
        .from(tableName as any)
        .insert(cleanData)
        .select();

      if (error) {
        console.error(`Database insertion error for ${tableName}:`, error);
        return {
          success: false,
          table: tableName,
          insertedCount: 0,
          errors: [error.message]
        };
      }

      console.log(`Successfully inserted ${data?.length || 0} records into ${tableName}`);
      return {
        success: true,
        table: tableName,
        insertedCount: data?.length || 0,
        errors: [],
        data
      };

    } catch (error) {
      console.error(`Unexpected error inserting into ${tableName}:`, error);
      return {
        success: false,
        table: tableName,
        insertedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Check for duplicates before insertion
  static async checkDuplicates(tableName: string, data: any[]): Promise<{ duplicates: any[], unique: any[] }> {
    const duplicates: any[] = [];
    const unique: any[] = [];

    // Type-safe table name check
    const validTables = [
      'clinical_diagnostic_lab_tests',
      'biomarker_heart', 
      'biomarker_activity',
      'biomarker_sleep',
      'biomarker_nutrition',
      'biomarker_biological_genetic_microbiome'
    ] as const;

    if (!validTables.includes(tableName as any)) {
      console.error(`Invalid table name for duplicate check: ${tableName}`);
      return { duplicates: [], unique: data }; // Treat all as unique if table is invalid
    }

    for (const record of data) {
      try {
        let query = supabase.from(tableName as any).select('id');
        
        // Build duplicate check query based on table type
        if (tableName === 'clinical_diagnostic_lab_tests') {
          query = query
            .eq('patient_id', record.patient_id)
            .eq('test_name', record.test_name)
            .eq('measurement_time', record.measurement_time);
        } else {
          // For biomarker tables, check by patient_id and measurement_time
          query = query
            .eq('patient_id', record.patient_id)
            .eq('measurement_time', record.measurement_time);
        }

        const { data: existing } = await query.limit(1);
        
        if (existing && existing.length > 0) {
          duplicates.push(record);
        } else {
          unique.push(record);
        }
      } catch (error) {
        console.error(`Error checking duplicates for ${tableName}:`, error);
        // If duplicate check fails, treat as unique to avoid blocking insertion
        unique.push(record);
      }
    }

    return { duplicates, unique };
  }

  // Process all extracted data
  static async processExtractedData(extractedFields: any): Promise<{
    results: InsertResult[];
    totalProcessed: number;
    totalErrors: number;
  }> {
    const results: InsertResult[] = [];
    let totalProcessed = 0;
    let totalErrors = 0;

    for (const [tableName, tableData] of Object.entries(extractedFields)) {
      if (!Array.isArray(tableData) || tableData.length === 0) {
        continue;
      }

      console.log(`Processing ${tableData.length} records for table: ${tableName}`);

      // Validate data
      const validation = this.validateData(tableName, tableData);
      if (!validation.isValid) {
        console.error(`Validation failed for ${tableName}:`, validation.errors);
        results.push({
          success: false,
          table: tableName,
          insertedCount: 0,
          errors: validation.errors
        });
        totalErrors += validation.errors.length;
        continue;
      }

      // Check for duplicates
      const { duplicates, unique } = await this.checkDuplicates(tableName, validation.processedData);
      
      if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicate records for ${tableName}, skipping`);
      }

      if (unique.length === 0) {
        results.push({
          success: true,
          table: tableName,
          insertedCount: 0,
          errors: [`All ${tableData.length} records were duplicates`]
        });
        continue;
      }

      // Insert unique records
      const insertResult = await this.insertData(tableName, unique);
      results.push(insertResult);
      
      if (insertResult.success) {
        totalProcessed += insertResult.insertedCount;
      } else {
        totalErrors += insertResult.errors.length;
      }
    }

    return { results, totalProcessed, totalErrors };
  }
}