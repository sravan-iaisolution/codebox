import { getQueryClient, trpc } from '@/trpc/server';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ClientGreeting } from './client';
export default async function Home() {
  const queryClient = getQueryClient();
  void queryClient.fetchQuery(trpc.createAI.queryOptions({ text: 'prefetch' }));
  // Do something with greeting on the server
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientGreeting />
    </HydrationBoundary>
  );
}