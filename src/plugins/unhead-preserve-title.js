/**
 * Retain active document title during Vue Router <transition mode="out-in">
 * to prevent tab title flicker back to index.html before the next page mounts.
 */
let lastTitle = ''

export const preserveTitlePlugin = {
  key: 'preserve-title-on-transition',
  hooks: {
    'tags:resolve'(ctx) {
      const titleTag = ctx.tags.find((t) => t.tag === 'title')
      if (titleTag?.textContent) {
        lastTitle = titleTag.textContent
      } else if (lastTitle) {
        const fallback = {
          tag: 'title',
          props: {},
          textContent: lastTitle,
          _d: 'title',
        }
        ctx.tags.push(fallback)
        ctx.tagMap.set('title', fallback)
      }
    },
  },
}
