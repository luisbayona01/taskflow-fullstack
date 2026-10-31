<script setup lang="ts">
/**
 * Diálogo para agregar un integrante a un proyecto.
 *
 * El backend solo admite el identificador del usuario (`user_id`) y no expone
 * ningún endpoint de búsqueda de usuarios, por lo que el formulario trabaja
 * con ese dato en lugar de inventar un contrato que no existe.
 */
import { computed, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

interface AddMemberModel {
  userId: number | undefined
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    loading?: boolean
    /** Identificadores de los miembros actuales (evita duplicados). */
    memberIds?: number[]
    /** Errores de validación del backend (422), indexados por campo. */
    fieldErrors?: Record<string, string[]>
  }>(),
  {
    loading: false,
    memberIds: () => [],
    fieldErrors: () => ({}),
  },
)

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'submit', userId: number): void
}>()

const formRef = ref<FormInstance>()
const form = ref<AddMemberModel>({ userId: undefined })

const rules = computed<FormRules<AddMemberModel>>(() => ({
  userId: [
    { required: true, message: 'El identificador del usuario es obligatorio.', trigger: 'blur' },
    {
      validator: (_rule, value: number | undefined, callback: (error?: Error) => void) => {
        if (value !== undefined && value > 0 && props.memberIds.includes(value)) {
          callback(new Error('Este usuario ya pertenece al proyecto.'))
          return
        }

        callback()
      },
      trigger: 'blur',
    },
  ],
}))

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      form.value = { userId: undefined }
      formRef.value?.clearValidate()
    }
  },
)

function close(): void {
  emit('update:visible', false)
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid || form.value.userId === undefined) {
    return
  }

  emit('submit', form.value.userId)
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="Agregar integrante"
    width="min(460px, 92vw)"
    @update:model-value="emit('update:visible', $event)"
  >
    <el-alert
      class="add-member__notice"
      type="info"
      show-icon
      :closable="false"
      title="Identificador de usuario"
      description="El backend solo permite agregar miembros mediante su identificador numérico (user_id); no existe un endpoint de búsqueda de usuarios."
    />

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent="handleSubmit"
    >
      <el-form-item label="ID del usuario" prop="userId" :error="fieldErrors.user_id?.[0]">
        <el-input-number
          v-model="form.userId"
          :min="1"
          :step="1"
          step-strictly
          controls-position="right"
          placeholder="Por ejemplo, 7"
        />
      </el-form-item>

      <div class="add-member__actions">
        <el-button @click="close">Cancelar</el-button>
        <el-button type="primary" native-type="submit" :loading="loading">Agregar</el-button>
      </div>
    </el-form>
  </el-dialog>
</template>

<style scoped>
.add-member__notice {
  margin-bottom: 1rem;
}

.add-member__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
