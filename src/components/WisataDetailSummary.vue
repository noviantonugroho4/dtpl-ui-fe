<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Wisata } from '@/api/types'
import { wisataImageUrl } from '@/api/wisata'
import { formatDateTime, formatRupiah } from '@/utils/format'
import WisataTypeTag from '@/components/WisataTypeTag.vue'

const props = withDefaults(defineProps<{ item: Wisata; testid?: string; showHistory?: boolean }>(), {
  testid: 'wisata-detail',
  showHistory: true,
})

/** Image ids whose URL failed to load; shown as a placeholder instead. */
const brokenImages = ref(new Set<string>())

const images = computed(() => [...(props.item.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))
const facilities = computed(() => [...(props.item.fasilitas ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))
const services = computed(() => [...(props.item.services ?? [])].sort((a, b) => a.sortOrder - b.sortOrder))

function phoneHref(value: string): string {
  return `tel:${value}`
}
function whatsappHref(value: string): string {
  return `https://wa.me/${value.replace(/\D/g, '')}`
}
</script>

<template>
  <dl class="flex flex-col gap-4" :data-testid="testid">
    <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px] sm:pt-1">Gambar</dt>
      <dd class="flex min-w-0 flex-1 flex-wrap gap-2.5" :data-testid="`${testid}-images`">
        <template v-if="images.length">
          <figure
            v-for="image in images"
            :key="image.id"
            class="flex h-[94px] w-[111px] items-center justify-center overflow-hidden rounded-[10px] border border-ink-300 bg-canvas"
            :data-testid="`${testid}-image-${image.id}`"
          >
            <img
              v-if="!brokenImages.has(image.id)"
              :src="wisataImageUrl(image)"
              :alt="`${item.nama} ${image.sortOrder + 1}`"
              class="size-full object-cover"
              loading="lazy"
              @error="brokenImages.add(image.id)"
            />
            <figcaption v-else class="px-2 text-center text-[9px] leading-[1.3] text-ink-500">Gambar tidak dapat dimuat</figcaption>
          </figure>
        </template>
        <span v-else class="text-xs text-ink-500">Tidak ada gambar.</span>
      </dd>
    </div>

    <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Nama Wisata</dt>
      <dd class="min-w-0 flex-1 text-sm font-semibold text-ink-900" :data-testid="`${testid}-nama`">{{ item.nama }}</dd>
    </div>

    <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Jenis Wisata</dt>
      <dd class="min-w-0 flex-1" :data-testid="`${testid}-jenis`"><WisataTypeTag :jenis="item.jenis" /></dd>
    </div>

    <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Kontak</dt>
      <dd class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-900">
        <span>No. Telp: <a :href="phoneHref(item.kontakTelp)" class="text-brand-500 underline" :data-testid="`${testid}-telp`">{{ item.kontakTelp }}</a></span>
        <span v-if="item.kontakWa">
          No. Whatsapp:
          <a :href="whatsappHref(item.kontakWa)" target="_blank" rel="noopener" class="text-brand-500 underline" :data-testid="`${testid}-wa`">{{ item.kontakWa }}</a>
        </span>
      </dd>
    </div>

    <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Alamat</dt>
      <dd class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-900">
        <span class="whitespace-pre-line" :data-testid="`${testid}-alamat`">{{ item.alamat }}</span>
        <span class="text-ink-500" :data-testid="`${testid}-wilayah`">Kel. {{ item.kelurahan }}, Kec. {{ item.kecamatan }}, {{ item.provinsi }}</span>
      </dd>
    </div>

    <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Link Google Maps</dt>
      <dd class="min-w-0 flex-1 text-xs">
        <a :href="item.mapsLink" target="_blank" rel="noopener" class="break-all text-brand-500 underline" :data-testid="`${testid}-maps`">{{ item.mapsLink }}</a>
      </dd>
    </div>

    <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Fasilitas</dt>
      <dd class="min-w-0 flex-1 text-xs text-ink-900">
        <ul v-if="facilities.length" class="list-disc space-y-0.5 pl-4" :data-testid="`${testid}-fasilitas`">
          <li v-for="facility in facilities" :key="facility.id">{{ facility.facility }}</li>
        </ul>
        <span v-else class="text-ink-500">-</span>
      </dd>
    </div>

    <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Deskripsi</dt>
      <dd class="min-w-0 flex-1 text-xs whitespace-pre-line text-ink-900" :data-testid="`${testid}-deskripsi`">{{ item.deskripsi || '-' }}</dd>
    </div>

    <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Harga Tiket</dt>
      <dd class="min-w-0 flex-1 text-xs text-ink-900" :data-testid="`${testid}-harga`">{{ formatRupiah(item.hargaTiket) }}</dd>
    </div>

    <div class="flex flex-col gap-1 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Service Objek Wisata</dt>
      <dd class="min-w-0 flex-1">
        <table v-if="services.length" class="w-full max-w-[420px] border-collapse text-left text-xs" :data-testid="`${testid}-services`">
          <thead>
            <tr class="border-b-[0.5px] border-[#c6c6c8] font-medium text-black">
              <th scope="col" class="py-2 pr-3 font-medium">Layanan</th>
              <th scope="col" class="py-2 text-right font-medium">Harga</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="service in services" :key="service.id" class="border-b-[0.5px] border-[#c6c6c8]" :data-testid="`${testid}-service-${service.id}`">
              <td class="py-2 pr-3 text-ink-900">{{ service.serviceName }}</td>
              <td class="py-2 text-right text-ink-900">{{ formatRupiah(service.price) }}</td>
            </tr>
          </tbody>
        </table>
        <span v-else class="text-xs text-ink-500">-</span>
      </dd>
    </div>

    <div v-if="showHistory" class="flex flex-col gap-1 border-t-[0.5px] border-[#c6c6c8] pt-4 sm:flex-row sm:gap-2.5">
      <dt class="shrink-0 text-xs leading-[1.2] tracking-[-0.36px] text-black sm:w-[185px]">Riwayat</dt>
      <dd class="flex min-w-0 flex-1 flex-col gap-1 text-xs text-ink-500">
        <span :data-testid="`${testid}-created`">Dibuat: {{ formatDateTime(item.createdAt) }}</span>
        <span :data-testid="`${testid}-updated`">Diperbarui: {{ formatDateTime(item.updatedAt) }}</span>
      </dd>
    </div>
  </dl>
</template>
