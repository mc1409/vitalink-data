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
      cardiovascular_tests: {
        Row: {
          axis_degrees: number | null
          blood_pressure_peak: string | null
          created_at: string
          ecg_interpretation: string | null
          exercise_duration: number | null
          findings: string | null
          heart_rate: number | null
          id: string
          interpretation: string | null
          max_heart_rate: number | null
          mets_achieved: number | null
          patient_id: string
          performing_facility: string | null
          performing_physician: string | null
          pr_interval: number | null
          qrs_duration: number | null
          qt_interval: number | null
          qtc_interval: number | null
          rhythm: string | null
          stress_test_result: string | null
          stress_test_type: string | null
          target_heart_rate: number | null
          test_date: string
          test_status: string | null
          test_type: string
          updated_at: string
        }
        Insert: {
          axis_degrees?: number | null
          blood_pressure_peak?: string | null
          created_at?: string
          ecg_interpretation?: string | null
          exercise_duration?: number | null
          findings?: string | null
          heart_rate?: number | null
          id?: string
          interpretation?: string | null
          max_heart_rate?: number | null
          mets_achieved?: number | null
          patient_id: string
          performing_facility?: string | null
          performing_physician?: string | null
          pr_interval?: number | null
          qrs_duration?: number | null
          qt_interval?: number | null
          qtc_interval?: number | null
          rhythm?: string | null
          stress_test_result?: string | null
          stress_test_type?: string | null
          target_heart_rate?: number | null
          test_date: string
          test_status?: string | null
          test_type: string
          updated_at?: string
        }
        Update: {
          axis_degrees?: number | null
          blood_pressure_peak?: string | null
          created_at?: string
          ecg_interpretation?: string | null
          exercise_duration?: number | null
          findings?: string | null
          heart_rate?: number | null
          id?: string
          interpretation?: string | null
          max_heart_rate?: number | null
          mets_achieved?: number | null
          patient_id?: string
          performing_facility?: string | null
          performing_physician?: string | null
          pr_interval?: number | null
          qrs_duration?: number | null
          qt_interval?: number | null
          qtc_interval?: number | null
          rhythm?: string | null
          stress_test_result?: string | null
          stress_test_type?: string | null
          target_heart_rate?: number | null
          test_date?: string
          test_status?: string | null
          test_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cardiovascular_tests_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      imaging_studies: {
        Row: {
          body_part: string | null
          contrast_type: string | null
          contrast_used: boolean | null
          created_at: string
          findings: string | null
          id: string
          images_available: boolean | null
          impression: string | null
          ordering_physician: string | null
          patient_id: string
          performing_facility: string | null
          radiologist: string | null
          report_available: boolean | null
          study_date: string
          study_status: string | null
          study_subtype: string | null
          study_type: string
          updated_at: string
        }
        Insert: {
          body_part?: string | null
          contrast_type?: string | null
          contrast_used?: boolean | null
          created_at?: string
          findings?: string | null
          id?: string
          images_available?: boolean | null
          impression?: string | null
          ordering_physician?: string | null
          patient_id: string
          performing_facility?: string | null
          radiologist?: string | null
          report_available?: boolean | null
          study_date: string
          study_status?: string | null
          study_subtype?: string | null
          study_type: string
          updated_at?: string
        }
        Update: {
          body_part?: string | null
          contrast_type?: string | null
          contrast_used?: boolean | null
          created_at?: string
          findings?: string | null
          id?: string
          images_available?: boolean | null
          impression?: string | null
          ordering_physician?: string | null
          patient_id?: string
          performing_facility?: string | null
          radiologist?: string | null
          report_available?: boolean | null
          study_date?: string
          study_status?: string | null
          study_subtype?: string | null
          study_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imaging_studies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          abnormal_flag: string | null
          created_at: string
          id: string
          interpretation: string | null
          lab_test_id: string
          numeric_value: number | null
          reference_range_max: number | null
          reference_range_min: number | null
          reference_range_text: string | null
          result_name: string
          result_status: string | null
          reviewing_physician: string | null
          text_value: string | null
          units: string | null
          updated_at: string
        }
        Insert: {
          abnormal_flag?: string | null
          created_at?: string
          id?: string
          interpretation?: string | null
          lab_test_id: string
          numeric_value?: number | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          reference_range_text?: string | null
          result_name: string
          result_status?: string | null
          reviewing_physician?: string | null
          text_value?: string | null
          units?: string | null
          updated_at?: string
        }
        Update: {
          abnormal_flag?: string | null
          created_at?: string
          id?: string
          interpretation?: string | null
          lab_test_id?: string
          numeric_value?: number | null
          reference_range_max?: number | null
          reference_range_min?: number | null
          reference_range_text?: string | null
          result_name?: string
          result_status?: string | null
          reviewing_physician?: string | null
          text_value?: string | null
          units?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_lab_test_id_fkey"
            columns: ["lab_test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          collection_date: string | null
          created_at: string
          fasting_required: boolean | null
          id: string
          notes: string | null
          order_date: string
          ordering_physician: string | null
          patient_id: string
          performing_lab: string | null
          priority: string | null
          result_date: string | null
          specimen_type: string | null
          test_category: string
          test_code: string | null
          test_name: string
          test_status: string | null
          test_subcategory: string | null
          updated_at: string
        }
        Insert: {
          collection_date?: string | null
          created_at?: string
          fasting_required?: boolean | null
          id?: string
          notes?: string | null
          order_date: string
          ordering_physician?: string | null
          patient_id: string
          performing_lab?: string | null
          priority?: string | null
          result_date?: string | null
          specimen_type?: string | null
          test_category: string
          test_code?: string | null
          test_name: string
          test_status?: string | null
          test_subcategory?: string | null
          updated_at?: string
        }
        Update: {
          collection_date?: string | null
          created_at?: string
          fasting_required?: boolean | null
          id?: string
          notes?: string | null
          order_date?: string
          ordering_physician?: string | null
          patient_id?: string
          performing_lab?: string | null
          priority?: string | null
          result_date?: string | null
          specimen_type?: string | null
          test_category?: string
          test_code?: string | null
          test_name?: string
          test_status?: string | null
          test_subcategory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_tests_patient_id_fkey"
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
          race_ethnicity?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
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
      [_ in never]: never
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
