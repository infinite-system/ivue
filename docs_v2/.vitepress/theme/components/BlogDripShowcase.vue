<script setup lang="ts">
import { withBase } from 'vitepress';
import HorizontalVirtualScroller from '../../../../examples/playground/src/examples/virtual-scroller/HorizontalVirtualScroller.vue';
import { BlogDripShowcase } from './BlogDripShowcase';

const drip = new BlogDripShowcase.Class();

// the state destructure — only the element refs; the delivery state is
// read through the instance's own methods/getters (cardClasses & co.)
const {
  // element refs
  root,
  scroller,
} = drip;
</script>

<template>
  <div
    v-if="drip.hasItems"
    ref="root"
    class="drip-showcase"
    aria-label="Every blog post, delivered one email at a time"
    @mouseenter="drip.onMouseEnter()"
    @mouseleave="drip.onMouseLeave()"
  >
    <ClientOnly>
      <HorizontalVirtualScroller
        ref="scroller"
        :model-value="drip.items"
        :assumed-size="330"
        :padding-quantity="6"
        snap-to-items
        snap-align="center"
      >
        <template #item="{ item, index }">
          <a
            class="drip-card"
            :class="drip.cardClasses(item, index)"
            :href="withBase(item.url)"
            tabindex="-1"
          >
            <span class="drip-card__frame">
              <img
                class="drip-card__image"
                :src="withBase(item.image)"
                :alt="item.title"
                width="1200"
                height="630"
                :loading="drip.imageLoading(index)"
                decoding="async"
              />
              <span class="drip-card__envelope" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="6" width="18" height="13" rx="2" />
                  <path d="M3.5 7.5 12 13.5l8.5-6" />
                </svg>
              </span>
              <span class="drip-card__delivered" aria-hidden="true">Delivered ✓</span>
              <span class="drip-card__check" aria-hidden="true">✓</span>
            </span>
            <span class="drip-card__title">{{ item.title }}</span>
          </a>
        </template>
      </HorizontalVirtualScroller>
    </ClientOnly>
  </div>
</template>

<style>
.drip-showcase {
  position: relative;
  width: 100vw;
  margin: 26px calc(50% - 50vw) 0;
  /* the strip stands in the newsletter hero's beam — padding is only
     shadow room for the cards' hover lift (the scroller root clips) */
  padding: 4px 0 14px;
}
.drip-showcase::before {
  content: '';
  position: absolute;
  inset: 0;
  /* INVERTED for the strip's place at the section's close: the glow
     anchors at the BOTTOM and fades upward, so the band reads as the
     luminous base of the hero above it, not the start of a new one */
  background:
    radial-gradient(60rem 16rem at 50% 100%, rgba(99, 102, 241, 0.08), transparent 70%),
    linear-gradient(0deg, rgba(45, 212, 191, 0.05), transparent 85%);
  pointer-events: none;
}
.drip-showcase .virtual-scroller--x {
  /* cards enter and leave through a soft edge, not a hard clip */
  -webkit-mask-image: linear-gradient(90deg, transparent, black 4%, black 96%, transparent);
  mask-image: linear-gradient(90deg, transparent, black 4%, black 96%, transparent);
  /* main-axis padding, same contract as the vertical scroller's
     padding-top/bottom: the first and last card rest fully inside the
     edge fade (computeScrollExtent adds it through axisPaddingProps) */
  padding-left: max(4vw, 34px);
  padding-right: max(4vw, 34px);
}

.drip-card {
  display: block;
  width: clamp(230px, 24vw, 320px);
  /* the horizontal padding IS the gap — split SYMMETRICALLY (9+9 = the
     same 18px between frames) so the frame sits at the item's true
     center: centered snap landings would otherwise lean by half the gap,
     visible on narrow screens. The bottom padding is shadow room: the
     frame's hover glow reaches ~26px below it, and the scroller root is
     overflow: hidden — without this the shadow clips at the strip edge. */
  padding: 8px 9px 30px;
  text-decoration: none !important;
  cursor: pointer;
}

