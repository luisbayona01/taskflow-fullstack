<script setup lang="ts">
/**
 * Comentario individual: autor (proveniente del backend), contenido y fecha.
 */
import { formatDateTime } from '@/utils/format'
import type { Comment } from '@/types/api'

defineProps<{
  comment: Comment
  currentUserId?: number | null
}>()
</script>

<template>
  <article class="comment-item">
    <el-avatar :size="34">{{ comment.author.name.charAt(0).toUpperCase() }}</el-avatar>

    <div class="comment-item__content">
      <header class="comment-item__header">
        <strong>{{ comment.author.name }}</strong>
        <el-tag
          v-if="comment.author.id === currentUserId"
          size="small"
          type="success"
          effect="plain"
        >
          Tú
        </el-tag>
        <time class="comment-item__date" :datetime="comment.created_at">
          {{ formatDateTime(comment.created_at) }}
        </time>
      </header>

      <p class="comment-item__body">{{ comment.body }}</p>
    </div>
  </article>
</template>

<style scoped>
.comment-item {
  display: flex;
  gap: 0.6rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--tf-border);
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-item__content {
  flex: 1;
  min-width: 0;
}

.comment-item__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.comment-item__date {
  margin-left: auto;
  font-size: 0.78rem;
  color: var(--tf-text-muted);
}

.comment-item__body {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
