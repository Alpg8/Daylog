import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  onAdd?: () => void;
  addLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, onAdd, addLabel = "Yeni Ekle", actions }: PageHeaderProps) {
  return (
    <div className="surface-panel mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 md:px-5 md:py-4">
      <div className="min-w-0">
        <h2 className="truncate text-xl md:text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onAdd && (
          <Button onClick={onAdd} className="shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
