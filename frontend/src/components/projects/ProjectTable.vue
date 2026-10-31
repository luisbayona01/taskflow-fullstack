<script setup lang="ts">
/**
 * Tabla de proyectos (vista de escritorio).
 *
 * Las acciones de administración solo se muestran al propietario; el backend
 * sigue validando la autorización de cada operación.
 */
import { computed } from 'vue'

import { formatDate } from '@/utils/format'
import { PROJECT_ROLE_LABELS, resolveProjectRole } from '@/utils/project-role'
import type { Project, ProjectStats } from '@/types/api'

const props = defineProps<{
  projects: Project[]
  statsByProject: Record<number, ProjectStats>
  userId: number | null
}>()

const emit = defineEmits<{
  (event: 'view', project: Project): void
  (event: 'edit', project: Project): void
  (event: 'delete', project: Project): void
}>()

interface TableRow {
  project: Project
  role: ReturnType<typeof resolveProjectRole>
  taskCount: number | null
  progress: number | null
}

const rows = computed<TableRow[]>(() =>
  props.projects.map((project) => ({
    project,
    role: resolveProjectRole(project, props.userId),
    taskCount: props.statsByProject[project.id]?.total_tasks ?? null,
    progress: props.statsByProject[project.id]?.progress_percentage ?? null,
  })),
)

const isOwner = (row: TableRow): boolean => row.role === 'owner'
</script>

<template>
  <el-table :data="rows" row-key="project.id" class="project-table">
    <el-table-column label="Proyecto" min-width="220">
      <template #default="{ row }: { row: TableRow }">
        <div class="project-table__name">
          <strong>{{ row.project.name }}</strong>
          <span class="project-table__description">
            {{ row.project.description?.trim() || 'Sin descripción.' }}
          </span>
        </div>
      </template>
    </el-table-column>

    <el-table-column label="Propietario" min-width="150">
      <template #default="{ row }: { row: TableRow }">
        {{ row.project.owner?.name ?? '—' }}
      </template>
    </el-table-column>

    <el-table-column label="Rol" width="120">
      <template #default="{ row }: { row: TableRow }">
        <el-tag :type="isOwner(row) ? 'primary' : 'info'" size="small" effect="light">
          {{ PROJECT_ROLE_LABELS[row.role] }}
        </el-tag>
      </template>
    </el-table-column>

    <el-table-column label="Tareas" width="100" align="center">
      <template #default="{ row }: { row: TableRow }">
        {{ row.taskCount ?? '—' }}
      </template>
    </el-table-column>

    <el-table-column label="Progreso" width="150">
      <template #default="{ row }: { row: TableRow }">
        <el-progress v-if="row.progress !== null" :percentage="row.progress" :stroke-width="8" />
        <span v-else>—</span>
      </template>
    </el-table-column>

    <el-table-column label="Creado" width="140">
      <template #default="{ row }: { row: TableRow }">
        {{ formatDate(row.project.created_at) }}
      </template>
    </el-table-column>

    <el-table-column label="Acciones" width="210" align="right">
      <template #default="{ row }: { row: TableRow }">
        <el-button text type="primary" @click="emit('view', row.project)">Ver</el-button>
        <el-button v-if="isOwner(row)" text @click="emit('edit', row.project)">Editar</el-button>
        <el-button v-if="isOwner(row)" text type="danger" @click="emit('delete', row.project)">
          Eliminar
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.project-table__name {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.project-table__description {
  font-size: 0.82rem;
  color: var(--tf-text-muted);
}
</style>
