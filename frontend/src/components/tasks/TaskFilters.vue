<script setup lang="ts">
/**
 * Barra de filtros de tareas.
 *
 * Cada control se corresponde con un parámetro real de
 * `GET /api/projects/{project}/tasks` (ver `backend/routes/api.php`).
 */
import { computed } from 'vue'
import { Refresh, Search } from '@element-plus/icons-vue'

import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from '@/utils/task-labels'
import type { ProjectMember, TaskFilters } from '@/types/api'

const props = defineProps<{
  modelValue: TaskFilters
  members: ProjectMember[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: TaskFilters): void
  (event: 'apply', value: TaskFilters): void
}>()

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Fecha de creación' },
  { value: 'updated_at', label: 'Última actualización' },
  { value: 'due_date', label: 'Fecha de vencimiento' },
  { value: 'title', label: 'Título' },
  { value: 'status', label: 'Estado' },
  { value: 'priority', label: 'Prioridad' },
] as const

const PER_PAGE_OPTIONS = [15, 30, 50, 100] as const

const local = computed<TaskFilters>(() => ({ ...props.modelValue }))

function update(patch: Partial<TaskFilters>): void {
  emit('update:modelValue', { ...props.modelValue, ...patch })
}

function apply(): void {
  emit('apply', { ...props.modelValue })
}

function reset(): void {
  const empty: TaskFilters = {}

  emit('update:modelValue', empty)
  emit('apply', empty)
}
</script>

<template>
  <form class="task-filters" @submit.prevent="apply">
    <el-input
      class="task-filters__search"
      :model-value="local.search"
      placeholder="Buscar por título"
      clearable
      aria-label="Buscar tareas"
      @update:model-value="update({ search: $event || undefined })"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>

    <el-select
      :model-value="local.status"
      placeholder="Estado"
      clearable
      aria-label="Filtrar por estado"
      @update:model-value="update({ status: $event || undefined })"
    >
      <el-option
        v-for="(label, value) in TASK_STATUS_LABELS"
        :key="value"
        :label="label"
        :value="value"
      />
    </el-select>

    <el-select
      :model-value="local.priority"
      placeholder="Prioridad"
      clearable
      aria-label="Filtrar por prioridad"
      @update:model-value="update({ priority: $event || undefined })"
    >
      <el-option
        v-for="(label, value) in TASK_PRIORITY_LABELS"
        :key="value"
        :label="label"
        :value="value"
      />
    </el-select>

    <el-select
      :model-value="local.assigned_to"
      placeholder="Asignada a"
      clearable
      aria-label="Filtrar por asignado"
      @update:model-value="update({ assigned_to: $event || undefined })"
    >
      <el-option
        v-for="member in members"
        :key="member.id"
        :label="member.name"
        :value="member.id"
      />
    </el-select>

    <el-date-picker
      :model-value="local.due_date_from"
      type="date"
      value-format="YYYY-MM-DD"
      placeholder="Vence desde"
      aria-label="Vencimiento desde"
      @update:model-value="update({ due_date_from: $event || undefined })"
    />

    <el-date-picker
      :model-value="local.due_date_to"
      type="date"
      value-format="YYYY-MM-DD"
      placeholder="Vence hasta"
      aria-label="Vencimiento hasta"
      @update:model-value="update({ due_date_to: $event || undefined })"
    />

    <el-select
      :model-value="local.sort_by"
      placeholder="Ordenar por"
      clearable
      aria-label="Ordenar por"
      @update:model-value="update({ sort_by: $event || undefined })"
    >
      <el-option
        v-for="option in SORT_OPTIONS"
        :key="option.value"
        :label="option.label"
        :value="option.value"
      />
    </el-select>

    <el-select
      :model-value="local.sort_direction"
      placeholder="Dirección"
      clearable
      aria-label="Dirección de orden"
      @update:model-value="update({ sort_direction: $event || undefined })"
    >
      <el-option label="Ascendente" value="asc" />
      <el-option label="Descendente" value="desc" />
    </el-select>

    <el-select
      :model-value="local.per_page"
      placeholder="Por página"
      aria-label="Tareas por página"
      @update:model-value="update({ per_page: $event || undefined })"
    >
      <el-option
        v-for="option in PER_PAGE_OPTIONS"
        :key="option"
        :label="`${option} por página`"
        :value="option"
      />
    </el-select>

    <div class="task-filters__actions">
      <el-button native-type="submit" type="primary" :loading="loading">Aplicar</el-button>
      <el-button text @click="reset">
        <el-icon><Refresh /></el-icon>
        Limpiar
      </el-button>
    </div>
  </form>
</template>

<style scoped>
.task-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 0.75rem;
}

.task-filters__search {
  flex: 1 1 220px;
  min-width: 180px;
}

.task-filters__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}
</style>
