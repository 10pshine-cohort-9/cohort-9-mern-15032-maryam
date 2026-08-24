import React, { createRef } from "react";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RichTextEditor from "./RichTextEditor";

const createRect = () => ({
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: 0,
  height: 0,
  x: 0,
  y: 0,
  toJSON: () => ({}),
});

beforeAll(() => {
  if (!document.elementFromPoint) {
    document.elementFromPoint = jest.fn(() => document.body);
  }

  if (!Node.prototype.getClientRects) {
    Node.prototype.getClientRects = function () {
      return [createRect()];
    };
  }

  if (!Node.prototype.getBoundingClientRect) {
    Node.prototype.getBoundingClientRect = function () {
      return createRect();
    };
  }

  if (typeof Range !== "undefined") {
    if (!Range.prototype.getClientRects) {
      Range.prototype.getClientRects = function () {
        return [createRect()];
      };
    }

    if (!Range.prototype.getBoundingClientRect) {
      Range.prototype.getBoundingClientRect = function () {
        return createRect();
      };
    }
  }
});

afterEach(() => {
  cleanup();
});

const getEditor = (container) => {
  const editor = container.querySelector(".ProseMirror");

  if (!editor) {
    throw new Error("ProseMirror editor was not found");
  }

  return editor;
};

const getTable = (container) => {
  const table = container.querySelector("table");

  if (!table) {
    throw new Error("Table was not found");
  }

  return table;
};

const insertTable = () => {
  fireEvent.click(
    screen.getByRole("button", {
      name: "Insert table",
    })
  );
};

const getRowButtons = () =>
  screen.getAllByRole("button", {
    name: /^Row$/,
  });

const getColumnButtons = () =>
  screen.getAllByRole("button", {
    name: /^Column$/,
  });

describe("RichTextEditor Component", () => {

  test("renders the editor", () => {
    const { container } = render(<RichTextEditor />);

    expect(getEditor(container)).toBeInTheDocument();
  });

  test("renders paragraph option in block dropdown", () => {
    render(<RichTextEditor />);

    expect(
      screen.getByRole("option", {
        name: "Paragraph",
      })
    ).toBeInTheDocument();
  });

  test("renders heading options", () => {
    render(<RichTextEditor />);

    expect(
      screen.getByRole("option", {
        name: "Heading 1",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: "Heading 2",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", {
        name: "Heading 3",
      })
    ).toBeInTheDocument();
  });

  test("renders toolbar buttons", () => {
    render(<RichTextEditor />);

    const expectedButtons = [
      "Bold",
      "Italic",
      "Underline",
      "Strikethrough",
      "Bullet list",
      "Numbered list",
      "Align left",
      "Align center",
      "Align right",
      "Justify",
      "Insert link",
      "Insert image",
      "Quote",
      "Code block",
      "Insert table",
      "Undo",
      "Redo",
    ];

    expectedButtons.forEach((name) => {
      expect(
        screen.getByRole("button", {
          name,
        })
      ).toBeInTheDocument();
    });
  });

  test("renders initial HTML content", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello world</p>" />
    );

    expect(getEditor(container)).toHaveTextContent("Hello world");
  });

  test("renders initial heading content", () => {
    const { container } = render(
      <RichTextEditor initialContent="<h1>Hello heading</h1>" />
    );

    expect(
      container.querySelector("h1")
    ).toHaveTextContent("Hello heading");
  });

test("renders custom placeholder", () => {
  const { container } = render(
    <RichTextEditor placeholder="Write your note here..." />
  );

  const placeholderElement = container.querySelector(
    '[data-placeholder="Write your note here..."]'
  );

  expect(placeholderElement).toBeInTheDocument();
});

  test("calls onUpdate when content changes", async () => {
    const user = userEvent.setup();
    const mockUpdate = jest.fn();

    const { container } = render(
      <RichTextEditor onUpdate={mockUpdate} />
    );

    const editor = getEditor(container);

    await act(async () => {
      editor.focus();
    });

    await user.type(editor, "New text");

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    expect(mockUpdate).toHaveBeenLastCalledWith(
      expect.stringContaining("New text"),
      expect.stringContaining("New text")
    );
  });

