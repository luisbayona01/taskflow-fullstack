<script setup lang="ts">
/**
 * Formulario de tarea (alta y edición).
 *
 * Los campos coinciden con el payload real de
 * `POST /api/projects/{project}/tasks`.
 */
import { reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/utils/task-labels'
import type { ProjectMember, Task, TaskPayload } from '@/types/api'

interface TaskFormModel {
  title: string
  description: string
  status: TaskPayload['status']
  priority: TaskPayload['priority']
  due_date: string
  assigned_to: number | undefined
}

const props = withDefaults(
  defineProps<{
    /** Tarea a editar. `null` significa que se trata de un alta. */
    task?: Task | null
    members?: ProjectMember[]
    loading?: boolean
    fieldErrors?: Record<string, string[]>
  }>(),
  {
    task: null,
    members: () => [],
    loading: false,
    fieldErrors: () => ({}),
  },
)

const emit = defineEmits<{
  (event: 'submit', payload: TaskPayload): void
  (event: 'cancel'): void
}>()

const formRef = ref<FormInstance>()
const form = reactive<TaskFormModel>({
  title: '',
  description: '',
  status: undefined,
  priority: undefined,
  due_date: '',
  assigned_to: undefined,
})

const rules: FormRules<TaskFormModel> = {
  title: [
    { required: true, message: 'El título es obligatorio.', trigger: 'blur' },
    { max: 255, message: 'El título no puede superar los 255 caracteres.', trigger: 'blur' },
  ],
  description: [{ max: 5000, message: 'La descripción es demasiado larga.', trigger: 'blur' }],
}

watch(
  () => props.task,
  (task) => {
    form.title = task?.title ?? ''
    form.description = task?.description ?? ''
    form.status = task?.status ?? undefined
    form.priority = task?.priority ?? undefined
    form.due_date = task?.due_date ?? ''
    form.assigned_to = task?.assigned_to ?? undefined
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
    title: form.title.trim(),
    description: form.description.trim() === '' ? null : form.description.trim(),
    status: form.status ?? null,
    priority: form.priority ?? null,
    due_date: form.due_date === '' ? null : form.due_date,
    assigned_to: form.assigned_to ?? null,
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
    <el-form-item label="Título" prop="title" :error="fieldErrors.title?.[0]">
      <el-input v-model="form.title" maxlength="255" placeholder="Título de la tarea" />
    </el-form-item>

    <el-form-item label="Descripción" prop="description" :error="fieldErrors.description?.[0]">
      <el-input
        v-model="form.description"
        type="textarea"
        :rows="3"
        maxlength="5000"
        placeholder="Descripción opcional"
      />
    </el-form-item>

    <div class="task-form__row">
      <el-form-item label="Estado" prop="status" :error="fieldErrors.status?.[0]">
        <el-select v-model="form.status" placeholder="Pendiente" clearable>
          <el-option
            v-for="(label, value) in TASK_STATUS_LABELS"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Prioridad" prop="priority" :error="fieldErrors.priority?.[0]">
        <el-select v-model="form.priority" placeholder="Media" clearable>
          <el-option
            v-for="(label, value) in TASK_PRIORITY_LABELS"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
      </el-form-item>
    </div>

    <div class="task-form__row">
      <el-form-item label="Vencimiento" prop="due_date" :error="fieldErrors.due_date?.[0]">
        <el-date-picker
          v-model="form.due_date"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="Sin fecha"
          clearable
        />
      </el-form-item>

      <el-form-item label="Asignar a" prop="assigned_to" :error="fieldErrors.assigned_to?.[0]">
        <el-select v-model="form.assigned_to" placeholder="Sin asignar" clearable>
          <el-option
            v-for="member in members"
            :key="member.id"
            :label="member.name"
            :value="member.id"
          />
        </el-select>
      </el-form-item>
    </div>

    <div class="task-form__actions">
      <el-button @click="emit('cancel')">Cancelar</el-button>
      <el-button type="primary" native-type="submit" :loading="loading">
        {{ task ? 'Guardar cambios' : 'Crear tarea' }}
      </el-button>
    </div>
  </el-form>
</template>

<style scoped>
.task-form__row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0 1rem;
}

.task-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
