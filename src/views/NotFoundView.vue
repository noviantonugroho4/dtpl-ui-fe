<template>
  <div class="flex min-h-full flex-col items-center justify-center bg-white px-4 text-center text-ink-900">
    <p class="text-6xl font-bold text-brand-500">404</p>
    <h1 class="mt-4 text-2xl font-semibold">Halaman tidak ditemukan</h1>
    <p class="mt-2 max-w-md text-sm text-ink-500">Halaman yang Anda cari tidak ada atau telah dipindahkan.</p>
    <RouterLink
      :to="{ name: 'dashboard' }"
      class="mt-6 inline-flex rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
    >
      Kembali ke beranda
    </RouterLink>
  </div>
</template>
