import { put } from '@vercel/blob';

import { apiTools } from './apiTools';

/**
 * Hàm upload file lên Vercel Blob.
 * Tự động gọi API lấy token và đổi tên file chống trùng lặp.
 * @param file File cần upload
 * @returns Đường dẫn URL của file sau khi upload thành công
 */
export const uploadFileToVercel = async (file: File): Promise<string> => {
  try {
    // 1. Tự động gọi API lấy Token từ backend của bạn
    // (Giả sử hàm apiTools.getBlobToken() trả về object có chứa { token: '...' })
    const res = await apiTools.getBlobToken();
    const token = res.data.token;

    if (!token) {
      throw new Error("Don't have vercel token!");
    }

    // 2. Tạo tên file mới chống trùng lặp
    const ext = file.name.split(".").pop();
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
    const uniqueStr = Math.random().toString(36).substring(2, 9);
    const newName = `${nameWithoutExt}_${Date.now()}_${uniqueStr}.${ext}`;

    // 3. Thực hiện Upload bằng thư viện chính chủ
    const blob = await put(newName, file, {
      access: "public",
      token: token,
    });

    // 4. Trả về đúng cái URL cần thiết
    return blob.url;
  } catch (error) {
    throw error; // Ném lỗi ra ngoài để UI bắt được và hiện Alert
  }
};
