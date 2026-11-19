import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import '../services/i18n'
import { App } from './App'

const server = setupServer(
  http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
  http.post('/api/auth/login', () =>
    HttpResponse.json({ code: 'ERROR_AUTH_FAIL' }, { status: 401 }),
  ),
)
beforeAll(() => server.listen())
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

test('the log-in screen shows the message for the backend error key', async () => {
  window.history.pushState(null, '', '/login')
  render(<App />)

  await userEvent.type(await screen.findByLabelText('Email'), 'ada@example.com')
  await userEvent.type(screen.getByLabelText('Password'), 'not the password')
  await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

  expect(
    await screen.findByText('Wrong email or password.'),
  ).toBeInTheDocument()
})

test('a logged-in client opening "/" lands on the dashboard tab', async () => {
  server.use(
    http.get('/api/auth/me', () =>
      HttpResponse.json({ fullName: 'Ada Martin', email: 'ada@example.com' }),
    ),
    http.get('/api/company', () =>
      HttpResponse.json({
        name: 'Martin Industries',
        country: 'FR',
        registrationNumber: '123',
        id: '01970000-0000-7000-8000-000000000000',
        industries: [],
        logoFileId: null,
        hasAddress: false,
      }),
    ),
    http.get('/api/interventions/recent', () =>
      HttpResponse.json({ items: [], total: 0 }),
    ),
  )
  window.history.pushState(null, '', '/')
  render(<App />)

  expect(
    await screen.findByRole('heading', { name: 'Dashboard' }),
  ).toBeInTheDocument()
  expect(window.location.pathname).toBe('/dashboard')
  expect(screen.getAllByRole('link', { name: 'Dashboard' })[0]).toHaveAttribute(
    'aria-current',
    'page',
  )
})
