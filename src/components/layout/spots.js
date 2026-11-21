// Spot illustrations from the kit (decorative: always alt="").
// Loaded as text and turned into data URIs so any <metadata> block a file tool appended
// (which can make the SVG invalid XML) is dropped before the browser sees it.
import emptyRoster from '../../assets/art/kit/brand/empty-roster.svg?raw'
import emptySearch from '../../assets/art/kit/brand/empty-search.svg?raw'
import errorMeteor from '../../assets/art/kit/brand/error-meteor.svg?raw'
import logoMark from '../../assets/art/kit/brand/logo-mark.svg?raw'
import quizHero from '../../assets/art/kit/brand/quiz-hero.svg?raw'
import eggWhole from '../../assets/art/kit/decor/egg-whole.svg?raw'

const uri = (svg) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(String(svg).replace(/<metadata[\s\S]*?<\/metadata>/g, ''))}`

export const SPOTS = {
  emptyRoster: uri(emptyRoster),
  emptySearch: uri(emptySearch),
  errorMeteor: uri(errorMeteor),
  logoMark: uri(logoMark),
  quizHero: uri(quizHero),
  eggWhole: uri(eggWhole),
}
