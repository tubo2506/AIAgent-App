/**
 * Tavily AI Search API Service
 * Cung cấp khả năng tìm kiếm web thời gian thực tối ưu cho LLM / AI Agent
 * Đăng ký miễn phí 1.000 lượt/tháng không cần thẻ tín dụng tại: https://tavily.com
 */

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchOutput {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  formattedContext: string;
  sources: Array<{ title: string; url: string }>;
}

/**
 * Kiểm tra tính hợp lệ của Tavily API Key
 */
export async function testTavilyConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, message: 'Chưa nhập Tavily API Key.' };
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey.trim(),
        query: 'ping test',
        search_depth: 'basic',
        max_results: 1,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data?.detail?.error || data?.message || `HTTP ${res.status}`;
      return { success: false, message: `Lỗi Tavily API: ${errMsg}` };
    }

    return { success: true, message: 'Kết nối Tavily API thành công! Sẵn sàng tra cứu web.' };
  } catch (err: any) {
    return { success: false, message: `Không thể kết nối đến Tavily: ${err.message || err}` };
  }
}

/**
 * Thực hiện tìm kiếm web thời gian thực với Tavily AI Search
 */
export async function searchTavily(
  query: string,
  apiKey: string,
  options?: { maxResults?: number; searchDepth?: 'basic' | 'advanced' }
): Promise<TavilySearchOutput> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chưa cấu hình Tavily API Key. Vui lòng vào Cài đặt để nhập Key miễn phí.');
  }

  const maxResults = options?.maxResults || 5;
  const searchDepth = options?.searchDepth || 'basic';

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey.trim(),
      query: query.trim(),
      search_depth: searchDepth,
      include_answer: true,
      max_results: maxResults,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const errMsg = data?.detail?.error || data?.message || `HTTP ${res.status}`;
    if (res.status === 401) {
      throw new Error('Tavily API Key không hợp lệ hoặc đã hết hạn ngạch.');
    }
    throw new Error(`Lỗi tìm kiếm Tavily: ${errMsg}`);
  }

  const results: TavilySearchResult[] = (data.results || []).map((r: any) => ({
    title: r.title || 'Nguồn tin tức web',
    url: r.url || '',
    content: r.content || '',
    score: r.score || 0,
  }));

  const sources = results
    .filter((r) => r.url)
    .map((r) => ({ title: r.title, url: r.url }));

  // Xây dựng đoạn ngữ cảnh định dạng chuẩn cho LLM
  let formattedContext = `\n\n[DỮ LIỆU TÌM KIẾM WEB THỜI GIAN THỰC (Tavily AI Search - Cập nhật mới nhất)]\n`;
  if (data.answer) {
    formattedContext += `Tóm tắt nhanh từ web: ${data.answer}\n\n`;
  }

  formattedContext += `Chi tiết các kết quả tìm kiếm:\n`;
  results.forEach((item, index) => {
    formattedContext += `[Nguồn ${index + 1}] ${item.title}\n`;
    if (item.url) formattedContext += `Đường dẫn: ${item.url}\n`;
    formattedContext += `Trích đoạn: ${item.content}\n\n`;
  });

  formattedContext += `HÃY SỬ DỤNG DỮ LIỆU TÌM KIẾM MỚI NHẤT TRÊN ĐỂ TRẢ LỜI CÂU HỎI CỦA NGƯỜI DÙNG VÀ TRÍCH DẪN RÕ RÀNG NGUỒN CUNG CẤP THÔNG TIN.\n`;

  return {
    query,
    answer: data.answer,
    results,
    formattedContext,
    sources,
  };
}
