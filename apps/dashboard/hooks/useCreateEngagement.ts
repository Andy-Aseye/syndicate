import { useTransition } from 'react';
import { submitEngagementAction } from '@/app/actions/engagement';

export function useCreateEngagement() {
  const [isPending, startTransition] = useTransition();

  const createEngagement = (formData: FormData) => {
    startTransition(async () => {
      // The server action handles the redirect upon successful creation and kickoff
      await submitEngagementAction(formData);
    });
  };

  return {
    createEngagement,
    isPending,
  };
}
