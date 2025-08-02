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

      // First get the user's profile to find their primary patient
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('primary_patient_id')
        .eq('user_id', user.id)
        .single();

      console.log('🔍 PROFILE QUERY RESULT:', {
        profile: profile,
        error: profileError,
        primaryPatientId: profile?.primary_patient_id
      });

      if (profileError) {
        console.error('❌ PROFILE ERROR:', profileError);
        throw profileError;
      }

      if (profile?.primary_patient_id) {
        // Get the primary patient details
        const { data: patient, error: patientError } = await supabase
          .from('patients')
          .select('id, first_name, last_name, date_of_birth, gender, user_id')
          .eq('id', profile.primary_patient_id)
          .single();

        console.log('🔍 PRIMARY PATIENT QUERY RESULT:', {
          patient: patient,
          error: patientError
        });

        if (patientError) {
          console.error('❌ PATIENT ERROR:', patientError);
          throw patientError;
        }

        setPrimaryPatientState(patient);
        console.log('✅ PRIMARY PATIENT SET:', patient);
      } else {
        // If no primary patient set, get the first patient for this user
        const { data: patients, error: patientsError } = await supabase
          .from('patients')
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
          setPrimaryPatientState(patients[0]);
          console.log('✅ FALLBACK PATIENT SET:', patients[0]);
          
          // Update the profile to set this as primary patient
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ primary_patient_id: patients[0].id })
            .eq('user_id', user.id);

          if (updateError) {
            console.error('❌ PROFILE UPDATE ERROR:', updateError);
          } else {
            console.log('✅ PROFILE UPDATED with primary patient ID:', patients[0].id);
          }
        } else {
          console.log('⚠️ NO PATIENTS FOUND for user:', user.id);
          setPrimaryPatientState(null);
        }
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
      // Update the profile to set the new primary patient
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ primary_patient_id: patientId })
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
      const { data: newPatient, error: createError } = await supabase
        .from('patients')
        .insert({
          ...patientData,
          user_id: user.id
        })
        .select()
        .single();

      if (createError) {
        return { error: createError };
      }

      // If this is the first patient, set it as primary
      if (!primaryPatient) {
        await setPrimaryPatient(newPatient.id);
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