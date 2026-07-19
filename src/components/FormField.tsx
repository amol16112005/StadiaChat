"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

/** Accessible labeled field: associates label with control via htmlFor/id. */
export function FormField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const autoId = useId();
  const existingId =
    isValidElement(children) &&
    (children as ReactElement<{ id?: string }>).props.id;
  const controlId = existingId || autoId;
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, {
        id: controlId,
      })
    : children;

  return (
    <div>
      <label className="label" htmlFor={controlId}>
        {label}
      </label>
      {child}
      {hint ? (
        <p className="text-[10px] text-[var(--muted)] mt-1" id={`${controlId}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
