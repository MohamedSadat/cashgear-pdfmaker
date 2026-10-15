'use client';

import { type ToolDefinition, optionApplies, requiredOptions } from '@repo/pdf-client';
import { useId, useMemo } from 'react';
import { z } from 'zod';
import { useTranslations } from '../lib/i18n';
import { cn } from '../lib/utils';

interface JsonSchemaProperty {
  type?: string;
  enum?: readonly (string | number)[];
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

interface OptionsFormProps {
  tool: ToolDefinition;
  values: Record<string, unknown>;
  /** Options whose current value fails the schema. */
  invalid?: readonly string[];
  onChange: (name: string, value: unknown) => void;
  disabled?: boolean;
}

/**
 * Renders a field per option from the tool's zod schema, skipping options that don't apply to the
 * current values (`conditionalOptions`). Labels come from `ui.tools.<id>.options.<field>.label`
 * (and optional `.placeholder`); enum choices from `.choices.<value>`. A text or number option the
 * user must fill in (see `requiredOptions`) also needs `.required`, the hint while it is empty,
 * and `.invalid`, shown under the field while its value fails the schema. An empty number field
 * is stored as ''.
 */
export function OptionsForm({ tool, values, invalid = [], onChange, disabled }: OptionsFormProps) {
  const t = useTranslations('ui');
  const baseId = useId();
  const properties = useMemo(() => {
    const schema = z.toJSONSchema(tool.options, { io: 'input' }) as {
      properties?: Record<string, JsonSchemaProperty>;
    };
    return Object.entries(schema.properties ?? {});
  }, [tool]);
  const required = useMemo(() => new Set(requiredOptions(tool, values)), [tool, values]);

  const shown = properties.filter(([name]) => optionApplies(tool, name, values));
  if (shown.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      {shown.map(([name, prop]) => {
        const id = `${baseId}-${name}`;
        const key = `tools.${tool.id}.options.${name}`;
        const label = t(`${key}.label`);
        const placeholder = t.has(`${key}.placeholder`) ? t(`${key}.placeholder`) : undefined;

        if (prop.type === 'boolean') {
          return (
            <label key={name} htmlFor={id} className="flex items-center gap-2 text-sm">
              <input
                id={id}
                type="checkbox"
                checked={values[name] === true}
                onChange={(e) => onChange(name, e.target.checked)}
                className="size-4 accent-primary"
              />
              {label}
            </label>
          );
        }

        if (prop.enum) {
          return (
            <div key={name} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-sm font-medium">
                {label}
              </label>
              <select
                id={id}
                value={String(values[name] ?? '')}
                onChange={(e) => onChange(name, e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                {prop.enum.map((option) => (
                  <option key={option} value={option}>
                    {t(`${key}.choices.${option}`)}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        const numeric = prop.type === 'integer' || prop.type === 'number';
        if (prop.type === 'string' || numeric) {
          const value = String(values[name] ?? '');
          // An empty field is not flagged here; the hint under the action asks for it instead.
          const showError = invalid.includes(name) && value.trim() !== '';
          const errorId = `${id}-error`;
          const kind = numeric
            ? {
                type: 'number',
                inputMode: prop.type === 'integer' ? ('numeric' as const) : ('decimal' as const),
                step: prop.type === 'integer' ? 1 : 'any',
                min: prop.minimum,
                // z.int() reports the safe-integer bound; no field needs it spelled out.
                max:
                  prop.maximum !== undefined && prop.maximum < Number.MAX_SAFE_INTEGER
                    ? prop.maximum
                    : undefined,
              }
            : { type: 'text', dir: 'auto', maxLength: prop.maxLength };
          return (
            <div key={name} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-sm font-medium">
                {label}
              </label>
              <input
                id={id}
                {...kind}
                value={value}
                placeholder={placeholder}
                required={required.has(name)}
                aria-invalid={showError || undefined}
                aria-describedby={showError ? errorId : undefined}
                onChange={(e) => {
                  const next = e.target.value;
                  onChange(name, numeric && next !== '' ? Number(next) : next);
                }}
                className={cn(
                  'h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  numeric && 'max-w-40',
                  showError && 'border-destructive',
                )}
              />
              {showError && (
                <p id={errorId} className="text-sm text-destructive">
                  {t(`${key}.invalid`)}
                </p>
              )}
            </div>
          );
        }

        throw new Error(`OptionsForm: unsupported option type for "${tool.id}.${name}"`);
      })}
    </fieldset>
  );
}
