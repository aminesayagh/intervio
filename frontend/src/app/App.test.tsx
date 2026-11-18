import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, expect, test } from 'vitest'
import '../services/i18n'
import { App } from './App'

const server = setupServer(
  http.get('/api/auth/me', () => new HttpResponse(null, { status: 401 })),
  http.post('/api/auth/login', () =>
    HttpResponse.json({ code: 'ERROR_AUTH_FAIL' }, { status: 401 }),
  ),
)
beforeAll(() => server.listen())
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
