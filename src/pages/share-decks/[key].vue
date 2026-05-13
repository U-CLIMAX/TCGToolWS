<template>
  <ShareDeckDetail :deck-key="route.params.key" :embedded="false" />
</template>

<script setup>
import { useRoute } from 'vue-router'
import ShareDeckDetail from '@/components/deck/ShareDeckDetail.vue'

definePage({
  name: 'ShareDeckDetail',
  props: true,
  meta: { headerBlur: true, showCardPrice: true },
})

const route = useRoute()
</script>
