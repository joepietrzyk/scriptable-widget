/**
 * Edit {@link weeklySchedule} below to change your weekly workout plan.
 * Each day maps to a {@link DaySchedule} that controls the widget header and
 * whether weather + gear advice are shown.
 */

/** Configuration for a single day's workout. */
export interface DaySchedule {
  /** Label shown in the widget header (e.g. "Run", "Strength", "Rest"). */
  workoutType: string;
  /** When true, the widget fetches weather and shows gear advice for that day. */
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
