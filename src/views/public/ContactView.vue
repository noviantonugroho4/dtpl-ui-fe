<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CONTACT, formatPhoneDisplay } from '@/config/contact'
import { whatsappLink } from '@/utils/whatsapp'
import MaskIcon from '@/components/MaskIcon.vue'
import iconHome from '@/assets/icons/home.svg'
import iconChevronRight from '@/assets/icons/chevron-right.svg'
import iconInstagram from '@/assets/icons/instagram.svg'
import iconFacebook from '@/assets/icons/facebook.svg'
import iconYoutube from '@/assets/icons/youtube.svg'
import iconMap from '@/assets/icons/map.svg'
import iconMessageSquare from '@/assets/icons/message-square.svg'
import iconWhatsapp from '@/assets/icons/whatsapp.svg'

const SOCIAL_ICONS: Record<string, string> = { instagram: iconInstagram, facebook: iconFacebook, youtube: iconYoutube }

const TOPICS = ['Pertanyaan umum', 'Pemesanan tiket', 'Kerja sama destinasi', 'Laporan kendala'] as const

const form = reactive({ nama: '', email: '', topik: TOPICS[0] as string, pesan: '' })
const errors = reactive<Record<string, string | null>>({})
const sent = ref(false)

const phoneDisplay = computed(() => formatPhoneDisplay(CONTACT.whatsapp))
const whatsappDirect = computed(() => whatsappLink(CONTACT.whatsapp, 'Halo, Admin Widewi. Saya ingin bertanya mengenai layanan WIDEWI.'))

const messageText = computed(() =>
  [
    'Halo, Bapak/Ibu Admin Widewi.',
    '',
    `Topik: ${form.topik}`,
    `Nama: ${form.nama.trim() || '-'}`,
    `Email: ${form.email.trim() || '-'}`,
    '',
    form.pesan.trim(),
    '',
    'Pesan ini dikirim melalui halaman Kontak Kami website Widewi.',
  ].join('\n'),
)
const messageHref = computed(() => whatsappLink(CONTACT.whatsapp, messageText.value))

function validate(): boolean {
  for (const key of Object.keys(errors)) errors[key] = null
  if (!form.nama.trim()) errors.nama = 'Wajib diisi.'
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Format email tidak valid.'
  if (form.pesan.trim().length < 10) errors.pesan = 'Tulis pesan minimal 10 karakter.'
  return Object.values(errors).every((v) => !v)
}

