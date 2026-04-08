import React, { forwardRef, useEffect } from "react";

const EditorCanvas = forwardRef(({ media, edits, zoom }, ref) => {
  useEffect(() => {
    // فقط للصور - رسم على canvas
    if (media.type === "image" && ref.current) {
      const canvas = ref.current;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        let drawWidth = img.width;
        let drawHeight = img.height;

        if (edits.crop) {
          drawWidth = edits.crop.width;
          drawHeight = edits.crop.height;
        }

        canvas.width = drawWidth;
        canvas.height = drawHeight;

        ctx.save();

        if (edits.flip) ctx.scale(-1, 1);
        if (edits.flop) ctx.scale(1, -1);

        if (edits.rotate !== 0) {
          ctx.translate(drawWidth / 2, drawHeight / 2);
          ctx.rotate((edits.rotate * Math.PI) / 180);
          ctx.translate(-drawWidth / 2, -drawHeight / 2);
        }

        if (edits.crop) {
          ctx.drawImage(
            img,
            edits.crop.x,
            edits.crop.y,
            edits.crop.width,
            edits.crop.height,
            0,
            0,
            edits.crop.width,
            edits.crop.height
          );
        } else {
          ctx.drawImage(img, 0, 0);
        }

        if (edits.brightness !== 1 || edits.contrast !== 1) {
          const imageData = ctx.getImageData(0, 0, drawWidth, drawHeight);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * edits.brightness * edits.contrast);
            data[i + 1] = Math.min(255, data[i + 1] * edits.brightness * edits.contrast);
            data[i + 2] = Math.min(255, data[i + 2] * edits.brightness * edits.contrast);
          }

          ctx.putImageData(imageData, 0, 0);
        }

        edits.layers.forEach((layer) => {
          if (layer.type === "text") {
            ctx.fillStyle = layer.color || "#ffffff";
            ctx.font = `${layer.fontSize || 24}px Arial`;
            ctx.fillText(layer.content, layer.x, layer.y);
          }
        });

        ctx.restore();
      };

      img.src = media.url;
    }
  }, [media, edits, ref]);

  return (
    <div className="flex-1 bg-slate-950 rounded-lg overflow-auto flex items-center justify-center p-4">
      {media.type === "video" ? (
        <video
          ref={ref}
          src={media.url}
          controls
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            border: "2px solid #334155",
            borderRadius: "0.5rem",
            transform: `scale(${zoom / 100})`,
          }}
        />
      ) : (
        <canvas
          ref={ref}
          className="max-w-full max-h-full border-2 border-slate-700 rounded-lg"
          style={{ transform: `scale(${zoom / 100})` }}
        />
      )}
    </div>
  );
});

EditorCanvas.displayName = "EditorCanvas";
export default EditorCanvas;