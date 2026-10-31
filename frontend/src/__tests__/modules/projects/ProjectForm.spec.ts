import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'

import ProjectForm from '@/components/projects/ProjectForm.vue'
import type { Project } from '@/types/api'

/**
 * Element Plus muestra el mensaje de error con un debounce de 100 ms,
 * por lo que hay que dejar pasar ese tiempo antes de inspeccionar el DOM.
 */
async function waitForErrorMessage(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  await flushPromises()
}

const project: Project = {
  id: 10,
  name: 'TaskFlow',
  description: 'Gestión de proyectos',
  owner_id: 1,
  created_at: '2026-10-30T18:00:00.000000Z',
  updated_at: '2026-10-30T18:00:00.000000Z',
}

describe('components/projects/ProjectForm', () => {
  it('emite el payload con el nombre y la descripción introducidos', async () => {
    const wrapper = mount(ProjectForm, {
      global: { plugins: [ElementPlus] },
    })

    const inputs = wrapper.findAll('textarea, input')
    await inputs[0]!.setValue('  Nuevo proyecto  ')
    await inputs[1]!.setValue('  Descripción  ')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('submit')).toEqual([
      [{ name: 'Nuevo proyecto', description: 'Descripción' }],
    ])
  })

  it('no emite el payload cuando el nombre está vacío', async () => {
    const wrapper = mount(ProjectForm, {
      global: { plugins: [ElementPlus] },
    })

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await waitForErrorMessage()

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('.el-form-item__error').text()).toBe('El nombre es obligatorio.')
  })

  it('muestra los errores de validación del backend junto a cada campo', async () => {
    const wrapper = mount(ProjectForm, {
      props: {
        fieldErrors: { name: ['The name field is required.'] },
      },
      global: { plugins: [ElementPlus] },
    })

    await waitForErrorMessage()

    expect(wrapper.find('.el-form-item__error').text()).toBe('The name field is required.')
  })

  it('rellena los campos cuando se edita un proyecto existente', () => {
    const wrapper = mount(ProjectForm, {
      props: { project },
      global: { plugins: [ElementPlus] },
    })

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('TaskFlow')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe(
      'Gestión de proyectos',
    )
  })
})
