import { initAmbience } from './ambience';
import { initClock } from './clock';
import { initContinuous } from './continuous';
import { initHeader } from './header';
import { initProjector } from './projector';
import { initReveal } from './reveal';
import { initSlides } from './slides';

// Un único punto de entrada para todas las páginas: cada módulo sabe si le toca actuar.
initAmbience();
initHeader();
initReveal();
initClock();
initSlides();
initProjector();
initContinuous();