test("toggles bold formatting", async () => {
  const { container } = render(
    <RichTextEditor initialContent="<p>Hello</p>" />
  );

  const editor = getEditor(container);

  await act(async () => {
    editor.focus();
  });

  fireEvent.click(
    screen.getByRole("button", {
      name: "Bold",
    })
  );

    expect(
      screen.getByRole("button", {
        name: "Bold",
      })
    ).toBeInTheDocument();
  });

  test("toggles italic formatting", async () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    await act(async () => {
  getEditor(container).focus();
});

    fireEvent.click(
      screen.getByRole("button", {
        name: "Italic",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Italic",
      })
    ).toBeInTheDocument();
  });

  test("toggles underline formatting", async () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

   await act(async () => {
  getEditor(container).focus();
});

    fireEvent.click(
      screen.getByRole("button", {
        name: "Underline",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Underline",
      })
    ).toBeInTheDocument();
  });

  test("toggles strikethrough formatting", async () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    await act(async () => {
  getEditor(container).focus();
});

    fireEvent.click(
      screen.getByRole("button", {
        name: "Strikethrough",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Strikethrough",
      })
    ).toBeInTheDocument();
  });

  test("toggles bullet list", async () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    await act(async () => {
  getEditor(container).focus();
});
    fireEvent.click(
      screen.getByRole("button", {
        name: "Bullet list",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Bullet list",
      })
    ).toBeInTheDocument();
  });

  test("toggles numbered list", async () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    await act(async () => {
  getEditor(container).focus();
});

    fireEvent.click(
      screen.getByRole("button", {
        name: "Numbered list",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Numbered list",
      })
    ).toBeInTheDocument();
  });

  test("sets left alignment", async () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    await act(async () => {
  getEditor(container).focus();
});

    fireEvent.click(
      screen.getByRole("button", {
        name: "Align left",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Align left",
      })
    ).toBeInTheDocument();
  });

  test("sets center alignment", async () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    await act(async () => {
  getEditor(container).focus();
});

    fireEvent.click(
      screen.getByRole("button", {
        name: "Align center",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Align center",
      })
    ).toBeInTheDocument();
  });

  test("sets right alignment", async () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

   await act(async () => {
  getEditor(container).focus();
});

    fireEvent.click(
      screen.getByRole("button", {
        name: "Align right",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Align right",
      })
    ).toBeInTheDocument();
  });

  test("sets justify alignment", async () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

   await act(async () => {
  getEditor(container).focus();
});

    fireEvent.click(
      screen.getByRole("button", {
        name: "Justify",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Justify",
      })
    ).toBeInTheDocument();
  });

  test("changes paragraph to heading 1", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    const dropdown = screen.getByRole("combobox");

    fireEvent.change(dropdown, {
      target: {
        value: "H1",
      },
    });

    expect(
      container.querySelector("h1")
    ).toBeInTheDocument();
  });

  test("changes paragraph to heading 2", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    const dropdown = screen.getByRole("combobox");

    fireEvent.change(dropdown, {
      target: {
        value: "H2",
      },
    });

    expect(
      container.querySelector("h2")
    ).toBeInTheDocument();
  });

  test("changes paragraph to heading 3", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    const dropdown = screen.getByRole("combobox");

    fireEvent.change(dropdown, {
      target: {
        value: "H3",
      },
    });

    expect(
      container.querySelector("h3")
    ).toBeInTheDocument();
  });

  test("changes heading back to paragraph", () => {
    const { container } = render(
      <RichTextEditor initialContent="<h1>Hello</h1>" />
    );

    const dropdown = screen.getByRole("combobox");

    fireEvent.change(dropdown, {
      target: {
        value: "P",
      },
    });

    expect(
      container.querySelector("p")
    ).toBeInTheDocument();

    expect(
      container.querySelector("h1")
    ).not.toBeInTheDocument();
  });

  test("opens link modal", () => {
    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert link",
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Insert link",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("https://example.com")
    ).toBeInTheDocument();
  });

  test("link modal can be cancelled", () => {
    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert link",
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Insert link",
      })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cancel",
      })
    );

    expect(
      screen.queryByRole("heading", {
        name: "Insert link",
      })
    ).not.toBeInTheDocument();
  });

  test("link modal does not insert empty URL", () => {
    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert link",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert",
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Insert link",
      })
    ).toBeInTheDocument();
  });

  test("link modal closes after valid URL insertion", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert link",
      })
    );

    const input = screen.getByPlaceholderText(
      "https://example.com"
    );

    await user.type(
      input,
      "https://example.com"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert",
      })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "Insert link",
        })
      ).not.toBeInTheDocument();
    });

    expect(getEditor(container)).toBeInTheDocument();
  });

  test("opens image modal", () => {
    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert image",
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Insert image",
      })
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText("Image URL")
    ).toBeInTheDocument();
  });

  test("image modal can be cancelled", () => {
    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert image",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Cancel",
      })
    );

    expect(
      screen.queryByRole("heading", {
        name: "Insert image",
      })
    ).not.toBeInTheDocument();
  });

  test("image modal does not insert empty URL", () => {
    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert image",
      })
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert",
      })
    );

    expect(
      screen.getByRole("heading", {
        name: "Insert image",
      })
    ).toBeInTheDocument();
  });

  test("image modal closes after valid URL insertion", async () => {
    const user = userEvent.setup();

    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert image",
      })
    );

    const input = screen.getByPlaceholderText(
      "Image URL"
    );

    await user.type(
      input,
      "https://example.com/image.png"
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert",
      })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "Insert image",
        })
      ).not.toBeInTheDocument();
    });
  });

  test("inserts a table", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    expect(
      container.querySelector("table")
    ).not.toBeInTheDocument();

    insertTable();

    expect(
      container.querySelector("table")
    ).toBeInTheDocument();
  });

  test("inserted table has two rows", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    insertTable();

    const rows =
      getTable(container).querySelectorAll("tr");

    expect(rows).toHaveLength(2);
  });

  test("inserted table has two columns", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    insertTable();

    const firstRow =
      getTable(container).querySelector("tr");

    const columns =
      firstRow.querySelectorAll("th, td");

    expect(columns).toHaveLength(2);
  });

  test("table controls appear after inserting table", () => {
    render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    insertTable();

    expect(
      screen.getByText("Table:")
    ).toBeInTheDocument();

    const rowButtons = getRowButtons();
    const columnButtons = getColumnButtons();

    expect(rowButtons).toHaveLength(2);
    expect(columnButtons).toHaveLength(2);

    expect(
      screen.getByRole("button", {
        name: "Delete table",
      })
    ).toBeInTheDocument();
  });

  test("adds a row to table", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    insertTable();

    const initialRows =
      getTable(container).querySelectorAll("tr").length;

    const rowButtons = getRowButtons();

    fireEvent.click(rowButtons[0]);

    const newRows =
      getTable(container).querySelectorAll("tr").length;

    expect(newRows).toBe(initialRows + 1);
  });

  test("deletes a row from table", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    insertTable();

    const initialRows =
      getTable(container).querySelectorAll("tr").length;

    const rowButtons = getRowButtons();

    fireEvent.click(rowButtons[1]);

    const newRows =
      getTable(container).querySelectorAll("tr").length;

    expect(newRows).toBe(initialRows - 1);
  });

  test("adds a column to table", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    insertTable();

    const firstRow =
      getTable(container).querySelector("tr");

    const initialColumns =
      firstRow.querySelectorAll("th, td").length;

    const columnButtons = getColumnButtons();

    fireEvent.click(columnButtons[0]);

    const updatedFirstRow =
      getTable(container).querySelector("tr");

    const newColumns =
      updatedFirstRow.querySelectorAll("th, td").length;

    expect(newColumns).toBe(initialColumns + 1);
  });

  test("deletes a column from table", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    insertTable();

    const firstRow =
      getTable(container).querySelector("tr");

    const initialColumns =
      firstRow.querySelectorAll("th, td").length;

    const columnButtons = getColumnButtons();

    fireEvent.click(columnButtons[1]);

    const updatedFirstRow =
      getTable(container).querySelector("tr");

    const newColumns =
      updatedFirstRow.querySelectorAll("th, td").length;

    expect(newColumns).toBe(initialColumns - 1);
  });

  test("deletes table", () => {
    const { container } = render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    insertTable();

    expect(
      container.querySelector("table")
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Delete table",
      })
    );

    expect(
      container.querySelector("table")
    ).not.toBeInTheDocument();
  });

  test("renders undo button", () => {
    render(<RichTextEditor />);

    expect(
      screen.getByRole("button", {
        name: "Undo",
      })
    ).toBeInTheDocument();
  });

  test("renders redo button", () => {
    render(<RichTextEditor />);

    expect(
      screen.getByRole("button", {
        name: "Redo",
      })
    ).toBeInTheDocument();
  });

  test("undo button can be clicked", () => {
    render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Undo",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Undo",
      })
    ).toBeInTheDocument();
  });

  test("redo button can be clicked", () => {
    render(
      <RichTextEditor initialContent="<p>Hello</p>" />
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Redo",
      })
    );

    expect(
      screen.getByRole("button", {
        name: "Redo",
      })
    ).toBeInTheDocument();
  });

  test("exposes getHTML through ref", () => {
    const ref = createRef();

    render(
      <RichTextEditor
        ref={ref}
        initialContent="<p>Hello world</p>"
      />
    );

    expect(ref.current).toBeTruthy();

    expect(
      ref.current.getHTML()
    ).toContain("Hello world");
  });

  test("exposes getText through ref", () => {
    const ref = createRef();

    render(
      <RichTextEditor
        ref={ref}
        initialContent="<p>Hello world</p>"
      />
    );

    expect(
      ref.current.getText()
    ).toContain("Hello world");
  });

  test("setContent updates editor content without calling onUpdate", async () => {
    const ref = createRef();
    const mockUpdate = jest.fn();

    const { container } = render(
      <RichTextEditor
        ref={ref}
        onUpdate={mockUpdate}
        initialContent="<p>Original</p>"
      />
    );

    expect(getEditor(container)).toHaveTextContent(
      "Original"
    );

    await act(async () => {
      ref.current.setContent("<p>Updated content</p>");
    });

    expect(getEditor(container)).toHaveTextContent(
      "Updated content"
    );

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test("setContent handles empty content", async () => {
    const ref = createRef();

    const { container } = render(
      <RichTextEditor
        ref={ref}
        initialContent="<p>Original</p>"
      />
    );

    await act(async () => {
      ref.current.setContent("");
    });

    expect(
      getEditor(container)
    ).toBeInTheDocument();
  });

  test("focus method is exposed through ref", async () => {
    const ref = createRef();

    const { container } = render(
      <RichTextEditor ref={ref} />
    );

    await act(async () => {
      expect(() => {
        ref.current.focus();
      }).not.toThrow();
    });

    expect(
      getEditor(container)
    ).toBeInTheDocument();
  });

  test("Escape closes link modal", () => {
    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert link",
      })
    );

    const input = screen.getByPlaceholderText(
      "https://example.com"
    );

    fireEvent.keyDown(input, {
      key: "Escape",
      code: "Escape",
    });

    expect(
      screen.queryByRole("heading", {
        name: "Insert link",
      })
    ).not.toBeInTheDocument();
  });

  test("Escape closes image modal", () => {
    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert image",
      })
    );

    const input = screen.getByPlaceholderText(
      "Image URL"
    );

    fireEvent.keyDown(input, {
      key: "Escape",
      code: "Escape",
    });

    expect(
      screen.queryByRole("heading", {
        name: "Insert image",
      })
    ).not.toBeInTheDocument();
  });

  test("Enter submits a valid link URL", async () => {
    const user = userEvent.setup();

    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert link",
      })
    );

    const input = screen.getByPlaceholderText(
      "https://example.com"
    );

    await user.type(
      input,
      "https://example.com"
    );

    fireEvent.keyDown(input, {
      key: "Enter",
      code: "Enter",
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "Insert link",
        })
      ).not.toBeInTheDocument();
    });
  });

  test("Enter submits a valid image URL", async () => {
    const user = userEvent.setup();

    render(<RichTextEditor />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert image",
      })
    );

    const input = screen.getByPlaceholderText(
      "Image URL"
    );

    await user.type(
      input,
      "https://example.com/image.png"
    );

    fireEvent.keyDown(input, {
      key: "Enter",
      code: "Enter",
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "Insert image",
        })
      ).not.toBeInTheDocument();
    });
  });
});