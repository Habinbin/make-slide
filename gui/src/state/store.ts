import { create } from 'zustand';
import { DEFAULT_THEME_ID } from '../data/themes';
import { DEFAULT_LAYOUT_ID } from '../data/layouts';
import { loadTheme, type ParsedTheme, type SlideTemplate } from '../lib/themeLoader';
import { loadLayoutCss } from '../lib/layoutLoader';

let uid = 0;
const nextId = () => `slide-${++uid}`;

export interface DeckSlide extends SlideTemplate {} // same shape; html may be edited

interface EditorState {
  themeId: string;
  theme: ParsedTheme | null;
  loading: boolean;
  error: string | null;
  deck: DeckSlide[];
  selected: number;
  overrides: Record<string, string>;
  layoutId: string;
  layoutCss: string;

  // UI chrome state (not part of the slide document).
  appTheme: 'light' | 'dark';
  vaultOpen: boolean;

  selectTheme: (id: string) => void;
  selectLayout: (id: string) => void;
  selectSlide: (i: number) => void;
  addSlide: (tpl: SlideTemplate) => void;
  removeSlide: (i: number) => void;
  duplicateSlide: (i: number) => void;
  reorder: (from: number, to: number) => void;
  setOverride: (name: string, value: string) => void;
  updateSlideHtml: (id: string, html: string) => void;
  toggleAppTheme: () => void;
  toggleVault: () => void;
}

const storedAppTheme = (): 'light' | 'dark' =>
  (typeof localStorage !== 'undefined' && localStorage.getItem('ms-app-theme')) === 'dark' ? 'dark' : 'light';

export const useEditor = create<EditorState>((set, get) => ({
  themeId: DEFAULT_THEME_ID,
  theme: null,
  loading: true,
  error: null,
  deck: [],
  selected: 0,
  overrides: {},
  layoutId: DEFAULT_LAYOUT_ID,
  layoutCss: '',
  appTheme: storedAppTheme(),
  vaultOpen: true,

  toggleAppTheme: () =>
    set((s) => {
      const appTheme = s.appTheme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('ms-app-theme', appTheme);
      } catch {
        /* ignore */
      }
      return { appTheme };
    }),

  toggleVault: () => set((s) => ({ vaultOpen: !s.vaultOpen })),

  selectLayout: (id) => {
    set({ layoutId: id });
    loadLayoutCss(id)
      .then((css) => {
        if (get().layoutId === id) set({ layoutCss: css });
      })
      .catch(() => {
        if (get().layoutId === id) set({ layoutCss: '' });
      });
  },

  selectTheme: (id) => {
    set({ themeId: id, loading: true, error: null });
    loadTheme(id)
      .then((parsed) => {
        // Only apply if this is still the requested theme.
        if (get().themeId !== id) return;
        set((s) => {
          const deck =
            s.deck.length === 0
              ? (() => {
                  const title = parsed.templates.find((t) => t.type === 'title') ?? parsed.templates[0];
                  return title ? [{ ...title, id: nextId() }] : [];
                })()
              : // Re-map each existing slide to the new theme. Prefer the same
                // ordinal slot (keeps distinct slides distinct), then same type,
                // else keep as-is.
                s.deck.map((slide) => {
                  const repl =
                    parsed.templates[slide.sourceIndex] ??
                    parsed.templates.find((t) => t.type === slide.type);
                  return repl ? { ...repl, id: slide.id } : slide;
                });
          return { theme: parsed, loading: false, overrides: {}, deck };
        });
      })
      .catch((e) => {
        if (get().themeId !== id) return;
        set({ error: String(e?.message ?? e), loading: false });
      });
  },

  selectSlide: (i) => set({ selected: i }),

  addSlide: (tpl) =>
    set((s) => {
      const deck = [...s.deck, { ...tpl, id: nextId() }];
      return { deck, selected: deck.length - 1 };
    }),

  removeSlide: (i) =>
    set((s) => {
      const deck = s.deck.filter((_, idx) => idx !== i);
      const selected = Math.max(0, Math.min(s.selected, deck.length - 1));
      return { deck, selected };
    }),

  duplicateSlide: (i) =>
    set((s) => {
      const copy = { ...s.deck[i], id: nextId() };
      const deck = [...s.deck.slice(0, i + 1), copy, ...s.deck.slice(i + 1)];
      return { deck, selected: i + 1 };
    }),

  reorder: (from, to) =>
    set((s) => {
      if (to < 0 || to >= s.deck.length || from === to) return {};
      const deck = [...s.deck];
      const [moved] = deck.splice(from, 1);
      deck.splice(to, 0, moved);
      return { deck, selected: to };
    }),

  setOverride: (name, value) => set((s) => ({ overrides: { ...s.overrides, [name]: value } })),

  updateSlideHtml: (id, html) =>
    set((s) => ({
      deck: s.deck.map((slide) => (slide.id === id ? { ...slide, html } : slide)),
    })),
}));
