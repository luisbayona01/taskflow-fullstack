<script setup lang="ts">
/**
 * Sección de comentarios de una tarea.
 *
 * Lista, publica y pagina los comentarios usando el store de comentarios.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

import CommentForm from '@/components/tasks/CommentForm.vue'
import CommentItem from '@/components/tasks/CommentItem.vue'
import { useCommentStore } from '@/stores/comment'
import { useAuthStore } from '@/stores/auth'
import { describeApiError } from '@/utils/api-error'

const props = defineProps<{
  projectId: number
  taskId: number
}>()

const commentStore = useCommentStore()
const authStore = useAuthStore()

const fieldErrors = ref<Record<string, string[]>>({})
const currentPage = ref(1)

const totalPages = computed(() => commentStore.pagination?.last_page ?? 1)

async function loadComments(page = currentPage.value): Promise<void> {
  currentPage.value = page
  await commentStore.fetchComments(props.projectId, props.taskId, page)
}

onMounted(() => {
  void loadComments(1)
})

watch(
  () => [props.projectId, props.taskId],
  () => {
    fieldErrors.value = {}
    void loadComments(1)
  },
)

async function handleSubmit(body: string): Promise<void> {
  fieldErrors.value = {}

  try {
    await commentStore.postComment(props.projectId, props.taskId, body)
    ElMessage.success('Comentario publicado.')
  } catch (unknown) {
    const description = describeApiError(unknown)
    fieldErrors.value = description.fieldErrors
    ElMessage.error(description.message)
  }
}
</script>

<template>
  <section class="task-comments">
    <h2 class="task-comments__title">Comentarios ({{ commentStore.comments.length }})</h2>

    <el-alert
      v-if="commentStore.error"
      type="error"
      show-icon
      :closable="false"
      :title="commentStore.error"
      class="task-comments__error"
    />

    <div v-if="commentStore.loading" aria-live="polite">
      <el-skeleton :rows="3" animated />
    </div>

    <el-empty
      v-else-if="commentStore.comments.length === 0"
      description="Todavía no hay comentarios en esta tarea."
      :image-size="70"
    />

    <div v-else class="task-comments__list">
      <CommentItem
        v-for="comment in commentStore.comments"
        :key="comment.id"
        :comment="comment"
        :current-user-id="authStore.user?.id ?? null"
      />
    </div>

    <el-pagination
      v-if="totalPages > 1"
      v-model:current-page="currentPage"
      class="task-comments__pagination"
      layout="prev, pager, next"
      :total="commentStore.pagination?.total ?? 0"
      :page-size="commentStore.pagination?.per_page ?? 15"
      @current-change="loadComments"
    />

    <CommentForm
      class="task-comments__form"
      :loading="commentStore.submitting"
      :field-errors="fieldErrors"
      @submit="handleSubmit"
    />
  </section>
</template>

<style scoped>
.task-comments {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.task-comments__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.task-comments__error {
  margin-bottom: 0.25rem;
}

.task-comments__list {
  display: flex;
  flex-direction: column;
}

.task-comments__pagination {
  justify-content: flex-start;
}

.task-comments__form {
  padding-top: 0.75rem;
  border-top: 1px solid var(--tf-border);
}
</style>
