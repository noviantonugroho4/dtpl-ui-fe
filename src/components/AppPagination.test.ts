import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppPagination from './AppPagination.vue'

const labels = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('ul li').map((li) => li.text())

describe('AppPagination', () => {
  it('lists every page when there are few', () => {
    const wrapper = mount(AppPagination, { props: { page: 2, totalPages: 5 } })
    expect(labels(wrapper)).toEqual(['1', '2', '3', '4', '5'])
    expect(wrapper.find('[aria-current="page"]').text()).toBe('2')
  })

  it('collapses long ranges with a gap like the design', () => {
    const wrapper = mount(AppPagination, { props: { page: 1, totalPages: 68 } })
    expect(labels(wrapper)).toEqual(['1', '2', '3', '...', '67', '68'])
  })

  it('keeps the neighbours of the current page visible', () => {
    const wrapper = mount(AppPagination, { props: { page: 30, totalPages: 68 } })
    expect(labels(wrapper)).toEqual(['1', '2', '3', '...', '29', '30', '31', '...', '67', '68'])
  })

  it('disables previous on the first page and emits page changes', async () => {
    const wrapper = mount(AppPagination, { props: { page: 1, totalPages: 3 } })
    const [prev, next] = [wrapper.findAll('button')[0]!, wrapper.findAll('button').at(-1)!]
    expect(prev.attributes('disabled')).toBeDefined()
    await next.trigger('click')
    expect(wrapper.emitted('change')).toEqual([[2]])
  })
})
