export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_insights_cache: {
        Row: {
          confidence_score: number | null
          created_at: string
          expires_at: string | null
          generated_at: string
          generated_data: Json
          id: string
          insight_type: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          expires_at?: string | null
          generated_at?: string
          generated_data: Json
          id?: string
          insight_type: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          expires_at?: string | null
          generated_at?: string
          generated_data?: Json
          id?: string
          insight_type?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_sleep_insights: {
        Row: {
          agent_version: string | null
          analysis_date: string
          analysis_period: string
          confidence_level: number | null
          created_at: string
          data_sources_used: Json | null
          id: string
          key_factors: Json | null
          next_analysis_date: string | null
          optimal_bedtime: string | null
          optimal_wake_time: string | null
          patient_id: string
          predicted_sleep_duration: number | null
          processing_time_ms: number | null
          recommendations: Json | null
          sleep_debt_hours: number | null
          sleep_pattern_trend: string | null
          sleep_quality_score: number | null
          updated_at: string
        }
        Insert: {
          agent_version?: string | null
          analysis_date: string
          analysis_period?: string
          confidence_level?: number | null
          created_at?: string
          data_sources_used?: Json | null
          id?: string
          key_factors?: Json | null
          next_analysis_date?: string | null
          optimal_bedtime?: string | null
          optimal_wake_time?: string | null
          patient_id: string
          predicted_sleep_duration?: number | null
          processing_time_ms?: number | null
          recommendations?: Json | null
          sleep_debt_hours?: number | null
          sleep_pattern_trend?: string | null
          sleep_quality_score?: number | null
          updated_at?: string
        }
        Update: {
          agent_version?: string | null
          analysis_date?: string
          analysis_period?: string
          confidence_level?: number | null
          created_at?: string
          data_sources_used?: Json | null
          id?: string
          key_factors?: Json | null
          next_analysis_date?: string | null
          optimal_bedtime?: string | null
          optimal_wake_time?: string | null
          patient_id?: string
          predicted_sleep_duration?: number | null
          processing_time_ms?: number | null
          recommendations?: Json | null
          sleep_debt_hours?: number | null
          sleep_pattern_trend?: string | null
          sleep_quality_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      biomarker_activity: {
        Row: {
          active_calories: number | null
          basal_calories: number | null
          created_at: string
          data_source: string
          device_type: string
          distance_cycled_meters: number | null
          distance_ran_meters: number | null
          distance_walked_meters: number | null
          exercise_minutes: number | null
          flights_climbed: number | null
          id: string
          measurement_date: string
          measurement_time: string
          moderate_activity_minutes: number | null
          patient_id: string
          sedentary_minutes: number | null
          stand_goal_hours: number | null
          stand_hours: number | null
          steps_count: number | null
          total_calories: number | null
          updated_at: string
          vigorous_activity_minutes: number | null
          workout_avg_heart_rate: number | null
          workout_calories: number | null
          workout_distance_meters: number | null
          workout_duration_minutes: number | null
          workout_max_heart_rate: number | null
        }
        Insert: {
          active_calories?: number | null
          basal_calories?: number | null
          created_at?: string
          data_source: string
          device_type: string
          distance_cycled_meters?: number | null
          distance_ran_meters?: number | null
          distance_walked_meters?: number | null
          exercise_minutes?: number | null
          flights_climbed?: number | null
          id?: string
          measurement_date: string
          measurement_time: string
          moderate_activity_minutes?: number | null
          patient_id: string
          sedentary_minutes?: number | null
          stand_goal_hours?: number | null
          stand_hours?: number | null
          steps_count?: number | null
          total_calories?: number | null
          updated_at?: string
          vigorous_activity_minutes?: number | null
          workout_avg_heart_rate?: number | null
          workout_calories?: number | null
          workout_distance_meters?: number | null
          workout_duration_minutes?: number | null
          workout_max_heart_rate?: number | null
        }
        Update: {
          active_calories?: number | null
          basal_calories?: number | null
          created_at?: string
          data_source?: string
          device_type?: string
          distance_cycled_meters?: number | null
          distance_ran_meters?: number | null
          distance_walked_meters?: number | null
          exercise_minutes?: number | null
          flights_climbed?: number | null
          id?: string
          measurement_date?: string
          measurement_time?: string
          moderate_activity_minutes?: number | null
          patient_id?: string
          sedentary_minutes?: number | null
          stand_goal_hours?: number | null
          stand_hours?: number | null
          steps_count?: number | null
          total_calories?: number | null
          updated_at?: string
          vigorous_activity_minutes?: number | null
          workout_avg_heart_rate?: number | null
          workout_calories?: number | null
          workout_distance_meters?: number | null
          workout_duration_minutes?: number | null
          workout_max_heart_rate?: number | null
        }
        Relationships: []
      }
      biomarker_biological_genetic_microbiome: {
        Row: {
          acetate_production: number | null
          akkermansia_level: number | null
          alcohol_consumption_units: number | null
          alpha_diversity: number | null
          beneficial_bacteria_score: number | null
          beta_diversity: number | null
          bifidobacterium_level: number | null
          butyrate_production: number | null
          caffeine_intake_mg: number | null
          candida_level: number | null
          carb_utilization_score: number | null
          cardiovascular_load: number | null
          created_at: string
          data_source: string
          dysbiosis_index: number | null
          fat_utilization_score: number | null
          fiber_utilization_score: number | null
          firmicutes_bacteroidetes_ratio: number | null
          folate_production: number | null
          hrv_score: number | null
          hydration_level: number | null
          id: string
          immune_function_score: number | null
          inflammatory_pathways_score: number | null
          lactobacillus_level: number | null
          max_strain_time: string | null
          measurement_time: string
          microbial_diversity_shannon: number | null
          microbiome_age: number | null
          mitochondrial_health_score: number | null
          oxidative_stress_score: number | null
          pathogenic_bacteria_score: number | null
          patient_id: string
          propionate_production: number | null
          protein_utilization_score: number | null
          proteobacteria_level: number | null
          recovery_score: number | null
          resting_hr_score: number | null
          skin_temperature: number | null
          skin_temperature_deviation: number | null
          sleep_performance_score: number | null
          species_richness: number | null
          strain_score: number | null
          stress_score: number | null
          test_date: string
          test_provider: string
          test_version: string | null
          updated_at: string
          vitamin_b_production: number | null
          vitamin_k_production: number | null
        }
        Insert: {
          acetate_production?: number | null
          akkermansia_level?: number | null
          alcohol_consumption_units?: number | null
          alpha_diversity?: number | null
          beneficial_bacteria_score?: number | null
          beta_diversity?: number | null
          bifidobacterium_level?: number | null
          butyrate_production?: number | null
          caffeine_intake_mg?: number | null
          candida_level?: number | null
          carb_utilization_score?: number | null
          cardiovascular_load?: number | null
          created_at?: string
          data_source: string
          dysbiosis_index?: number | null
          fat_utilization_score?: number | null
          fiber_utilization_score?: number | null
          firmicutes_bacteroidetes_ratio?: number | null
          folate_production?: number | null
          hrv_score?: number | null
          hydration_level?: number | null
          id?: string
          immune_function_score?: number | null
          inflammatory_pathways_score?: number | null
          lactobacillus_level?: number | null
          max_strain_time?: string | null
          measurement_time: string
          microbial_diversity_shannon?: number | null
          microbiome_age?: number | null
          mitochondrial_health_score?: number | null
          oxidative_stress_score?: number | null
          pathogenic_bacteria_score?: number | null
          patient_id: string
          propionate_production?: number | null
          protein_utilization_score?: number | null
          proteobacteria_level?: number | null
          recovery_score?: number | null
          resting_hr_score?: number | null
          skin_temperature?: number | null
          skin_temperature_deviation?: number | null
          sleep_performance_score?: number | null
          species_richness?: number | null
          strain_score?: number | null
          stress_score?: number | null
          test_date: string
          test_provider: string
          test_version?: string | null
          updated_at?: string
          vitamin_b_production?: number | null
          vitamin_k_production?: number | null
        }
        Update: {
          acetate_production?: number | null
          akkermansia_level?: number | null
          alcohol_consumption_units?: number | null
          alpha_diversity?: number | null
          beneficial_bacteria_score?: number | null
          beta_diversity?: number | null
          bifidobacterium_level?: number | null
          butyrate_production?: number | null
          caffeine_intake_mg?: number | null
          candida_level?: number | null
          carb_utilization_score?: number | null
          cardiovascular_load?: number | null
          created_at?: string
          data_source?: string
          dysbiosis_index?: number | null
          fat_utilization_score?: number | null
          fiber_utilization_score?: number | null
          firmicutes_bacteroidetes_ratio?: number | null
          folate_production?: number | null
          hrv_score?: number | null
          hydration_level?: number | null
          id?: string
          immune_function_score?: number | null
          inflammatory_pathways_score?: number | null
          lactobacillus_level?: number | null
          max_strain_time?: string | null
          measurement_time?: string
          microbial_diversity_shannon?: number | null
          microbiome_age?: number | null
          mitochondrial_health_score?: number | null
          oxidative_stress_score?: number | null
          pathogenic_bacteria_score?: number | null
          patient_id?: string
          propionate_production?: number | null
          protein_utilization_score?: number | null
          proteobacteria_level?: number | null
          recovery_score?: number | null
          resting_hr_score?: number | null
          skin_temperature?: number | null
          skin_temperature_deviation?: number | null
          sleep_performance_score?: number | null
          species_richness?: number | null
          strain_score?: number | null
          stress_score?: number | null
          test_date?: string
          test_provider?: string
          test_version?: string | null
          updated_at?: string
          vitamin_b_production?: number | null
          vitamin_k_production?: number | null
        }
        Relationships: []
      }
      biomarker_heart: {
        Row: {
          afib_detected: boolean | null
          average_heart_rate: number | null
          cardio_fitness_level: string | null
          created_at: string
          data_source: string
          device_type: string
          diastolic_bp: number | null
          ecg_rhythm_classification: string | null
          hrv_rmssd: number | null
          hrv_score: number | null
          hrv_sdnn: number | null
          id: string
          irregular_rhythm_detected: boolean | null
          max_heart_rate: number | null
          measurement_time: string
          min_heart_rate: number | null
          patient_id: string
          recovery_heart_rate: number | null
          resting_heart_rate: number | null
          systolic_bp: number | null
          updated_at: string
          vo2_max: number | null
          walking_heart_rate: number | null
          workout_heart_rate: number | null
        }
        Insert: {
          afib_detected?: boolean | null
          average_heart_rate?: number | null
          cardio_fitness_level?: string | null
          created_at?: string
          data_source: string
          device_type: string
          diastolic_bp?: number | null
          ecg_rhythm_classification?: string | null
          hrv_rmssd?: number | null
          hrv_score?: number | null
          hrv_sdnn?: number | null
          id?: string
          irregular_rhythm_detected?: boolean | null
          max_heart_rate?: number | null
          measurement_time: string
          min_heart_rate?: number | null
          patient_id: string
          recovery_heart_rate?: number | null
          resting_heart_rate?: number | null
          systolic_bp?: number | null
          updated_at?: string
          vo2_max?: number | null
          walking_heart_rate?: number | null
          workout_heart_rate?: number | null
        }
        Update: {
          afib_detected?: boolean | null
          average_heart_rate?: number | null
          cardio_fitness_level?: string | null
          created_at?: string
          data_source?: string
          device_type?: string
          diastolic_bp?: number | null
          ecg_rhythm_classification?: string | null
          hrv_rmssd?: number | null
          hrv_score?: number | null
          hrv_sdnn?: number | null
          id?: string
          irregular_rhythm_detected?: boolean | null
          max_heart_rate?: number | null
          measurement_time?: string
          min_heart_rate?: number | null
          patient_id?: string
          recovery_heart_rate?: number | null
          resting_heart_rate?: number | null
          systolic_bp?: number | null
          updated_at?: string
          vo2_max?: number | null
          walking_heart_rate?: number | null
          workout_heart_rate?: number | null
        }
        Relationships: []
      }
      biomarker_nutrition: {
        Row: {
          added_sugar_grams: number | null
          alcohol_grams: number | null
          biotin_mcg: number | null
          caffeine_mg: number | null
          calcium_mg: number | null
          carbohydrates_grams: number | null
          created_at: string
          data_source: string
          fat_grams: number | null
          fiber_grams: number | null
          folate_mcg: number | null
          id: string
          iron_mg: number | null
          magnesium_mg: number | null
          measurement_date: string
          measurement_time: string
          niacin_mg: number | null
          pantothenic_acid_mg: number | null
          patient_id: string
          phosphorus_mg: number | null
          potassium_mg: number | null
          protein_grams: number | null
          riboflavin_mg: number | null
          sodium_mg: number | null
          sugar_grams: number | null
          thiamine_mg: number | null
          total_calories: number | null
          updated_at: string
          vitamin_a_iu: number | null
          vitamin_b12_mcg: number | null
          vitamin_b6_mg: number | null
          vitamin_c_mg: number | null
          vitamin_d_iu: number | null
          vitamin_e_mg: number | null
          vitamin_k_mcg: number | null
          water_intake_ml: number | null
          zinc_mg: number | null
        }
        Insert: {
          added_sugar_grams?: number | null
          alcohol_grams?: number | null
          biotin_mcg?: number | null
          caffeine_mg?: number | null
          calcium_mg?: number | null
          carbohydrates_grams?: number | null
          created_at?: string
          data_source: string
          fat_grams?: number | null
          fiber_grams?: number | null
          folate_mcg?: number | null
          id?: string
          iron_mg?: number | null
          magnesium_mg?: number | null
          measurement_date: string
          measurement_time: string
          niacin_mg?: number | null
          pantothenic_acid_mg?: number | null
          patient_id: string
          phosphorus_mg?: number | null
          potassium_mg?: number | null
          protein_grams?: number | null
          riboflavin_mg?: number | null
          sodium_mg?: number | null
          sugar_grams?: number | null
          thiamine_mg?: number | null
          total_calories?: number | null
          updated_at?: string
          vitamin_a_iu?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_b6_mg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_iu?: number | null
          vitamin_e_mg?: number | null
          vitamin_k_mcg?: number | null
          water_intake_ml?: number | null
          zinc_mg?: number | null
        }
        Update: {
          added_sugar_grams?: number | null
          alcohol_grams?: number | null
          biotin_mcg?: number | null
          caffeine_mg?: number | null
          calcium_mg?: number | null
          carbohydrates_grams?: number | null
          created_at?: string
          data_source?: string
          fat_grams?: number | null
          fiber_grams?: number | null
          folate_mcg?: number | null
          id?: string
          iron_mg?: number | null
          magnesium_mg?: number | null
          measurement_date?: string
          measurement_time?: string
          niacin_mg?: number | null
          pantothenic_acid_mg?: number | null
          patient_id?: string
          phosphorus_mg?: number | null
          potassium_mg?: number | null
          protein_grams?: number | null
          riboflavin_mg?: number | null
          sodium_mg?: number | null
          sugar_grams?: number | null
          thiamine_mg?: number | null
          total_calories?: number | null
          updated_at?: string
          vitamin_a_iu?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_b6_mg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_iu?: number | null
          vitamin_e_mg?: number | null
          vitamin_k_mcg?: number | null
          water_intake_ml?: number | null
          zinc_mg?: number | null
        }
        Relationships: []
      }
      biomarker_sleep: {
        Row: {
          avg_body_temperature: number | null
          avg_heart_rate: number | null
          avg_hrv: number | null
          avg_respiratory_rate: number | null
          avg_spo2: number | null
          awake_minutes: number | null
          bedtime: string | null
          created_at: string
          data_source: string
          deep_sleep_minutes: number | null
          device_type: string
          id: string
          light_sleep_minutes: number | null
          max_heart_rate: number | null
          measurement_time: string
          min_heart_rate: number | null
          min_spo2: number | null
          patient_id: string
          rem_sleep_minutes: number | null
          restfulness_score: number | null
          sleep_date: string
          sleep_debt: number | null
          sleep_disturbances: number | null
          sleep_efficiency: number | null
          sleep_end: string | null
          sleep_latency: number | null
          sleep_score: number | null
          sleep_start: string | null
          temperature_deviation: number | null
          time_in_bed: number | null
          total_sleep_time: number | null
          updated_at: string
          wake_time: string | null
        }
        Insert: {
          avg_body_temperature?: number | null
          avg_heart_rate?: number | null
          avg_hrv?: number | null
          avg_respiratory_rate?: number | null
          avg_spo2?: number | null
          awake_minutes?: number | null
          bedtime?: string | null
          created_at?: string
          data_source: string
          deep_sleep_minutes?: number | null
          device_type: string
          id?: string
          light_sleep_minutes?: number | null
          max_heart_rate?: number | null
          measurement_time: string
          min_heart_rate?: number | null
          min_spo2?: number | null
          patient_id: string
          rem_sleep_minutes?: number | null
          restfulness_score?: number | null
          sleep_date: string
          sleep_debt?: number | null
          sleep_disturbances?: number | null
          sleep_efficiency?: number | null
          sleep_end?: string | null
          sleep_latency?: number | null
          sleep_score?: number | null
          sleep_start?: string | null
          temperature_deviation?: number | null
          time_in_bed?: number | null
          total_sleep_time?: number | null
          updated_at?: string
          wake_time?: string | null
        }
        Update: {
          avg_body_temperature?: number | null
          avg_heart_rate?: number | null
          avg_hrv?: number | null
          avg_respiratory_rate?: number | null
          avg_spo2?: number | null
          awake_minutes?: number | null
          bedtime?: string | null
          created_at?: string
          data_source?: string
          deep_sleep_minutes?: number | null
          device_type?: string
          id?: string
          light_sleep_minutes?: number | null
          max_heart_rate?: number | null
          measurement_time?: string
          min_heart_rate?: number | null
          min_spo2?: number | null
          patient_id?: string
          rem_sleep_minutes?: number | null
          restfulness_score?: number | null
          sleep_date?: string
          sleep_debt?: number | null
          sleep_disturbances?: number | null
          sleep_efficiency?: number | null
          sleep_end?: string | null
          sleep_latency?: number | null
          sleep_score?: number | null
          sleep_start?: string | null
          temperature_deviation?: number | null
          time_in_bed?: number | null
          total_sleep_time?: number | null
          updated_at?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      clinical_diagnostic_cardiovascular: {
        Row: {
          axis_degrees: number | null
          created_at: string
          data_source: string
          diastolic_bp: number | null
          exercise_duration: number | null
          heart_rate: number | null
          id: string
          max_heart_rate: number | null
          measurement_time: string
          mets_achieved: number | null
          patient_id: string
          pr_interval: number | null
          qrs_duration: number | null
          qt_interval: number | null
          qtc_interval: number | null
          systolic_bp: number | null
          target_heart_rate: number | null
          test_date: string
          test_status: string | null
          test_type: string
          updated_at: string
        }
        Insert: {
          axis_degrees?: number | null
          created_at?: string
          data_source: string
          diastolic_bp?: number | null
          exercise_duration?: number | null
          heart_rate?: number | null
          id?: string
          max_heart_rate?: number | null
          measurement_time: string
          mets_achieved?: number | null
          patient_id: string
          pr_interval?: number | null
          qrs_duration?: number | null
          qt_interval?: number | null
          qtc_interval?: number | null
          systolic_bp?: number | null
          target_heart_rate?: number | null
          test_date: string
          test_status?: string | null
          test_type: string
          updated_at?: string
        }
        Update: {
          axis_degrees?: number | null
          created_at?: string
          data_source?: string
          diastolic_bp?: number | null
          exercise_duration?: number | null
          heart_rate?: number | null
          id?: string
          max_heart_rate?: number | null
          measurement_time?: string
          mets_achieved?: number | null
          patient_id?: string
          pr_interval?: number | null
          qrs_duration?: number | null
          qt_interval?: number | null
          qtc_interval?: number | null
          systolic_bp?: number | null
          target_heart_rate?: number | null
          test_date?: string
          test_status?: string | null
          test_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_diagnostic_lab_tests: {
        Row: {
          active: boolean | null
          collection_date: string | null
          created_at: string
          data_source: string
          id: string
          is_out_of_range: boolean | null
          measurement_time: string
          numeric_value: number | null
          patient_id: string
          reference_range_max: number | null
          reference_range_min: number | null
          result_date: string | null
          result_value: string | null
          sample_type: string | null
          test_category: string
          test_name: string
          test_type: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          collection_date?: string | null
          created_at?: string
          data_source: string
          id?: string
          is_out_of_range?: boolean | null
          measurement_time: string
          numeric_value?: number | null
          patient_id: string
          reference_range_max?: number | null
          reference_range_min?: number | null
          result_date?: string | null
          result_value?: string | null
          sample_type?: string | null
          test_category: string
          test_name: string
          test_type: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          collection_date?: string | null
          created_at?: string
          data_source?: string
          id?: string
          is_out_of_range?: boolean | null
          measurement_time?: string
          numeric_value?: number | null
          patient_id?: string
          reference_range_max?: number | null
          reference_range_min?: number | null
          result_date?: string | null
          result_value?: string | null
          sample_type?: string | null
          test_category?: string
          test_name?: string
          test_type?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      device_integrations: {
        Row: {
          api_version: string | null
          authentication_status: string | null
          created_at: string
          data_permissions_granted: Json | null
          device_model: string | null
          device_name: string | null
          device_type: string
          id: string
          is_active: boolean | null
          last_sync_timestamp: string | null
          patient_id: string | null
          sync_frequency: number | null
          sync_settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_version?: string | null
          authentication_status?: string | null
          created_at?: string
          data_permissions_granted?: Json | null
          device_model?: string | null
          device_name?: string | null
          device_type: string
          id?: string
          is_active?: boolean | null
          last_sync_timestamp?: string | null
          patient_id?: string | null
          sync_frequency?: number | null
          sync_settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_version?: string | null
          authentication_status?: string | null
          created_at?: string
          data_permissions_granted?: Json | null
          device_model?: string | null
          device_name?: string | null
          device_type?: string
          id?: string
          is_active?: boolean | null
          last_sync_timestamp?: string | null
          patient_id?: string | null
          sync_frequency?: number | null
          sync_settings?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_processing_logs: {
        Row: {
          ai_analysis_status: string
          ai_structured_data: Json | null
          confidence_score: number | null
          created_at: string
          error_message: string | null
          extracted_text_preview: string | null
          file_size: number
          filename: string
          id: string
          patient_id: string | null
          processing_status: string
          storage_path: string | null
          updated_at: string
          upload_status: string
          user_id: string
        }
        Insert: {
          ai_analysis_status?: string
          ai_structured_data?: Json | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          extracted_text_preview?: string | null
          file_size: number
          filename: string
          id?: string
          patient_id?: string | null
          processing_status?: string
          storage_path?: string | null
          updated_at?: string
          upload_status?: string
          user_id: string
        }
        Update: {
          ai_analysis_status?: string
          ai_structured_data?: Json | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          extracted_text_preview?: string | null
          file_size?: number
          filename?: string
          id?: string
          patient_id?: string | null
          processing_status?: string
          storage_path?: string | null
          updated_at?: string
          upload_status?: string
          user_id?: string
        }
        Relationships: []
      }
      health_reports: {
        Row: {
          created_at: string
          file_path: string | null
          file_size: number | null
          generated_at: string
          id: string
          page_count: number | null
          patient_id: string
          report_data: Json
          report_type: string
          shared_with: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          generated_at?: string
          id?: string
          page_count?: number | null
          patient_id: string
          report_data: Json
          report_type: string
          shared_with?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string | null
          file_size?: number | null
          generated_at?: string
          id?: string
          page_count?: number | null
          patient_id?: string
          report_data?: Json
          report_type?: string
          shared_with?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          comments: string | null
          created_at: string
          feedback_type: string
          id: string
          insight_id: string | null
          patient_id: string
          rating: number | null
        }
        Insert: {
          comments?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          insight_id?: string | null
          patient_id: string
          rating?: number | null
        }
        Update: {
          comments?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          insight_id?: string | null
          patient_id?: string
          rating?: number | null
        }
        Relationships: []
      }
      user_patients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string
          display_name: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          gender: string | null
          id: string
          insurance_group_number: string | null
          insurance_policy_number: string | null
          insurance_provider: string | null
          is_primary: boolean | null
          last_name: string
          medical_record_number: string | null
          phone_primary: string | null
          phone_secondary: string | null
          primary_care_physician: string | null
          race_ethnicity: string | null
          state: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth: string
          display_name?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          gender?: string | null
          id?: string
          insurance_group_number?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_primary?: boolean | null
          last_name: string
          medical_record_number?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          primary_care_physician?: string | null
          race_ethnicity?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string
          display_name?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          insurance_group_number?: string | null
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          is_primary?: boolean | null
          last_name?: string
          medical_record_number?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          primary_care_physician?: string | null
          race_ethnicity?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_sql: {
        Args: { query_text: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
