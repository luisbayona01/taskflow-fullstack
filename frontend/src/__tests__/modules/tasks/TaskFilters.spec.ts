import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'

import TaskFilters from '@/components/tasks/TaskFilters.vue'
import type { ProjectMember, TaskFilters as TaskFilterValues } from '@/types/api'

const members: ProjectMember[] = [
  {
    id: 1,
    name: 'Ada Lovelace',
    email: 'ada@taskflow.test',
    email_verified_at: null,
    created_at: null,
    updated_at: null,
  },
]

function mountFilters(modelValue: TaskFilterValues = {}) {
  return mount(TaskFilters, {
    props: { modelValue, members },
    global: { plugins: [ElementPlus] },
  })
}

describe('components/tasks/TaskFilters', () => {
  it('expone los filtros reales del backend', () => {
    const wrapper = mountFilters()

    expect(wrapper.find('input[aria-label="Buscar tareas"]').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Filtrar por estado"]').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Filtrar por prioridad"]').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Filtrar por asignado"]').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Vencimiento desde"]').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Vencimiento hasta"]').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Ordenar por"]').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Dirección de orden"]').exists()).toBe(true)
    expect(wrapper.find('input[aria-label="Tareas por página"]').exists()).toBe(true)
  })

  it('propaga el texto de búsqueda', async () => {
    const wrapper = mountFilters()

    await wrapper.find('input[aria-label="Buscar tareas"]').setValue('login')

    expect(wrapper.emitted('update:modelValue')).toEqual([[{ search: 'login' }]])
  })

  it('propaga el estado seleccionado', async () => {
    const wrapper = mountFilters()

    const statusSelect = wrapper
      .findAllComponents({ name: 'ElSelect' })
      .find((select) => select.props('ariaLabel') === 'Filtrar por estado')

    expect(statusSelect).toBeDefined()

    statusSelect?.vm.$emit('update:modelValue', 'done')

    expect(wrapper.emitted('update:modelValue')).toEqual([[{ status: 'done' }]])
  })

  it('emite los filtros actuales al aplicar', async () => {
    const wrapper = mountFilters({ status: 'done', page: 2 })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('apply')).toEqual([[{ status: 'done', page: 2 }]])
  })

  it('limpia los filtros aplicados', async () => {
    const wrapper = mountFilters({ search: 'login', status: 'done' })

    const clearButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Limpiar'))
    await clearButton?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[{}]])
    expect(wrapper.emitted('apply')).toEqual([[{}]])
  })
})
