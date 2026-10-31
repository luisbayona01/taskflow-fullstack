<script setup lang="ts">
/**
 * Listado de proyectos.
 *
 * Consume el store de proyectos (Pinia): la vista no hace llamadas Axios.
 * La API no pagina este endpoint, por lo que la búsqueda y la paginación se
 * resuelven en cliente sobre el conjunto completo.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Grid, List, Plus, Refresh, Search } from '@element-plus/icons-vue'

import ProjectCard from '@/components/projects/ProjectCard.vue'
import ProjectForm from '@/components/projects/ProjectForm.vue'
import ProjectTable from '@/components/projects/ProjectTable.vue'
import { useProjectStore } from '@/stores/project'
import { useAuthStore } from '@/stores/auth'
import { describeApiError } from '@/utils/api-error'
import type { Project, ProjectPayload } from '@/types/api'

const router = useRouter()
const projectStore = useProjectStore()
const authStore = useAuthStore()

const PAGE_SIZE = 9
const MOBILE_BREAKPOINT = 900

const search = ref('')
const page = ref(1)
const viewMode = ref<'table' | 'cards'>('table')

const createDialogVisible = ref(false)
const createFieldErrors = ref<Record<string, string[]>>({})

const editDialogVisible = ref(false)
const editingProject = ref<Project | null>(null)
const editFieldErrors = ref<Record<string, string[]>>({})

/** Proyectos filtrados por el texto de búsqueda (nombre o descripción). */
const filteredProjects = computed<Project[]>(() => {
  const term = search.value.trim().toLowerCase()

  if (!term) {
    return projectStore.projects
  }

  return projectStore.projects.filter((project) => {
    const name = project.name.toLowerCase()
    const description = project.description?.toLowerCase() ?? ''

    return name.includes(term) || description.includes(term)
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProjects.value.length / PAGE_SIZE)))

const visibleProjects = computed<Project[]>(() => {
  const start = (page.value - 1) * PAGE_SIZE

  return filteredProjects.value.slice(start, start + PAGE_SIZE)
})

const showCards = computed(() => viewMode.value === 'cards')

watch(search, () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) {
    page.value = value
  }
})

async function loadProjects(): Promise<void> {
  await projectStore.fetchProjects()
  await projectStore.fetchStats(projectStore.projects.map((project) => project.id))
}

onMounted(() => {
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    viewMode.value = 'cards'
  }

  void loadProjects()
})

function openProject(project: Project): void {
  void router.push({ name: 'project-detail', params: { projectId: project.id } })
}

function openCreateDialog(): void {
  createFieldErrors.value = {}
  createDialogVisible.value = true
}

function openEditDialog(project: Project): void {
  editFieldErrors.value = {}
  editingProject.value = project
  editDialogVisible.value = true
}

async function handleCreate(payload: ProjectPayload): Promise<void> {
  createFieldErrors.value = {}

  try {
    const project = await projectStore.createProject(payload)
    createDialogVisible.value = false
    ElMessage.success('Proyecto creado correctamente.')
    await router.push({ name: 'project-detail', params: { projectId: project.id } })
  } catch (unknown) {
    const description = describeApiError(unknown)
    createFieldErrors.value = description.fieldErrors
    ElMessage.error(description.message)
  }
}

async function handleUpdate(payload: ProjectPayload): Promise<void> {
  const project = editingProject.value

  if (!project) {
    return
  }

  editFieldErrors.value = {}

  try {
    await projectStore.updateProject(project.id, payload)
    editDialogVisible.value = false
    ElMessage.success('Proyecto actualizado correctamente.')
  } catch (unknown) {
    const description = describeApiError(unknown)
    editFieldErrors.value = description.fieldErrors
    ElMessage.error(description.message)
  }
}

async function handleDelete(project: Project): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `¿Seguro que quieres eliminar el proyecto "${project.name}"? Esta acción no se puede deshacer.`,
      'Eliminar proyecto',
      {
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }

  try {
    await projectStore.deleteProject(project.id)
    ElMessage.success('Proyecto eliminado correctamente.')
  } catch (unknown) {
    ElMessage.error(describeApiError(unknown).message)
  }
}
</script>

