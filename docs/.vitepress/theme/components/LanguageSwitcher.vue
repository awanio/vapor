<template>
  <div class="language-switcher">
    <button
      class="language-button"
      @click="toggleDropdown"
      @blur="closeDropdown"
    >
      <span class="language-icon">🌐</span>
      <span class="language-text">{{ currentLanguage.text }}</span>
      <svg class="dropdown-arrow" :class="{ open: isOpen }" width="12" height="12" viewBox="0 0 12 12">
        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    </button>
    
    <Transition name="dropdown">
      <div v-if="isOpen" class="language-dropdown">
        <div
          v-for="lang in languages"
          :key="lang.code"
          class="language-option"
          :class="{ active: lang.code === currentLanguage.code }"
          @mousedown.prevent
          @click="selectLanguage(lang)"
        >
          <span class="option-text">{{ lang.text }}</span>
          <svg v-if="lang.code === currentLanguage.code" class="check-icon" width="16" height="16" viewBox="0 0 16 16">
            <path d="M13.5 3.5L6 11L2.5 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vitepress'

const route = useRoute()
const router = useRouter()
const isOpen = ref(false)

const languages = [
  { code: 'en', text: 'English', prefix: '/en/' },
  { code: 'id', text: 'Bahasa Indonesia', prefix: '/id/' }
]

const currentLanguage = computed(() => {
  const path = route.path
  const lang = languages.find(l => path.startsWith(l.prefix))
  return lang || languages[0]
})

const getLocalizedPath = (targetLang) => {
  const currentPath = route.path
  const currentLang = currentLanguage.value
  
  // If we're on the home page
  if (currentPath === '/' || currentPath === '/index') {
    return targetLang.code === 'id' ? '/id/01-pendahuluan' : '/en/01-introduction'
  }
  
  // For language switching between en and id, we need to handle the file name differences
  if (currentLang.code === 'en' && targetLang.code === 'id') {
    // Map English file names to Indonesian
    const enToIdMap = {
      '01-introduction': '01-pendahuluan',
      '02-installation': '02-instalasi', 
      '03-first-login': '03-login-pertama',
      '04-user-interface': '04-antarmuka-pengguna',
      '05-dashboard': '05-dashboard',
      '06-network-management': '06-manajemen-jaringan',
      '07-storage-management': '07-manajemen-penyimpanan',
      '08-container-management': '08-manajemen-kontainer',
      '09-kubernetes-management': '09-manajemen-kubernetes',
      '10-user-management': '10-manajemen-pengguna',
      '11-system-logs': '11-log-sistem',
      '12-terminal-access': '12-akses-terminal',
      '13-api-reference': '13-referensi-api',
      '14-security': '14-keamanan',
      '15-troubleshooting': '15-pemecahan-masalah'
    }
    const pagePath = currentPath.substring(currentLang.prefix.length)
    const mappedPath = enToIdMap[pagePath] || pagePath
    return targetLang.prefix + mappedPath
  }
  
  if (currentLang.code === 'id' && targetLang.code === 'en') {
    // Map Indonesian file names to English
    const idToEnMap = {
      '01-pendahuluan': '01-introduction',
      '02-instalasi': '02-installation',
      '03-login-pertama': '03-first-login',
      '04-antarmuka-pengguna': '04-user-interface',
      '05-dashboard': '05-dashboard',
      '06-manajemen-jaringan': '06-network-management',
      '07-manajemen-penyimpanan': '07-storage-management',
      '08-manajemen-kontainer': '08-container-management',
      '09-manajemen-kubernetes': '09-kubernetes-management',
      '10-manajemen-pengguna': '10-user-management',
      '11-log-sistem': '11-system-logs',
      '12-akses-terminal': '12-terminal-access',
      '13-referensi-api': '13-api-reference',
      '14-keamanan': '14-security',
      '15-pemecahan-masalah': '15-troubleshooting'
    }
    const pagePath = currentPath.substring(currentLang.prefix.length)
    const mappedPath = idToEnMap[pagePath] || pagePath
    return targetLang.prefix + mappedPath
  }
  
  // Default fallback
  return targetLang.code === 'id' ? '/id/01-pendahuluan' : '/en/01-introduction'
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  setTimeout(() => {
    isOpen.value = false
  }, 200)
}

const selectLanguage = (lang) => {
  if (lang.code === currentLanguage.value.code) {
    isOpen.value = false
    return
  }
  
  isOpen.value = false
  const newPath = getLocalizedPath(lang)
  router.go(newPath)
}

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  const switcher = document.querySelector('.language-switcher')
  if (switcher && !switcher.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.language-switcher {
  position: relative;
  margin-left: 12px;
}

.language-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: transparent;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  transition: all 0.25s;
}

.language-button:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.language-icon {
  font-size: 16px;
  line-height: 1;
}

.language-text {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  transition: transform 0.25s;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.language-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 50;
}

.dark .language-dropdown {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
}

.language-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  color: var(--vp-c-text-1);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  cursor: pointer;
}

.language-option:hover {
  background-color: var(--vp-c-bg-mute);
  color: var(--vp-c-brand-1);
}

.language-option.active {
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-brand-soft);
}

.option-text {
  font-weight: 500;
}

.check-icon {
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.25s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .language-button {
    padding: 5px 10px;
    font-size: 13px;
  }
  
  .language-text {
    max-width: 80px;
  }
  
  .language-dropdown {
    min-width: 150px;
  }
}
</style>
