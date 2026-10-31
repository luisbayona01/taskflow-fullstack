<script setup lang="ts">
/**
 * Sección de miembros del proyecto.
 *
 * Se integra en el detalle del proyecto. Solo el propietario puede agregar o
 * retirar integrantes: el resto de miembros ve el listado sin acciones.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'

import AddMemberDialog from '@/components/projects/AddMemberDialog.vue'
import MemberList from '@/components/projects/MemberList.vue'
import { useMemberStore } from '@/stores/member'
import { describeApiError } from '@/utils/api-error'
import type { ProjectMember } from '@/types/api'

const props = defineProps<{
  projectId: number
  projectOwnerId: number
  canManage: boolean
  currentUserId: number | null
}>()

const memberStore = useMemberStore()

const dialogVisible = ref(false)
const fieldErrors = ref<Record<string, string[]>>({})
const removingUserId = ref<number | null>(null)

const memberIds = computed(() => memberStore.members.map((member) => member.id))

async function loadMembers(): Promise<void> {
  await memberStore.fetchMembers(props.projectId)
}

onMounted(loadMembers)

watch(
  () => props.projectId,
  () => {
    void loadMembers()
  },
)

async function handleAdd(userId: number): Promise<void> {
  fieldErrors.value = {}

  try {
    await memberStore.addMember(props.projectId, userId)
    dialogVisible.value = false
    ElMessage.success('Integrante agregado al proyecto.')
  } catch (unknown) {
    const description = describeApiError(unknown)
    fieldErrors.value = description.fieldErrors
    ElMessage.error(description.message)
  }
}

async function handleRemove(member: ProjectMember): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `¿Seguro que quieres retirar a ${member.name} del proyecto?`,
      'Retirar integrante',
      {
        confirmButtonText: 'Retirar',
        cancelButtonText: 'Cancelar',
        type: 'warning',
        confirmButtonClass: 'el-button--danger',
      },
    )
  } catch {
    return
  }

  removingUserId.value = member.id

  try {
    await memberStore.removeMember(props.projectId, member.id)
    ElMessage.success('Integrante retirado del proyecto.')
  } catch (unknown) {
    ElMessage.error(describeApiError(unknown).message)
  } finally {
    removingUserId.value = null
  }
}
</script>

<template>
  <section class="project-members">
    <header class="project-members__header">
      <h2 class="project-members__title">Miembros ({{ memberStore.members.length }})</h2>

      <div class="project-members__actions">
        <el-button
          text
          :loading="memberStore.loading"
          aria-label="Actualizar miembros"
          @click="loadMembers"
        >
          <el-icon><Refresh /></el-icon>
        </el-button>

        <el-button v-if="canManage" type="primary" size="small" @click="dialogVisible = true">
          <el-icon><Plus /></el-icon>
          Agregar integrante
        </el-button>
      </div>
    </header>

    <el-alert
      v-if="memberStore.error"
      type="error"
      show-icon
      :closable="false"
      :title="memberStore.error"
      class="project-members__error"
    />

    <div v-if="memberStore.loading" aria-live="polite">
      <el-skeleton :rows="3" animated />
    </div>

    <el-empty
      v-else-if="memberStore.members.length === 0"
      description="Este proyecto todavía no tiene miembros."
      :image-size="70"
    />

    <MemberList
      v-else
      :members="memberStore.members"
      :project-owner-id="projectOwnerId"
      :current-user-id="currentUserId"
      :can-manage="canManage"
      :removing-user-id="removingUserId"
      @remove="handleRemove"
    />

    <AddMemberDialog
      v-model:visible="dialogVisible"
      :loading="memberStore.saving"
      :member-ids="memberIds"
      :field-errors="fieldErrors"
      @submit="handleAdd"
    />
  </section>
</template>

<style scoped>
.project-members {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.project-members__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.project-members__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.project-members__actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.project-members__error {
  margin-bottom: 0.25rem;
}
</style>
