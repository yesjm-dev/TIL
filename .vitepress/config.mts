import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'TIL',
  description: 'Today I Learned',
  lang: 'ko-KR',
  ignoreDeadLinks: true,

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
    ],

    sidebar: [
      {
        text: 'Algorithm',
        collapsed: false,
        items: [
          { text: 'Binary Search Pattern', link: '/algorithm/binary search pattern' },
        ]
      },
      {
        text: 'Backend',
        collapsed: false,
        items: [
          { text: 'CSRF', link: '/backend/CSRF' },
          { text: 'Kafka', link: '/backend/kafka' },
          { text: 'SPOF & HA', link: '/backend/spof-ha' },
          { text: 'Transactional Outbox', link: '/backend/transactional-outbox' },
        ]
      },
      {
        text: 'Kotlin',
        collapsed: false,
        items: [
          { text: 'Char.isDigit()', link: '/kotlin/Char.isDigit()' },
          { text: 'Kotlin Value Class', link: '/kotlin/kotlin value class' },
          { text: 'try-with-resources', link: '/kotlin/try-with-resources' },
        ]
      },
      {
        text: 'Network',
        collapsed: false,
        items: [
          { text: 'Authentication vs Authorization', link: '/network/authentication vs authorization' },
          { text: 'Cookie & Session', link: '/network/cookie, session' },
          { text: 'HTTP', link: '/network/http' },
          { text: 'HTTP Idempotent', link: '/network/http idempotent' },
          { text: 'JWT', link: '/network/jwt' },
          { text: 'Proxy Server', link: '/network/proxy-server' },
          { text: 'Session', link: '/network/session' },
        ]
      },
      {
        text: 'Spring',
        collapsed: false,
        items: [
          { text: 'Transaction', link: '/spring/transaction' },
        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/yesjm-dev/TIL' }
    ],

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3],
      label: '목차'
    }
  }
})
