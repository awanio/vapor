<template>
  <Layout>
    <template #nav-bar-content-after>
      <LanguageSwitcher />
    </template>
  </Layout>
</template>

<script setup>
import DefaultTheme from 'vitepress/theme'
import LanguageSwitcher from './components/LanguageSwitcher.vue'

const { Layout } = DefaultTheme
</script>
