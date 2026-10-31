export type ImageTracer = {
  imagedataToSVG: (image: ImageData, options: Record<string, number>) => string;
};

declare global {
  interface Window { ImageTracer?: ImageTracer }
}

let loading: Promise<ImageTracer> | null = null;

export function loadImageTracer(): Promise<ImageTracer> {
  if (window.ImageTracer) return Promise.resolve(window.ImageTracer);
  if (loading) return loading;

  loading = new Promise<ImageTracer>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/imagetracerjs@1.2.6/imagetracer_v1.2.6.js';
    script.async = true;
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      if (error) { script.remove(); reject(error); }
      else resolve(window.ImageTracer!);
    };
    const timeout = window.setTimeout(() => finish(new Error('Tải thư viện chuyển ảnh quá lâu. Kiểm tra kết nối và thử lại.')), 20000);
    script.onload = () => finish(window.ImageTracer ? undefined : new Error('Không thể khởi tạo thư viện chuyển ảnh.'));
    script.onerror = () => finish(new Error('Không tải được thư viện chuyển ảnh. Kiểm tra kết nối và thử lại.'));
    document.head.appendChild(script);
  }).catch(error => { loading = null; throw error; });
  return loading;
}
