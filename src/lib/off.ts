// Open Food Facts (ODbL): búsqueda por texto y por código de barras.
// Lógica pura + fetch, sin React. Solo rellena el formulario de comida; no toca la base de datos.

export interface OffProduct {
  code: string
  name: string
  brand: string | null
  /** kcal por 100 g. */
  kcal100: number
  /** Proteína (g) por 100 g. */
  protein100: number
  /** Ración en gramos si el producto la declara. */
  servingG: number | null
}

const FIELDS = 'code,product_name,product_name_es,generic_name,brands,nutriments,serving_quantity'
const KJ_PER_KCAL = 4.184

type Rec = Record<string, unknown>

function isRec(v: unknown): v is Rec {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Número finito desde un número o un texto ("12.5", "12,5"); si no, null. */
function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.trim().replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** Convierte un producto crudo de OFF. Devuelve null si falta el nombre o la energía. */
export function parseOffProduct(p: unknown): OffProduct | null {
  if (!isRec(p)) return null
  const name = text(p.product_name_es) || text(p.product_name) || text(p.generic_name)
  if (!name) return null

  const n = isRec(p.nutriments) ? p.nutriments : {}
  let kcal100 = toNum(n['energy-kcal_100g'])
  if (kcal100 == null) {
    const kj = toNum(n['energy_100g'])
    if (kj != null) kcal100 = kj / KJ_PER_KCAL
  }
  if (kcal100 == null || kcal100 < 0) return null

  const protein = toNum(n.proteins_100g)
  const serving = toNum(p.serving_quantity)
  const brand = text(p.brands).split(',')[0]?.trim() ?? ''
  const code = typeof p.code === 'string' || typeof p.code === 'number' ? String(p.code).trim() : ''

  return {
    code,
    name,
    brand: brand || null,
    kcal100,
    protein100: protein != null && protein > 0 ? protein : 0,
    servingG: serving != null && serving > 0 ? serving : null,
  }
}

/** Valores del formulario de comida para `grams` gramos del producto. */
export function forGrams(p: OffProduct, grams: number): { label: string; kcal: number; protein_g: number } {
  const g = Math.round(grams * 10) / 10
  const brand = p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? ` ${p.brand}` : ''
  return {
    label: `${p.name}${brand} (${String(g).replace('.', ',')} g)`,
    kcal: Math.round((p.kcal100 * g) / 100),
    protein_g: Math.round(((p.protein100 * g) / 100) * 10) / 10,
  }
}

/** EAN-8 / UPC-A / EAN-13 / GTIN-14: solo dígitos, 8 a 14. */
export function isValidBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code)
}

const MSG_OFFLINE = 'Sin conexión. Conéctate a internet para buscar en Open Food Facts.'
const MSG_NETWORK = 'No se pudo contactar con Open Food Facts. Revisa tu conexión e inténtalo de nuevo.'

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

async function getJson(url: string, signal?: AbortSignal): Promise<{ status: number; body: unknown }> {
  if (isOffline()) throw new Error(MSG_OFFLINE)
  let res: Response
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new Error(isOffline() ? MSG_OFFLINE : MSG_NETWORK)
  }
  let body: unknown = null
  try {
    body = await res.json()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    if (res.ok) throw new Error('Open Food Facts devolvió una respuesta que no se entiende. Inténtalo más tarde.')
  }
  return { status: res.status, body }
}

/** Busca un producto por código de barras. null si OFF no lo conoce o no trae datos útiles. */
export async function fetchByBarcode(code: string, signal?: AbortSignal): Promise<OffProduct | null> {
  const c = code.trim()
  if (!isValidBarcode(c)) throw new Error('Código de barras no válido: deben ser entre 8 y 14 dígitos.')
  const { status, body } = await getJson(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(c)}.json?fields=${FIELDS}`,
    signal,
  )
  if (status === 404) return null
  if (status >= 400) throw new Error(`Open Food Facts no responde ahora (error ${status}). Inténtalo más tarde.`)
  if (!isRec(body) || body.status === 0 || !isRec(body.product)) return null
  return parseOffProduct({ code: c, ...body.product })
}

/** Busca productos por texto (máx. 20). Llamar solo al enviar la búsqueda: OFF limita a ~10/min. */
export async function searchProducts(q: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const term = q.trim().slice(0, 100)
  if (!term) return []
  const params = new URLSearchParams({
    search_terms: term,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    fields: FIELDS,
  })
  // El buscador de OFF devuelve 503 de forma intermitente: un solo reintento, contra el host general.
  let { status, body } = await getJson(`https://es.openfoodfacts.org/cgi/search.pl?${params}`, signal)
  if (status === 502 || status === 503 || status === 504) {
    await new Promise((r) => setTimeout(r, 700))
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    ;({ status, body } = await getJson(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, signal))
  }
  if (status === 429) throw new Error('Demasiadas búsquedas seguidas. Espera un minuto e inténtalo de nuevo.')
  if (status >= 400) throw new Error(`Open Food Facts no responde ahora (error ${status}). Inténtalo más tarde.`)
  const list = isRec(body) && Array.isArray(body.products) ? body.products : []
  return list.map(parseOffProduct).filter((p): p is OffProduct => p !== null)
}
