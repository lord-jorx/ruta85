import type { ExerciseInfo } from '../domain/types';

/**
 * Catálogo de ejercicios.
 * Incluye todos los ejercicios del plan A-B-C-H1-H2-Z2-DL y sus alternativas.
 * Los ejercicios propios (c-*) tienen custom: true y una descripción.
 */
export const EXERCISES: Record<string, ExerciseInfo> = {
  "1299": {
    "id": "1299",
    "nameEs": "Press inclinado en máquina",
    "nameOg": "lever incline chest press",
    "custom": false
  },
  "1350": {
    "id": "1350",
    "nameEs": "Remo en máquina sentado",
    "nameOg": "lever seated row",
    "custom": false
  },
  "1373": {
    "id": "1373",
    "nameEs": "Gemelo con peso corporal",
    "nameOg": "bodyweight standing calf raise",
    "custom": false
  },
  "1409": {
    "id": "1409",
    "nameEs": "Puente de glúteo con barra",
    "nameOg": "barbell glute bridge",
    "custom": false
  },
  "1459": {
    "id": "1459",
    "nameEs": "Peso muerto rumano con mancuernas",
    "nameOg": "dumbbell romanian deadlift",
    "custom": false
  },
  "1490": {
    "id": "1490",
    "nameEs": "Gemelo en escalón",
    "nameOg": "standing calf raise (on a staircase)",
    "custom": false
  },
  "1760": {
    "id": "1760",
    "nameEs": "Sentadilla goblet (a caja)",
    "nameOg": "dumbbell goblet squat",
    "custom": false
  },
  "2141": {
    "id": "2141",
    "nameEs": "Elíptica",
    "nameOg": "walk elliptical cross trainer",
    "custom": false
  },
  "2188": {
    "id": "2188",
    "nameEs": "Extensión de tríceps sentado con mancuerna",
    "nameOg": "dumbbell seated triceps extension",
    "custom": false
  },
  "2286": {
    "id": "2286",
    "nameEs": "Extensión de cadera en máquina",
    "nameOg": "lever hip extension v. 2",
    "custom": false
  },
  "2287": {
    "id": "2287",
    "nameEs": "Prensa alterna en palanca",
    "nameOg": "lever alternate leg press",
    "custom": false
  },
  "2292": {
    "id": "2292",
    "nameEs": "Pájaros con mancuernas",
    "nameOg": "dumbbell rear delt raise",
    "custom": false
  },
  "2311": {
    "id": "2311",
    "nameEs": "Escaladora (stepmill)",
    "nameOg": "walking on stepmill",
    "custom": false
  },
  "2330": {
    "id": "2330",
    "nameEs": "Jalón al pecho",
    "nameOg": "cable lat pulldown full range of motion",
    "custom": false
  },
  "2611": {
    "id": "2611",
    "nameEs": "Prensa horizontal a una pierna",
    "nameOg": "lever horizontal one leg press",
    "custom": false
  },
  "2736": {
    "id": "2736",
    "nameEs": "Jalón supino en máquina",
    "nameOg": "lever reverse grip lateral pulldown",
    "custom": false
  },
  "3007": {
    "id": "3007",
    "nameEs": "Extensión de cuádriceps con goma",
    "nameOg": "resistance band leg extension",
    "custom": false
  },
  "3013": {
    "id": "3013",
    "nameEs": "Puente de glúteo en suelo",
    "nameOg": "low glute bridge on floor",
    "custom": false
  },
  "3239": {
    "id": "3239",
    "nameEs": "Plancha con toque de hombro",
    "nameOg": "kneeling plank tap shoulder (male)",
    "custom": false
  },
  "3281": {
    "id": "3281",
    "nameEs": "Sentadilla multipower (Smith)",
    "nameOg": "smith full squat",
    "custom": false
  },
  "3523": {
    "id": "3523",
    "nameEs": "Puente de glúteo en banco",
    "nameOg": "glute bridge two legs on bench (male)",
    "custom": false
  },
  "3544": {
    "id": "3544",
    "nameEs": "Plancha lateral inclinada",
    "nameOg": "bodyweight incline side plank",
    "custom": false
  },
  "3561": {
    "id": "3561",
    "nameEs": "Puente de glúteo con marcha",
    "nameOg": "glute bridge march",
    "custom": false
  },
  "3562": {
    "id": "3562",
    "nameEs": "Puente de glúteo con barra en banco",
    "nameOg": "barbell glute bridge two legs on bench (male)",
    "custom": false
  },
  "3665": {
    "id": "3665",
    "nameEs": "Power point plank",
    "nameOg": "power point plank",
    "custom": false
  },
  "3666": {
    "id": "3666",
    "nameEs": "Cinta inclinada caminando",
    "nameOg": "walking on incline treadmill",
    "custom": false
  },
  "c-cardio": {
    "id": "c-cardio",
    "nameEs": "Cardio libre",
    "nameOg": "Cardio libre (bici, elíptica, cinta, remo o caminar)",
    "custom": true,
    "desc": "Usa la máquina que esté libre: bici, elíptica, cinta inclinada caminando, remo o caminar por la calle. Calentamiento: suave. Zona 2: puedes hablar en frases cortas. Evita correr y saltar por las rodillas."
  },
  "c-iso-ext": {
    "id": "c-iso-ext",
    "nameEs": "Extensión isométrica de cuádriceps (60º)",
    "nameOg": "Extensión isométrica de cuádriceps (60º)",
    "custom": true,
    "desc": "Máquina de extensión, rodilla a ~60º, empuja al 70% del esfuerzo máximo sin mover la palanca. 4×30 s, descanso 2 min. Alivia el dolor de rodilla."
  },
  "0748": {
    "id": "0748",
    "nameEs": "Press banca multipower",
    "nameOg": "smith bench press",
    "custom": false
  },
  "0579": {
    "id": "0579",
    "nameEs": "Jalón en máquina",
    "nameOg": "lever front pulldown",
    "custom": false
  },
  "0586": {
    "id": "0586",
    "nameEs": "Curl femoral tumbado",
    "nameOg": "lever lying leg curl",
    "custom": false
  },
  "0334": {
    "id": "0334",
    "nameEs": "Elevaciones laterales con mancuernas",
    "nameOg": "dumbbell lateral raise",
    "custom": false
  },
  "c-plank": {
    "id": "c-plank",
    "nameEs": "Plancha frontal",
    "nameOg": "Plancha frontal",
    "custom": true,
    "desc": "Cuerpo en línea, abdomen apretado, sin hundir la cadera."
  },
  "0085": {
    "id": "0085",
    "nameEs": "Peso muerto rumano con barra",
    "nameOg": "barbell romanian deadlift",
    "custom": false
  },
  "0861": {
    "id": "0861",
    "nameEs": "Remo en polea baja sentado",
    "nameOg": "cable seated row",
    "custom": false
  },
  "0405": {
    "id": "0405",
    "nameEs": "Press hombro con mancuernas sentado",
    "nameOg": "dumbbell seated shoulder press",
    "custom": false
  },
  "0196": {
    "id": "0196",
    "nameEs": "Pull-through en polea (cuerda)",
    "nameOg": "cable pull through (with rope)",
    "custom": false
  },
  "0294": {
    "id": "0294",
    "nameEs": "Curl de bíceps con mancuernas",
    "nameOg": "dumbbell biceps curl",
    "custom": false
  },
  "0594": {
    "id": "0594",
    "nameEs": "Gemelo sentado",
    "nameOg": "lever seated calf raise",
    "custom": false
  },
  "0276": {
    "id": "0276",
    "nameEs": "Dead bug",
    "nameOg": "dead bug",
    "custom": false
  },
  "0739": {
    "id": "0739",
    "nameEs": "Prensa 45º (tempo lento)",
    "nameOg": "sled 45° leg press",
    "custom": false
  },
  "0757": {
    "id": "0757",
    "nameEs": "Press inclinado multipower",
    "nameOg": "smith incline bench press",
    "custom": false
  },
  "0585": {
    "id": "0585",
    "nameEs": "Extensión de cuádriceps (lenta)",
    "nameOg": "lever leg extension",
    "custom": false
  },
  "0602": {
    "id": "0602",
    "nameEs": "Pájaros en máquina",
    "nameOg": "lever seated reverse fly",
    "custom": false
  },
  "0200": {
    "id": "0200",
    "nameEs": "Tríceps en polea (cuerda)",
    "nameOg": "cable pushdown (with rope attachment)",
    "custom": false
  },
  "c-wallsit": {
    "id": "c-wallsit",
    "nameEs": "Sentadilla isométrica en pared",
    "nameOg": "Sentadilla isométrica en pared (wall sit)",
    "custom": true,
    "desc": "Espalda en la pared, rodillas a ~60-90º según tolerancia. Dolor máximo 3/10."
  },
  "0493": {
    "id": "0493",
    "nameEs": "Flexiones inclinadas (manos en mesa o encimera)",
    "nameOg": "incline push-up",
    "custom": false
  },
  "0292": {
    "id": "0292",
    "nameEs": "Remo a una mano (con mochila cargada)",
    "nameOg": "dumbbell one arm bent-over row",
    "custom": false
  },
  "0588": {
    "id": "0588",
    "nameEs": "Remo agarre estrecho en máquina",
    "nameOg": "lever narrow grip seated row",
    "custom": false
  },
  "0581": {
    "id": "0581",
    "nameEs": "Remo alto en máquina",
    "nameOg": "lever high row",
    "custom": false
  },
  "0293": {
    "id": "0293",
    "nameEs": "Remo con mancuernas inclinado",
    "nameOg": "dumbbell bent over row",
    "custom": false
  },
  "0417": {
    "id": "0417",
    "nameEs": "Gemelo de pie con mancuerna",
    "nameOg": "dumbbell standing calf raise",
    "custom": false
  },
  "0818": {
    "id": "0818",
    "nameEs": "Jalón agarre cerrado",
    "nameOg": "twin handle parallel grip lat pulldown",
    "custom": false
  },
  "0017": {
    "id": "0017",
    "nameEs": "Dominadas asistidas",
    "nameOg": "assisted pull-up",
    "custom": false
  },
  "0974": {
    "id": "0974",
    "nameEs": "Jalón con goma, agarre cerrado",
    "nameOg": "band close-grip pulldown",
    "custom": false
  },
  "0872": {
    "id": "0872",
    "nameEs": "Crunch inverso",
    "nameOg": "reverse crunch",
    "custom": false
  },
  "0413": {
    "id": "0413",
    "nameEs": "Sentadilla con mancuernas",
    "nameOg": "dumbbell squat",
    "custom": false
  },
  "0755": {
    "id": "0755",
    "nameEs": "Hack en multipower",
    "nameOg": "smith hack squat",
    "custom": false
  },
  "0798": {
    "id": "0798",
    "nameEs": "Bicicleta estática",
    "nameOg": "stationary bike walk",
    "custom": false
  },
  "0289": {
    "id": "0289",
    "nameEs": "Press banca con mancuernas",
    "nameOg": "dumbbell bench press",
    "custom": false
  },
  "0577": {
    "id": "0577",
    "nameEs": "Press pecho en máquina",
    "nameOg": "lever chest press",
    "custom": false
  },
  "0025": {
    "id": "0025",
    "nameEs": "Press banca con barra",
    "nameOg": "barbell bench press",
    "custom": false
  },
  "0662": {
    "id": "0662",
    "nameEs": "Flexiones",
    "nameOg": "push-up",
    "custom": false
  },
  "0606": {
    "id": "0606",
    "nameEs": "Remo en T",
    "nameOg": "lever t bar row",
    "custom": false
  },
  "0599": {
    "id": "0599",
    "nameEs": "Curl femoral sentado",
    "nameOg": "lever seated leg curl",
    "custom": false
  },
  "0697": {
    "id": "0697",
    "nameEs": "Curl femoral inverso asistido",
    "nameOg": "self assisted inverse leg curl",
    "custom": false
  },
  "0178": {
    "id": "0178",
    "nameEs": "Elevación lateral en polea",
    "nameOg": "cable lateral raise",
    "custom": false
  },
  "0584": {
    "id": "0584",
    "nameEs": "Elevación lateral en máquina",
    "nameOg": "lever lateral raise",
    "custom": false
  },
  "0192": {
    "id": "0192",
    "nameEs": "Elevación lateral a una mano en polea",
    "nameOg": "cable one arm lateral raise",
    "custom": false
  },
  "0991": {
    "id": "0991",
    "nameEs": "Pull-through con goma",
    "nameOg": "band pull through",
    "custom": false
  },
  "0603": {
    "id": "0603",
    "nameEs": "Press hombro en máquina",
    "nameOg": "lever shoulder press",
    "custom": false
  },
  "0219": {
    "id": "0219",
    "nameEs": "Press hombro en polea",
    "nameOg": "cable shoulder press",
    "custom": false
  },
  "0404": {
    "id": "0404",
    "nameEs": "Press hombro mancuernas, agarre neutro",
    "nameOg": "dumbbell seated shoulder press (parallel grip)",
    "custom": false
  },
  "0361": {
    "id": "0361",
    "nameEs": "Press hombro a una mano",
    "nameOg": "dumbbell one arm shoulder press",
    "custom": false
  },
  "0760": {
    "id": "0760",
    "nameEs": "Prensa en multipower",
    "nameOg": "smith leg press",
    "custom": false
  },
  "0868": {
    "id": "0868",
    "nameEs": "Curl en polea",
    "nameOg": "cable curl",
    "custom": false
  },
  "0313": {
    "id": "0313",
    "nameEs": "Curl martillo con mancuernas",
    "nameOg": "dumbbell hammer curl",
    "custom": false
  },
  "0031": {
    "id": "0031",
    "nameEs": "Curl con barra",
    "nameOg": "barbell curl",
    "custom": false
  },
  "0297": {
    "id": "0297",
    "nameEs": "Curl concentrado",
    "nameOg": "dumbbell concentration curl",
    "custom": false
  },
  "0241": {
    "id": "0241",
    "nameEs": "Tríceps polea, barra en V",
    "nameOg": "cable triceps pushdown (v-bar)",
    "custom": false
  },
  "0201": {
    "id": "0201",
    "nameEs": "Tríceps polea, barra recta",
    "nameOg": "cable pushdown",
    "custom": false
  },
  "0129": {
    "id": "0129",
    "nameEs": "Fondos en banco, rodillas flexionadas",
    "nameOg": "bench dip (knees bent)",
    "custom": false
  },
  "0605": {
    "id": "0605",
    "nameEs": "Gemelo de pie en máquina",
    "nameOg": "lever standing calf raise",
    "custom": false
  },
  "0738": {
    "id": "0738",
    "nameEs": "Gemelo en prensa 45º",
    "nameOg": "sled 45° calf press",
    "custom": false
  },
  "0314": {
    "id": "0314",
    "nameEs": "Press inclinado con mancuernas",
    "nameOg": "dumbbell incline bench press",
    "custom": false
  },
  "0169": {
    "id": "0169",
    "nameEs": "Press inclinado en polea",
    "nameOg": "cable incline bench press",
    "custom": false
  },
  "0203": {
    "id": "0203",
    "nameEs": "Rear delt en polea con cuerda",
    "nameOg": "cable rear delt row (with rope)",
    "custom": false
  },
  "0240": {
    "id": "0240",
    "nameEs": "Apertura inversa en polea tumbado",
    "nameOg": "cable supine reverse fly",
    "custom": false
  },
  "0624": {
    "id": "0624",
    "nameEs": "Sentadilla en pared con marcha",
    "nameOg": "march sit (wall)",
    "custom": false
  },
  "0489": {
    "id": "0489",
    "nameEs": "Hiperextensiones (banco de 45º)",
    "nameOg": "hyperextension",
    "custom": false
  },
  "0499": {
    "id": "0499",
    "nameEs": "Remo invertido",
    "nameOg": "inverted row",
    "custom": false
  }
};

/**
 * Obtiene el nombre en español de un ejercicio, o su ID si no se encuentra.
 */
export function exName(id: string): string {
  return EXERCISES[id]?.nameEs || id;
}
