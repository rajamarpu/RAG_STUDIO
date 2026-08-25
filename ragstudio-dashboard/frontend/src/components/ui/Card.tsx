import * as React from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

function StatCard({
  className,
  children,
  label,
  value,
  change,
  icon: Icon,
  trend,
  iconColor,
  ...props
}: React.ComponentProps<"div"> & { label?: string; value?: string; change?: string; icon?: React.ComponentType<{ className?: string; style?: any }>; trend?: string; iconColor?: string }) {
  if (label !== undefined) {
    return (
      <div
        data-slot="stat-card"
        className={cn(
          "bg-card text-card-foreground flex flex-col gap-2 rounded-xl border p-4 shadow-sm",
          className
        )}
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
        {...props}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
          {Icon && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${iconColor || 'var(--accent-primary)'}/10`, color: iconColor || 'var(--accent-primary)' }}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
        {change && (
          <div className="text-xs flex items-center gap-1" style={{ color: trend === 'down' ? 'var(--accent-success)' : 'var(--text-muted)' }}>
            {change}
          </div>
        )}
        {children}
      </div>
    );
  }
  return (
    <div
      data-slot="stat-card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-2 rounded-xl border p-4 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function KBCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kb-card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-2 rounded-xl border p-4 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DocRow({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="doc-row"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-2 rounded-xl border p-4 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function RetrievalStage({
  className,
  stage,
  progress,
  details,
  ...props
}: React.ComponentProps<"div"> & { stage: string; progress: number; details?: string }) {
  return (
    <div
      data-slot="retrieval-stage"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-2 rounded-xl border p-4 shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium capitalize">{stage}</span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      {details && <p className="text-sm text-muted-foreground">{details}</p>}
    </div>
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  StatCard,
  KBCard,
  DocRow,
  RetrievalStage,
};
