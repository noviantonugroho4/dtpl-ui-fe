<script setup lang="ts">
/**
 * One row of the CMS form (Figma 330:5760 etc.): a 185px label column with an
 * optional required mark and hint, then the control slot and its error line.
 */
defineProps<{
  label: string
  for?: string
  required?: boolean
  hint?: string | string[]
  error?: string | null
}>()
</script>

<template>
  <div class="flex w-full flex-col gap-1 sm:flex-row sm:gap-2.5">
    <div class="flex shrink-0 flex-col sm:w-[185px] sm:pt-2">
      <label v-if="$props.for" :for="$props.for" class="text-xs leading-[1.2] tracking-[-0.36px] text-black">
        {{ label }} <span v-if="required" class="text-[#ff383c]" aria-hidden="true">*</span>
      </label>
      <span v-else class="text-xs leading-[1.2] tracking-[-0.36px] text-black">
        {{ label }} <span v-if="required" class="text-[#ff383c]" aria-hidden="true">*</span>
      </span>
      <template v-if="hint">
        <p
          v-for="line in Array.isArray(hint) ? hint : [hint]"
          :key="line"
          class="text-[9px] leading-[1.3] tracking-[-0.27px] text-[#c6c6c8] italic"
        >
          {{ line }}
        </p>
      </template>
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <slot />
      <p v-if="error" class="text-[10px] leading-[1.2] tracking-[-0.3px] text-[#ff383c]" role="alert">{{ error }}</p>
    </div>
  </div>
</template>
