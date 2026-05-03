export interface ExportOptions {
  filename?: string;
  format: "html" | "pdf" | "zip" | "jsx";
}

/** Export canvas content as a downloadable file. */
export async function exportCanvas(content: string, options: ExportOptions) {
  const { format, filename = "design" } = options;

  switch (format) {
    case "html": {
      const blob = new Blob([content], { type: "text/html" });
      downloadBlob(blob, `${filename}.html`);
      break;
    }

    case "pdf": {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        throw new Error("Popup blocked. Please allow popups for PDF export.");
      }
      printWindow.document.write(content);
      printWindow.document.close();
      // Wait for assets to load then print
      setTimeout(() => {
        printWindow.print();
      }, 500);
      break;
    }

    case "zip": {
      // Simple ZIP using JSZip-like approach with data URLs
      const zipContent = await createZip(content, filename);
      downloadBlob(zipContent, `${filename}.zip`);
      break;
    }

    case "jsx": {
      // Wrap HTML content as a React component string
      const jsx = `import React from "react";\n\nexport default function Design() {\n  return (\n    <div\n      dangerouslySetInnerHTML={{\n        __html: ${JSON.stringify(extractBodyContent(content))}\n      }}\n    />\n  );\n}\n`;
      const blob = new Blob([jsx], { type: "text/jsx" });
      downloadBlob(blob, `${filename}.jsx`);
      break;
    }

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : html;
}

async function createZip(html: string, name: string): Promise<Blob> {
  // For a real implementation we'd use JSZip. For now, create a minimal
  // ZIP-like structure or just bundle as a single HTML file within a folder.
  // This is a placeholder that creates a simple text manifest + HTML.
  const manifest = `DesignForge Export\n==================\nName: ${name}\nDate: ${new Date().toISOString()}\nFiles: index.html\n`;
  const combined = manifest + "\n\n---BEGIN HTML---\n\n" + html;
  return new Blob([combined], { type: "application/zip" });
}
