<script setup lang="ts">
/**
 * Pantalla de registro de usuario.
 *
 * Los errores de validación (422) del backend se muestran junto a cada campo.
 */
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { ApiRequestError } from '@/services/http'
import { useAuthStore } from '@/stores/auth'

interface RegisterForm {
  name: string
  email: string
  password: string
  password_confirmation: string
}

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const form = reactive<RegisterForm>({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})
const fieldErrors = ref<Record<string, string[]>>({})

const rules: FormRules<RegisterForm> = {
  name: [{ required: true, message: 'El nombre es obligatorio.', trigger: 'blur' }],
  email: [
    { required: true, message: 'El correo electrónico es obligatorio.', trigger: 'blur' },
    { type: 'email', message: 'Introduce un correo electrónico válido.', trigger: 'blur' },
  ],
  password: [
    { required: true, message: 'La contraseña es obligatoria.', trigger: 'blur' },
    { min: 8, message: 'La contraseña debe tener al menos 8 caracteres.', trigger: 'blur' },
  ],
  password_confirmation: [
    { required: true, message: 'Confirma la contraseña.', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback: (error?: Error) => void) => {
        if (value !== form.password) {
          callback(new Error('Las contraseñas no coinciden.'))
          return
        }

        callback()
      },
      trigger: 'blur',
    },
  ],
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  fieldErrors.value = {}

  try {
    await authStore.register({
      name: form.name,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })
    ElMessage.success('Cuenta creada correctamente.')
    await router.push({ name: 'dashboard' })
  } catch (error) {
    if (error instanceof ApiRequestError) {
      fieldErrors.value = error.fieldErrors
      ElMessage.error(error.message)
      return
    }

    ElMessage.error('No se pudo crear la cuenta. Inténtalo de nuevo.')
  }
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
    <el-form-item label="Nombre" prop="name" :error="fieldErrors.name?.[0]">
      <el-input v-model="form.name" autocomplete="name" placeholder="Nombre y apellidos" />
    </el-form-item>

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
        autocomplete="new-password"
        show-password
        placeholder="Mínimo 8 caracteres"
      />
    </el-form-item>

    <el-form-item
      label="Confirmar contraseña"
      prop="password_confirmation"
      :error="fieldErrors.password_confirmation?.[0]"
    >
      <el-input
        v-model="form.password_confirmation"
        type="password"
        autocomplete="new-password"
        show-password
        placeholder="Repite la contraseña"
      />
    </el-form-item>

    <el-button
      type="primary"
      native-type="submit"
      class="auth-submit"
      :loading="authStore.loading"
      size="large"
    >
      Crear cuenta
    </el-button>

    <p class="auth-switch">
      ¿Ya tienes cuenta?
      <RouterLink :to="{ name: 'login' }">Inicia sesión</RouterLink>
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
