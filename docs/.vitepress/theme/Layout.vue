<template>
  <Layout>
    <template #nav-bar-content-after>
      <LanguageSwitcher />
    </template>
  
    <!-- Inject modal at the very bottom of layout so it always renders -->
    <template #layout-bottom>
      <VideoModal ref="videoModal" video-id="8MZk5s8x8FY" />
    </template>
  </Layout>
</template>

<script setup>
import { onMounted, ref, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import VideoModal from './components/VideoModal.vue'

const { Layout } = DefaultTheme
const videoModal = ref(null)
const route = useRoute()

let cleanupFns = []
let mo // MutationObserver

function attachTrigger() {
  const hero = document.querySelector('.VPHero')
  if (!hero) return

  // Try a few common containers around the hero image
  const candidates = [
    hero.querySelector('.image-container'),
    hero.querySelector('.VPImage.image-src'),
    hero.querySelector('.VPImage'),
    hero.querySelector('.image'),
    hero.querySelector('picture'),
    hero.querySelector('img')
  ].filter(Boolean)

  const imgEl = hero.querySelector('img')
  const target = candidates[0] || hero
  if (!imgEl || !target) return

  // Mark as trigger and make accessible on both container and image
  ;[target, imgEl].forEach((el) => {
    el.classList.add('vp-hero-video-trigger')
    el.setAttribute('role', 'button')
    el.setAttribute('tabindex', '0')
    el.setAttribute('aria-label', 'Play Vapor overview video')
  })

  const tryOpen = () => {
    // Debug hook
    // eslint-disable-next-line no-console
    console.debug('[Vapor Docs] Opening video modal')
    if (videoModal.value && typeof videoModal.value.open === 'function') {
      videoModal.value.open()
    } else {
      requestAnimationFrame(() => {
        if (videoModal.value && typeof videoModal.value.open === 'function') {
          videoModal.value.open()
        }
      })
    }
  }

  const onClick = (e) => {
    // Delegate: only react if clicking image or its container
    const t = e.target
    if (
      t && (t.classList?.contains('image-bg') ||
      t.closest?.('.image-container, .VPImage.image-src, .VPImage, .image, picture, img'))
    ) {
      e.preventDefault()
      tryOpen()
    }
  }
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      tryOpen()
    }
  }

  // Attach a single delegated handler on the hero root to survive re-renders
  hero.addEventListener('click', onClick, true)
  hero.addEventListener('keydown', onKey, true)

  cleanupFns.push(() => {
    hero.removeEventListener('click', onClick, true)
    hero.removeEventListener('keydown', onKey, true)
    ;[target, imgEl].forEach((el) => {
      el.classList.remove('vp-hero-video-trigger')
      el.removeAttribute('role')
      el.removeAttribute('tabindex')
      el.removeAttribute('aria-label')
    })
  })
}

async function initHeroTrigger() {
  // Clean previous listeners
  cleanup()

  await nextTick()
  // If hero not yet in DOM, observe for it
  const hero = document.querySelector('.VPHero')
  if (hero) {
    attachTrigger()
    return
  }
  mo = new MutationObserver(() => {
    const h = document.querySelector('.VPHero')
    if (h) {
      attachTrigger()
      mo && mo.disconnect()
      mo = null
    }
  })
  mo.observe(document.body, { childList: true, subtree: true })
}

function cleanup() {
  cleanupFns.forEach((fn) => fn())
  cleanupFns = []
  if (mo) {
    mo.disconnect()
    mo = null
  }
}

onMounted(() => {
  initHeroTrigger()
  // Expose a manual opener for debugging
  // @ts-ignore
  window.__vaporOpenVideo = () => videoModal.value && videoModal.value.open()
  // eslint-disable-next-line no-console
  console.debug('[Vapor Docs] Hero trigger initialized')
})

// Re-attach after route changes (e.g., navigating back to home)
watch(
  () => route.path,
  () => {
    initHeroTrigger()
  }
)

onBeforeUnmount(() => {
  cleanup()
})
</script>
