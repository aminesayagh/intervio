import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { ApiError } from '../../http'
import { restSource } from './restSource'
import type { ListQuery } from '../types'

type Thing = { id: string; name: string }

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Non-GET calls first ask for the CSRF cookie.
const csrf = http.get(
  '/api/auth/me',
  () => new HttpResponse(null, { status: 401 }),
)

const query: ListQuery = {
  search: ' pump ',
  filters: { status: ['valid', 'draft'], owner: [] },
  sort: [{ by: 'updated', direction: 'desc' }],
  cursor: 'abc',
}

test('list uses the default route and parameter names, and leaves empty values out', async () => {
  let seen = ''
  server.use(
    http.get('/api/things', ({ request }) => {
      seen = new URL(request.url).search
      return HttpResponse.json({
        items: [{ id: '1', name: 'Pump' }],
        nextCursor: null,
        total: 1,
      })
    }),
  )
  const page = await restSource<Thing>({ path: '/api/things' }).list(query)
  expect(page).toEqual({
    items: [{ id: '1', name: 'Pump' }],
    nextCursor: null,
    total: 1,
  })
  expect(decodeURIComponent(seen)).toBe(
    '?q=pump&f.status=valid,draft&sort=updated:desc&cursor=abc&limit=30',
  )
})

test('the record calls use their default routes and methods', async () => {
  const calls: string[] = []
  const record = (request: Request) => {
    calls.push(`${request.method} ${new URL(request.url).pathname}`)
    return HttpResponse.json({ id: '7', name: 'Pump' })
  }
  server.use(
    csrf,
    http.get('/api/things/7', ({ request }) => record(request)),
    http.post('/api/things', ({ request }) => record(request)),
    http.patch('/api/things/7', ({ request }) => record(request)),
    http.delete('/api/things/7', ({ request }) => record(request)),
    http.post('/api/things/7/archive', ({ request }) => record(request)),
    http.post('/api/things/7/restore', ({ request }) => record(request)),
  )
  const source = restSource<Thing>({ path: '/api/things' })
  expect(await source.one('7')).toEqual({ id: '7', name: 'Pump' })
  await source.create!({ name: 'Pump' })
  await source.update!('7', { name: 'Pump' })
  await source.remove!('7')
  await source.archive!('7')
  await source.restore!('7')
  expect(calls).toEqual([
    'GET /api/things/7',
    'POST /api/things',
    'PATCH /api/things/7',
    'DELETE /api/things/7',
    'POST /api/things/7/archive',
    'POST /api/things/7/restore',
  ])
})

test('routes, parameter names, the update method and the response shapes can be overridden', async () => {
  let listUrl = ''
  let method = ''
  server.use(
    csrf,
    http.get('/api/interventions/42/resources', ({ request }) => {
      listUrl = new URL(request.url).search
      return HttpResponse.json({
        content: [{ uuid: '1', title: 'Pump' }],
        next: 'n2',
        count: 9,
      })
    }),
    http.put('/api/interventions/42/resources/1', ({ request }) => {
      method = request.method
      return HttpResponse.json({ uuid: '1', title: 'Pump' })
    }),
    http.post('/api/archive/1', () => new HttpResponse(null, { status: 204 })),
  )
  const source = restSource<Thing, { interventionId: string }>({
    path: (context) => `/api/interventions/${context.interventionId}/resources`,
    routes: { archive: (id) => `/api/archive/${id}` },
    params: { search: 'search', cursor: 'after', limit: 'size' },
    pageSize: 10,
    updateMethod: 'PUT',
    toPage: (body) => {
      const b = body as {
        content: { uuid: string; title: string }[]
        next: string
        count: number
      }
      return {
        items: b.content.map((r) => ({ id: r.uuid, name: r.title })),
        nextCursor: b.next,
        total: b.count,
      }
    },
    toRecord: (body) => {
      const b = body as { uuid: string; title: string }
      return { id: b.uuid, name: b.title }
    },
  })
  const context = { interventionId: '42' }
  const page = await source.list({ ...query, filters: {} }, context)
  expect(page).toEqual({
    items: [{ id: '1', name: 'Pump' }],
    nextCursor: 'n2',
    total: 9,
  })
  expect(decodeURIComponent(listUrl)).toBe(
    '?search=pump&sort=updated:desc&after=abc&size=10',
  )
  expect(await source.update!('1', { name: 'Pump' }, context)).toEqual({
    id: '1',
    name: 'Pump',
  })
  expect(method).toBe('PUT')
  await expect(source.archive!('1', context)).resolves.toBeUndefined()
})

test('an error response becomes an ApiError with its code and field', async () => {
  server.use(
    csrf,
    http.patch('/api/things/7', () =>
      HttpResponse.json(
        { code: 'ERROR_NAME_REQUIRED', field: 'name' },
        { status: 400 },
      ),
    ),
    http.get('/api/things/8', () =>
      HttpResponse.json({ code: 'ERROR_NOT_FOUND' }, { status: 404 }),
    ),
  )
  const source = restSource<Thing>({ path: '/api/things' })
  const refused = await source.update!('7', { name: '' }).catch(
    (e: unknown) => e,
  )
  expect(refused).toBeInstanceOf(ApiError)
  expect(refused).toMatchObject({
    status: 400,
    code: 'ERROR_NAME_REQUIRED',
    field: 'name',
  })
  await expect(source.one('8')).rejects.toMatchObject({
    status: 404,
    code: 'ERROR_NOT_FOUND',
  })
})
