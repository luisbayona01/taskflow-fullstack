<script setup lang="ts">
/**
 * Pantalla de inicio de sesión.
 *
 * Los errores de validación (422) del backend se muestran junto a cada campo.
 */
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { describeApiError } from '@/utils/api-error'
import { useAuthStore } from '@/stores/auth'

interface LoginForm {
  email: string
  password: string
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const form = reactive<LoginForm>({ email: '', password: '' })
const fieldErrors = ref<Record<string, string[]>>({})

const rules: FormRules<LoginForm> = {
  email: [
    { required: true, message: 'El correo electrónico es obligatorio.', trigger: 'blur' },
    { type: 'email', message: 'Introduce un correo electrónico válido.', trigger: 'blur' },
  ],
  password: [{ required: true, message: 'La contraseña es obligatoria.', trigger: 'blur' }],
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  fieldErrors.value = {}

  try {
    await authStore.login({ email: form.email, password: form.password })
    ElMessage.success('Sesión iniciada correctamente.')
    await router.push((route.query.redirect as string) || { name: 'dashboard' })
  } catch (error) {
    const description = describeApiError(error)
    fieldErrors.value = description.fieldErrors
    ElMessage.error(description.message)
  }
}

// Expuesto para poder ejercitar el envío desde las pruebas unitarias.
defineExpose({ handleSubmit })
</script>

<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-position="top"
    @submit.prevent="handleSubmit"
  >
    <el-form-item label="Correo electrónico" prop="email" :error="fieldErrors.email?.[0]">
      <el-input
        v-model="form.email"
        type="email"
        autocomplete="email"
        placeholder="tu@correo.com"
      />
    </el-form-item>

    <el-form-item label="Contraseña" prop="password" :error="fieldErrors.password?.[0]">
      <el-input
        v-model="form.password"
        type="password"
        autocomplete="current-password"
        show-password
        placeholder="••••••••"
      />
    </el-form-item>

    <el-button
      type="primary"
      native-type="submit"
      class="auth-submit"
      :loading="authStore.loading"
      size="large"
    >
      Entrar
    </el-button>

    <p class="auth-switch">
      ¿No tienes cuenta?
      <RouterLink :to="{ name: 'register' }">Regístrate</RouterLink>
    </p>
  </el-form>
</template>

<style scoped>
.auth-submit {
  width: 100%;
  margin-top: 0.5rem;
}

.auth-switch {
  margin: 1.25rem 0 0;
  text-align: center;
  font-size: 0.88rem;
  color: var(--tf-text-muted);
}

.auth-switch a {
  color: var(--tf-primary);
  font-weight: 600;
  text-decoration: none;
}
</style>
