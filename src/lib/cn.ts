import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Join class names; later Tailwind utilities override conflicting earlier ones (e.g. `hidden` beats `inline-flex`). */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
