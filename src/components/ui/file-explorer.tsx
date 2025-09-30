import { CopyCheckIcon, CopyIcon } from "lucide-react"; // 'CopyCheckIcon', 'CopyIcon' ...
import { CodeView } from "@/components/code-view"; // 'CodeView' is defined but never used.
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"; // 'ResizableHandle', 'ResizablePanel', 'ResizablePanelGroup' are defined but never used.
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb"; // 'Breadcrumb*' items are defined but never used.
import { Fragment, use, useCallback, useMemo, useState } from "react";
import { Button } from "./button";
import { convertFilesToTreeItems } from "@/lib/utils";
import { TreeView } from "./tree-view";

type FileCollection = { [path: string]: string };

function getLanguageFromExtension(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension || "text";
};

interface FileExplorerProps {
  files: FileCollection;
};

const FileBreadcrumb = ({ filePath }: any) => {
  const pathSegments = filePath.split("/");
  const maxSegments = 4;

  const renderBreadcrumbItems = () => {
    if (pathSegments.length <= maxSegments) {
      // Show all segments if 4 or less
      return pathSegments.map((segment:any, index:any) => {
        const isLast = index === pathSegments.length - 1;

        return (
          <Fragment key={index}>
            <BreadcrumbItem>
              {isLast?<BreadcrumbPage  className="medium">
                {segment}
              </BreadcrumbPage>:(
                <span className="text-muted-foreground">{segment}</span>
              )}
            </BreadcrumbItem>
            {!isLast && <BreadcrumbSeparator />}
          </Fragment>
        );
      }
        
        );
      }else{
         const firstSegment = pathSegments[0];
         const lastSegment = pathSegments[pathSegments.length-1];
         return(
          <>
          <BreadcrumbItem>
          <span className="text-muted-foreground">{firstSegment}</span>
           <BreadcrumbSeparator />
           <BreadcrumbItem>
           <BreadcrumbEllipsis/>
           </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
           <BreadcrumbPage>
           {lastSegment}
           </BreadcrumbPage>
           </BreadcrumbItem>
          </BreadcrumbItem>

          </>
         )
      }
    }
    return(
      <Breadcrumb>
      <BreadcrumbList>
      {renderBreadcrumbItems()}
      </BreadcrumbList>
      </Breadcrumb>
    )
  };


export const FileExplorer = ({files}: FileExplorerProps) => {
    const [selectedFile,setSelectedFile]=useState<string|null>(()=>{
        const fileKeys=Object.keys(files)
        return fileKeys.length>0?fileKeys[0]:null
    })

    const treeData=useMemo(()=>{
        return convertFilesToTreeItems(files)
    },[files])

    const handleFileSelect=useCallback
    ((filePath:string)=>{
      console.log(filePath,'jinnn')
      if(files[filePath]){
        setSelectedFile(filePath)
      } 
    },[files])

    
    
return(
    <ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={30} minSize={30} className="bg-sidebar">
   <TreeView data={treeData} onSelect={handleFileSelect} value={selectedFile}/>
  </ResizablePanel>

  <ResizableHandle className="hover:bg-primary transition-colors" />

  <ResizablePanel defaultSize={70} minSize={50}>
    {selectedFile && files[selectedFile] ? (
      <div className="h-full w-full flex flex-col">
  <div className="border-b bg-sidebar px-4 py-2 flex justify-between items-center gap-x-2">
    <FileBreadcrumb filePath={selectedFile} />
    <div>
      <Button
        variant="outline"
        size="icon"
        className="ml-auto"
        onClick={() => {}}
        disabled={false}
      >
        <CopyIcon />
      </Button>
    </div>
  </div>
   <div className="flex-1 overflow-auto ">
  <CodeView
    code={files[selectedFile]}
    lang={getLanguageFromExtension(selectedFile)}
  />
</div>

</div>
    ) : (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a file to view it&apos;s content
      </div>
    )}
  </ResizablePanel>
</ResizablePanelGroup>

)
};
