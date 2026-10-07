import type { Alternative } from '../domain/types';

/**
 * Alternativas de ejercicios: para cuando la máquina está ocupada.
 * Ordenadas de menos a más carga sobre la rodilla.
 */
export const ALTERNATIVES: Record<string, Alternative[]> = {
  "1350": [
    {
      "id": "0861",
      "nameEs": "Remo en polea baja sentado",
      "note": "remo en polea baja"
    },
    {
      "id": "0588",
      "nameEs": "Remo agarre estrecho en máquina",
      "note": "remo agarre estrecho en máquina"
    },
    {
      "id": "0581",
      "nameEs": "Remo alto en máquina",
      "note": "remo alto en máquina"
    },
    {
      "id": "0293",
      "nameEs": "Remo con mancuernas inclinado",
      "note": "remo con mancuernas"
    }
  ],
  "1409": [
    {
      "id": "3523",
      "nameEs": "Puente de glúteo en banco",
      "note": "puente en banco con mancuerna sobre la cadera"
    },
    {
      "id": "3562",
      "nameEs": "Puente de glúteo con barra en banco",
      "note": "con barra y hombros en banco"
    },
    {
      "id": "0196",
      "nameEs": "Pull-through en polea (cuerda)",
      "note": "pull-through en polea"
    },
    {
      "id": "3013",
      "nameEs": "Puente de glúteo en suelo",
      "note": "puente en suelo, 2-3 s arriba"
    }
  ],
  "1490": [
    {
      "id": "1373",
      "nameEs": "Gemelo con peso corporal",
      "note": "gemelo con peso corporal en el suelo"
    },
    {
      "id": "0417",
      "nameEs": "Gemelo de pie con mancuerna",
      "note": "a una pierna sujetando una garrafa o mochila"
    }
  ],
  "2330": [
    {
      "id": "0818",
      "nameEs": "Jalón agarre cerrado",
      "note": "agarre paralelo"
    },
    {
      "id": "2736",
      "nameEs": "Jalón supino en máquina",
      "note": "agarre supino en máquina"
    },
    {
      "id": "0017",
      "nameEs": "Dominadas asistidas",
      "note": "dominadas asistidas"
    },
    {
      "id": "0974",
      "nameEs": "Jalón con goma, agarre cerrado",
      "note": "jalón con goma, agarre cerrado"
    }
  ],
  "3013": [
    {
      "id": "3561",
      "nameEs": "Puente de glúteo con marcha",
      "note": "puente con marcha"
    },
    {
      "id": "3523",
      "nameEs": "Puente de glúteo en banco",
      "note": "puente con los pies en el sofá o una silla"
    }
  ],
  "3239": [
    {
      "id": "c-plank",
      "nameEs": "Plancha frontal",
      "note": "plancha frontal quieta"
    },
    {
      "id": "0276",
      "nameEs": "Dead bug",
      "note": "dead bug"
    },
    {
      "id": "0872",
      "nameEs": "Crunch inverso",
      "note": "crunch inverso"
    }
  ],
  "3281": [
    {
      "id": "0739",
      "nameEs": "Prensa 45º (tempo lento)",
      "note": "3×5-8 pesado, pies a media altura, sin bajar de 90º"
    },
    {
      "id": "1760",
      "nameEs": "Sentadilla goblet (a caja)",
      "note": "a caja, mancuerna al pecho"
    },
    {
      "id": "0413",
      "nameEs": "Sentadilla con mancuernas",
      "note": "a caja, mancuernas a los lados"
    },
    {
      "id": "0755",
      "nameEs": "Hack en multipower",
      "note": "hack en multipower, pies adelantados"
    }
  ],
  "3544": [
    {
      "id": "c-plank",
      "nameEs": "Plancha frontal",
      "note": "plancha frontal"
    },
    {
      "id": "0276",
      "nameEs": "Dead bug",
      "note": "dead bug"
    }
  ],
  "3561": [
    {
      "id": "3013",
      "nameEs": "Puente de glúteo en suelo",
      "note": "puente en suelo"
    },
    {
      "id": "3523",
      "nameEs": "Puente de glúteo en banco",
      "note": "puente con pies en el sofá"
    }
  ],
  "c-cardio": [
    {
      "id": "0798",
      "nameEs": "Bicicleta estática",
      "note": "bici estática"
    },
    {
      "id": "2141",
      "nameEs": "Elíptica",
      "note": "elíptica"
    },
    {
      "id": "3666",
      "nameEs": "Cinta inclinada caminando",
      "note": "cinta inclinada caminando"
    },
    {
      "id": "2311",
      "nameEs": "Escaladora (stepmill)",
      "note": "escaladora: carga más la rodilla, solo si no molesta"
    }
  ],
  "c-iso-ext": [
    {
      "id": "c-wallsit",
      "nameEs": "Sentadilla isométrica en pared",
      "note": "30-45 s, rodillas a 60-90º"
    },
    {
      "id": "3007",
      "nameEs": "Extensión de cuádriceps con goma",
      "note": "con goma, aguanta 30 s a medio recorrido"
    },
    {
      "id": "0739",
      "nameEs": "Prensa 45º (tempo lento)",
      "note": "en la prensa, empuja y aguanta a mitad de recorrido sin mover"
    }
  ],
  "0748": [
    {
      "id": "0289",
      "nameEs": "Press banca con mancuernas",
      "note": "mancuernas, mismo rango de repeticiones"
    },
    {
      "id": "0577",
      "nameEs": "Press pecho en máquina",
      "note": "press de pecho en máquina"
    },
    {
      "id": "0025",
      "nameEs": "Press banca con barra",
      "note": "barra libre con topes de seguridad"
    },
    {
      "id": "0662",
      "nameEs": "Flexiones",
      "note": "flexiones; con peso en la espalda si sobra fuerza"
    }
  ],
  "0861": [
    {
      "id": "1350",
      "nameEs": "Remo en máquina sentado",
      "note": "remo en máquina sentado"
    },
    {
      "id": "0293",
      "nameEs": "Remo con mancuernas inclinado",
      "note": "remo con mancuernas inclinado"
    },
    {
      "id": "0606",
      "nameEs": "Remo en T",
      "note": "remo en T"
    },
    {
      "id": "0581",
      "nameEs": "Remo alto en máquina",
      "note": "remo alto en máquina"
    }
  ],
  "0586": [
    {
      "id": "0599",
      "nameEs": "Curl femoral sentado",
      "note": "curl femoral sentado"
    },
    {
      "id": "1459",
      "nameEs": "Peso muerto rumano con mancuernas",
      "note": "peso muerto rumano con mancuernas"
    },
    {
      "id": "0196",
      "nameEs": "Pull-through en polea (cuerda)",
      "note": "pull-through en polea"
    },
    {
      "id": "0697",
      "nameEs": "Curl femoral inverso asistido",
      "note": "curl femoral inverso asistido"
    }
  ],
  "0334": [
    {
      "id": "0178",
      "nameEs": "Elevación lateral en polea",
      "note": "elevación lateral en polea"
    },
    {
      "id": "0584",
      "nameEs": "Elevación lateral en máquina",
      "note": "elevación lateral en máquina"
    },
    {
      "id": "0192",
      "nameEs": "Elevación lateral a una mano en polea",
      "note": "a una mano en polea"
    }
  ],
  "c-plank": [
    {
      "id": "0276",
      "nameEs": "Dead bug",
      "note": "dead bug"
    },
    {
      "id": "3239",
      "nameEs": "Plancha con toque de hombro",
      "note": "plancha tocando el hombro contrario"
    },
    {
      "id": "3544",
      "nameEs": "Plancha lateral inclinada",
      "note": "plancha lateral inclinada"
    },
    {
      "id": "3665",
      "nameEs": "Power point plank",
      "note": "power point plank"
    }
  ],
  "0085": [
    {
      "id": "1459",
      "nameEs": "Peso muerto rumano con mancuernas",
      "note": "mancuernas"
    },
    {
      "id": "0196",
      "nameEs": "Pull-through en polea (cuerda)",
      "note": "pull-through en polea con cuerda"
    },
    {
      "id": "1409",
      "nameEs": "Puente de glúteo con barra",
      "note": "puente de glúteo con barra"
    },
    {
      "id": "0991",
      "nameEs": "Pull-through con goma",
      "note": "pull-through con goma"
    }
  ],
  "0405": [
    {
      "id": "0603",
      "nameEs": "Press hombro en máquina",
      "note": "press hombro en máquina"
    },
    {
      "id": "0219",
      "nameEs": "Press hombro en polea",
      "note": "press hombro en polea"
    },
    {
      "id": "0404",
      "nameEs": "Press hombro mancuernas, agarre neutro",
      "note": "mancuernas con agarre neutro"
    },
    {
      "id": "0361",
      "nameEs": "Press hombro a una mano",
      "note": "a una mano"
    }
  ],
  "0739": [
    {
      "id": "0760",
      "nameEs": "Prensa en multipower",
      "note": "prensa en multipower"
    },
    {
      "id": "2287",
      "nameEs": "Prensa alterna en palanca",
      "note": "prensa alterna en palanca"
    },
    {
      "id": "2611",
      "nameEs": "Prensa horizontal a una pierna",
      "note": "prensa horizontal a una pierna"
    },
    {
      "id": "1760",
      "nameEs": "Sentadilla goblet (a caja)",
      "note": "sentadilla goblet a caja"
    }
  ],
  "0294": [
    {
      "id": "0868",
      "nameEs": "Curl en polea",
      "note": "curl en polea"
    },
    {
      "id": "0313",
      "nameEs": "Curl martillo con mancuernas",
      "note": "martillo con mancuernas"
    },
    {
      "id": "0031",
      "nameEs": "Curl con barra",
      "note": "curl con barra recta"
    },
    {
      "id": "0297",
      "nameEs": "Curl concentrado",
      "note": "curl concentrado"
    }
  ],
  "0200": [
    {
      "id": "0241",
      "nameEs": "Tríceps polea, barra en V",
      "note": "barra en V"
    },
    {
      "id": "0201",
      "nameEs": "Tríceps polea, barra recta",
      "note": "barra recta"
    },
    {
      "id": "2188",
      "nameEs": "Extensión de tríceps sentado con mancuerna",
      "note": "extensión sentado con mancuerna"
    },
    {
      "id": "0129",
      "nameEs": "Fondos en banco, rodillas flexionadas",
      "note": "fondos en banco con rodillas flexionadas"
    }
  ],
  "0605": [
    {
      "id": "0594",
      "nameEs": "Gemelo sentado",
      "note": "gemelo sentado en máquina"
    },
    {
      "id": "0738",
      "nameEs": "Gemelo en prensa 45º",
      "note": "gemelo en prensa 45º"
    },
    {
      "id": "0417",
      "nameEs": "Gemelo de pie con mancuerna",
      "note": "gemelo de pie con mancuerna"
    },
    {
      "id": "1373",
      "nameEs": "Gemelo con peso corporal",
      "note": "gemelo con peso corporal en escalón"
    }
  ],
  "0757": [
    {
      "id": "0314",
      "nameEs": "Press inclinado con mancuernas",
      "note": "mancuernas en banco inclinado"
    },
    {
      "id": "1299",
      "nameEs": "Press inclinado en máquina",
      "note": "press inclinado en máquina"
    },
    {
      "id": "0169",
      "nameEs": "Press inclinado en polea",
      "note": "press inclinado en polea"
    },
    {
      "id": "0577",
      "nameEs": "Press pecho en máquina",
      "note": "press de pecho en máquina"
    }
  ],
  "0602": [
    {
      "id": "2292",
      "nameEs": "Pájaros con mancuernas",
      "note": "pájaros con mancuernas"
    },
    {
      "id": "0203",
      "nameEs": "Rear delt en polea con cuerda",
      "note": "rear delt en polea con cuerda"
    },
    {
      "id": "0240",
      "nameEs": "Apertura inversa en polea tumbado",
      "note": "apertura inversa en polea tumbado"
    }
  ],
  "0585": [
    {
      "id": "3007",
      "nameEs": "Extensión de cuádriceps con goma",
      "note": "extensión con goma"
    },
    {
      "id": "0739",
      "nameEs": "Prensa 45º (tempo lento)",
      "note": "prensa lenta con los pies bajos"
    },
    {
      "id": "c-wallsit",
      "nameEs": "Sentadilla isométrica en pared",
      "note": "isometría de pared"
    }
  ],
  "0276": [
    {
      "id": "0872",
      "nameEs": "Crunch inverso",
      "note": "crunch inverso"
    },
    {
      "id": "c-plank",
      "nameEs": "Plancha frontal",
      "note": "plancha"
    },
    {
      "id": "3544",
      "nameEs": "Plancha lateral inclinada",
      "note": "plancha lateral inclinada"
    }
  ],
  "c-wallsit": [
    {
      "id": "0624",
      "nameEs": "Sentadilla en pared con marcha",
      "note": "sentadilla en pared con marcha, cuando 45 s te resulten fáciles"
    },
    {
      "id": "3013",
      "nameEs": "Puente de glúteo en suelo",
      "note": "si la rodilla protesta, cambia a puente de glúteo"
    }
  ],
  "0662": [
    {
      "id": "0493",
      "nameEs": "Flexiones inclinadas",
      "note": "manos en mesa o encimera si no llegas a 3×8 en el suelo"
    },
    {
      "id": "0129",
      "nameEs": "Fondos en banco, rodillas flexionadas",
      "note": "fondos en silla con rodillas flexionadas (tríceps)"
    }
  ],
  "0579": [
    {
      "id": "0818",
      "nameEs": "Jalón agarre cerrado",
      "note": "jalón en polea con agarre cerrado"
    },
    {
      "id": "2330",
      "nameEs": "Jalón al pecho",
      "note": "jalón en polea con barra"
    },
    {
      "id": "2736",
      "nameEs": "Jalón supino en máquina",
      "note": "jalón en máquina con agarre supino"
    },
    {
      "id": "0017",
      "nameEs": "Dominadas asistidas",
      "note": "dominadas asistidas"
    }
  ],
  "0196": [
    {
      "id": "0489",
      "nameEs": "Hiperextensiones (banco de 45º)",
      "note": "hiperextensiones en banco de 45º"
    },
    {
      "id": "2286",
      "nameEs": "Extensión de cadera en máquina",
      "note": "extensión de cadera en máquina"
    },
    {
      "id": "1409",
      "nameEs": "Puente de glúteo con barra",
      "note": "puente de glúteo con barra"
    },
    {
      "id": "1459",
      "nameEs": "Peso muerto rumano con mancuernas",
      "note": "peso muerto rumano con mancuernas"
    }
  ],
  "0292": [
    {
      "id": "0293",
      "nameEs": "Remo con mancuernas inclinado",
      "note": "las dos manos a la vez, inclinado"
    },
    {
      "id": "0499",
      "nameEs": "Remo invertido",
      "note": "remo invertido bajo una mesa robusta, solo si no se mueve"
    }
  ]
};
