import { useNavigate } from 'react-router';
import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <EmptyState icon={Compass} title="Page not found" action={<Button onClick={() => navigate('/')}>Go home</Button>}>
      That page doesn't exist.
    </EmptyState>
  );
}
