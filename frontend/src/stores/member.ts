/**
 * Store de miembros de un proyecto (Pinia).
 *
 * El backend solo permite administrar miembros al propietario del proyecto
 * (`ProjectPolicy::manageMembers`), por lo que un 403 se maneja como un error
 * de permisos y no como un fallo de carga.
 */

import { ref } from 'vue'
import { defineStore } from 'pinia'

import { memberService } from '@/services/member'
import { describeApiError } from '@/utils/api-error'
import type { ProjectMember } from '@/types/api'

export const useMemberStore = defineStore('member', () => {
  const members = ref<ProjectMember[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const removing = ref(false)
  const error = ref<string | null>(null)

  async function fetchMembers(projectId: number): Promise<void> {
    loading.value = true
    error.value = null

    try {
      members.value = await memberService.list(projectId)
    } catch (unknown) {
      members.value = []
      error.value = describeApiError(unknown).message
    } finally {
      loading.value = false
    }
  }

  function findMember(userId: number): ProjectMember | undefined {
    return members.value.find((member) => member.id === userId)
  }

  function isMember(userId: number): boolean {
    return findMember(userId) !== undefined
  }

  async function addMember(projectId: number, userId: number): Promise<void> {
    saving.value = true

    try {
      await memberService.add(projectId, userId)
      // El alta no devuelve el recurso, así que se recarga la lista.
      await fetchMembers(projectId)
    } finally {
      saving.value = false
    }
  }

  async function removeMember(projectId: number, userId: number): Promise<void> {
    removing.value = true

    try {
      await memberService.remove(projectId, userId)
      members.value = members.value.filter((member) => member.id !== userId)
    } finally {
      removing.value = false
    }
  }

  function reset(): void {
    members.value = []
    error.value = null
  }

  return {
    members,
    loading,
    saving,
    removing,
    error,
    fetchMembers,
    findMember,
    isMember,
    addMember,
    removeMember,
    reset,
  }
})
