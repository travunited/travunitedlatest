import Image from "@tiptap/extension-image";

// Custom Image extension with delete functionality
export const ImageWithDelete = Image.extend({
  name: "image",
  
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement("div");
      container.className = "relative inline-block my-4 group";
      container.style.display = "inline-block";
      container.style.maxWidth = "100%";
      
      const img = document.createElement("img");
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || "";
      img.className = "max-w-full h-auto rounded-lg";
      img.style.display = "block";
      img.style.width = "100%";
      img.style.height = "auto";
      container.appendChild(img);

      let deleteButton: HTMLButtonElement | null = null;

      const showDeleteButton = () => {
        if (!deleteButton) {
          deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "absolute top-2 right-2 bg-red-600 text-white rounded-full p-1.5 shadow-lg hover:bg-red-700 transition-colors z-10";
          deleteButton.style.cursor = "pointer";
          deleteButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          `;
          deleteButton.title = "Delete image";
          deleteButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const pos = typeof getPos === "function" ? getPos() : null;
            if (pos !== null && pos !== undefined) {
              const { state } = editor;
              const { tr } = state;
              tr.delete(pos, pos + node.nodeSize);
              editor.view.dispatch(tr);
              editor.view.focus();
            }
          };
          container.appendChild(deleteButton);
        }
        if (deleteButton) {
          deleteButton.style.display = "block";
        }
      };

      const hideDeleteButton = () => {
        if (deleteButton) {
          deleteButton.style.display = "none";
        }
      };

      const handleMouseEnter = () => {
        showDeleteButton();
      };

      const handleMouseLeave = () => {
        hideDeleteButton();
      };

      // Initially hide the delete button
      hideDeleteButton();

      container.addEventListener("mouseenter", handleMouseEnter);
      container.addEventListener("mouseleave", handleMouseLeave);

      return {
        dom: container,
        destroy: () => {
          container.removeEventListener("mouseenter", handleMouseEnter);
          container.removeEventListener("mouseleave", handleMouseLeave);
          if (deleteButton) {
            deleteButton.remove();
          }
        },
      };
    };
  },
});

