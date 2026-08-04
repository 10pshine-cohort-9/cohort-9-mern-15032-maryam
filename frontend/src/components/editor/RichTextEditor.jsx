import { forwardRef, useImperativeHandle, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link2,
  Image as ImageIcon,
  Quote,
  Code2,
  Table as TableIcon,
  Undo2,
  Redo2,
} from "lucide-react";

function InsertUrlModal({ mode, onCancel, onConfirm }) {
  const [value, setValue] = useState("");

  if (!mode) return null;

  const isImage = mode === "image";

  return (
    <div className="fixed inset-0 bg-slate-900/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-3">
          {isImage ? "Insert image" : "Insert link"}
        </h3>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={isImage ? "Image URL" : "https://example.com"}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onConfirm(value.trim());
            if (e.key === "Escape") onCancel();
          }}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => value.trim() && onConfirm(value.trim())}
            className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}

const RichTextEditor = forwardRef(function RichTextEditor(
  { initialContent = "", placeholder = "Start writing...", onUpdate },
  ref
) {
  const [insertMode, setInsertMode] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TableKit,
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML(), editor.getText());
    },
    editorProps: {
      attributes: {
        class:
          "flex-1 min-h-[400px] px-6 py-5 text-slate-700 leading-relaxed outline-none prose prose-slate max-w-none",
      },
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      setContent: (html) => editor?.commands.setContent(html || "", { emitUpdate: false }),
      getHTML: () => editor?.getHTML() || "",
      getText: () => editor?.getText() || "",
      focus: () => editor?.commands.focus(),
    }),
    [editor]
  );

  if (!editor) return null;

  const confirmInsert = (url) => {
    if (insertMode === "link") {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    if (insertMode === "image") {
      editor.chain().focus().setImage({ src: url }).run();
    }
    setInsertMode(null);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: "bold", label: "Bold" },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: "italic", label: "Italic" },
    { icon: Underline, action: () => editor.chain().focus().toggleUnderline().run(), active: "underline", label: "Underline" },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: "strike", label: "Strikethrough" },
    { divider: true },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: "bulletList", label: "Bullet list" },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: "orderedList", label: "Numbered list" },
    { divider: true },
    { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign("left").run(), active: { textAlign: "left" }, label: "Align left" },
    { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign("center").run(), active: { textAlign: "center" }, label: "Align center" },
    { icon: AlignRight, action: () => editor.chain().focus().setTextAlign("right").run(), active: { textAlign: "right" }, label: "Align right" },
    { icon: AlignJustify, action: () => editor.chain().focus().setTextAlign("justify").run(), active: { textAlign: "justify" }, label: "Justify" },
    { divider: true },
    { icon: Link2, action: () => setInsertMode("link"), active: "link", label: "Insert link" },
    { icon: ImageIcon, action: () => setInsertMode("image"), label: "Insert image" },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: "blockquote", label: "Quote" },
    { icon: Code2, action: () => editor.chain().focus().toggleCodeBlock().run(), active: "codeBlock", label: "Code block" },
    {
      icon: TableIcon,
      action: () => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run(),
      label: "Insert table",
    },
    { divider: true },
    { icon: Undo2, action: () => editor.chain().focus().undo().run(), label: "Undo" },
    { icon: Redo2, action: () => editor.chain().focus().redo().run(), label: "Redo" },
  ];

  const isActive = (active) => {
    if (!active) return false;
    if (typeof active === "string") return editor.isActive(active);
    return editor.isActive(active);
  };

  const currentBlock = editor.isActive("heading", { level: 1 })
    ? "H1"
    : editor.isActive("heading", { level: 2 })
    ? "H2"
    : editor.isActive("heading", { level: 3 })
    ? "H3"
    : "P";

  const handleFormatBlock = (e) => {
    const value = e.target.value;
    if (value === "P") editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level: Number(value.slice(1)) }).run();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex-1 flex flex-col">
      <InsertUrlModal mode={insertMode} onCancel={() => setInsertMode(null)} onConfirm={confirmInsert} />
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-slate-100">
        <select
          value={currentBlock}
          onChange={handleFormatBlock}
          className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 mr-1 text-slate-600 outline-none bg-white"
        >
          <option value="P">Paragraph</option>
          <option value="H1">Heading 1</option>
          <option value="H2">Heading 2</option>
          <option value="H3">Heading 3</option>
        </select>

        {toolbarButtons.map((btn, i) =>
          btn.divider ? (
            <div key={i} className="w-px h-5 bg-slate-200 mx-1" />
          ) : (
            <button
              key={btn.label}
              title={btn.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={btn.action}
              className={`p-1.5 rounded-md hover:bg-slate-100 ${
                isActive(btn.active) ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <btn.icon className="w-4 h-4" />
            </button>
          )
        )}
      </div>
      <EditorContent editor={editor} className="flex-1 flex flex-col" />
    </div>
  );
});

export default RichTextEditor;
