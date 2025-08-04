import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string;
  user_id: string;
}

interface PatientContextType {
  primaryPatient: Patient | null;
  loading: boolean;
  error: string | null;
  refreshPrimaryPatient: () => Promise<void>;
  setPrimaryPatient: (patientId: string) => Promise<{ error: any }>;
  createPatient: (patientData: Omit<Patient, 'id' | 'user_id'>) => Promise<{ error: any; patient?: Patient }>;
}

const PatientContext = createContext<PatientContextType | undefined>(undefined);

export const usePatient = () => {
  const context = useContext(PatientContext);
  if (context === undefined) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
};

export const PatientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const [primaryPatient, setPrimaryPatientState] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrimaryPatient = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 FETCHING PRIMARY PATIENT:', {
        userId: user.id,
        userEmail: user.email
      });

      // Get the primary patient directly from user_patients table
      const { data: patient, error: patientError } = await supabase
        .from('user_patients')
        .select('id, first_name, last_name, date_of_birth, gender, user_id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      console.log('🔍 PRIMARY PATIENT QUERY RESULT:', {
        patient: patient,
        error: patientError
      });

      if (patientError) {
        // If no primary patient found, get the first patient and set as primary
        const { data: patients, error: patientsError } = await supabase
          .from('user_patients')
          .select('id, first_name, last_name, date_of_birth, gender, user_id')
          .eq('user_id', user.id)
          .order('created_at')
          .limit(1);

        console.log('🔍 FALLBACK PATIENTS QUERY RESULT:', {
          patients: patients,
          error: patientsError,
          patientsCount: patients?.length || 0
        });

        if (patientsError) {
          console.error('❌ PATIENTS ERROR:', patientsError);
          throw patientsError;
        }

        if (patients && patients.length > 0) {
          // Set the first patient as primary
          await supabase
            .from('user_patients')
            .update({ is_primary: true })
            .eq('id', patients[0].id);

          setPrimaryPatientState(patients[0]);
          console.log('✅ FALLBACK PATIENT SET AS PRIMARY:', patients[0]);
        } else {
          console.log('⚠️ NO PATIENTS FOUND for user:', user.id);
          setPrimaryPatientState(null);
        }
      } else {
        setPrimaryPatientState(patient);
        console.log('✅ PRIMARY PATIENT SET:', patient);
      }
    } catch (err: any) {
      console.error('❌ ERROR FETCHING PRIMARY PATIENT:', err);
      setError(err.message);
      setPrimaryPatientState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrimaryPatient();
  }, [user]);

  const refreshPrimaryPatient = async () => {
    await fetchPrimaryPatient();
  };

  const setPrimaryPatient = async (patientId: string) => {
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    try {
      // Clear any existing primary patient
      await supabase
        .from('user_patients')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Set the new primary patient
      const { error: updateError } = await supabase
        .from('user_patients')
        .update({ is_primary: true })
        .eq('id', patientId)
        .eq('user_id', user.id);

      if (updateError) {
        return { error: updateError };
      }

      // Refresh the primary patient data
      await refreshPrimaryPatient();
      
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const createPatient = async (patientData: Omit<Patient, 'id' | 'user_id'>) => {
    if (!user) {
      return { error: { message: 'User not authenticated' } };
    }

    try {
      // Check if this is the user's first patient
      const { data: existingPatients } = await supabase
        .from('user_patients')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id);

      const isFirstPatient = !existingPatients || existingPatients.length === 0;

      const { data: newPatient, error: createError } = await supabase
        .from('user_patients')
        .insert({
          ...patientData,
          user_id: user.id,
          is_primary: isFirstPatient // First patient is automatically primary
        })
        .select()
        .single();

      if (createError) {
        return { error: createError };
      }

      if (isFirstPatient) {
        setPrimaryPatientState(newPatient);
      }

      return { error: null, patient: newPatient };
    } catch (err: any) {
      return { error: err };
    }
  };

  const value = {
    primaryPatient,
    loading,
    error,
    refreshPrimaryPatient,
    setPrimaryPatient,
    createPatient,
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
};