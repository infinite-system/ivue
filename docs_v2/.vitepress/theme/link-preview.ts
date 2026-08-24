// Hover previews for internal links in prose: every page already has
// a 1200x630 image (blog banners, /og/ page banners) and slim metadata
// (blog-lite / pages-lite loaders), and the URL → image mapping is
// deterministic — so one delegated listener gives every in-content
// link a Wikipedia-style preview card (image, title, date for posts,
// clamped excerpt) with ZERO per-page work. Desktop only; an image
// that doesn't exist keeps the card hidden (onerror) — no manifest.
import { data as blogPosts } from '../../blog/blog-lite.data.mjs';
import { data as pageRecords } from '../../blog/pages-lite.data.mjs';

const SHOW_DELAY_MS = 220;
const CARD_WIDTH = 320;
const IMAGE_HEIGHT = 168; // 320 / (1200/630)

interface PreviewInfo {
  image: string;
  title: string;
  date?: string;
  excerpt?: string;
}

const blogBySlug = new Map(
  (blogPosts as any[]).map((post) => [post.slug, post]),
);

function formatDate(date: string): string {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function previewFor(href: string): PreviewInfo | null {
  const url = new URL(href, window.location.origin);
  if (url.origin !== window.location.origin) return null;
  let path = url.pathname.replace(/\.html$/, '');
  const herePath = window.location.pathname.replace(/\.html$/, '');
  if (path === herePath) return null; // same page (incl. anchors)
  if (path === '/' || path === '') {
    return {
      image: '/og-image.png',
      title: 'ivue — Plain classes. Full reactivity. One kilobyte.',
    };
  }
  const blogPost = path.match(/^\/blog\/([^/]+)$/);
  if (blogPost) {
    const post = blogBySlug.get(blogPost[1]);
    if (!post) return null;
    return {
      image: post.image ?? `/blog/${post.slug}.png`,
      title: post.title,
      date: post.date ? formatDate(post.date) : undefined,
      excerpt: post.excerpt || undefined,
    };
  }
  const record = (pageRecords as Record<string, any>)[
    path.endsWith('/') ? path.slice(0, -1) || path : path
  ];
  if (!record?.title) return null;
  const slug =
    path.replace(/^\//, '').replace(/\/$/, '/index').replaceAll('/', '-') +
    '.png';
  return {
    image: `/og/${slug}`,
    title: record.title,
    excerpt: record.description || undefined,
  };
}

export function installLinkPreviews() {
  // hover is the whole interaction — never on touch devices
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  // a real anchor: hovering the card keeps it open, clicking navigates
  // (VitePress's global click handler gives it SPA navigation for free)
  const card = document.createElement('a');
  card.className = 'ix-link-preview';
  card.tabIndex = -1;
  const image = document.createElement('img');
  image.width = CARD_WIDTH;
  image.height = IMAGE_HEIGHT;
  image.alt = '';
  const body = document.createElement('div');
  body.className = 'ix-link-preview__body';
  const titleElement = document.createElement('p');
  titleElement.className = 'ix-link-preview__title';
  const dateElement = document.createElement('p');
  dateElement.className = 'ix-link-preview__date';
  const excerptElement = document.createElement('p');
  excerptElement.className = 'ix-link-preview__excerpt';
  body.append(titleElement, dateElement, excerptElement);
  card.append(image, body);
  document.body.appendChild(card);

  let showTimer: number | undefined;
  let hideTimer: number | undefined;
  let currentLink: HTMLAnchorElement | null = null;
  let pointerX = 0;
  let pointerY = 0;

  const hide = () => {
    window.clearTimeout(showTimer);
    window.clearTimeout(hideTimer);
    currentLink = null;
    card.classList.remove('is-visible');
  };
  // leaving the link starts a short grace period — long enough to
  // cross the gap onto the card, which cancels the hide
  const scheduleHide = () => {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, 140);
  };
  card.addEventListener('mouseenter', () => window.clearTimeout(hideTimer));
  card.addEventListener('mouseleave', scheduleHide);

  image.addEventListener('load', () => {
    if (currentLink) {
      reposition(currentLink);
      card.classList.add('is-visible');
    }
  });
  image.addEventListener('error', hide);

  const reposition = (link: HTMLAnchorElement) => {
    // a wrapped inline link's bounding box spans the whole line — use
    // the line FRAGMENT under the pointer as the anchor instead
    const fragments = [...link.getClientRects()];
    const rect =
      fragments.find(
        (fragment) =>
          pointerY >= fragment.top - 2 && pointerY <= fragment.bottom + 2,
      ) ??
      fragments[0] ??
      link.getBoundingClientRect();
    const margin = 10;
    const cardHeight = card.offsetHeight || IMAGE_HEIGHT + 90;
    let left = rect.left + rect.width / 2 - CARD_WIDTH / 2;
    left = Math.max(
      margin,
      Math.min(left, window.innerWidth - CARD_WIDTH - margin),
    );
    // the card lives ABOVE the link; below only when there is no room
    let top = rect.top - cardHeight - margin;
    if (top < margin) top = rect.bottom + margin;
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  };

  document.addEventListener('mouseover', (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    const link = (event.target as Element | null)?.closest?.(
      '.vp-doc a[href], a.feature-inline-link[href]',
    ) as HTMLAnchorElement | null;
    if (!link || link === currentLink) return;
    hide();
    // links that already show an image (cards, thumbs) need no preview
    if (link.querySelector('img')) return;
    const info = previewFor(link.href);
    if (!info) return;
    currentLink = link;
    showTimer = window.setTimeout(() => {
      if (currentLink !== link) return;
      card.href = link.href;
      titleElement.textContent = info.title;
      dateElement.textContent = info.date ?? '';
      dateElement.style.display = info.date ? '' : 'none';
      excerptElement.textContent = info.excerpt ?? '';
      excerptElement.style.display = info.excerpt ? '' : 'none';
      reposition(link);
      if (image.getAttribute('src') === info.image) {
        card.classList.add('is-visible');
      } else {
        card.classList.remove('is-visible');
        image.src = info.image; // 'load' reveals, 'error' hides
      }
    }, SHOW_DELAY_MS);
  });

  document.addEventListener(
    'mouseout',
    (event) => {
      const link = (event.target as Element | null)?.closest?.('.vp-doc a');
      if (link !== currentLink || !link) return;
      // heading onto the card keeps it open
      const destination = event.relatedTarget as Element | null;
      if (destination && card.contains(destination)) return;
      scheduleHide();
    },
    { passive: true },
  );
  document.addEventListener('scroll', hide, { passive: true });
  // SPA navigation keeps the pointer where it was — the card must not
  // outlive the click
  document.addEventListener('click', hide, { passive: true });
}
