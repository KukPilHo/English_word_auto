import { useState } from 'react';
import { ChevronRight, Check, Minus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getDescendantLeafIds } from '../../data/grammarCategories';

/**
 * 재귀적 체크박스 트리 네비게이션 컴포넌트
 * 국밥맨 AI의 좌측 카테고리 트리를 재현
 */
export default function CategoryTree({ categories, selected, onToggle }) {
  return (
    <div role="tree" className="space-y-0.5">
      {categories.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          selected={selected}
          onToggle={onToggle}
          depth={0}
        />
      ))}
    </div>
  );
}

function TreeNode({ node, selected, onToggle, depth }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren =
    (node.children && node.children.length > 0) ||
    (node.subTypes && node.subTypes.length > 0);

  // 리프 ID 목록 계산
  const leafIds = getDescendantLeafIds(node);

  // 체크 상태 계산
  const checkedCount = leafIds.filter((id) => selected.has(id)).length;
  const isChecked = checkedCount === leafIds.length && leafIds.length > 0;
  const isIndeterminate = checkedCount > 0 && checkedCount < leafIds.length;

  const handleCheck = () => {
    onToggle(leafIds, !isChecked);
  };

  const handleExpand = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1.5 py-1.5 px-1 rounded-lg cursor-pointer transition-colors',
          'hover:bg-slate-100/70',
          depth > 0 && 'ml-4'
        )}
      >
        {/* 확장/접기 버튼 */}
        {hasChildren ? (
          <button
            onClick={handleExpand}
            className="p-0.5 rounded hover:bg-slate-200 transition-transform shrink-0"
          >
            <ChevronRight
              className={cn(
                'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                expanded && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <span className="w-4.5 shrink-0" />
        )}

        {/* 체크박스 */}
        <button
          onClick={handleCheck}
          className={cn(
            'w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all',
            isChecked
              ? 'bg-blue-600 border-blue-600 text-white'
              : isIndeterminate
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-slate-300 hover:border-blue-400 bg-white'
          )}
        >
          {isChecked && <Check className="w-3 h-3" />}
          {isIndeterminate && !isChecked && <Minus className="w-3 h-3" />}
        </button>

        {/* 라벨 */}
        <span
          onClick={handleCheck}
          className={cn(
            'text-sm select-none flex-1 break-words',
            isChecked || isIndeterminate
              ? 'text-slate-800 font-medium'
              : 'text-slate-600'
          )}
        >
          {node.label}
        </span>

        {/* 문제 수 배지 (리프 노드) */}
        {!hasChildren && leafIds.length > 0 && (
          <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5 shrink-0">
            {leafIds.length > 0 ? '' : '0'}
          </span>
        )}
      </div>

      {/* 하위 노드 */}
      {hasChildren && expanded && (
        <div className="border-l border-slate-200 ml-3 pl-0.5">
          {/* subTypes (문장형/서술형) */}
          {node.subTypes &&
            node.subTypes.map((st) => {
              const stId = `${node.id}__${st}`;
              const stChecked = selected.has(stId);
              return (
                <div
                  key={stId}
                  className="group flex items-center gap-1.5 py-1.5 px-1 ml-8 rounded-lg cursor-pointer hover:bg-slate-100/70"
                >
                  <button
                    onClick={() => onToggle([stId], !stChecked)}
                    className={cn(
                      'w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-all',
                      stChecked
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 hover:border-blue-400 bg-white'
                    )}
                  >
                    {stChecked && <Check className="w-3 h-3" />}
                  </button>
                  <span
                    onClick={() => onToggle([stId], !stChecked)}
                    className={cn(
                      'text-sm select-none',
                      stChecked
                        ? 'text-slate-800 font-medium'
                        : 'text-slate-600'
                    )}
                  >
                    [{st}]
                  </span>
                </div>
              );
            })}

          {/* 자식 노드 */}
          {node.children &&
            node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                selected={selected}
                onToggle={onToggle}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
}
