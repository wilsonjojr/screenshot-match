import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatMinutes } from "@/lib/planner/logic";
import { Field } from "./ui";

export function LongSessionDialog({ open, start, end, onClose, onConfirm }: { open: boolean; start: Date | null; end: Date | null; onClose: () => void; onConfirm: (end: Date) => void }) {
  const total = start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : 0;
  const [mins, setMins] = useState(total);
  useEffect(() => setMins(total), [total]);
  if (!start || !end) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sessão muito longa</DialogTitle>
          <DialogDescription>Esta sessão durou {formatMinutes(total)}. Confirme a duração ou ajuste-a.</DialogDescription>
        </DialogHeader>
        <Field label="Duração (minutos)" htmlFor="long-mins">
          <Input id="long-mins" type="number" min={1} value={mins} onChange={(e) => setMins(Number(e.target.value))} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Voltar</Button>
          <Button disabled={!(mins > 0)} onClick={() => onConfirm(new Date(start.getTime() + mins * 60000))}>Salvar sessão</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
