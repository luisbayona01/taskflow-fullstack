<script setup lang="ts">
/**
 * Lista de miembros de un proyecto.
 *
 * Las acciones administrativas solo se muestran al propietario del proyecto y
 * nunca sobre la fila del propio propietario (el backend rechaza con 422 que
 * se retire a sí mismo).
 */
import { computed } from 'vue'

import { PROJECT_ROLE_LABELS, roleForMember } from '@/utils/project-role'
import type { ProjectMember } from '@/types/api'

const props = defineProps<{
  members: ProjectMember[]
  projectOwnerId: number
  currentUserId: number | null
  canManage: boolean
  removingUserId?: number | null
}>()

const emit = defineEmits<{
  (event: 'remove', member: ProjectMember): void
}>()

const roleOf = (member: ProjectMember): 'owner' | 'member' =>
  roleForMember(member.id, props.projectOwnerId)

/** El propietario no puede retirarse a sí mismo. */
function canRemove(member: ProjectMember): boolean {
  if (!props.canManage) {
    return false
  }

  return member.id !== props.projectOwnerId && member.id !== props.currentUserId
}

const ownerLabel = computed(() => PROJECT_ROLE_LABELS.owner)
</script>

<template>
  <ul class="member-list">
    <li v-for="member in members" :key="member.id" class="member-list__item">
      <el-avatar :size="34">{{ member.name.charAt(0).toUpperCase() }}</el-avatar>

      <div class="member-list__info">
        <strong>{{ member.name }}</strong>
        <span>{{ member.email }}</span>
      </div>

      <el-tag
        :type="roleOf(member) === 'owner' ? 'primary' : 'info'"
        size="small"
        effect="light"
      >
        {{ roleOf(member) === 'owner' ? ownerLabel : PROJECT_ROLE_LABELS.member }}
      </el-tag>

      <el-tag v-if="member.id === currentUserId" size="small" type="success" effect="plain">
        Tú
      </el-tag>

      <el-button
        v-if="canRemove(member)"
        class="member-list__remove"
        text
        type="danger"
        :loading="removingUserId === member.id"
        @click="emit('remove', member)"
      >
        Retirar
      </el-button>
    </li>
  </ul>
</template>

<style scoped>
.member-list {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.member-list__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.25rem;
  border-bottom: 1px solid var(--tf-border);
}

.member-list__item:last-child {
  border-bottom: none;
}

.member-list__info {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.member-list__info span {
  font-size: 0.8rem;
  color: var(--tf-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-list__remove {
  flex-shrink: 0;
}
</style>
