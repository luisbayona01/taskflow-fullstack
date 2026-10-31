<script setup lang="ts">
/**
 * Formulario reutilizable de proyecto (alta y edición).
 *
 * El componente no hace peticiones HTTP: emite el payload validado y quien lo
 * usa (la vista) se encarga de la llamada al store y de mostrar los errores
 * devueltos por el backend.
 */
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

import type { Project, ProjectPayload } from '@/types/api'

interface ProjectFormModel {
  name: string
  description: string
}

const props = withDefaults(
  defineProps<{
    /** Proyecto a editar. `null` significa que se trata de un alta. */
    project?: Project | null
    loading?: boolean
    /** Errores de validación del backend (422), indexados por campo. */
    fieldErrors?: Record<string, string[]>
  }>(),
  {
    project: null,
    loading: false,
    fieldErrors: () => ({}),
  },
)

const emit = defineEmits<{
  (event: 'submit', payload: ProjectPayload): void
  (event: 'cancel'): void
}>()

const formRef = ref<FormInstance>()
const form = reactive<ProjectFormModel>({ name: '', description: '' })

const rules: FormRules<ProjectFormModel> = {
  name: [
    { required: true, message: 'El nombre es obligatorio.', trigger: 'blur' },
    { max: 255, message: 'El nombre no puede superar los 255 caracteres.', trigger: 'blur' },
  ],
  description: [{ max: 2000, message: 'La descripción es demasiado larga.', trigger: 'blur' }],
}

watch(
  () => props.project,
  (project) => {
    form.name = project?.name ?? ''
    form.description = project?.description ?? ''
    formRef.value?.clearValidate()
  },
  { immediate: true },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim() === '' ? null : form.description.trim(),
  })
}
</script>

<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-position="top"
    @submit.prevent="handleSubmit"
  >
    <el-form-item label="Nombre" prop="name" :error="fieldErrors.name?.[0]">
      <el-input
        v-model="form.name"
        maxlength="255"
        show-word-limit
        placeholder="Nombre del proyecto"
      />
    </el-form-item>

    <el-form-item label="Descripción" prop="description" :error="fieldErrors.description?.[0]">
      <el-input
        v-model="form.description"
        type="textarea"
        :rows="4"
        maxlength="2000"
        show-word-limit
        placeholder="Descripción opcional del proyecto"
      />
    </el-form-item>

    <div class="project-form__actions">
      <el-button @click="emit('cancel')">Cancelar</el-button>
      <el-button type="primary" native-type="submit" :loading="loading">
        {{ project ? 'Guardar cambios' : 'Crear proyecto' }}
      </el-button>
    </div>
  </el-form>
</template>

<style scoped>
.project-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
