
export interface Set {
  id: string;
  reps: number;
  weight: number;
}

export interface WorkoutExercise {
  id:string;
  exerciseId: string;
  sets: Set[];
}

export interface Workout {
  id: string;
  date: string; // ISO string date
  exercises: WorkoutExercise[];
}

export interface Exercise {
  id: string;
  name: string;
  coefficient?: 'x1' | 'x2' | 'gravitron';
}

export interface WeightEntry {
  id: string;
  date: string; // ISO string date
  weight: number;
}