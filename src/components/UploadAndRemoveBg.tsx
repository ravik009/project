import React, { useState } from 'react';

async function resizeImage(file: File, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height *= maxWidth / width));
          width = maxWidth;
        } else {
          width = Math.round((width *= maxHeight / height));
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            throw new Error('Image compression failed');
          }
          console.log("Original size:", file.size / 1024, "KB");
          console.log("Compressed size:", blob.size / 1024, "KB");
          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
}

const UploadAndRemoveBg: React.FC = () => {
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div style={{ marginTop: 40, textAlign: 'center' }}>
      <input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setInputImage(URL.createObjectURL(file));
          setLoading(true);

          const resizedBlob = await resizeImage(file, 512, 512, 0.6);
          const formData = new FormData();
          formData.append('image', resizedBlob, file.name);
          formData.append('model', 'u2net'); // Default model

          try {
            const response = await fetch('http://localhost:5000/remove-bg', {
              method: 'POST',
              body: formData,
            });
            if (!response.ok) throw new Error('Background removal failed');
            const blob = await response.blob();
            setOutputUrl(URL.createObjectURL(blob));
          } catch (err) {
            alert('Background removal failed!');
          }
          setLoading(false);
        }}
        style={{ marginBottom: 20 }}
      />
      {inputImage && (
        <div style={{ margin: 20 }}>
          <p>Original Image:</p>
          <img src={inputImage} alt="Input" width={250} />
        </div>
      )}
      {loading && <p>Processing...</p>}
      {outputUrl && (
        <div style={{ margin: 20 }}>
          <p>Background Removed:</p>
          <img src={outputUrl} alt="Output" width={250} />
          <br />
          <a href={outputUrl} download="cutout.png">
            <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">Download Result</button>
          </a>
        </div>
      )}
    </div>
  );
};

export default UploadAndRemoveBg;