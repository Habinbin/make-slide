import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useEditor } from '../state/store';
import { buildSlideDoc } from '../lib/iframeBuilder';
import { SlideFrame } from './SlideFrame';

export function LeftPanel() {
  const theme = useEditor((s) => s.theme);
  const deck = useEditor((s) => s.deck);
  const selected = useEditor((s) => s.selected);
  const overrides = useEditor((s) => s.overrides);
  const layoutCss = useEditor((s) => s.layoutCss);
  const selectSlide = useEditor((s) => s.selectSlide);
  const removeSlide = useEditor((s) => s.removeSlide);
  const duplicateSlide = useEditor((s) => s.duplicateSlide);
  const reorder = useEditor((s) => s.reorder);

  const onDragEnd = (r: DropResult) => {
    if (r.destination) reorder(r.source.index, r.destination.index);
  };

  return (
    <aside className="panel left">
      <section className="panel-section">
        <h2 className="panel-title">슬라이드 ({deck.length})</h2>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="deck">
            {(prov) => (
              <div className="deck-list" ref={prov.innerRef} {...prov.droppableProps}>
                {deck.map((s, i) => (
                  <Draggable key={s.id} draggableId={s.id} index={i}>
                    {(dp, snap) => (
                      <div
                        ref={dp.innerRef}
                        {...dp.draggableProps}
                        {...dp.dragHandleProps}
                        className={`deck-item ${i === selected ? 'active' : ''} ${snap.isDragging ? 'dragging' : ''}`}
                        onClick={() => selectSlide(i)}
                      >
                        <span className="deck-index">{i + 1}</span>
                        {theme && <SlideFrame doc={buildSlideDoc(theme, s.html, overrides, layoutCss)} width={172} />}
                        <div className="deck-item-bar">
                          <span className="deck-type">{s.label}</span>
                          <span className="deck-actions" onClick={(e) => e.stopPropagation()}>
                            <button title="복제" onClick={() => duplicateSlide(i)}>⎘</button>
                            <button title="삭제" onClick={() => removeSlide(i)}>✕</button>
                          </span>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {prov.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </section>
    </aside>
  );
}
