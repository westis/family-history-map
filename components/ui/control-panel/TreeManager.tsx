interface TreeManagerProps {
  onTreeSelect: (treeId: string) => void;
  onTreeRemove: (treeId: string) => void;
}

export function TreeManager({ onTreeSelect, onTreeRemove }: TreeManagerProps) {
  const { trees, updateTreeName, removeTree } = useTrees();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [treeToRemove, setTreeToRemove] = useState<string | null>(null);

  if (trees.length === 0) return null;

  const mainTree = trees.find((tree) => tree.isMain);
  const comparisonTrees = trees.filter((tree) => !tree.isMain);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-500">Loaded Trees</div>

      {/* Main Tree Section */}
      {mainTree && (
        <div>
          <div className="text-sm font-medium text-gray-500">Main Tree</div>
          <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: mainTree.color }}
              />
              <span>{mainTree.name}</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleTreeRemove(mainTree.id)}
            >
              Remove Tree
            </Button>
          </div>
        </div>
      )}

      {/* Comparison Trees Section */}
      {comparisonTrees.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-500">
            Comparison Trees
          </div>
          {comparisonTrees.map((tree) => (
            <div
              key={tree.id}
              className="flex items-center justify-between p-2 rounded-lg border"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tree.color }}
                />
                <span>{tree.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTreeRemove(tree.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