.drip-card__frame {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 12px;
  /* no stray vertical gaps between border and banner: the theme's vp-doc
     image margins and inline line-height would read as double borders */
  line-height: 0;
  /* NO border on the wrapper, ever — the hover ring lives on the image
     itself (outline), so there is exactly one edge and one radius */
  transition: transform 0.25s, box-shadow 0.25s;
}
.drip-card:hover .drip-card__frame {
  transform: translateY(-3px);
  box-shadow: 0 18px 44px -18px var(--ivue-link-glow);
}
.drip-card:hover .drip-card__image {
  /* the highlight is ON the image: an inset outline hugs the banner's own
     edge at the banner's own radius — nothing to double */
  outline: 1.5px solid var(--ivue-link-accent);
  outline-offset: -1.5px;
}

.drip-card__image {
  display: block;
  width: 100%;
  height: auto;
  margin: 0 !important; /* vp-doc gives images vertical margins — not here */
  aspect-ratio: 1200 / 630;
  object-fit: cover;
  border-radius: 12px; /* the outline follows this radius on hover */
}

/* the delivery: the arriving card starts as a sealed envelope face that
   lifts open to reveal the banner, then a "Delivered" receipt pops */
.drip-card__envelope {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  color: #9db6e6;
  background:
    radial-gradient(18rem 9rem at 50% 120%, rgba(45, 212, 191, 0.22), transparent 70%),
    linear-gradient(160deg, #101a33, #0a1226);
  z-index: 1;
}
.drip-card__envelope svg {
  width: 34%;
  height: 34%;
  filter: drop-shadow(0 0 18px rgba(99, 102, 241, 0.55));
}

.drip-card__delivered {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 2;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.02em;
  line-height: 1.35; /* the frame's line-height: 0 must not crush the pill */
  color: #06251d;
  background: linear-gradient(90deg, #5eead4, #34d399);
  box-shadow: 0 6px 18px -6px rgba(52, 211, 153, 0.7);
  opacity: 0;
  pointer-events: none;
}

/* the permanent receipt: a quiet check on every already-delivered card */
.drip-card__check {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  color: #06251d;
  background: linear-gradient(135deg, #5eead4, #34d399);
  box-shadow: 0 4px 12px -4px rgba(52, 211, 153, 0.55);
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.4s ease, transform 0.4s ease;
  pointer-events: none;
}
.drip-card--delivered .drip-card__check {
  opacity: 0.92;
  transform: scale(1);
}

/* SEALED: not yet delivered — the banner hides behind the envelope face
   until this card's own arrival lifts it open. The outline gives the
   flat envelope a defined edge against the dark band (an outline, not a
   border: borders would grow the frame and nudge the measured card
   size when the state flips). */
.drip-card--sealed .drip-card__envelope {
  /* an inset ring, not a border/outline: it paints INSIDE the envelope
     face (never clipped, never resizing the frame) and follows the
     frame's radius */
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.22);
  border-radius: 12px;
}
.drip-card--sealed .drip-card__envelope {
  display: flex;
}

.drip-card--arriving .drip-card__envelope {
  display: flex;
  animation: drip-open 0.85s cubic-bezier(0.55, 0, 0.3, 1) 0.25s both;
}
.drip-card--arriving .drip-card__delivered {
  animation: drip-receipt 1.7s ease 0.95s both;
}

@keyframes drip-open {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: translateY(-101%);
    opacity: 0.9;
  }
}

@keyframes drip-receipt {
  0% {
    opacity: 0;
    transform: translateY(6px) scale(0.9);
  }
  15%,
  80% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
}

.drip-card__title {
  display: block;
  margin-top: 9px;
  padding: 0 9px; /* centered over the symmetric gap */
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  /* the cards stand in a bright beam — a muted title disappears in it */
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.25s;
}
.drip-card:hover .drip-card__title {
  color: var(--vp-c-text-1);
}
</style>
