import type { Request, Response } from 'express'

type GraphQLError = { message?: string }
type ProductInput = {
  row?: number
  article?: unknown
  barcode?: unknown
  price?: unknown
  name?: unknown
  productGroup?: unknown
  unsafeBarcode?: unknown
}
type ExistingProduct = {
  id: string
  article?: string | null
  barcode?: string | null
  name?: string | null
  product_group?: string | null
  price?: number | null
}

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function fail(res: Response, status: number, message: string) {
  Object.entries(jsonHeaders).forEach(([key, value]) => res.setHeader(key, value))
  return res.status(status).json({ message })
}

function text(value: unknown, max = 240) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
}

function identifier(value: unknown, max = 40) {
  const raw = text(value, max)
  if (!raw || !/^\d+$/.test(raw)) return ''
  return raw
}

async function graphql<T>(query: string, variables: Record<string, unknown> = {}) {
  const endpoint = process.env.NHOST_GRAPHQL_URL
  const adminSecret = process.env.NHOST_ADMIN_SECRET
  if (!endpoint || !adminSecret) throw new Error('تنظیمات امن Nhost در Functions در دسترس نیست.')
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': adminSecret },
    body: JSON.stringify({ query, variables }),
  })
  const body = await response.json() as { data?: T; errors?: GraphQLError[] }
  if (!response.ok || body.errors?.length) throw new Error(body.errors?.[0]?.message || 'خطای پایگاه داده.')
  if (!body.data) throw new Error('پاسخ خالی از پایگاه داده دریافت شد.')
  return body.data
}

async function currentUser(authorization: string) {
  const authUrl = process.env.NHOST_AUTH_URL
  if (!authUrl) throw new Error('آدرس Auth در دسترس نیست.')
  const response = await fetch(`${authUrl}/user`, { headers: { Authorization: authorization } })
  if (!response.ok) return null
  return await response.json() as { id?: string; defaultRole?: string; roles?: string[] }
}

function normalizeItem(input: ProductInput) {
  const row = Number(input.row) || 0
  const article = identifier(input.article)
  const barcode = identifier(input.barcode)
  const price = Number(input.price)
  const name = text(input.name)
  const productGroup = text(input.productGroup, 160)
  const unsafeBarcode = input.unsafeBarcode === true
  return { row, article, barcode, price, name, productGroup, unsafeBarcode }
}

