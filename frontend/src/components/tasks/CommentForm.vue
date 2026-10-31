<script setup lang="ts">
/**
 * Formulario para publicar un comentario.
 *
 * El autor lo toma el backend de la sesión autenticada: el formulario solo
 * permite escribir el contenido.
 */
import { ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

interface CommentFormModel {
  body: string
}

const props = withDefaults(
  defineProps<{
    loading?: boolean
    /** Errores de validación del backend (422), indexados por campo. */
    fieldErrors?: Record<string, string[]>
  }>(),
  {
    loading: false,
    fieldErrors: () => ({}),
  },
)

const emit = defineEmits<{
  (event: 'submit', body: string): void
}>()

const formRef = ref<FormInstance>()
const form = ref<CommentFormModel>({ body: '' })

const rules: FormRules<CommentFormModel> = {
  body: [
    { required: true, message: 'El comentario no puede estar vacío.', trigger: 'blur' },
    { max: 2000, message: 'El comentario no puede superar los 2000 caracteres.', trigger: 'blur' },
  ],
}

watch(
  () => props.loading,
  (loading) => {
    if (!loading) {
      formRef.value?.clearValidate()
    }
  },
)

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  emit('submit', form.value.body.trim())
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
    <el-form-item label="Nuevo comentario" prop="body" :error="fieldErrors.body?.[0]">
      <el-input
        v-model="form.body"
        type="textarea"
        :rows="3"
        maxlength="2000"
        show-word-limit
        placeholder="Escribe un comentario…"
      />
    </el-form-item>

    <div class="comment-form__actions">
      <el-button
        type="primary"
        native-type="submit"
        :loading="loading"
        :disabled="loading"
      >
        {{ loading ? 'Publicando…' : 'Publicar' }}
      </el-button>
    </div>
  </el-form>
</template>

<style scoped>
.comment-form__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
