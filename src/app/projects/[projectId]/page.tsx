import { ProjectView } from "@/modules/messsages/server/ui/views/project-view";
import { trpc, getQueryClient } from "@/trpc/server"; // <-- server proxy + server QC
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";

interface Props {
    params: { projectId: string }; // <-- not a Promise
}

const Page = async ({ params }: Props) => {
    const { projectId } = params;

    const queryClient = getQueryClient();

    // These assume your procedures accept these inputs.
    await queryClient.prefetchQuery(
        trpc.messages.getMany.queryOptions({ projectId })
    );
    await queryClient.prefetchQuery(
        trpc.projects.getOne.queryOptions({ id: projectId })
    );

    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<p>Loading....</p>}>
                <ProjectView projectId={projectId} />
            </Suspense>
        </HydrationBoundary>
    );
};

export default Page;
