/**
 * Guía de entrenamiento: fases, reglas, objetivos y recomendaciones.
 * Versión condensada de plan_entrenamiento.md, rutinas_opengym.md, guia_garmin_fenix8.md y coach_opengym.md.
 */

export interface GuideSection {
  id: string;
  title: string;
  blocks: (string | { list: string[] } | { table: string[][] })[];
}

export const GUIDE: GuideSection[] = [
  {
    id: 'rotacion',
    title: '1. Rotación A-B-C (sin días fijos)',
    blocks: [
      'Haces las rutinas en rotación **A → B → C → A...** el día que puedas ir. Objetivo: 3 por semana; 2 también cuenta.',
      'Regla clave: **A y C no van en días seguidos** (ambas cargan la rodilla). Si te toca C y ayer hiciste A, haz B y sigue la rotación desde ahí.',
      {
        list: [
          '**Un día de descanso entre sesiones:** lo ideal, sigue la rotación.',
          '**Dos días seguidos:** bien, salvo A y C (cambia a B).',
          '**Tres días seguidos (p. ej. A-B-C):** se puede con RIR 3 y quitando una serie el tercer día.',
          '**Saliendo de una guardia:** nada de fuerza pesada. Como mucho Casa 2 (caminar suave + core).'
        ]
      }
    ]
  },
  {
    id: 'duracion',
    title: '2. Duración máxima 1 h 30',
    blocks: [
      '| Rutina | Estimado | Fase 2 |',
      '|---|---|---|',
      '| **A** (sentadilla + pecho) | ~55-65 min | ~65-75 min |',
      '| **B** (cadera + espalda) | ~55-65 min | ~65-75 min |',
      '| **C** (prensa lenta + inclinado) | ~50-60 min | ~60-70 min |',
      '',
      'Incluye 10 min de cardio de calentamiento, descansos, aproximaciones y cambios de máquina. Referencia real: la A del 7 oct 2026 duró ~65 min.',
      '**Si vas justo:** empareja dos accesorios en superserie (curl + gemelo en B, pájaros + tríceps en C). Ahorras ~8-10 min. Si aún no llegas, quita el último accesorio (nunca los básicos).'
    ]
  },
  {
    id: 'rodilla',
    title: '3. Protocolo de rodilla',
    blocks: [
      'Tres pilares:',
      {
        list: [
          '**Isometría de cuádriceps (a demanda):** ya no va fija en A/B/C. Si llegas con la rodilla molesta, haz 4×30 s a 60º antes de empezar: alivia el dolor de rodilla. Sigue en el Deload.',
          '**Tempo lento:** en C, prensa y extensión van con 3 s bajando, 2-3 s subiendo.',
          '**Regla 3/10:** dolor máximo permitido 3/10 en cualquier ejercicio. Si llega a 4/10, reduce peso o repeticiones.'
        ]
      },
      '**Que evitar:** saltos, correr, zancadas, búlgaras, sentadilla profunda con rebote. **24 h de recuperación** tras la rutina si hay dolor.',
      '**Si la rodilla mejora:** en la Fase 2, si lleva < 3/10 de media, puedes sumar series. Si no, mantén el volumen de la Fase 1.'
    ]
  },
  {
    id: 'fases',
    title: '4. Fases y calendario',
    blocks: [
      'Semana 1 = lunes 5 oct 2026. Objetivo: semana del 18 sep 2027 (50 semanas).',
      {
        table: [
          ['Fase', 'Semanas', 'Fechas', 'Qué cambia'],
          ['**0 · Reentrada**', '1-2', '5 oct – 18 oct 2026', '2 series (omite la última), RIR 3-4, cargas ligeras'],
          ['**1 · Base**', '3-13', '19 oct 2026 – 3 ene 2027', 'Series completas, RIR 1-3. Lineal en básicos, doble en el resto'],
          ['**2 · Construcción**', '14-40', '4 ene – 11 jul 2027', 'Si ≥2,5 sesiones/semana y rodilla <3/10: +1 serie en básicos y 2 accesorios. Si no, Fase 1'],
          ['**3 · Afinado**', '41-50', '12 jul – 19 sep 2027', 'Mismo entrenamiento. Semanas 49-50 a mantenimiento']
        ]
      }
    ]
  },
  {
    id: 'objetivo',
    title: '5. Objetivo: peso y cintura',
    blocks: [
      'Tus cifras salen de Ajustes (altura y peso objetivo); la pantalla Cuerpo las calcula:',
      {
        table: [
          ['Referencia', 'Valor'],
          ['Cintura objetivo', '< mitad de tu altura (cintura/altura < 0,50)'],
          ['Peso de referencia', 'IMC ≤ 25'],
          ['**Peso objetivo**', 'El que fijes en Ajustes']
        ]
      },
      '**Hitos de pérdida acumulada** (según el ritmo):',
      {
        table: [
          ['Objetivo', 'Ritmo', '20 dic 2026', '28 mar 2027', '27 jun 2027', '5 sep 2027'],
          ['−10 kg', '~0,23 kg/sem', '−2,5 kg', '−5 kg', '−7,5 kg', '−10 kg'],
          ['−15 kg', '~0,34 kg/sem', '−4 kg', '−8 kg', '−11,5 kg', '−15 kg'],
          ['−20 kg', '~0,45 kg/sem', '−5 kg', '−10,5 kg', '−15,5 kg', '−20 kg']
        ]
      },
      '**Máximo 0,45 kg/semana** (~0,5 % del peso corporal): por encima aumenta el riesgo de perder músculo. Revisa la cintura cada 2-3 meses: es el criterio principal.'
    ]
  },
  {
    id: 'dieta',
    title: '6. Dieta: déficit moderado de 300-500 kcal/día',
    blocks: [
      '**Proteína:** 140-170 g/día (protege el músculo durante la pérdida de peso).',
      '**Déficit:** 300-500 kcal/día por debajo del mantenimiento.',
      {
        table: [
          ['Bloque', 'Semanas', 'Fechas', 'Comida'],
          ['Déficit 1', '1-11', '5 oct – 20 dic 2026', 'Déficit moderado'],
          ['Mantenimiento', '12-13', '21 dic 2026 – 3 ene 2027', 'Navidad'],
          ['Déficit 2', '14-25', '4 ene – 28 mar 2027', 'Déficit moderado'],
          ['Mantenimiento', '26-27', '29 mar – 11 abr 2027', 'Semana Santa'],
          ['Déficit 3', '28-48', '12 abr – 5 sep 2027', 'Déficit moderado'],
          ['Llegada', '49-50', '6 sep – 19 sep 2027', 'Mantenimiento (peso estable)']
        ]
      },
      '**Total:** 44 semanas de déficit. Las pausas coinciden con fechas difíciles para la dieta (adherencia, no estudios).'
    ]
  },
  {
    id: 'cardio',
    title: '7. Caminar, correr y zona 2',
    blocks: [
      '**Cardio diario:** 30-60 min/día caminando (o elíptica/bici si la rodilla lo permite). No es una rutina formal, solo acumula minutos.',
      '**Zona 2:** ritmo en el que puedas hablar en frases cortas (1-2 sesiones/semana, 30-40 min). En un día sin fuerza o 15-20 min tras la rutina.',
      '**Correr:** opcional, solo si la rodilla no tiene molestias. Camina es suficiente.',
      '**Casa 2 (H2):** 30 min de cardio libre + core 2-3 veces/semana en días sin gimnasio.'
    ]
  },
  {
    id: 'garmin',
    title: '8. Garmin Fenix 8: guiar la sesión',
    blocks: [
      'Crea 3 entrenamientos de tipo **Fuerza** en Garmin Connect: **A**, **B** y **C** (sin días asignados).',
      'Descanso en todos: "Pulsar botón Lap". Calentamiento: **Cardio 10:00** (cualquier máquina).',
      '**Tu flujo:** Garmin guía (serie, reps, descanso), **OpenGym es la fuente de verdad de pesos** (y calcula la siguiente carga). Cota lleva el peso corporal, la cintura, el dolor de rodilla y la dieta.',
      'Los 3 entrenamientos iniciales del Garmin (Day 1/2/3) son antiguos: archívalos o bórralos.'
    ]
  },
  {
    id: 'opengym',
    title: '9. OpenGym: importar y usar',
    blocks: [
      '1. **Importar el plan:** OpenGym → Plan → Compartir → **Import a plan file** → `opengym_plan.json`.',
      '2. **Importar no sobrescribe:** añade rutinas. Borra las antiguas si quieres empezar limpio.',
      '3. **El plan no asigna días:** cada día abre la rutina que toque según la rotación (sección 1).',
      '4. **Pon pesos iniciales:** las dos primeras semanas, con los que te sobren 3-4 reps (RIR 3-4).',
      '5. **Progresión:** OpenGym calcula la siguiente carga. Lineal (peso sube si completas las reps) o doble (reps suben dentro del rango, luego peso).',
      '6. **Pasar los entrenos a Cota:** OpenGym → Settings → Data → **Export backup (JSON)** y aquí, Ajustes → **Importar copia de OpenGym**. Reimportar la misma copia o una más nueva no duplica sesiones.'
    ]
  },
  {
    id: 'coach',
    title: '10. Coach IA de OpenGym (opcional)',
    blocks: [
      'Pon tu propia API key (Anthropic, OpenAI o Gemini) en Settings → AI Coach, un modelo pequeño (Haiku) te ahorra dinero.',
      '**Úsalo para:** "Review my last workout" (da una nota y qué vigilar). No cambia nada automáticamente.',
      '**Cambios de plan:** acépta de uno en uno. **Rechaza:**',
      {
        list: [
          'Saltos, carrera, búlgaras, sentadilla profunda con rebote (rodilla)',
          'Días fijos o crear 4.º día de gimnasio',
          'Quitar el tempo lento',
          'Superar 1 h 30 de sesión'
        ]
      },
      '**Respuestas para su cuestionario inicial:**',
      {
        list: [
          '**Ejercicios favoritos:** Press banca/inclinado, jalón, remo, prensa, extensión cuádriceps, press hombro, curl',
          '**A evitar:** Saltos, correr, zancadas, búlgaras, sentadilla profunda (rodilla)',
          '**Info especial:** tu objetivo y fecha. Turnos: A-B-C sin días fijos, nunca A y C seguidas. Máx 1 h 30. Rodilla: dolor ≤3/10, tempo lento. Casa sin material.'
        ]
      }
    ]
  }
];
