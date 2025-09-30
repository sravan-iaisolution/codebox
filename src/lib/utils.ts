import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}



export function convertFilesToTreeItems(files: { [path: string]: string }): any {
  interface TreeNode {
    [key: string]: TreeNode | null;
  }

  const tree: TreeNode = {};

  const sortedPaths = Object.keys(files).sort();

  for (const filePath of sortedPaths) {
    const parts = filePath.split("/");
    let current = tree;

    // Traverse folders
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // last part = file
        current[part] = null;
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as TreeNode;
      }
    }
  }

  function convertNode(node: TreeNode): any[] {
    return Object.entries(node).map(([key, value]) => {
      if (value === null) {
        return key; // file
      } else {
        return [key, convertNode(value)]; // folder
      }
    });
  }

  return convertNode(tree);
}

