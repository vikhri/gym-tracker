export interface Set {
  id: string;
  reps: number | null;
  weight: number | null;
}

export interface WorkoutExercise {
  id:string;
  exerciseId: string;
  sets: Set[];
  weightUnit?: 'kg' | 'lb';
}

export interface Workout {
  id: string;
  date: string; // ISO string date
  exercises: WorkoutExercise[];
  isSynced?: boolean; // Track sync status
  createdAt?: number; // Used for local sorting
}

export interface Exercise {
  id: string;
  name: string;
  coefficient?: 'x1' | 'x2' | 'gravitron';
  isSynced?: boolean;
}

export interface WeightEntry {
  id: string;
  date: string; // ISO string date
  weight: number;
}