export default async function handler(req: Request, res: Response) {
  Object.entries(jsonHeaders).forEach(([key, value]) => res.setHeader(key, value))
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return fail(res, 405, 'فقط درخواست POST مجاز است.')

  try {
    const authorization = String(req.headers.authorization || '')
    if (!authorization.startsWith('Bearer ')) return fail(res, 401, 'ابتدا وارد حساب مدیر پلتفرم شوید.')
    const caller = await currentUser(authorization)
    const callerRoles = new Set([caller?.defaultRole, ...(caller?.roles || [])].filter(Boolean))
    if (!caller || (!callerRoles.has('system_admin') && !callerRoles.has('platform_admin'))) {
      return fail(res, 403, 'فقط مدیر پلتفرم اجازه به‌روزرسانی محصولات را دارد.')
    }

    const mode = req.body?.mode === 'apply' ? 'apply' : 'preview'
    const rawItems = Array.isArray(req.body?.items) ? req.body.items as ProductInput[] : []
    if (!rawItems.length || rawItems.length > 250) return fail(res, 400, 'هر بخش باید بین ۱ تا ۲۵۰ ردیف داشته باشد.')
    const items = rawItems.map(normalizeItem)

    const articles = [...new Set(items.map(x => x.article).filter(Boolean))]
    const barcodes = [...new Set(items.map(x => x.barcode).filter(Boolean))]
    const found = await graphql<{ products: ExistingProduct[] }>(`
      query ProductImportMatches($articles: [String!]!, $barcodes: [String!]!) {
        products(where: {_or: [{article: {_in: $articles}}, {barcode: {_in: $barcodes}}]}) {
          id article barcode name product_group price
        }
      }
    `, { articles, barcodes })

    const byArticle = new Map<string, ExistingProduct[]>()
    const byBarcode = new Map<string, ExistingProduct[]>()
    for (const product of found.products || []) {
      const article = text(product.article)
      const barcode = text(product.barcode)
      if (article) byArticle.set(article, [...(byArticle.get(article) || []), product])
      if (barcode) byBarcode.set(barcode, [...(byBarcode.get(barcode) || []), product])
    }

    const results = items.map(item => {
      const errors: string[] = []
      if (!item.article) errors.push('Article نامعتبر است.')
      if (!item.barcode) errors.push('بارکد نامعتبر است.')
      if (!Number.isFinite(item.price) || item.price <= 0 || !Number.isInteger(item.price)) errors.push('قیمت باید عدد صحیح مثبت و به ریال باشد.')
      const articleMatches = item.article ? byArticle.get(item.article) || [] : []
      const barcodeMatches = item.barcode ? byBarcode.get(item.barcode) || [] : []
      const existing = articleMatches[0]
      const conflictingBarcodeProducts = barcodeMatches.filter(product => text(product.article) !== item.article)
      if (conflictingBarcodeProducts.length) errors.push('Article و بارکد به کالاهای متفاوتی در دیتابیس اشاره می‌کنند.')
      if (!existing && barcodeMatches.length) errors.push('بارکد موجود است اما Article فایل با کالای دیتابیس یکسان نیست.')

      if (existing) {
        return {
          row: item.row,
          action: errors.length ? 'error' : 'update',
          errors,
          ids: [...new Set(articleMatches.map(product => product.id))],
          article: item.article,
          barcode: item.barcode,
          name: existing.name || item.name,
          oldPrice: Number(existing.price) || 0,
          newPrice: item.price,
        }
      }

      if (!item.name) errors.push('نام کالای جدید خالی است.')
      if (!item.productGroup) errors.push('گروه کالای جدید خالی است.')
      if (item.unsafeBarcode) errors.push('بارکد بیش از ۱۵ رقم است و در اکسل به‌صورت عدد ذخیره شده؛ مقدار صحیح متنی لازم است.')
      return {
        row: item.row,
        action: errors.length ? 'error' : 'insert',
        errors,
        ids: [] as string[],
        article: item.article,
        barcode: item.barcode,
        name: item.name,
        oldPrice: null,
        newPrice: item.price,
      }
    })

    if (mode === 'preview') return res.status(200).json({ results })

    const valid = results.filter(x => x.action !== 'error')
    if (!valid.length) return res.status(200).json({ results, applied: { updated: 0, inserted: 0 } })

    const updates = valid.filter(x => x.action === 'update')
    const inserts = valid.filter(x => x.action === 'insert')
    const updateItems = updates.flatMap(x => x.ids.map(id => ({ id, price: x.newPrice })))
    const insertRows = inserts.map(x => {
      const source = items.find(item => item.row === x.row)!
      return {
        article: source.article,
        barcode: source.barcode,
        name: source.name,
        product_group: source.productGroup,
        price: source.price,
      }
    })

    if (updateItems.length) {
      await graphql(`
        mutation ApplyProductPrices($updates: [products_updates!]!) {
          update_products_many(updates: $updates) { affected_rows }
        }
      `, { updates: updateItems.map(x => ({ where: { id: { _eq: x.id } }, _set: { price: x.price } })) })
    }
    if (insertRows.length) {
      await graphql(`
        mutation InsertNewProducts($objects: [products_insert_input!]!) {
          insert_products(objects: $objects) { affected_rows }
        }
      `, { objects: insertRows })
    }

    return res.status(200).json({ results, applied: { updated: updates.length, inserted: inserts.length } })
  } catch (error) {
    console.error(error)
    return fail(res, 500, error instanceof Error ? error.message : 'خطای داخلی در به‌روزرسانی محصولات.')
  }
}
