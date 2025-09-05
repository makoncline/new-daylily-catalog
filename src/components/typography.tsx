import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Typography style definitions
export const typography = {
  h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
  h2: "scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0",
  h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
  h4: "scroll-m-20 text-xl font-semibold tracking-tight",
  p: "leading-7",
  blockquote: "mt-6 border-l-2 pl-6 italic",
  table: "w-full",
  th: "border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right",
  td: "border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right",
  tr: "m-0 border-t p-0 even:bg-muted",
  list: "my-6 ml-6 list-disc [&>li]:mt-2",
  inlineCode:
    "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
  lead: "text-xl text-muted-foreground",
  large: "text-lg font-semibold",
  small: "text-sm font-medium leading-none",
  muted: "text-sm text-muted-foreground",
} as const;

interface TypographyProps extends HTMLAttributes<HTMLElement> {
  className?: string;
  children: React.ReactNode;
}

// Components using the typography styles
export const H1 = ({ className = "", children, ...props }: TypographyProps) => (
  <h1 className={cn(typography.h1, className)} {...props}>
    {children}
  </h1>
);

export const H2 = ({ className = "", children, ...props }: TypographyProps) => (
  <h2 className={cn(typography.h2, className)} {...props}>
    {children}
  </h2>
);

export const H3 = ({ className = "", children, ...props }: TypographyProps) => (
  <h3 className={cn(typography.h3, className)} {...props}>
    {children}
  </h3>
);

export const H4 = ({ className = "", children, ...props }: TypographyProps) => (
  <h4 className={cn(typography.h4, className)} {...props}>
    {children}
  </h4>
);

export const P = ({ className = "", children, ...props }: TypographyProps) => (
  <p className={cn(typography.p, className)} {...props}>
    {children}
  </p>
);

export const Blockquote = ({
  className = "",
  children,
  ...props
}: TypographyProps) => (
  <blockquote className={cn(typography.blockquote, className)} {...props}>
    {children}
  </blockquote>
);

export const Table = ({
  className = "",
  children,
  ...props
}: TypographyProps) => (
  <div className="my-6 w-full overflow-y-auto">
    <table className={cn(typography.table, className)} {...props}>
      {children}
    </table>
  </div>
);

export const Th = ({ className = "", children, ...props }: TypographyProps) => (
  <th className={cn(typography.th, className)} {...props}>
    {children}
  </th>
);

export const Td = ({ className = "", children, ...props }: TypographyProps) => (
  <td className={cn(typography.td, className)} {...props}>
    {children}
  </td>
);

export const Tr = ({ className = "", children, ...props }: TypographyProps) => (
  <tr className={cn(typography.tr, className)} {...props}>
    {children}
  </tr>
);

export const List = ({
  className = "",
  children,
  ...props
}: TypographyProps) => (
  <ul className={cn(typography.list, className)} {...props}>
    {children}
  </ul>
);

export const InlineCode = ({
  className = "",
  children,
  ...props
}: TypographyProps) => (
  <code className={cn(typography.inlineCode, className)} {...props}>
    {children}
  </code>
);

export const Lead = ({
  className = "",
  children,
  ...props
}: TypographyProps) => (
  <p className={cn(typography.lead, className)} {...props}>
    {children}
  </p>
);

export const Large = ({
  className = "",
  children,
  ...props
}: TypographyProps) => (
  <div className={cn(typography.large, className)} {...props}>
    {children}
  </div>
);

export const Small = ({
  className = "",
  children,
  ...props
}: TypographyProps) => (
  <small className={cn(typography.small, className)} {...props}>
    {children}
  </small>
);

export const Muted = ({
  className = "",
  children,
  ...props
}: TypographyProps) => (
  <p className={cn(typography.muted, className)} {...props}>
    {children}
  </p>
);

// Usage examples:
{
  /*
// Using components:
<H1>Regular H1 Heading</H1>

// Using components with style override:
<H2 className={typography.h1}>H2 styled as H1</H2>

// Using just the styles:
<h3 className={typography.h2}>H3 element with H2 styles</h3>

// Combining styles:
<h4 className={cn(typography.h3, "text-primary")}>
  H4 with H3 styles plus custom color
</h4>

// Complex example:
export function TypographyDemo() {
  return (
    <div>
      <h1 className={typography.h1}>Raw element with H1 styles</h1>
      <H2 className={typography.h1}>H2 component with H1 styles</H2>
      <P className={typography.large}>Paragraph with large text styles</P>
      <div className={typography.muted}>Div with muted text styles</div>
    </div>
  )
}
*/
}
