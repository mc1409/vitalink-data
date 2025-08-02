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
      allergies: {
        Row: {
          active: boolean | null
          allergen: string
          created_at: string
          id: string
          notes: string | null
          onset_date: string | null
          patient_id: string
          reaction: string
          severity: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          allergen: string
          created_at?: string
          id?: string
          notes?: string | null
          onset_date?: string | null
          patient_id: string
          reaction: string
          severity?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          allergen?: string
          created_at?: string
          id?: string
          notes?: string | null
          onset_date?: string | null
          patient_id?: string
          reaction?: string
          severity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
          exercise_goal_minutes: number | null
          exercise_minutes: number | null
          flights_climbed: number | null
          id: string
          measurement_date: string
          measurement_time: string
          moderate_activity_minutes: number | null
          move_goal_calories: number | null
          move_goal_percentage: number | null
          patient_id: string
          raw_data: Json | null
          reference_range_max: number | null
          reference_range_min: number | null
          sedentary_minutes: number | null
          stand_goal_hours: number | null
          stand_hours: number | null
          steps_count: number | null
          total_calories: number | null
          unit: string | null
          updated_at: string
          vigorous_activity_minutes: number | null
          workout_avg_heart_rate: number | null
          workout_calories: number | null
          workout_distance_meters: number | null
          workout_duration_minutes: number | null
          workout_max_heart_rate: number | null
          workout_type: string | null
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
          exercise_goal_minutes?: number | null
          exercise_minutes?: number | null
          flights_climbed?: number | null
          id?: string
          measurement_date: string
          measurement_time: string
          moderate_activity_minutes?: number | null
          move_goal_calories?: number | null
          move_goal_percentage?: number | null
          patient_id: string
          raw_data?: Json | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          sedentary_minutes?: number | null
          stand_goal_hours?: number | null
          stand_hours?: number | null
          steps_count?: number | null
          total_calories?: number | null
          unit?: string | null
          updated_at?: string
          vigorous_activity_minutes?: number | null
          workout_avg_heart_rate?: number | null
          workout_calories?: number | null
          workout_distance_meters?: number | null
          workout_duration_minutes?: number | null
          workout_max_heart_rate?: number | null
          workout_type?: string | null
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
          exercise_goal_minutes?: number | null
          exercise_minutes?: number | null
          flights_climbed?: number | null
          id?: string
          measurement_date?: string
          measurement_time?: string
          moderate_activity_minutes?: number | null
          move_goal_calories?: number | null
          move_goal_percentage?: number | null
          patient_id?: string
          raw_data?: Json | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          sedentary_minutes?: number | null
          stand_goal_hours?: number | null
          stand_hours?: number | null
          steps_count?: number | null
          total_calories?: number | null
          unit?: string | null
          updated_at?: string
          vigorous_activity_minutes?: number | null
          workout_avg_heart_rate?: number | null
          workout_calories?: number | null
          workout_distance_meters?: number | null
          workout_duration_minutes?: number | null
          workout_max_heart_rate?: number | null
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biomarker_activity_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
          lab_processing_date: string | null
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
          raw_data: Json | null
          recommendations: Json | null
          recovery_score: number | null
          reference_range_max: number | null
          reference_range_min: number | null
          report_generated_date: string | null
          resting_hr_score: number | null
          sample_collection_date: string | null
          sample_type: string | null
          skin_temperature: number | null
          skin_temperature_deviation: number | null
          sleep_performance_score: number | null
          species_richness: number | null
          strain_score: number | null
          stress_score: number | null
          test_date: string
          test_provider: string
          test_version: string | null
          unit: string | null
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
          lab_processing_date?: string | null
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
          raw_data?: Json | null
          recommendations?: Json | null
          recovery_score?: number | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          report_generated_date?: string | null
          resting_hr_score?: number | null
          sample_collection_date?: string | null
          sample_type?: string | null
          skin_temperature?: number | null
          skin_temperature_deviation?: number | null
          sleep_performance_score?: number | null
          species_richness?: number | null
          strain_score?: number | null
          stress_score?: number | null
          test_date: string
          test_provider: string
          test_version?: string | null
          unit?: string | null
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
          lab_processing_date?: string | null
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
          raw_data?: Json | null
          recommendations?: Json | null
          recovery_score?: number | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          report_generated_date?: string | null
          resting_hr_score?: number | null
          sample_collection_date?: string | null
          sample_type?: string | null
          skin_temperature?: number | null
          skin_temperature_deviation?: number | null
          sleep_performance_score?: number | null
          species_richness?: number | null
          strain_score?: number | null
          stress_score?: number | null
          test_date?: string
          test_provider?: string
          test_version?: string | null
          unit?: string | null
          updated_at?: string
          vitamin_b_production?: number | null
          vitamin_k_production?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "biomarker_biological_genetic_microbiome_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
          hr_zone_1_minutes: number | null
          hr_zone_2_minutes: number | null
          hr_zone_3_minutes: number | null
          hr_zone_4_minutes: number | null
          hr_zone_5_minutes: number | null
          hrv_rmssd: number | null
          hrv_score: number | null
          hrv_sdnn: number | null
          id: string
          irregular_rhythm_detected: boolean | null
          max_heart_rate: number | null
          measurement_context: string | null
          measurement_time: string
          min_heart_rate: number | null
          patient_id: string
          raw_data: Json | null
          recovery_heart_rate: number | null
          reference_range_max: number | null
          reference_range_min: number | null
          resting_heart_rate: number | null
          systolic_bp: number | null
          unit: string | null
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
          hr_zone_1_minutes?: number | null
          hr_zone_2_minutes?: number | null
          hr_zone_3_minutes?: number | null
          hr_zone_4_minutes?: number | null
          hr_zone_5_minutes?: number | null
          hrv_rmssd?: number | null
          hrv_score?: number | null
          hrv_sdnn?: number | null
          id?: string
          irregular_rhythm_detected?: boolean | null
          max_heart_rate?: number | null
          measurement_context?: string | null
          measurement_time: string
          min_heart_rate?: number | null
          patient_id: string
          raw_data?: Json | null
          recovery_heart_rate?: number | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          resting_heart_rate?: number | null
          systolic_bp?: number | null
          unit?: string | null
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
          hr_zone_1_minutes?: number | null
          hr_zone_2_minutes?: number | null
          hr_zone_3_minutes?: number | null
          hr_zone_4_minutes?: number | null
          hr_zone_5_minutes?: number | null
          hrv_rmssd?: number | null
          hrv_score?: number | null
          hrv_sdnn?: number | null
          id?: string
          irregular_rhythm_detected?: boolean | null
          max_heart_rate?: number | null
          measurement_context?: string | null
          measurement_time?: string
          min_heart_rate?: number | null
          patient_id?: string
          raw_data?: Json | null
          recovery_heart_rate?: number | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          resting_heart_rate?: number | null
          systolic_bp?: number | null
          unit?: string | null
          updated_at?: string
          vo2_max?: number | null
          walking_heart_rate?: number | null
          workout_heart_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "biomarker_heart_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      biomarker_nutrition: {
        Row: {
          added_sugar_grams: number | null
          alcohol_grams: number | null
          biotin_mcg: number | null
          breakfast_calories: number | null
          caffeine_mg: number | null
          calcium_mg: number | null
          carbohydrates_grams: number | null
          created_at: string
          data_source: string
          dinner_calories: number | null
          eating_window_hours: number | null
          fat_grams: number | null
          fiber_grams: number | null
          folate_mcg: number | null
          id: string
          iron_mg: number | null
          lunch_calories: number | null
          magnesium_mg: number | null
          meal_data: Json | null
          measurement_date: string
          measurement_time: string
          niacin_mg: number | null
          pantothenic_acid_mg: number | null
          patient_id: string
          phosphorus_mg: number | null
          potassium_mg: number | null
          protein_grams: number | null
          reference_range_max: number | null
          reference_range_min: number | null
          riboflavin_mg: number | null
          snack_calories: number | null
          sodium_mg: number | null
          sugar_grams: number | null
          supplement_data: Json | null
          thiamine_mg: number | null
          total_calories: number | null
          unit: string | null
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
          breakfast_calories?: number | null
          caffeine_mg?: number | null
          calcium_mg?: number | null
          carbohydrates_grams?: number | null
          created_at?: string
          data_source: string
          dinner_calories?: number | null
          eating_window_hours?: number | null
          fat_grams?: number | null
          fiber_grams?: number | null
          folate_mcg?: number | null
          id?: string
          iron_mg?: number | null
          lunch_calories?: number | null
          magnesium_mg?: number | null
          meal_data?: Json | null
          measurement_date: string
          measurement_time: string
          niacin_mg?: number | null
          pantothenic_acid_mg?: number | null
          patient_id: string
          phosphorus_mg?: number | null
          potassium_mg?: number | null
          protein_grams?: number | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          riboflavin_mg?: number | null
          snack_calories?: number | null
          sodium_mg?: number | null
          sugar_grams?: number | null
          supplement_data?: Json | null
          thiamine_mg?: number | null
          total_calories?: number | null
          unit?: string | null
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
          breakfast_calories?: number | null
          caffeine_mg?: number | null
          calcium_mg?: number | null
          carbohydrates_grams?: number | null
          created_at?: string
          data_source?: string
          dinner_calories?: number | null
          eating_window_hours?: number | null
          fat_grams?: number | null
          fiber_grams?: number | null
          folate_mcg?: number | null
          id?: string
          iron_mg?: number | null
          lunch_calories?: number | null
          magnesium_mg?: number | null
          meal_data?: Json | null
          measurement_date?: string
          measurement_time?: string
          niacin_mg?: number | null
          pantothenic_acid_mg?: number | null
          patient_id?: string
          phosphorus_mg?: number | null
          potassium_mg?: number | null
          protein_grams?: number | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          riboflavin_mg?: number | null
          snack_calories?: number | null
          sodium_mg?: number | null
          sugar_grams?: number | null
          supplement_data?: Json | null
          thiamine_mg?: number | null
          total_calories?: number | null
          unit?: string | null
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
        Relationships: [
          {
            foreignKeyName: "biomarker_nutrition_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      biomarker_sleep: {
        Row: {
          ambient_light_level: number | null
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
          noise_level: number | null
          patient_id: string
          raw_data: Json | null
          reference_range_max: number | null
          reference_range_min: number | null
          rem_sleep_minutes: number | null
          restfulness_score: number | null
          room_temperature: number | null
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
          unit: string | null
          updated_at: string
          wake_time: string | null
        }
        Insert: {
          ambient_light_level?: number | null
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
          noise_level?: number | null
          patient_id: string
          raw_data?: Json | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          rem_sleep_minutes?: number | null
          restfulness_score?: number | null
          room_temperature?: number | null
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
          unit?: string | null
          updated_at?: string
          wake_time?: string | null
        }
        Update: {
          ambient_light_level?: number | null
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
          noise_level?: number | null
          patient_id?: string
          raw_data?: Json | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          rem_sleep_minutes?: number | null
          restfulness_score?: number | null
          room_temperature?: number | null
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
          unit?: string | null
          updated_at?: string
          wake_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biomarker_sleep_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_diagnostic_cardiovascular: {
        Row: {
          axis_degrees: number | null
          blood_pressure_peak: string | null
          created_at: string
          data_source: string
          diastolic_bp: number | null
          ecg_interpretation: string | null
          exercise_duration: number | null
          findings: string | null
          heart_rate: number | null
          id: string
          interpretation: string | null
          max_heart_rate: number | null
          measurement_time: string
          mets_achieved: number | null
          patient_id: string
          performing_facility: string | null
          performing_physician: string | null
          pr_interval: number | null
          qrs_duration: number | null
          qt_interval: number | null
          qtc_interval: number | null
          raw_data: Json | null
          reference_range_max: number | null
          reference_range_min: number | null
          rhythm: string | null
          stress_test_result: string | null
          stress_test_type: string | null
          systolic_bp: number | null
          target_heart_rate: number | null
          test_date: string
          test_status: string | null
          test_type: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          axis_degrees?: number | null
          blood_pressure_peak?: string | null
          created_at?: string
          data_source: string
          diastolic_bp?: number | null
          ecg_interpretation?: string | null
          exercise_duration?: number | null
          findings?: string | null
          heart_rate?: number | null
          id?: string
          interpretation?: string | null
          max_heart_rate?: number | null
          measurement_time: string
          mets_achieved?: number | null
          patient_id: string
          performing_facility?: string | null
          performing_physician?: string | null
          pr_interval?: number | null
          qrs_duration?: number | null
          qt_interval?: number | null
          qtc_interval?: number | null
          raw_data?: Json | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          rhythm?: string | null
          stress_test_result?: string | null
          stress_test_type?: string | null
          systolic_bp?: number | null
          target_heart_rate?: number | null
          test_date: string
          test_status?: string | null
          test_type: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          axis_degrees?: number | null
          blood_pressure_peak?: string | null
          created_at?: string
          data_source?: string
          diastolic_bp?: number | null
          ecg_interpretation?: string | null
          exercise_duration?: number | null
          findings?: string | null
          heart_rate?: number | null
          id?: string
          interpretation?: string | null
          max_heart_rate?: number | null
          measurement_time?: string
          mets_achieved?: number | null
          patient_id?: string
          performing_facility?: string | null
          performing_physician?: string | null
          pr_interval?: number | null
          qrs_duration?: number | null
          qt_interval?: number | null
          qtc_interval?: number | null
          raw_data?: Json | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          rhythm?: string | null
          stress_test_result?: string | null
          stress_test_type?: string | null
          systolic_bp?: number | null
          target_heart_rate?: number | null
          test_date?: string
          test_status?: string | null
          test_type?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_diagnostic_cardiovascular_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_diagnostic_lab_tests: {
        Row: {
          abnormal_flag: string | null
          active: boolean | null
          allergen: string | null
          collection_date: string | null
          created_at: string
          data_source: string
          fasting_required: boolean | null
          id: string
          interpretation: string | null
          is_out_of_range: boolean | null
          measurement_time: string
          notes: string | null
          numeric_value: number | null
          onset_date: string | null
          order_date: string | null
          ordering_physician: string | null
          patient_id: string
          performing_lab: string | null
          priority: string | null
          raw_data: Json | null
          reaction: string | null
          reference_range_max: number | null
          reference_range_min: number | null
          reference_range_text: string | null
          result_date: string | null
          result_status: string | null
          result_value: string | null
          reviewing_physician: string | null
          sample_type: string | null
          severity: string | null
          standard_test_name: string | null
          test_category: string
          test_code: string | null
          test_name: string
          test_status: string | null
          test_subcategory: string | null
          test_type: string
          text_value: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          abnormal_flag?: string | null
          active?: boolean | null
          allergen?: string | null
          collection_date?: string | null
          created_at?: string
          data_source: string
          fasting_required?: boolean | null
          id?: string
          interpretation?: string | null
          is_out_of_range?: boolean | null
          measurement_time: string
          notes?: string | null
          numeric_value?: number | null
          onset_date?: string | null
          order_date?: string | null
          ordering_physician?: string | null
          patient_id: string
          performing_lab?: string | null
          priority?: string | null
          raw_data?: Json | null
          reaction?: string | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          reference_range_text?: string | null
          result_date?: string | null
          result_status?: string | null
          result_value?: string | null
          reviewing_physician?: string | null
          sample_type?: string | null
          severity?: string | null
          standard_test_name?: string | null
          test_category: string
          test_code?: string | null
          test_name: string
          test_status?: string | null
          test_subcategory?: string | null
          test_type: string
          text_value?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          abnormal_flag?: string | null
          active?: boolean | null
          allergen?: string | null
          collection_date?: string | null
          created_at?: string
          data_source?: string
          fasting_required?: boolean | null
          id?: string
          interpretation?: string | null
          is_out_of_range?: boolean | null
          measurement_time?: string
          notes?: string | null
          numeric_value?: number | null
          onset_date?: string | null
          order_date?: string | null
          ordering_physician?: string | null
          patient_id?: string
          performing_lab?: string | null
          priority?: string | null
          raw_data?: Json | null
          reaction?: string | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          reference_range_text?: string | null
          result_date?: string | null
          result_status?: string | null
          result_value?: string | null
          reviewing_physician?: string | null
          sample_type?: string | null
          severity?: string | null
          standard_test_name?: string | null
          test_category?: string
          test_code?: string | null
          test_name?: string
          test_status?: string | null
          test_subcategory?: string | null
          test_type?: string
          text_value?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_diagnostic_lab_tests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "device_integrations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "document_processing_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string
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
          last_name: string
          medical_record_number: string | null
          phone_primary: string | null
          phone_secondary: string | null
          primary_care_physician: string | null
          profile_id: string | null
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
          last_name: string
          medical_record_number?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          primary_care_physician?: string | null
          profile_id?: string | null
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
          last_name?: string
          medical_record_number?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          primary_care_physician?: string | null
          profile_id?: string | null
          race_ethnicity?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          gender: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
          user_id?: string
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
