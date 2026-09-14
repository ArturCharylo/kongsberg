import { afterEach, describe, expect, it, vi } from 'vitest'
import { textApi } from '../api'

const response = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init })

describe('textApi', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lists texts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ id: 1, content: 'one' }])))

    await expect(textApi.list()).resolves.toEqual([{ id: 1, content: 'one' }])
    expect(fetch).toHaveBeenCalledWith('/api/texts', expect.objectContaining({ headers: { 'Content-Type': 'application/json' } }))
  })

  it('creates text and sends JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ id: 2, content: 'two' })))

    await expect(textApi.create('two')).resolves.toEqual({ id: 2, content: 'two' })
    expect(fetch).toHaveBeenCalledWith('/api/texts', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ content: 'two' }),
    }))
  })

  it('removes text on a 204 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))

    await expect(textApi.remove(3)).resolves.toBeUndefined()
  })

  it('uses the server error detail when a request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ detail: 'Invalid text' }, { status: 400 })))

    await expect(textApi.list()).rejects.toThrow('Invalid text')
  })

  it('uses a fallback when an error response is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad gateway', { status: 502 })))

    await expect(textApi.list()).rejects.toThrow('Nie udało się połączyć z serwerem.')
  })
})
