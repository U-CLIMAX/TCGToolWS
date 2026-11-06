<template>
  <ShareDeckDetail :deck-key="route.params.key" :embedded="false" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSeoMeta, useHead } from '@unhead/vue'
import { getWebsiteUrl } from '@/utils/api'

definePage({
  name: 'ShareDeckDetail',
  props: true,
  meta: { showCardPrice: true },
})

const route = useRoute()
const siteUrl = getWebsiteUrl()

useSeoMeta({
  title: `${route.params.key} | 卡组分享 | U-CLIMAX`,
  description: '查看玩家分享的 Weiβ Schwarz 牌组。',
  ogTitle: `${route.params.key} | 卡组分享 | U-CLIMAX`,
})

useHead({
  link: [{ rel: 'canonical', href: computed(() => `${siteUrl}/share-decks/${route.params.key}`) }],
})
</script>
