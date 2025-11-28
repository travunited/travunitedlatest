"use client";

import { memo, useCallback } from "react";

/**
 * Memoized input components to prevent focus loss
 * Use these instead of regular inputs in forms to prevent remounting on every keystroke
 */

export const TextInput = memo(({ 
  value, 
  onChange, 
  placeholder, 
  required, 
  type = "text", 
  className = "",
  disabled,
  id,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <input
      id={id}
      name={name}
      type={type}
      required={required}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 ${className}`}
    />
  );
});
TextInput.displayName = "TextInput";

export const NumberInput = memo(({ 
  value, 
  onChange, 
  placeholder, 
  min, 
  max,
  required, 
  className = "",
  disabled,
  id,
  name,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = e.target.value === "" ? null : Number(e.target.value);
    onChange(isNaN(numValue as number) ? null : numValue);
  }, [onChange]);

  return (
    <input
      id={id}
      name={name}
      type="number"
      required={required}
      min={min}
      max={max}
      value={value ?? ""}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 ${className}`}
    />
  );
});
NumberInput.displayName = "NumberInput";

export const TextareaInput = memo(({ 
  value, 
  onChange, 
  placeholder, 
  rows = 3, 
  className = "",
  disabled,
  id,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <textarea
      id={id}
      name={name}
      rows={rows}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 ${className}`}
    />
  );
});
TextareaInput.displayName = "TextareaInput";

export const SelectInput = memo(({ 
  value, 
  onChange, 
  children, 
  className = "", 
  required,
  disabled,
  id,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <select
      id={id}
      name={name}
      required={required}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={`mt-1 w-full border border-neutral-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 ${className}`}
    >
      {children}
    </select>
  );
});
SelectInput.displayName = "SelectInput";

export const CheckboxInput = memo(({
  checked,
  onChange,
  className = "",
  disabled,
  id,
  name,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  label?: string;
}) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  }, [onChange]);

  return (
    <input
      id={id}
      name={name}
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      className={`rounded border-neutral-300 text-primary-600 focus:ring-primary-500 ${className}`}
      aria-label={label}
    />
  );
});
CheckboxInput.displayName = "CheckboxInput";

