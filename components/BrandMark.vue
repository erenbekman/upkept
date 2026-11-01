<script setup lang="ts">
const id = useId()
</script>

<template>
  <svg viewBox="200 180 624 664" aria-hidden="true">
    <defs>
      <mask :id="id" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
        <path d="M337 297 V552 A175 175 0 0 0 687 552 V297" fill="none" stroke="#fff" stroke-width="160" stroke-linecap="round" />
      </mask>
    </defs>
    <g :mask="`url(#${id})`">
      <rect width="1024" height="1024" fill="currentColor" opacity="0.22" />
      <g transform="translate(0 7)">
        <path fill="#ffb020" d="M-20 505 L12 516 L76 521 L140 513 L204 498 L268 489 L332 493 L396 507 L460 519 L524 520 L588 509 L652 495 L716 489 L780 496 L844 511 L908 520 L972 518 L1044 505 L1044 1044 L-20 1044 Z" />
        <path fill="#ff8a70" d="M-20 625 L44 612 L108 599 L172 597 L236 607 L300 621 L364 628 L428 622 L492 608 L556 597 L620 598 L684 611 L748 624 L812 628 L876 618 L940 604 L1004 596 L1044 597 L1044 1044 L-20 1044 Z" />
        <path fill="#ff5a36" d="M-20 699 L44 697 L108 707 L172 721 L236 728 L300 722 L364 707 L428 697 L492 699 L556 711 L620 724 L684 727 L748 718 L812 704 L876 696 L940 702 L1004 716 L1044 722 L1044 1044 L-20 1044 Z" />
      </g>
    </g>
  </svg>
</template>
