'use client'

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import MessageContainer from "../components/messages-container";
import { Suspense, useState } from "react";
import { ProjectHeader } from "../components/project-header";


interface Props {
    projectId: string;
};

export const ProjectView = ({ projectId }: Props) => {
    const trpc = useTRPC();
    const [activeFragment,setActiveFragment]=useState<string|null>(null)
    const { data: project } = useSuspenseQuery(trpc.projects.getOne.queryOptions({
        id: projectId,
    }));
    const { data: messages } = useSuspenseQuery(trpc.messages.getMany.queryOptions({
        projectId,
    }));
    return (
        <div className="h-screen">
  <ResizablePanelGroup direction="horizontal">
    <ResizablePanel
      defaultSize={35}
      minSize={20}
      className="flex flex-col min-h-0"
    >
        <Suspense fallback={<p>Loading project header....</p>}>
         <ProjectHeader projectId={projectId}/>
        </Suspense>
       
        <Suspense fallback={<p>Loading messages....</p>}>
        <MessageContainer projectId={projectId} activeFragment={activeFragment} setActiveFragment={setActiveFragment}/>
        </Suspense>
      
    </ResizablePanel>

    <ResizableHandle />

    <ResizablePanel defaultSize={65} minSize={50}>
      preview
    </ResizablePanel>
  </ResizablePanelGroup>
</div>

    )
};
