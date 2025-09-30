import { ChevronRightIcon, FileIcon, FolderIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "./sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@radix-ui/react-collapsible";

type TreeData = string | [string, TreeData[]];

interface TreeViewProps {
  data: TreeData[];
  value?: string | null;
  onSelect?: (value: string) => void;
}

export const TreeView = ({ data, value, onSelect }: TreeViewProps) => {
  return (
    <SidebarProvider>
      <Sidebar collapsible="none" className="w-full">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {data.map((item, index) => (
                  <Tree
                    key={index}
                    item={item}
                    selectedValue={value}
                    onSelect={onSelect}
                    parentPath=""
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
};

interface TreeProps {
  item: TreeData;
  selectedValue?: string | null;
  onSelect?: (value: string) => void;
  parentPath: string;
}

const Tree = ({ item, selectedValue, onSelect, parentPath }: TreeProps) => {
  const [name, children] = Array.isArray(item) ? item : [item, []];
  const currentPath = parentPath ? `${parentPath}/${name}` : name;

  const isLeaf = children.length === 0;

  if (isLeaf) {
    const isSelected = selectedValue === currentPath;
    return (
      <SidebarMenuButton
        className={`truncate ${
          isSelected ? "bg-blue-500 text-white" : ""
        }`}
        onClick={() => onSelect?.(currentPath)}
      >
        <FileIcon />
        <span className="truncate">{name}</span>
      </SidebarMenuButton>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            <ChevronRightIcon className="transition-transform" />
            <FolderIcon />
            <span className="truncate">{name}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu className="ml-4 border-l pl-2">
            {children.map((child, index) => (
              <Tree
                key={index}
                item={child}
                selectedValue={selectedValue}
                onSelect={onSelect}
                parentPath={currentPath}
              />
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
};
