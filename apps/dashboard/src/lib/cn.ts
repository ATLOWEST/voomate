/**
 * Class name joiner.
 *
 * Deliberately not `clsx` + `tailwind-merge`. Those exist to resolve conflicting Tailwind
 * classes at runtime, which is only necessary when components accept arbitrary style
 * overrides. Ours don't — variants are closed sets defined in the component. Two fewer
 * dependencies on a page that merchants judge by how fast it loads.
 */
export type ClassValue = string | false | null | undefined;

export const cn = (...values: ClassValue[]): string => values.filter(Boolean).join(' ');
