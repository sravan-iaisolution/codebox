'use client'

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Tabs,TabsContent,TabsList,TabsTrigger } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import MessageContainer from "../components/messages-container";
import { Suspense, useState } from "react";
import { ProjectHeader } from "../components/project-header";
import { Code, CodeIcon, CrownIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CodeView } from "@/components/code-view";
import { FileExplorer } from "@/components/ui/file-explorer";
import { FragmentWeb } from "@/components/ui/fragment-web";


interface Props {
    projectId: string;
};

export const ProjectView = ({ projectId }: Props) => {
    const trpc = useTRPC();
    const [activeFragment,setActiveFragment]=useState<any>(null)
    const [tabState,setTabState]=useState<"preview"|"code">("preview")
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
      <Tabs
  className="h-full gap-y-0"
  defaultValue="preview"
  value={tabState}
  onValueChange={(value) => setTabState(value as "preview" | "code")}
>
  <div className="w-full flex items-center p-2 border-b gap-x-2">
    <TabsList className="h-8 p-0 border rounded-md">
      <TabsTrigger value="preview" className="rounded-md">
        <EyeIcon /> <span>Demo</span>
      </TabsTrigger>
      <TabsTrigger value="code" className="rounded-md">
        <CodeIcon /> <span>Code</span>
      </TabsTrigger>
      
    </TabsList>

  </div>
  {/* <div className="ml-auto flex items-center gap-x-2">
  <Button asChild size="sm" variant="default">
    <Link href="/pricing">
      <CrownIcon /> Upgrade
    </Link>
  </Button>
</div> */}

<TabsContent value="preview">
  {!!activeFragment && <FragmentWeb data={activeFragment} />}

</TabsContent>
<TabsContent value="code" className="min-h-0">
  {!!activeFragment?.files && (
  <FileExplorer
    files={activeFragment?.files as { [path: string]: string }}
  />
)}

</TabsContent>

</Tabs>

    </ResizablePanel>
  </ResizablePanelGroup>
</div>

    )
};
