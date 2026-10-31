<script setup lang="ts">
/**
 * Tarjeta de proyecto (vista en cuadrícula para tablet y móvil).
 */
import { computed } from 'vue'
import { Calendar, Collection, User } from '@element-plus/icons-vue'

import { formatDate } from '@/utils/format'
import { PROJECT_ROLE_LABELS, resolveProjectRole } from '@/utils/project-role'
import type { Project, ProjectStats } from '@/types/api'

const props = defineProps<{
  project: Project
  stats?: ProjectStats | null
  userId: number | null
}>()

const emit = defineEmits<{
  (event: 'view', project: Project): void
  (event: 'edit', project: Project): void
  (event: 'delete', project: Project): void
}>()

const role = computed(() => resolveProjectRole(props.project, props.userId))
const isOwner = computed(() => role.value === 'owner')
const taskCount = computed(() => props.stats?.total_tasks ?? null)
const progress = computed(() => props.stats?.progress_percentage ?? null)
</script>

<template>
  <el-card class="project-card" shadow="hover">
    <template #header>
      <div class="project-card__header">
        <h3 class="project-card__title">{{ project.name }}</h3>
        <el-tag :type="isOwner ? 'primary' : 'info'" size="small" effect="light">
          {{ PROJECT_ROLE_LABELS[role] }}
        </el-tag>
      </div>
    </template>

    <p class="project-card__description">
      {{ project.description?.trim() || 'Sin descripción.' }}
    </p>

    <dl class="project-card__meta">
      <div class="project-card__meta-item">
        <el-icon><User /></el-icon>
        <dt>Propietario</dt>
        <dd>{{ project.owner?.name ?? '—' }}</dd>
      </div>

      <div class="project-card__meta-item">
        <el-icon><Collection /></el-icon>
        <dt>Tareas</dt>
        <dd>{{ taskCount ?? '—' }}</dd>
      </div>

      <div class="project-card__meta-item">
        <el-icon><Calendar /></el-icon>
        <dt>Creado</dt>
        <dd>{{ formatDate(project.created_at) }}</dd>
      </div>
    </dl>

    <el-progress
      v-if="progress !== null"
      :percentage="progress"
      :stroke-width="8"
      class="project-card__progress"
    />

    <template #footer>
      <div class="project-card__actions">
        <el-button text type="primary" @click="emit('view', project)">Ver</el-button>
        <el-button v-if="isOwner" text @click="emit('edit', project)">Editar</el-button>
        <el-button v-if="isOwner" text type="danger" @click="emit('delete', project)">
          Eliminar
        </el-button>
      </div>
    </template>
  </el-card>
</template>

<style scoped>
.project-card {
  height: 100%;
}

.project-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.project-card__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  word-break: break-word;
}

.project-card__description {
  display: -webkit-box;
  min-height: 3rem;
  margin: 0 0 0.75rem;
  overflow: hidden;
  font-size: 0.88rem;
  color: var(--tf-text-muted);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.project-card__meta {
  display: grid;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.82rem;
}

.project-card__meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--tf-text-muted);
}

.project-card__meta-item dt {
  margin: 0;
}

.project-card__meta-item dd {
  margin: 0 0 0 auto;
  color: var(--tf-text);
}

.project-card__progress {
  margin-top: 0.75rem;
}

.project-card__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.25rem;
}
</style>
