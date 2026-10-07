import type { Routine, RoutineCode } from '../domain/types';

/**
 * Rutinas del plan: A, B, C de gimnasio, H1 y H2 de casa, Z2 cardio libre, DL deload.
 * En orden de aparición en el plan.
 */
export const ROUTINES: Routine[] = [
  {
    "code": "A",
    "name": "A · Sentadilla + pecho",
    "emoji": "🅰️",
    "place": "gym",
    "kneeLoad": "high",
    "estMinutes": [
      55,
      65
    ],
    "exercises": [
      {
        "id": "c-cardio",
        "sets": 1,
        "mode": "cardio",
        "min": 10,
        "prog": "off",
        "cue": "Bici, elíptica, cinta inclinada o caminar"
      },
      {
        "id": "3281",
        "sets": 3,
        "mode": "reps",
        "reps": 5,
        "prog": "linear",
        "inc": 2.5,
        "rest": "2-3 min",
        "cue": "Profundidad cómoda: dolor máximo 3/10"
      },
      {
        "id": "0748",
        "sets": 3,
        "mode": "reps",
        "reps": 5,
        "prog": "linear",
        "inc": 2.5,
        "rest": "2-3 min"
      },
      {
        "id": "0579",
        "sets": 3,
        "mode": "reps",
        "reps": 12,
        "repsMin": 8,
        "prog": "double",
        "inc": 2.5,
        "rest": "90-120 s"
      },
      {
        "id": "0586",
        "sets": 2,
        "mode": "reps",
        "reps": 15,
        "repsMin": 10,
        "prog": "double",
        "inc": 2.5,
        "rest": "60-90 s"
      },
      {
        "id": "0334",
        "sets": 2,
        "mode": "reps",
        "reps": 15,
        "repsMin": 12,
        "prog": "double",
        "inc": 1,
        "rest": "60 s"
      },
      {
        "id": "c-plank",
        "sets": 3,
        "mode": "time",
        "sec": 30,
        "prog": "time",
        "rest": "45-60 s"
      }
    ]
  },
  {
    "code": "B",
    "name": "B · Cadera + espalda (sin pecho)",
    "emoji": "🅱️",
    "place": "gym",
    "kneeLoad": "low",
    "estMinutes": [
      55,
      65
    ],
    "exercises": [
      {
        "id": "c-cardio",
        "sets": 1,
        "mode": "cardio",
        "min": 10,
        "prog": "off",
        "cue": "Bici, elíptica, cinta inclinada o caminar"
      },
      {
        "id": "0085",
        "sets": 3,
        "mode": "reps",
        "reps": 5,
        "prog": "linear",
        "inc": 2.5,
        "rest": "2-3 min"
      },
      {
        "id": "0861",
        "sets": 3,
        "mode": "reps",
        "reps": 12,
        "repsMin": 8,
        "prog": "double",
        "inc": 2.5,
        "rest": "90-120 s"
      },
      {
        "id": "0405",
        "sets": 3,
        "mode": "reps",
        "reps": 10,
        "repsMin": 6,
        "prog": "double",
        "inc": 2,
        "rest": "2 min"
      },
      {
        "id": "0196",
        "sets": 3,
        "mode": "reps",
        "reps": 15,
        "repsMin": 10,
        "prog": "double",
        "inc": 2.5,
        "rest": "90 s"
      },
      {
        "id": "0294",
        "sets": 2,
        "mode": "reps",
        "reps": 15,
        "repsMin": 10,
        "prog": "double",
        "inc": 1,
        "rest": "60 s"
      },
      {
        "id": "0594",
        "sets": 2,
        "mode": "reps",
        "reps": 15,
        "repsMin": 12,
        "prog": "double",
        "inc": 2.5,
        "rest": "60 s"
      },
      {
        "id": "0276",
        "sets": 2,
        "mode": "reps",
        "reps": 10,
        "prog": "off",
        "rest": "45-60 s"
      }
    ]
  },
  {
    "code": "C",
    "name": "C · Prensa lenta + inclinado",
    "emoji": "©️",
    "place": "gym",
    "kneeLoad": "high",
    "estMinutes": [
      50,
      60
    ],
    "exercises": [
      {
        "id": "c-cardio",
        "sets": 1,
        "mode": "cardio",
        "min": 10,
        "prog": "off",
        "cue": "Bici, elíptica, cinta inclinada o caminar"
      },
      {
        "id": "0739",
        "sets": 3,
        "mode": "reps",
        "reps": 12,
        "repsMin": 10,
        "prog": "double",
        "inc": 5,
        "rest": "2 min",
        "cue": "Tempo lento: 3 s bajando, 2-3 s subiendo"
      },
      {
        "id": "0757",
        "sets": 3,
        "mode": "reps",
        "reps": 12,
        "repsMin": 8,
        "prog": "double",
        "inc": 2.5,
        "rest": "2 min"
      },
      {
        "id": "0861",
        "sets": 3,
        "mode": "reps",
        "reps": 12,
        "repsMin": 10,
        "prog": "double",
        "inc": 2.5,
        "rest": "90-120 s"
      },
      {
        "id": "0585",
        "sets": 3,
        "mode": "reps",
        "reps": 12,
        "repsMin": 10,
        "prog": "double",
        "inc": 2.5,
        "rest": "90 s",
        "cue": "Tempo lento: 3 s bajando, 2-3 s subiendo"
      },
      {
        "id": "0602",
        "sets": 2,
        "mode": "reps",
        "reps": 15,
        "repsMin": 12,
        "prog": "double",
        "inc": 2.5,
        "rest": "60 s"
      },
      {
        "id": "0200",
        "sets": 2,
        "mode": "reps",
        "reps": 15,
        "repsMin": 10,
        "prog": "double",
        "inc": 2.5,
        "rest": "60 s"
      }
    ]
  },
  {
    "code": "H1",
    "name": "Casa 1 · fuerza sin material",
    "emoji": "🏠",
    "place": "home",
    "kneeLoad": "low",
    "estMinutes": [
      20,
      25
    ],
    "exercises": [
      {
        "id": "c-wallsit",
        "sets": 3,
        "mode": "time",
        "sec": 30,
        "prog": "time",
        "rest": "2 min",
        "cue": "Rodillas a 60-90º según tolerancia"
      },
      {
        "id": "3013",
        "sets": 3,
        "mode": "reps",
        "reps": 20,
        "repsMin": 12,
        "prog": "double"
      },
      {
        "id": "0662",
        "sets": 3,
        "mode": "reps",
        "reps": 12,
        "repsMin": 8,
        "prog": "double",
        "cue": "Flexión normal; si no llegas al rango, apoya las manos en una mesa"
      },
      {
        "id": "0292",
        "sets": 3,
        "mode": "reps",
        "reps": 15,
        "repsMin": 10,
        "prog": "double",
        "cue": "Mochila con 5-10 kg; apoya mano y rodilla en una silla"
      },
      {
        "id": "1490",
        "sets": 2,
        "mode": "reps",
        "reps": 20,
        "repsMin": 15,
        "prog": "double"
      },
      {
        "id": "0276",
        "sets": 3,
        "mode": "reps",
        "reps": 10,
        "prog": "off",
        "rest": "45-60 s"
      }
    ]
  },
  {
    "code": "H2",
    "name": "Casa 2 · caminar + core",
    "emoji": "🚶",
    "place": "home",
    "kneeLoad": "none",
    "estMinutes": [
      40,
      45
    ],
    "exercises": [
      {
        "id": "c-cardio",
        "sets": 1,
        "mode": "cardio",
        "min": 30,
        "prog": "off",
        "cue": "Bici, elíptica, cinta inclinada o caminar"
      },
      {
        "id": "3239",
        "sets": 3,
        "mode": "reps",
        "reps": 16,
        "prog": "off",
        "cue": "8 toques por lado"
      },
      {
        "id": "3544",
        "sets": 2,
        "mode": "time",
        "sec": 20,
        "prog": "time"
      },
      {
        "id": "3561",
        "sets": 2,
        "mode": "reps",
        "reps": 10,
        "prog": "off"
      },
      {
        "id": "c-plank",
        "sets": 3,
        "mode": "time",
        "sec": 30,
        "prog": "time",
        "rest": "45-60 s"
      }
    ]
  },
  {
    "code": "Z2",
    "name": "Cardio libre · zona 2",
    "emoji": "🚴",
    "place": "any",
    "kneeLoad": "none",
    "estMinutes": [
      30,
      40
    ],
    "exercises": [
      {
        "id": "c-cardio",
        "sets": 1,
        "mode": "cardio",
        "min": 30,
        "prog": "off",
        "cue": "Bici, elíptica, cinta inclinada o caminar"
      }
    ]
  },
  {
    "code": "DL",
    "name": "Deload (semana ligera)",
    "emoji": "🌿",
    "place": "gym",
    "kneeLoad": "low",
    "estMinutes": [
      40,
      50
    ],
    "excludeFromProgression": true,
    "exercises": [
      {
        "id": "c-cardio",
        "sets": 1,
        "mode": "cardio",
        "min": 10,
        "prog": "off",
        "cue": "Bici, elíptica, cinta inclinada o caminar"
      },
      {
        "id": "c-iso-ext",
        "sets": 4,
        "mode": "time",
        "sec": 30,
        "prog": "off",
        "rest": "2 min",
        "cue": "Rodilla a ~60º, empuja al 70 % sin mover la palanca"
      },
      {
        "id": "3281",
        "sets": 2,
        "mode": "reps",
        "reps": 5,
        "prog": "off",
        "rest": "2-3 min",
        "cue": "Profundidad cómoda: dolor máximo 3/10"
      },
      {
        "id": "0748",
        "sets": 2,
        "mode": "reps",
        "reps": 5,
        "prog": "off",
        "rest": "2-3 min"
      },
      {
        "id": "0085",
        "sets": 2,
        "mode": "reps",
        "reps": 5,
        "prog": "off",
        "rest": "2-3 min"
      },
      {
        "id": "0861",
        "sets": 2,
        "mode": "reps",
        "reps": 10,
        "prog": "off",
        "rest": "90-120 s"
      },
      {
        "id": "0579",
        "sets": 2,
        "mode": "reps",
        "reps": 10,
        "prog": "off",
        "rest": "90-120 s"
      }
    ]
  }
];

/**
 * Índice por código para acceso rápido.
 */
export const ROUTINE_BY_CODE: Record<RoutineCode, Routine> = {
  'A': ROUTINES[0]!,
  'B': ROUTINES[1]!,
  'C': ROUTINES[2]!,
  'H1': ROUTINES[3]!,
  'H2': ROUTINES[4]!,
  'Z2': ROUTINES[5]!,
  'DL': ROUTINES[6]!
};
