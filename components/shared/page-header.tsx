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
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-white/40">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onAdd && (
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