<template>
  <section class="project-list">
    <header class="project-list__header">
      <div>
        <h1 class="project-list__title">Proyectos</h1>
        <p class="project-list__subtitle">
          {{ projectStore.projects.length }} proyecto(s) en tu espacio de trabajo.
        </p>
      </div>

      <div class="project-list__header-actions">
        <el-button :loading="projectStore.loading" @click="loadProjects">
          <el-icon><Refresh /></el-icon>
          Actualizar
        </el-button>
        <el-button type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          Nuevo proyecto
        </el-button>
      </div>
    </header>

    <div class="project-list__toolbar">
      <el-input
        v-model="search"
        class="project-list__search"
        placeholder="Buscar por nombre o descripción"
        clearable
        aria-label="Buscar proyectos"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-radio-group v-model="viewMode" size="small" aria-label="Cambiar vista">
        <el-radio-button value="table">
          <el-icon><List /></el-icon>
        </el-radio-button>
        <el-radio-button value="cards">
          <el-icon><Grid /></el-icon>
        </el-radio-button>
      </el-radio-group>
    </div>

    <div v-if="projectStore.loading" class="project-list__loading" aria-live="polite">
      <el-skeleton :rows="4" animated />
    </div>

    <template v-else>
      <el-alert
        v-if="projectStore.error"
        class="project-list__error"
        type="error"
        show-icon
        :closable="false"
        :title="projectStore.error"
      >
        <template #default>
          <el-button size="small" @click="loadProjects">Reintentar</el-button>
        </template>
      </el-alert>

      <el-empty
        v-else-if="projectStore.isEmpty"
        description="Todavía no tienes proyectos. Crea el primero para empezar."
      >
        <el-button type="primary" @click="openCreateDialog">Nuevo proyecto</el-button>
      </el-empty>

      <el-empty
        v-else-if="filteredProjects.length === 0"
        description="No hay proyectos que coincidan con la búsqueda."
      />

      <template v-else>
        <ProjectTable
          v-if="!showCards"
          :projects="visibleProjects"
          :stats-by-project="projectStore.statsByProject"
          :user-id="authStore.user?.id ?? null"
          @view="openProject"
          @edit="openEditDialog"
          @delete="handleDelete"
        />

        <div v-else class="project-list__grid">
          <ProjectCard
            v-for="project in visibleProjects"
            :key="project.id"
            :project="project"
            :stats="projectStore.statsByProject[project.id] ?? null"
            :user-id="authStore.user?.id ?? null"
            @view="openProject"
            @edit="openEditDialog"
            @delete="handleDelete"
          />
        </div>

        <el-pagination
          v-if="totalPages > 1"
          v-model:current-page="page"
          class="project-list__pagination"
          layout="prev, pager, next"
          :total="filteredProjects.length"
          :page-size="PAGE_SIZE"
        />
      </template>
    </template>

    <el-dialog
      v-model="createDialogVisible"
      title="Nuevo proyecto"
      width="min(520px, 92vw)"
      destroy-on-close
    >
      <ProjectForm
        :loading="projectStore.saving"
        :field-errors="createFieldErrors"
        @submit="handleCreate"
        @cancel="createDialogVisible = false"
      />
    </el-dialog>

    <el-dialog
      v-model="editDialogVisible"
      title="Editar proyecto"
      width="min(520px, 92vw)"
      destroy-on-close
    >
      <ProjectForm
        :project="editingProject"
        :loading="projectStore.saving"
        :field-errors="editFieldErrors"
        @submit="handleUpdate"
        @cancel="editDialogVisible = false"
      />
    </el-dialog>
  </section>
</template>

<style scoped>
.project-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.project-list__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.project-list__title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
}

.project-list__subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.88rem;
  color: var(--tf-text-muted);
}

.project-list__header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.project-list__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.project-list__search {
  max-width: 420px;
}

.project-list__error {
  margin-bottom: 0.5rem;
}

.project-list__loading {
  padding: 1rem;
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 0.75rem;
}

.project-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.project-list__pagination {
  justify-content: center;
  margin-top: 0.5rem;
}

@media (max-width: 640px) {
  .project-list__toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .project-list__search {
    max-width: none;
  }
}
</style>
