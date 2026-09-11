<template>
  <v-dialog v-model="isVisible" max-width="320px">
    <v-card class="rounded-2lg pa-2">
      <v-card-title> 需要登入</v-card-title>
      <v-card-text class="text-body-2 text-medium-emphasis">
        该功能需要登入后才能使用。
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" variant="tonal" @click="isVisible = false">确定</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
const isVisible = defineModel()
</script>
