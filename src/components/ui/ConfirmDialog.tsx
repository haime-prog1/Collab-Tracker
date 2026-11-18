import { Sheet } from './Sheet';
import { Button } from './Button';
import { closeConfirm as close, useConfirmRequest } from './confirm';


export function ConfirmHost() {
  const req = useConfirmRequest();
  return (
    <Sheet
      center
      open={!!req}
      onClose={() => close(false)}
      title={req?.title ?? ''}
      footer={
        <>
          <Button className="flex-1" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button className="flex-1" variant={req?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
            {req?.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      <p className="text-muted">{req?.message}</p>
    </Sheet>
  );
}
