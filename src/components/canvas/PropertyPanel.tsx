import { useState, useCallback } from 'react';
import type { ElementData, DomTreeNode } from '@/lib/types';

interface PropertyPanelProps {
  element: ElementData | null;
  onUpdateStyle: (styles: Record<string, string>) => void;
  onUpdateText: (text: string) => void;
  onDelete: () => void;
  onNavigate: (selector: string) => void;
}

export function PropertyPanel({ element, onUpdateStyle, onUpdateText, onDelete, onNavigate }: PropertyPanelProps) {
  const [activeTab, setActiveTab] = useState<'styles' | 'computed' | 'tree'>('styles');

  if (!element) {
    return (
      <div className="w-72 flex-shrink-0 border-l border-stone/10 bg-cream flex flex-col">
        <div className="px-4 py-3 border-b border-stone/10">
          <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">Inspector</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-xs text-stone text-center">
            Click an element on the canvas to inspect and edit its properties
          </p>
        </div>
      </div>
    );
  }

  const s = element.styles;

  const update = useCallback((key: string, value: string) => {
    onUpdateStyle({ [key]: value });
  }, [onUpdateStyle]);

  return (
    <div className="w-72 flex-shrink-0 border-l border-stone/10 bg-cream flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone/10 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">Inspector</h3>
        <button onClick={onDelete} className="text-red-600 hover:bg-red-50 p-1 rounded" title="Delete element">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone/10">
        {(['styles', 'computed', 'tree'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'bg-linen text-ink border-b-2 border-terracotta'
                : 'text-stone hover:text-ink'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Breadcrumb */}
        <div className="flex flex-wrap gap-1">
          {element.breadcrumb.map((crumb, i) => (
            <button
              key={i}
              onClick={() => {
                const selector = element.breadcrumb.slice(0, i + 1).join(' > ');
                onNavigate(selector);
              }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-linen text-stone hover:text-ink hover:bg-stone/10 transition-colors"
            >
              {crumb}
            </button>
          ))}
        </div>

        {activeTab === 'styles' && (
          <>
            {/* Text Content */}
            {(element.tag === 'p' || element.tag === 'h1' || element.tag === 'h2' || element.tag === 'h3' || element.tag === 'h4' || element.tag === 'span' || element.tag === 'div' || element.tag === 'a' || element.tag === 'button' || element.tag === 'li') && (
              <Section title="Text">
                <textarea
                  value={element.text}
                  onChange={(e) => onUpdateText(e.target.value)}
                  className="w-full rounded-md border border-stone/20 bg-parchment px-2 py-1.5 text-xs outline-none focus:border-terracotta/40 resize-none"
                  rows={3}
                />
              </Section>
            )}

            <Section title="Colors">
              <ColorField label="Text" value={s.color} onChange={(v) => update('color', v)} />
              <ColorField label="Background" value={s.backgroundColor} onChange={(v) => update('backgroundColor', v)} />
              <ColorField label="Border" value={s.borderColor} onChange={(v) => update('borderColor', v)} />
            </Section>

            <Section title="Typography">
              <NumberField label="Size" value={s.fontSize} onChange={(v) => update('fontSize', v + 'px')} suffix="px" />
              <SelectField label="Weight" value={String(s.fontWeight)} onChange={(v) => update('fontWeight', v)} options={['300', '400', '500', '600', '700', '800']} />
              <TextField label="Family" value={s.fontFamily} onChange={(v) => update('fontFamily', v)} />
              <SelectField label="Align" value={s.textAlign} onChange={(v) => update('textAlign', v)} options={['left', 'center', 'right', 'justify']} />
            </Section>

            <Section title="Spacing">
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="PT" value={s.paddingTop} onChange={(v) => update('paddingTop', v + 'px')} suffix="px" />
                <NumberField label="PR" value={s.paddingRight} onChange={(v) => update('paddingRight', v + 'px')} suffix="px" />
                <NumberField label="PB" value={s.paddingBottom} onChange={(v) => update('paddingBottom', v + 'px')} suffix="px" />
                <NumberField label="PL" value={s.paddingLeft} onChange={(v) => update('paddingLeft', v + 'px')} suffix="px" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <NumberField label="MT" value={s.marginTop} onChange={(v) => update('marginTop', v + 'px')} suffix="px" />
                <NumberField label="MR" value={s.marginRight} onChange={(v) => update('marginRight', v + 'px')} suffix="px" />
                <NumberField label="MB" value={s.marginBottom} onChange={(v) => update('marginBottom', v + 'px')} suffix="px" />
                <NumberField label="ML" value={s.marginLeft} onChange={(v) => update('marginLeft', v + 'px')} suffix="px" />
              </div>
            </Section>

            <Section title="Layout">
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="W" value={s.width} onChange={(v) => update('width', v + 'px')} suffix="px" />
                <NumberField label="H" value={s.height} onChange={(v) => update('height', v + 'px')} suffix="px" />
              </div>
              <SelectField label="Display" value={s.display} onChange={(v) => update('display', v)} options={['block', 'inline', 'inline-block', 'flex', 'grid', 'none']} />
              <SelectField label="Position" value={s.position} onChange={(v) => update('position', v)} options={['static', 'relative', 'absolute', 'fixed', 'sticky']} />
              {(s.position === 'absolute' || s.position === 'fixed' || s.position === 'relative' || s.position === 'sticky') && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <NumberField label="Top" value={s.top} onChange={(v) => update('top', v + 'px')} suffix="px" />
                  <NumberField label="Left" value={s.left} onChange={(v) => update('left', v + 'px')} suffix="px" />
                </div>
              )}
              {s.display === 'flex' && (
                <>
                  <SelectField label="Direction" value={s.flexDirection} onChange={(v) => update('flexDirection', v)} options={['row', 'column', 'row-reverse', 'column-reverse']} />
                  <SelectField label="Justify" value={s.justifyContent} onChange={(v) => update('justifyContent', v)} options={['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly']} />
                  <SelectField label="Align" value={s.alignItems} onChange={(v) => update('alignItems', v)} options={['flex-start', 'center', 'flex-end', 'stretch', 'baseline']} />
                  <NumberField label="Gap" value={s.gap} onChange={(v) => update('gap', v + 'px')} suffix="px" />
                </>
              )}
            </Section>

            <Section title="Border">
              <NumberField label="Radius" value={s.borderRadius} onChange={(v) => update('borderRadius', v + 'px')} suffix="px" />
              <NumberField label="Width" value={s.borderWidth} onChange={(v) => update('borderWidth', v + 'px')} suffix="px" />
              <SelectField label="Style" value={s.borderStyle} onChange={(v) => update('borderStyle', v)} options={['none', 'solid', 'dashed', 'dotted']} />
            </Section>

            <Section title="Effects">
              <SliderField label="Opacity" value={parseFloat(s.opacity) || 1} min={0} max={1} step={0.05} onChange={(v) => update('opacity', String(v))} />
              <TextField label="Shadow" value={s.boxShadow} onChange={(v) => update('boxShadow', v)} placeholder="none" />
            </Section>

            {element.attributes.length > 0 && (
              <Section title="Attributes">
                {element.attributes.map((attr) => (
                  <div key={attr.name} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-stone w-16 truncate">{attr.name}</span>
                    <span className="text-[10px] text-ink truncate flex-1">{attr.value}</span>
                  </div>
                ))}
              </Section>
            )}
          </>
        )}

        {activeTab === 'computed' && (
          <>
            <Section title="Box Model">
              <div className="flex flex-col items-center gap-1 py-2">
                <ComputedValue label="margin" value={s.margin} />
                <ComputedValue label="padding" value={s.padding} />
                <ComputedValue label="border" value={s.border} />
              </div>
            </Section>
            <Section title="Typography" defaultOpen={false}>
              <ComputedRow label="font-size" value={s.fontSize} />
              <ComputedRow label="font-weight" value={s.fontWeight} />
              <ComputedRow label="line-height" value={s.lineHeight} />
              <ComputedRow label="letter-spacing" value={s.letterSpacing} />
              <ComputedRow label="text-align" value={s.textAlign} />
              <ComputedRow label="text-transform" value={s.textTransform} />
            </Section>
            <Section title="Layout" defaultOpen={false}>
              <ComputedRow label="display" value={s.display} />
              <ComputedRow label="position" value={s.position} />
              <ComputedRow label="width" value={s.width} />
              <ComputedRow label="height" value={s.height} />
              <ComputedRow label="min-width" value={s.minWidth} />
              <ComputedRow label="min-height" value={s.minHeight} />
              <ComputedRow label="max-width" value={s.maxWidth} />
              <ComputedRow label="max-height" value={s.maxHeight} />
              <ComputedRow label="z-index" value={s.zIndex} />
              <ComputedRow label="overflow" value={s.overflow} />
            </Section>
            <Section title="Flex / Grid" defaultOpen={false}>
              <ComputedRow label="flex-direction" value={s.flexDirection} />
              <ComputedRow label="justify-content" value={s.justifyContent} />
              <ComputedRow label="align-items" value={s.alignItems} />
              <ComputedRow label="gap" value={s.gap} />
            </Section>
            <Section title="Visual" defaultOpen={false}>
              <ComputedRow label="opacity" value={s.opacity} />
              <ComputedRow label="transform" value={s.transform} />
              <ComputedRow label="visibility" value={s.visibility} />
              <ComputedRow label="cursor" value={s.cursor} />
              <ComputedRow label="pointer-events" value={s.pointerEvents} />
            </Section>
          </>
        )}

        {activeTab === 'tree' && (
          <>
            {element.domTree && (
              <Section title="Selected Element">
                <DomTreeView node={element.domTree} onSelect={onNavigate} depth={0} />
              </Section>
            )}
            {element.parentTree && (
              <Section title="Document Tree" defaultOpen={false}>
                <DomTreeView node={element.parentTree} onSelect={onNavigate} depth={0} />
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DomTreeView({ node, onSelect, depth }: { node: DomTreeNode; onSelect: (selector: string) => void; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'text') {
    return (
      <div className="text-[10px] text-stone truncate pl-3" style={{ paddingLeft: depth * 12 }}>
        {node.text}
      </div>
    );
  }

  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <button
        onClick={() => {
          if (node.selector) onSelect(node.selector);
          if (hasChildren) setExpanded(!expanded);
        }}
        className="flex items-center gap-1 text-[10px] hover:bg-linen rounded px-1 py-0.5 w-full text-left"
        style={{ paddingLeft: depth * 12 }}
      >
        {hasChildren && (
          <span className="text-stone w-3">{expanded ? '▼' : '▶'}</span>
        )}
        {!hasChildren && <span className="w-3" />}
        <span className="font-mono text-terracotta">{node.tag}</span>
        {node.id && <span className="text-blue-600">#{node.id}</span>}
        {node.classes && node.classes.length > 0 && (
          <span className="text-purple-600">.{node.classes.join('.')}</span>
        )}
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child, i) => (
            <DomTreeView key={i} node={child} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function ComputedValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between w-full max-w-[180px]">
      <span className="text-[10px] text-stone uppercase tracking-wider">{label}</span>
      <span className="text-[10px] font-mono text-ink">{value || '—'}</span>
    </div>
  );
}

function ComputedRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 border-b border-stone/5 last:border-0">
      <span className="text-[10px] text-stone">{label}</span>
      <span className="text-[10px] font-mono text-ink truncate max-w-[120px]">{value || '—'}</span>
    </div>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-stone/10 pb-3 last:border-0">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full py-1">
        <span className="text-[10px] font-semibold text-stone uppercase tracking-wider">{title}</span>
        <svg className={`h-3 w-3 text-stone transition-transform ${open ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = value?.startsWith('#') ? value : value || '#000000';
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-stone w-16">{label}</label>
      <input
        type="color"
        value={hex.length === 7 ? hex : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border-0 p-0 cursor-pointer"
      />
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-stone/20 bg-parchment px-2 py-1 text-[10px] font-mono outline-none focus:border-terracotta/40"
      />
    </div>
  );
}

function NumberField({ label, value, onChange, suffix }: { label: string; value: string | number | undefined; onChange: (v: number) => void; suffix?: string }) {
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-stone w-8">{label}</label>
      <div className="flex-1 flex items-center">
        <input
          type="number"
          value={num}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full rounded border border-stone/20 bg-parchment px-2 py-1 text-[10px] font-mono outline-none focus:border-terracotta/40"
        />
        {suffix && <span className="text-[10px] text-stone ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-stone w-16">{label}</label>
      <input
        type="text"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-stone/20 bg-parchment px-2 py-1 text-[10px] outline-none focus:border-terracotta/40"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-stone w-16">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-stone/20 bg-parchment px-2 py-1 text-[10px] outline-none focus:border-terracotta/40"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-stone">{label}</label>
        <span className="text-[10px] font-mono text-ink">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-stone/20 rounded-lg appearance-none cursor-pointer accent-terracotta"
      />
    </div>
  );
}
