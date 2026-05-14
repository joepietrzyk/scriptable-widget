// Edit this file to change your weekly workout schedule.
// workoutType: label shown in the widget header (e.g. "Run", "Strength", "Rest")
// isOutdoor:   true → show weather + gear advice; false → skip it

export interface DaySchedule {
  workoutType: string;
  isOutdoor: boolean;
}

export const weeklySchedule: Record<string, DaySchedule> = {
  sunday:    { workoutType: "Rest",     isOutdoor: false },
  monday:    { workoutType: "Run",      isOutdoor: true  },
  tuesday:   { workoutType: "Rest",     isOutdoor: false },
  wednesday: { workoutType: "Run",      isOutdoor: true  },
  thursday:  { workoutType: "Rest",     isOutdoor: false },
  friday:    { workoutType: "Run",      isOutdoor: true  },
  saturday:  { workoutType: "Run",      isOutdoor: true  },
};
