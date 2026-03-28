import { createI18n } from 'vue-i18n'

const messages = {
  en: {
    nav: {
      brand: 'Milkweed Mutual Aid',
      blog: 'Blog',
      about: 'About',
      interestForm: 'Interest Form',
      contribute: 'Contribute',
      english: 'EN',
      spanish: 'ES'
    },
    about: {
      heading: 'Milkweed Mutual Aid Collective',
      intro: 'We create space and organize events in furtherance of our guiding principles:',
      principlesHeading: 'Our Guiding Principles',
      principle1: 'To build an alternative, and revolutionary, network of support and decrease reliance on the state',
      principle2: 'To support and create alternatives to policing and commerce',
      principle3: 'To foster self protection and reliance on one another to have our needs met',
      principle4: 'To facilitate the exchange of ideas, resources (material and educational), creative exploration, art, liberation, joy and the things that matter most to our community'
    },
    blog: {
      badge: 'News & Updates',
      listHeading: 'Community Updates',
      intro: 'Stories, resources, and updates from the Milkweed Mutual Aid collective. Posts are available in English and Spanish.',
      readMore: 'Read',
      heroPrompt: 'Fresh updates are added after every build trigger.',
      postBadge: 'Blog',
      toggleEs: 'Leer en Español',
      toggleEn: 'Read in English',
      missingPost: 'We could not find this post. Please check back soon.',
      fetchError: 'We could not load posts from Ghost. Please verify your configuration.',
      fallbackTagWarning: "No posts are tagged '{lang}'. Showing all available posts instead.",
      noPosts: 'No posts are available yet. Please check back soon.',
      readingTime: '{minutes} min read',
      autoTranslated: 'This post was automatically translated from English.',
      filterByTag: 'Filter by topic',
      allPosts: 'All',
      loadMore: 'Load more',
      featuredBadge: 'Featured'
    },
    author: {
      postsBy: 'Posts by {name}',
      noPosts: 'No posts by this author yet.',
      notFound: 'Author not found.'
    },
    page: {
      notFound: 'Page not found.'
    }
  },
  es: {
    nav: {
      brand: 'Milkweed Mutual Aid',
      blog: 'Blog',
      about: 'Acerca de',
      interestForm: 'Formulario',
      contribute: 'Contribuir',
      english: 'EN',
      spanish: 'ES'
    },
    about: {
      heading: 'Colectivo Milkweed de Ayuda Mutua',
      intro: 'Creamos espacios y organizamos eventos en cumplimiento de nuestros principios rectores:',
      principlesHeading: 'Nuestros Principios Rectores',
      principle1: 'Construir una red alternativa y revolucionaria de apoyo y reducir la dependencia del estado',
      principle2: 'Apoyar y crear alternativas a la policía y al comercio',
      principle3: 'Fomentar la autoprotección y la confianza mutua para satisfacer nuestras necesidades',
      principle4: 'Facilitar el intercambio de ideas, recursos (materiales y educativos), exploración creativa, arte, liberación, alegría y las cosas que más importan a nuestra comunidad'
    },
    blog: {
      badge: 'Noticias y Actualizaciones',
      listHeading: 'Actualizaciones Comunitarias',
      intro: 'Historias, recursos y noticias del colectivo Milkweed Mutual Aid. Las publicaciones están disponibles en inglés y español.',
      readMore: 'Leer',
      heroPrompt: 'Sumamos novedades cada vez que se publica en Ghost.',
      postBadge: 'Blog',
      toggleEs: 'Leer en Español',
      toggleEn: 'Read in English',
      missingPost: 'No pudimos encontrar esta publicación. Vuelve pronto.',
      fetchError: 'No pudimos cargar las publicaciones de Ghost. Verifica la configuración.',
      fallbackTagWarning: "No hay publicaciones etiquetadas como '{lang}'. Mostramos todas las publicaciones disponibles.",
      noPosts: 'Todavía no hay publicaciones disponibles. Vuelve pronto.',
      readingTime: '{minutes} min lectura',
      autoTranslated: 'Esta publicación fue traducida automáticamente del inglés.',
      filterByTag: 'Filtrar por tema',
      allPosts: 'Todos',
      loadMore: 'Cargar más',
      featuredBadge: 'Destacado'
    },
    author: {
      postsBy: 'Publicaciones de {name}',
      noPosts: 'Aún no hay publicaciones de este autor.',
      notFound: 'Autor no encontrado.'
    },
    page: {
      notFound: 'Página no encontrada.'
    }
  }
} as const

export type LocaleCode = keyof typeof messages

export const i18n = createI18n({
  legacy: false,
  locale: 'en' as LocaleCode,
  fallbackLocale: 'en' as LocaleCode,
  messages
})

export const supportedLocales = Object.keys(messages) as LocaleCode[]
