<template>
  <div v-if="isOpen" class="video-modal-overlay" @click="close">
    <div class="video-modal-container" @click.stop>
      <button class="video-modal-close" @click="close" aria-label="Close video">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
      <div class="video-modal-content">
        <iframe
          :src="`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`"
          title="Vapor Demo Video"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  videoId: {
    type: String,
    required: true
  }
})

const isOpen = ref(false)

const open = () => {
  isOpen.value = true
  document.body.style.overflow = 'hidden'
}

const close = () => {
  isOpen.value = false
  document.body.style.overflow = ''
}

// Handle ESC key
const handleEsc = (e) => {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEsc)
  document.body.style.overflow = ''
})

// Expose methods for parent component
defineExpose({ open, close })
</script>

<style scoped>
.video-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.video-modal-container {
  position: relative;
  width: 100%;
  max-width: 900px;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.video-modal-close {
  position: absolute;
  top: -40px;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.video-modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.video-modal-content {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.video-modal-content iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

/* Transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .video-modal-container,
.modal-leave-active .video-modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .video-modal-container {
  transform: scale(0.9);
}

.modal-leave-to .video-modal-container {
  transform: scale(0.9);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .video-modal-close {
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.7);
  }
  
  .video-modal-container {
    margin-top: 50px;
  }
}
</style>
