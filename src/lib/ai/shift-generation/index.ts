/**
 * AI Shift Generation Module
 *
 * Esporta tutte le funzionalità per la generazione turni AI
 */

// Types
export * from './types';

// Algorithm
export { generateWeekShifts } from './algorithm';

// Slot Availability
export {
  checkSlotAvailability,
  checkMultiSlotAvailability,
  suggestCoverageOptions,
  type SlotAvailabilityInput,
  type SlotAvailabilityResult,
} from './slot-availability';

// Riposi Assignment
export {
  assignRiposiAutomatici,
  assignRiposiMultipli,
  type RiposiAssignmentInput,
  type RiposiAssignmentContext,
  type RiposiAssignmentResult,
  type RiposoGenerato,
} from './riposi-assignment';
