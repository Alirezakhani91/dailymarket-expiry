import { randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'

type GraphQLError = { message?: string }

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function clean(value: unknown, max = 120) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
}

function fail(res: Response, status: number, message: string) {
  Object.entries(jsonHeaders).forEach(([key, value]) => res.setHeader(key, value))
  return res.status(status).json({ message })
}

async function graphql<T>(query: string, variables: Record<string, unknown> = {}) {
  const endpoint = process.env.NHOST_GRAPHQL_URL
  const adminSecret = process.env.NHOST_ADMIN_SECRET
  if (!endpoint || !adminSecret) throw new Error('تنظیمات امن Nhost در Functions در دسترس نیست.')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({ query, variables }),
  })
  const body = await response.json() as { data?: T; errors?: GraphQLError[] }
  if (!response.ok || body.errors?.length) {
    throw new Error(body.errors?.[0]?.message || 'خطا در ثبت اطلاعات پایگاه داده.')
  }
  if (!body.data) throw new Error('پاسخ خالی از پایگاه داده دریافت شد.')
  return body.data
}

async function currentUser(authorization: string) {
  const authUrl = process.env.NHOST_AUTH_URL
  if (!authUrl) throw new Error('آدرس Auth در دسترس نیست.')
  const response = await fetch(`${authUrl}/user`, {
    headers: { Authorization: authorization },
  })
  if (!response.ok) return null
  return await response.json() as { id?: string; defaultRole?: string; roles?: string[] }
}

async function deleteAuthUser(userId: string) {
  try {
    await graphql(`mutation RollbackUser($id: uuid!) { deleteUser(id: $id) { id } }`, { id: userId })
  } catch (error) {
    console.error('Could not roll back auth user', userId, error)
  }
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
      return fail(res, 403, 'فقط مدیر پلتفرم اجازه ساخت حساب فروشگاه را دارد.')
    }

    const storeCode = clean(req.body?.storeCode, 32).toUpperCase().replace(/\s+/g, '')
    const storeName = clean(req.body?.storeName)
    const region = clean(req.body?.region)
    const regionManagerName = clean(req.body?.regionManagerName)
    const executiveManagerName = clean(req.body?.executiveManagerName)
    const password = String(req.body?.password || '')

    if (!/^[A-Z][A-Z0-9_-]{2,31}$/.test(storeCode)) return fail(res, 400, 'کد فروشگاه معتبر نیست؛ نمونه درست: F1010')
    if (!storeName || !region || !regionManagerName || !executiveManagerName) return fail(res, 400, 'تمام مشخصات فروشگاه و مدیران را کامل کنید.')
    if (password.length < 8 || password.length > 50) return fail(res, 400, 'رمز باید بین ۸ تا ۵۰ کاراکتر باشد.')

    const username = storeCode.toLowerCase()
    const email = `${username}@dailymarket.local`
    const displayName = `${storeCode} - ${storeName}`.slice(0, 32)
    const fullStoreName = `فروشگاه ${storeCode} - ${storeName}`

    const duplicate = await graphql<{
      stores: Array<{ id: string }>
      users: Array<{ id: string }>
    }>(`
      query DuplicateStoreAccount($code: String!, $email: citext!) {
        stores(where: {store_code: {_ilike: $code}}, limit: 1) { id }
        users(where: {email: {_eq: $email}}, limit: 1) { id }
      }
    `, { code: storeCode, email })

    if (duplicate.stores.length || duplicate.users.length) {
      return fail(res, 409, `برای کد ${storeCode} قبلاً فروشگاه یا حساب ورود ساخته شده است.`)
    }

    const authUrl = process.env.NHOST_AUTH_URL
    if (!authUrl) throw new Error('آدرس Auth در دسترس نیست.')
    const signupResponse = await fetch(`${authUrl}/signup/email-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        options: {
          displayName,
          defaultRole: 'store_operator',
          allowedRoles: ['store_operator'],
          metadata: { storeCode, storeName },
        },
      }),
    })
    const signup = await signupResponse.json() as {
      session?: { user?: { id?: string } } | null
      message?: string
      error?: string
    }
    if (!signupResponse.ok) {
      return fail(res, signupResponse.status === 409 ? 409 : 400, signup.message || signup.error || 'ساخت حساب Auth ناموفق بود.')
    }

    let userId = signup.session?.user?.id || ''
    if (!userId) {
      const found = await graphql<{ users: Array<{ id: string }> }>(
        `query CreatedUser($email: citext!) { users(where: {email: {_eq: $email}}, limit: 1) { id } }`,
        { email },
      )
      userId = found.users[0]?.id || ''
    }
    if (!userId) throw new Error('حساب ساخته شد اما شناسه کاربر دریافت نشد.')

    const storeId = randomUUID()
    try {
      await graphql(`
        mutation CompleteStoreAccount(
          $userId: uuid!,
          $store: stores_insert_input!,
          $role: user_roles_insert_input!
        ) {
          updateUser(pk_columns: {id: $userId}, _set: {emailVerified: true}) { id }
          insert_stores_one(object: $store) { id store_code name region }
          insert_user_roles_one(object: $role) { id user_id role store_id }
        }
      `, {
        userId,
        store: {
          id: storeId,
          store_code: storeCode,
          sap_store_code: storeCode,
          name: fullStoreName,
          region,
          region_manager_name: regionManagerName,
          executive_manager_name: executiveManagerName,
          is_active: true,
        },
        role: {
          user_id: userId,
          role: 'store_operator',
          store_id: storeId,
        },
      })
    } catch (error) {
      await deleteAuthUser(userId)
      throw error
    }

    return res.status(201).json({
      store: { id: storeId, code: storeCode, name: fullStoreName, region },
      userId,
      credentials: { username: storeCode, email },
    })
  } catch (error) {
    console.error(error)
    return fail(res, 500, error instanceof Error ? error.message : 'خطای داخلی در ساخت حساب فروشگاه.')
  }
}
