/**
 * AI Scheduling Module
 *
 * Sistema intelligente per la generazione e validazione dei turni.
 */

// Types
export * from './types';

// Engine
export { AISchedulingEngine, getAISchedulingEngine } from './engine';

// Validators
export {
  PreferenceValidator,
  getPreferenceValidator,
} from './validators/preference-validator';

export {
  ConflictDetector,
  getConflictDetector,
  type ConflictInfo,
  type ConflictDetectionResult,
} from './validators/conflict-detector';