function onSubmit() {
  sent.value = false
  if (!validate()) return
  window.open(messageHref.value, '_blank', 'noopener')
  sent.value = true
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1021px] flex-col items-center gap-4 px-4 pt-6 pb-8 lg:pt-[100px]" data-testid="contact-page">
    <nav class="flex w-full items-center gap-1 px-2 text-xs text-black sm:px-8" aria-label="Breadcrumb" data-testid="contact-breadcrumb">
      <RouterLink :to="{ name: 'home' }" aria-label="Beranda" class="text-ink-900"><MaskIcon :src="iconHome" :size="16" /></RouterLink>
      <MaskIcon :src="iconChevronRight" :size="16" />
      <RouterLink :to="{ name: 'home' }" class="hover:underline">Beranda</RouterLink>
      <MaskIcon :src="iconChevronRight" :size="16" />
      <span aria-current="page">Kontak Kami</span>
    </nav>

    <section class="w-full rounded-[20px] bg-white px-8 py-4">
      <h1 class="text-xl leading-[1.2] font-semibold tracking-[-0.6px] text-ink-900" data-testid="contact-title">Kontak Kami</h1>
      <p class="mt-2 text-xs leading-[1.4] text-ink-500">Ada pertanyaan tentang destinasi, tiket, atau ingin bekerja sama? Hubungi kami lewat kanal di bawah ini.</p>
    </section>

    <section class="grid w-full gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <!-- Info kontak -->
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-4 rounded-[20px] bg-white p-6" data-testid="contact-info">
          <h2 class="text-base font-semibold text-ink-900">Hubungi langsung</h2>

          <a :href="whatsappDirect" target="_blank" rel="noopener" class="flex items-start gap-3 rounded-lg border border-ink-200 p-3 transition hover:border-brand-500" data-testid="contact-whatsapp">
            <img :src="iconWhatsapp" alt="" class="mt-0.5 size-5" width="20" height="20" />
            <span class="flex flex-col gap-0.5 text-xs">
              <span class="font-semibold text-ink-900">WhatsApp Admin</span>
              <span class="text-ink-500">{{ phoneDisplay }}</span>
              <span class="text-[#019606]">Balas cepat di jam layanan</span>
            </span>
          </a>

          <a :href="`mailto:${CONTACT.email}`" class="flex items-start gap-3 rounded-lg border border-ink-200 p-3 transition hover:border-brand-500" data-testid="contact-email">
            <span class="mt-0.5 text-brand-500"><MaskIcon :src="iconMessageSquare" :size="20" /></span>
            <span class="flex flex-col gap-0.5 text-xs">
              <span class="font-semibold text-ink-900">Email</span>
              <span class="text-ink-500">{{ CONTACT.email }}</span>
            </span>
          </a>

          <div class="flex items-start gap-3 rounded-lg border border-ink-200 p-3" data-testid="contact-address">
            <span class="mt-0.5 text-brand-500"><MaskIcon :src="iconMap" :size="20" /></span>
            <span class="flex flex-col gap-0.5 text-xs">
              <span class="font-semibold text-ink-900">Alamat</span>
              <span v-for="line in CONTACT.address" :key="line" class="text-ink-500">{{ line }}</span>
            </span>
          </div>
        </div>

        <div class="flex flex-col gap-3 rounded-[20px] bg-white p-6" data-testid="contact-hours">
          <h2 class="text-base font-semibold text-ink-900">Jam layanan</h2>
          <ul class="flex flex-col gap-1 text-xs text-ink-900">
            <li v-for="line in CONTACT.hours" :key="line">{{ line }}</li>
          </ul>
        </div>

        <div class="flex flex-col gap-3 rounded-[20px] bg-white p-6" data-testid="contact-social">
          <h2 class="text-base font-semibold text-ink-900">Media sosial</h2>
          <ul class="flex flex-col gap-2">
            <li v-for="s in CONTACT.social" :key="s.key">
              <a :href="s.href" class="flex items-center gap-3 text-xs text-ink-900 hover:text-brand-500" :data-testid="`contact-social-${s.key}`">
                <MaskIcon :src="SOCIAL_ICONS[s.key]!" :size="16" />
                <span class="font-semibold">{{ s.label }}</span>
                <span class="text-ink-500">{{ s.handle }}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Formulir pesan -->
      <form class="flex flex-col gap-4 rounded-[20px] bg-white p-6 sm:p-8" novalidate data-testid="contact-form" @submit.prevent="onSubmit">
        <div class="flex flex-col gap-1">
          <h2 class="text-base font-semibold text-ink-900">Kirim pesan</h2>
          <p class="text-xs text-ink-500">Isi formulir ini, lalu pesan akan dibuka di WhatsApp untuk Anda kirim ke Admin Widewi.</p>
        </div>

        <p v-if="sent" role="status" class="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800" data-testid="contact-sent">
          WhatsApp sudah dibuka dengan pesan Anda. Tekan kirim di WhatsApp untuk menyelesaikannya.
        </p>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5">
            <label for="ct-nama" class="text-xs leading-[1.4] text-black">Nama <span class="text-[#ff383c]" aria-hidden="true">*</span></label>
            <input id="ct-nama" v-model="form.nama" type="text" autocomplete="name" placeholder="Nama lengkap" :class="['cms-input h-auto w-full px-4 py-3 text-xs placeholder:italic', { 'cms-input--error': errors.nama }]" data-testid="contact-nama" />
            <p v-if="errors.nama" class="text-[10px] text-[#ff383c]" role="alert" data-testid="contact-nama-error">{{ errors.nama }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label for="ct-email" class="text-xs leading-[1.4] text-black">Email</label>
            <input id="ct-email" v-model="form.email" type="email" autocomplete="email" placeholder="nama@contoh.id" :class="['cms-input h-auto w-full px-4 py-3 text-xs placeholder:italic', { 'cms-input--error': errors.email }]" data-testid="contact-email-input" />
            <p v-if="errors.email" class="text-[10px] text-[#ff383c]" role="alert" data-testid="contact-email-error">{{ errors.email }}</p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="ct-topik" class="text-xs leading-[1.4] text-black">Topik</label>
          <select id="ct-topik" v-model="form.topik" class="cms-input h-auto w-full px-4 py-3 text-xs" data-testid="contact-topik">
            <option v-for="topic in TOPICS" :key="topic" :value="topic">{{ topic }}</option>
          </select>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="ct-pesan" class="text-xs leading-[1.4] text-black">Pesan <span class="text-[#ff383c]" aria-hidden="true">*</span></label>
          <textarea id="ct-pesan" v-model="form.pesan" rows="6" placeholder="Tulis pertanyaan atau kebutuhan Anda" :class="['cms-input h-auto w-full resize-y px-4 py-3 text-xs placeholder:italic', { 'cms-input--error': errors.pesan }]" data-testid="contact-pesan" />
          <p v-if="errors.pesan" class="text-[10px] text-[#ff383c]" role="alert" data-testid="contact-pesan-error">{{ errors.pesan }}</p>
        </div>

        <button
          type="submit"
          class="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-brand-500 p-3 text-base leading-none font-extrabold text-white transition hover:bg-brand-600"
          data-testid="contact-submit"
        >
          <img :src="iconWhatsapp" alt="" class="size-5" width="20" height="20" />
          Kirim via WhatsApp
        </button>
        <a :href="messageHref" class="sr-only" tabindex="-1" aria-hidden="true" data-testid="contact-preview-link">pratinjau</a>
      </form>
    </section>
  </div>
</template>
