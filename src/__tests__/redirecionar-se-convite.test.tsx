import { render, waitFor } from '@testing-library/react'
import { RedirecionarSeConvite } from '@/components/redirecionar-se-convite'

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

describe('RedirecionarSeConvite', () => {
  beforeEach(() => {
    mockReplace.mockReset()
    window.location.hash = ''
  })

  it('redireciona para /aceitar-convite quando a URL tem access_token no fragmento', async () => {
    window.location.hash = '#access_token=abc123&type=invite'
    render(<RedirecionarSeConvite />)
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/aceitar-convite#access_token=abc123&type=invite')
    )
  })

  it('não redireciona quando não há access_token no fragmento', () => {
    window.location.hash = ''
    render(<RedirecionarSeConvite />)
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('não renderiza nada visível', () => {
    const { container } = render(<RedirecionarSeConvite />)
    expect(container).toBeEmptyDOMElement()
  })
})
