'use client';

import type { ToolDefinition } from '@repo/pdf-client';
import { useId, useMemo } from 'react';
import { z } from 'zod';
import { useTranslations } from '../lib/i18n';
import { cn } from '../lib/utils';

interface JsonSchemaProperty {
  type?: string;
  enum?: readonly (string | number)[];
  maxLength?: number;
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
 * Renders a field per option from the tool's zod schema. Labels come from
 * `ui.tools.<id>.options.<field>.label` (and optional `.placeholder`). A required text option (one
 * without a default) also needs `.required`, the hint while it is empty, and `.invalid`, shown
 * under the field while its value fails the schema.
 */
export function OptionsForm({ tool, values, invalid = [], onChange, disabled }: OptionsFormProps) {
  const t = useTranslations('ui');
  const baseId = useId();
  const { properties, required } = useMemo(() => {
    // 'input' mode: options with a default are optional, so `required` lists those without one.
    const schema = z.toJSONSchema(tool.options, { io: 'input' }) as {
      properties?: Record<string, JsonSchemaProperty>;
      required?: string[];
    };
    return {
      properties: Object.entries(schema.properties ?? {}),
      required: new Set(schema.required),
    };
  }, [tool]);

  if (properties.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-4" disabled={disabled}>
      {properties.map(([name, prop]) => {
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

        if (prop.type === 'string') {
          const value = String(values[name] ?? '');
          // An empty field is not flagged here; the hint under the action asks for it instead.
          const showError = invalid.includes(name) && value.trim() !== '';
          const errorId = `${id}-error`;
          return (
            <div key={name} className="flex flex-col gap-1.5">
              <label htmlFor={id} className="text-sm font-medium">
                {label}
              </label>
              <input
                id={id}
                type="text"
                dir="auto"
                value={value}
                maxLength={prop.maxLength}
                placeholder={placeholder}
                required={required.has(name)}
                aria-invalid={showError || undefined}
                aria-describedby={showError ? errorId : undefined}
                onChange={(e) => onChange(name, e.target.value)}
                className={cn(
                  'h-10 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
